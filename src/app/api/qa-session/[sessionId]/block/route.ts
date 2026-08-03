import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

/** Records an automated Phase 1 compliance stop into stepData.sessionBlocked. The session can no
 *  longer be resumed — the customer dashboard and the voice-session page both gate on this — and an
 *  advisor needs to follow up.
 *
 *  `reason` is stored for whoever makes that call and is deliberately never shown to the customer;
 *  they get one generic message regardless of which blocker fired.
 *  See private-documents/after-demo/SESSION_BLOCKED_STEPDATA_PLAN.md. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });

    const user = await AuthService.getUserFromToken(token);
    if (!user) return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });

    const { sessionId } = await params;
    const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

    const session = await prisma.qASession.findFirst({
      where:  { id: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ message: "Sitzung nicht gefunden" }, { status: 404 });
    }

    // Merge, never overwrite — stepData also holds the voice resume blob and the signteq state.
    const existing = await prisma.sessionWorkflowState.findUnique({
      where:  { qaSessionId: sessionId },
      select: { stepData: true },
    });
    const currentStepData = (existing?.stepData ?? {}) as Record<string, unknown>;

    // Idempotent: the tap and voice paths can both reach a blocker for the same answer, and a
    // second call must not overwrite the original reason or timestamp.
    if (currentStepData.sessionBlocked) {
      return NextResponse.json({ success: true, alreadyBlocked: true });
    }

    const mergedStepData = {
      ...currentStepData,
      sessionBlocked: { at: new Date().toISOString(), reason: reason ?? "unspecified" },
    } as Prisma.InputJsonValue;

    await prisma.sessionWorkflowState.upsert({
      where:  { qaSessionId: sessionId },
      create: { qaSessionId: sessionId, stepData: mergedStepData, lastActivity: new Date() },
      update: { stepData: mergedStepData, lastActivity: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("session block error:", error);
    return NextResponse.json({ success: false, message: "Interner Serverfehler" }, { status: 500 });
  }
}

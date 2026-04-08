import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });

    const user = await AuthService.getUserFromToken(token);
    if (!user) return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });

    const { sessionId } = await params;
    const ws = await prisma.sessionWorkflowState.findUnique({
      where:  { qaSessionId: sessionId },
      select: { stepData: true },
    });

    const stepData  = (ws?.stepData ?? {}) as Record<string, unknown>;
    const voice     = (stepData.voice ?? {}) as Record<string, unknown>;
    const lastIndex = typeof voice.lastQuestionIndex === "number" ? voice.lastQuestionIndex : 0;

    return NextResponse.json({ success: true, lastQuestionIndex: lastIndex });
  } catch (error) {
    console.error("voice-state GET error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });
    }

    const { sessionId } = await params;
    const { lastQuestionIndex } = await req.json();

    if (typeof lastQuestionIndex !== "number") {
      return NextResponse.json({ message: "lastQuestionIndex fehlt" }, { status: 400 });
    }

    // Verify session belongs to user
    const session = await prisma.qASession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ message: "Sitzung nicht gefunden" }, { status: 404 });
    }

    // Upsert workflow state and merge voice data into stepData
    const existing = await prisma.sessionWorkflowState.findUnique({
      where: { qaSessionId: sessionId },
      select: { stepData: true },
    });

    const currentStepData = (existing?.stepData ?? {}) as Record<string, unknown>;
    const updatedStepData = {
      ...currentStepData,
      voice: { lastQuestionIndex },
    };

    await prisma.sessionWorkflowState.upsert({
      where:  { qaSessionId: sessionId },
      create: { qaSessionId: sessionId, stepData: updatedStepData, lastActivity: new Date() },
      update: { stepData: updatedStepData, lastActivity: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("voice-state PATCH error:", error);
    return NextResponse.json({ success: false, message: "Interner Serverfehler" }, { status: 500 });
  }
}

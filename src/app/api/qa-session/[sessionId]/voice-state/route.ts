import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma";
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

    // Ownership check — without this, any authenticated customer who knows/guesses another
    // customer's session_id could read that customer's voicePhase/skippedIds/Phase 6 chat log.
    // Mirrors the check the PATCH handler below already has. See
    // private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
    const session = await prisma.qASession.findFirst({
      where:  { id: sessionId, userId: user.id },
      select: { phase: true },
    });
    if (!session) {
      return NextResponse.json({ message: "Sitzung nicht gefunden" }, { status: 404 });
    }

    const ws = await prisma.sessionWorkflowState.findUnique({
      where:  { qaSessionId: sessionId },
      select: { stepData: true },
    });

    const stepData  = (ws?.stepData ?? {}) as Record<string, unknown>;
    // Phase 1 compliance stop — the page renders the blocked notice instead of resuming. Read here
    // rather than via a new endpoint because the page already calls this on mount.
    const isBlocked = !!stepData.sessionBlocked;
    const voice     = (stepData.voice ?? {}) as Record<string, unknown>;

    const lastIndex    = typeof voice.lastQuestionIndex === "number" ? voice.lastQuestionIndex : 0;
    const skippedIds   = Array.isArray(voice.skippedIds)   ? (voice.skippedIds as string[]) : [];
    const voicePhase   = typeof voice.voicePhase === "number" ? (voice.voicePhase as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) : null;
    const termsSubStep = typeof voice.termsSubStep === "string" ? (voice.termsSubStep as string) : null;
    const isRevisiting = voice.isRevisiting === true;
    // Phase 6's own isolated chat history — deliberately separate from the Thread/Message
    // table that backs Phase 1's chat, so Phase 1 content can never leak in. See
    // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
    const phase6Chat   = Array.isArray(voice.phase6Chat) ? voice.phase6Chat : [];

    return NextResponse.json({
      success:           true,
      lastQuestionIndex: lastIndex,
      skippedIds,
      voicePhase,
      termsSubStep,
      isRevisiting,
      currentPhase:      session?.phase ?? null,
      isBlocked,
      phase6Chat,
    });
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
    if (!token) return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });

    const user = await AuthService.getUserFromToken(token);
    if (!user) return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });

    const { sessionId } = await params;
    const body = await req.json();
    const { lastQuestionIndex, skippedIds, voicePhase, termsSubStep, isRevisiting, phase6Chat } = body as {
      lastQuestionIndex: number;
      skippedIds?:       string[];
      voicePhase?:       0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
      termsSubStep?:     string | null;
      isRevisiting?:     boolean;
      // Phase 6's own isolated chat history — see
      // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
      phase6Chat?:       { id: string; text: string; sender: "ai" | "user"; timestamp: string }[];
    };

    if (typeof lastQuestionIndex !== "number") {
      return NextResponse.json({ message: "lastQuestionIndex fehlt" }, { status: 400 });
    }

    const session = await prisma.qASession.findFirst({
      where:  { id: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ message: "Sitzung nicht gefunden" }, { status: 404 });
    }

    // Read existing stepData so we merge instead of overwriting unrelated keys.
    const existing = await prisma.sessionWorkflowState.findUnique({
      where:  { qaSessionId: sessionId },
      select: { stepData: true },
    });
    const currentStepData = (existing?.stepData ?? {}) as Record<string, unknown>;
    const currentVoice    = (currentStepData.voice ?? {}) as Record<string, unknown>;

    const updatedVoice: Record<string, unknown> = {
      ...currentVoice,
      lastQuestionIndex,
    };
    if (Array.isArray(skippedIds))          updatedVoice.skippedIds   = skippedIds;
    if (voicePhase !== undefined)           updatedVoice.voicePhase   = voicePhase;
    if (termsSubStep !== undefined)         updatedVoice.termsSubStep = termsSubStep;
    if (isRevisiting !== undefined)         updatedVoice.isRevisiting = isRevisiting;
    if (Array.isArray(phase6Chat))          updatedVoice.phase6Chat   = phase6Chat;

    const mergedStepData = { ...currentStepData, voice: updatedVoice } as Prisma.InputJsonValue;

    await prisma.sessionWorkflowState.upsert({
      where:  { qaSessionId: sessionId },
      create: { qaSessionId: sessionId, stepData: mergedStepData, lastActivity: new Date() },
      update: { stepData: mergedStepData, lastActivity: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("voice-state PATCH error:", error);
    return NextResponse.json({ success: false, message: "Interner Serverfehler" }, { status: 500 });
  }
}

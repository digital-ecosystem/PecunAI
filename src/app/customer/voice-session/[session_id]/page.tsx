"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import VoiceSessionShell from "@/components/voice/VoiceSessionShell";
import { useVoiceSessionStore } from "@/store/voiceSessionStore";

export default function VoiceSessionPage() {
  const router    = useRouter();
  const params    = useParams();
  const sessionId = params?.session_id as string;

  type InitialTermsPhase = 'terms2' | 'skip' | null;

  const [ready,                setReady]                = useState(false);
  const [questions,            setQuestions]            = useState<CarouselQuestion[]>([]);
  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0);
  const [initialTermsPhase,    setInitialTermsPhase]    = useState<InitialTermsPhase>(null);
  const [termsVectorId,        setTermsVectorId]        = useState<string | null>(null);

  // Resume state — populated from Zustand cache (same-browser) or DB (cross-device)
  const [initialAnsweredIds,  setInitialAnsweredIds]  = useState<string[]>([]);
  const [initialSkippedIds,   setInitialSkippedIds]   = useState<string[]>([]);
  const [initialSavedAnswers, setInitialSavedAnswers] = useState<Record<string, string>>({});
  const [initialVoicePhase,   setInitialVoicePhase]   = useState<0 | 1 | 2 | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      // ── Same-browser fast path ──────────────────────────────────
      // If Zustand has data for this session in localStorage, use it immediately
      // so we can skip the loading spinner for returning visitors on the same device.
      const cached = useVoiceSessionStore.getState();
      if (cached.sessionId === sessionId) {
        setInitialAnsweredIds(cached.answeredIds);
        setInitialSkippedIds(cached.skippedIds);
        setInitialSavedAnswers(cached.savedAnswers);
        setInitialVoicePhase(cached.voicePhase);
        if (cached.voicePhase === 1) {
          setInitialTermsPhase('skip');
        } else if (cached.voicePhase === 2) {
          setInitialTermsPhase('skip');
        } else if (cached.termsSubStep === 'terms2' || cached.termsSubStep === 'sustainabilityTerms') {
          setInitialTermsPhase('terms2');
        }
        // voicePhase 0 + termsSubStep 'intro'/'terms1' → initialTermsPhase stays null → starts from beginning of terms
        // We still need questions + auth check — don't set ready yet, but data is pre-loaded.
      }

      // ── Auth check ──────────────────────────────────────────────
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!meData?.success) {
        router.push("/customer/signin");
        return;
      }

      // ── Load voice state (index + skipped + phase) and questions in parallel ──
      const [vsRes, vcRes, phaseRes] = await Promise.all([
        fetch(`/api/qa-session/${sessionId}/voice-state`),
        fetch("/api/voice/config"),
        fetch(`/api/phase?id=${sessionId}`),
      ]);

      const vsData   = await vsRes.json().catch(() => null);
      const vcData   = await vcRes.json().catch(() => null);
      const phaseData = await phaseRes.json();

      if (vcData?.termsVectorId) setTermsVectorId(vcData.termsVectorId);

      if (!phaseData?.success) {
        router.push("/customer/signin");
        return;
      }
      if (phaseData.sessionFound === false) {
        router.push("/customer/dashboard");
        return;
      }

      // ── Build question list ──────────────────────────────────────
      type ApiOption   = { id: string; value: string; label: string };
      type ApiQuestion = {
        id: string; text: string; category?: string; phase?: string;
        questionType?: string; options?: ApiOption[];
        minValue?: number; maxValue?: number; inputPlaceholder?: string;
        questionOrder?: number; footnote?: string;
      };

      const loaded: CarouselQuestion[] = (phaseData.questions ?? []).map((q: ApiQuestion) => ({
        id:               q.id,
        category:         q.category ?? q.phase ?? "Frage",
        text:             q.text,
        questionType:     q.questionType ?? "choice",
        options:          (q.options ?? []).map((o: ApiOption) => ({ id: o.id, value: o.value, label: o.label })),
        minValue:         q.minValue ?? undefined,
        maxValue:         q.maxValue ?? undefined,
        inputPlaceholder: q.inputPlaceholder ?? undefined,
        questionOrder:    q.questionOrder,
        footnote:         q.footnote,
      }));

      const finalQuestions = loaded.length ? loaded : [
        { id: "fallback-1", category: "Anlageziel",     text: "Was möchten Sie mit dieser Veranlagung erreichen?", options: [] },
        { id: "fallback-2", category: "Anlagedauer",    text: "Für welchen Zeitraum möchten Sie veranlagen?", options: [] },
        { id: "fallback-3", category: "Risikoprofil",   text: "Wie würden Sie Ihre Risikobereitschaft einschätzen?", options: [] },
        { id: "fallback-4", category: "Erfahrung",      text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung gesammelt?", options: [] },
        { id: "fallback-5", category: "Nachhaltigkeit", text: "Wünschen Sie Informationen zu nachhaltigen Veranlagungen?", options: [] },
      ];
      setQuestions(finalQuestions);

      // ── Reconstruct answered / skipped IDs from DB ───────────────
      // phaseData.answers is Record<questionId, value> — already includes every saved answer.
      const dbAnswers: Record<string, string> = phaseData.answers ?? {};
      const dbAnsweredIds = Object.keys(dbAnswers);

      // Sub-questions (decimal questionOrder e.g. 12.1) whose parent was NOT answered "good"
      // are implicitly handled — add them to answeredIds so they don't pollute the remaining filter.
      const implicitlyHandledIds = finalQuestions
        .filter((q) => q.questionOrder !== undefined && q.questionOrder % 1 !== 0)
        .filter((q) => {
          const parentOrder = Math.floor(q.questionOrder!);
          const parentQ     = finalQuestions.find((p) => p.questionOrder === parentOrder);
          if (!parentQ) return false;
          const parentAnswer = dbAnswers[parentQ.id];
          // Parent was answered but NOT "good" → sub-question was never shown, treat as handled.
          return parentAnswer !== undefined && parentAnswer !== "good";
        })
        .map((q) => q.id);

      const allAnsweredIds = [...new Set([...dbAnsweredIds, ...implicitlyHandledIds])];

      // skippedIds from DB (persisted since this feature was added).
      // For old sessions without skippedIds in DB, reconstruct from the Zustand cache if available.
      const dbSkippedIds: string[] = vsData?.skippedIds ?? [];
      const cachedSkipped          = cached.sessionId === sessionId ? cached.skippedIds : [];
      const resolvedSkippedIds     = dbSkippedIds.length > 0 ? dbSkippedIds : cachedSkipped;

      // Use DB index (absolute position) for system-prompt resume marker.
      // Clamp to question count to avoid stale out-of-bounds values.
      const dbLastIndex = vsData?.lastQuestionIndex ?? 0;
      const safeIndex   = Math.min(dbLastIndex, Math.max(0, finalQuestions.length - 1));

      setInitialQuestionIndex(safeIndex);
      setInitialAnsweredIds(allAnsweredIds);
      setInitialSkippedIds(resolvedSkippedIds);
      setInitialSavedAnswers(dbAnswers);

      // ── Derive termsPhase and voicePhase from voice-state ───────────────────────
      const dbVoicePhase: number | null = vsData?.voicePhase ?? null;
      const currentPhase = vsData?.currentPhase as string | null | undefined;

      if (dbVoicePhase !== null && dbVoicePhase !== undefined) {
        setInitialVoicePhase(dbVoicePhase as 0 | 1 | 2);
      }
      if (dbVoicePhase === 1) {
        setInitialTermsPhase('skip');
      } else if (dbVoicePhase === 2) {
        setInitialTermsPhase('skip');
      } else if (vsData?.termsSubStep === 'terms2' || vsData?.termsSubStep === 'sustainabilityTerms') {
        setInitialTermsPhase('terms2');
      } else if (currentPhase === 'TERMS_FROOTS') {
        setInitialTermsPhase('terms2');  // fallback for old sessions before termsSubStep was saved to DB
      }

      // ── Hydrate Zustand for next same-browser visit ──────────────
      useVoiceSessionStore.getState().hydrate({
        sessionId,
        voicePhase:   (dbVoicePhase as 0 | 1 | 2) ?? 0,
        termsSubStep: (vsData?.termsSubStep as "intro" | "terms1" | "terms2" | "sustainabilityTerms" | null) ?? null,
        activeCardId: finalQuestions[safeIndex]?.id ?? null,
        answeredIds:  allAnsweredIds,
        skippedIds:   resolvedSkippedIds,
        savedAnswers: dbAnswers,
      });

      setReady(true);
    };

    init();
  }, [router, sessionId]);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <VoiceSessionShell
      sessionId={sessionId}
      questions={questions}
      initialQuestionIndex={initialQuestionIndex}
      initialTermsPhase={initialTermsPhase}
      termsVectorId={termsVectorId}
      initialAnsweredIds={initialAnsweredIds}
      initialSkippedIds={initialSkippedIds}
      initialSavedAnswers={initialSavedAnswers}
      initialVoicePhase={initialVoicePhase}
    />
  );
}

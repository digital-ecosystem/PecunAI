"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import VoiceSessionShell from "@/components/voice/VoiceSessionShell";

export default function VoiceSessionPage() {
  const router    = useRouter();
  const params    = useParams();
  const sessionId = params?.session_id as string;

  const [ready,                setReady]                = useState(false);
  const [questions,            setQuestions]            = useState<CarouselQuestion[]>([]);
  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0);

  useEffect(() => {
    const init = async () => {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!meData?.success) {
        router.push("/customer/signin");
        return;
      }

      // Load resume position from voice state
      const vsRes  = await fetch(`/api/qa-session/${sessionId}/voice-state`);
      const vsData = await vsRes.json().catch(() => null);
      if (vsData?.success && typeof vsData.lastQuestionIndex === "number" && vsData.lastQuestionIndex > 0) {
        setInitialQuestionIndex(vsData.lastQuestionIndex);
      }

      const res  = await fetch(`/api/phase?id=${sessionId}`);
      const data = await res.json();

      if (!data?.success) {
        router.push("/customer/signin");
        return;
      }

      // Guard: session must belong to the current user.
      // If sessionFound is explicitly false the session ID is wrong for this account.
      if (data.sessionFound === false) {
        router.push("/customer/dashboard");
        return;
      }

      type ApiOption = { id: string; value: string; label: string };
      type ApiQuestion = {
        id: string; text: string; category?: string; phase?: string;
        questionType?: string; options?: ApiOption[];
        minValue?: number; maxValue?: number; inputPlaceholder?: string;
      };

      const loaded: CarouselQuestion[] = (data.questions ?? []).map((q: ApiQuestion) => ({
        id:               q.id,
        category:         q.category ?? q.phase ?? "Frage",
        text:             q.text,
        questionType:     q.questionType ?? "choice",
        options:          (q.options ?? []).map((o: ApiOption) => ({ id: o.id, value: o.value, label: o.label })),
        minValue:         q.minValue ?? undefined,
        maxValue:         q.maxValue ?? undefined,
        inputPlaceholder: q.inputPlaceholder ?? undefined,
      }));

      setQuestions(loaded.length ? loaded : [
        { id: "fallback-1", category: "Anlageziel",     text: "Was möchten Sie mit dieser Veranlagung erreichen?", options: [] },
        { id: "fallback-2", category: "Anlagedauer",    text: "Für welchen Zeitraum möchten Sie veranlagen?", options: [] },
        { id: "fallback-3", category: "Risikoprofil",   text: "Wie würden Sie Ihre Risikobereitschaft einschätzen?", options: [] },
        { id: "fallback-4", category: "Erfahrung",      text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung gesammelt?", options: [] },
        { id: "fallback-5", category: "Nachhaltigkeit", text: "Wünschen Sie Informationen zu nachhaltigen Veranlagungen?", options: [] },
      ]);
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
    />
  );
}

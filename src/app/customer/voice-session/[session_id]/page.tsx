"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Menu, User, Mic, MicOff, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import VoiceSphere, { VoiceState, VOICE_COLORS } from "@/components/voice/VoiceSphere";
import VoiceCarousel, { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import VoiceQuestionModal from "@/components/voice/VoiceQuestionModal";
import VoiceExplainOverlay from "@/components/voice/VoiceExplainOverlay";
import VoiceChatModal from "@/components/voice/VoiceChatModal";

// ── Sample options until real questions are loaded from DB ────────
const SAMPLE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  default: [
    { id: "a", label: "Option A" },
    { id: "b", label: "Option B" },
    { id: "c", label: "Option C" },
  ],
};

const STATUS_LABEL: Record<VoiceState, string> = {
  idle:      "Bereit...",
  speaking:  "PecunAI spricht",
  listening: "Zuhören...",
};

export default function VoiceSessionPage() {
  const router   = useRouter();
  const params   = useParams();
  const sessionId = params?.session_id as string;

  const [ready,       setReady]       = useState(false);
  const [questions,   setQuestions]   = useState<CarouselQuestion[]>([]);
  const [currentQ,    setCurrentQ]    = useState(0);
  const [voiceState]                  = useState<VoiceState>("listening");
  const [isMuted,     setIsMuted]     = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [chatOpen,    setChatOpen]    = useState(false);

  const color   = VOICE_COLORS[isMuted ? "idle" : voiceState];
  const activeQ = questions[((currentQ % questions.length) + questions.length) % questions.length];

  // ── Auth + load questions ─────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Auth check
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!meData?.success) {
        router.push("/customer/signin");
        return;
      }

      // Load questions for this session
      const res  = await fetch(`/api/phase?id=${sessionId}`);
      const data = await res.json();

      if (!data?.success) {
        router.push("/customer/signin");
        return;
      }

      const loaded: CarouselQuestion[] = (data.questions ?? []).map(
        (q: { id: string; text: string; category?: string; phase?: string }) => ({
          id:       q.id,
          category: q.category ?? q.phase ?? "Frage",
          text:     q.text,
        })
      );

      setQuestions(loaded.length ? loaded : [
        { id: "1", category: "Anlageziel",     text: "Was möchten Sie mit dieser Veranlagung erreichen?" },
        { id: "2", category: "Anlagedauer",    text: "Für welchen Zeitraum möchten Sie veranlagen?" },
        { id: "3", category: "Risikoprofil",   text: "Wie würden Sie Ihre Risikobereitschaft einschätzen?" },
        { id: "4", category: "Erfahrung",      text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung gesammelt?" },
        { id: "5", category: "Nachhaltigkeit", text: "Wünschen Sie Informationen zu nachhaltigen Veranlagungen?" },
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
    <>
      <div
        className="h-screen flex flex-col overflow-hidden select-none"
        style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <Btn onClick={() => router.push("/customer/dashboard")}>
            <Menu size={20} color="#3b82f6" strokeWidth={2.0} />
          </Btn>
          <span className="text-lg font-bold tracking-tight" style={{ color: "#3a5bd9" }}>Vox.2</span>
          <Btn>
            <User size={20} color="#3b82f6" strokeWidth={2.0} />
          </Btn>
        </header>

        {/* ── Sphere ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center flex-1 min-h-0">
          <VoiceSphere voiceState={isMuted ? "idle" : voiceState} size={420} />
          <p className="mt-4 text-sm font-semibold tracking-wide transition-colors duration-500" style={{ color }}>
            {isMuted ? "Stumm – tippen Sie Ihre Antwort" : STATUS_LABEL[voiceState]}
          </p>
        </div>

        {/* ── Bottom panel ─────────────────────────────────────────── */}
        <div
          className="flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(240,247,255,0.6) 20%, rgba(235,244,255,0.92) 100%)",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}
        >
          {questions.length > 0 && (
            <VoiceCarousel
              questions={questions}
              currentIndex={currentQ}
              onNext={() => setCurrentQ(q => q + 1)}
              onPrev={() => setCurrentQ(q => q - 1)}
              onActiveCardClick={() => setModalOpen(true)}
              onInfoClick={() => setExplainOpen(true)}
            />
          )}

          {/* ── Nav bar ──────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-5 py-4">
            <Btn active={isMuted} onClick={() => setIsMuted(m => !m)}>
              {isMuted
                ? <MicOff size={18} color="#ef4444" strokeWidth={2} />
                : <Mic    size={18} color="#3b82f6"  strokeWidth={2} />}
            </Btn>

            <div className="flex items-center gap-5 px-5 py-4 rounded-full"
              style={{ background: "rgba(210,224,248,0.45)", border: "1.5px solid rgba(190,212,245,0.6)", boxShadow: "0 2px 8px rgba(80,120,210,0.10)" }}>
              <button onClick={() => setCurrentQ(q => q - 1)} style={{ color: "#6b8de0" }}>
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <button onClick={() => setCurrentQ(q => q + 1)} style={{ color: "#6b8de0" }}>
                <ChevronRight size={22} strokeWidth={1.5} />
              </button>
            </div>

            <Btn onClick={() => setChatOpen(true)}>
              <MessageSquare size={18} color="#8ba3d4" strokeWidth={2} />
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Chat modal ──────────────────────────────────────────────── */}
      {chatOpen && <VoiceChatModal onClose={() => setChatOpen(false)} />}

      {/* ── Explain overlay ─────────────────────────────────────────── */}
      {explainOpen && activeQ && (
        <VoiceExplainOverlay
          footnote={{
            title: `${activeQ.category} verstehen`,
            body:  "Bei der Festlegung Ihres Anlageziels ist es wichtig zu verstehen, ob Sie primär Vermögen aufbauen, Kapital erhalten, für das Alter vorsorgen oder andere spezifische Ziele verfolgen möchten.",
            stats: [
              { label: "Stocks", value: 60, color: "#3b82f6" },
              { label: "Bonds",  value: 30, color: "#60a5fa" },
              { label: "Cash",   value: 10, color: "#93c5fd" },
            ],
          }}
          questionCategory={activeQ.category}
          questionText={activeQ.text}
          onClose={() => setExplainOpen(false)}
          onFollowUp={() => { setChatOpen(true); setExplainOpen(false); }}
        />
      )}

      {/* ── Question modal ───────────────────────────────────────────── */}
      {modalOpen && activeQ && (
        <VoiceQuestionModal
          question={{
            number:  currentQ + 1,
            total:   questions.length,
            text:    activeQ.text,
            options: SAMPLE_OPTIONS[activeQ.id] ?? SAMPLE_OPTIONS.default,
          }}
          onClose={() => setModalOpen(false)}
          onNext={() => {
            setModalOpen(false);
            setCurrentQ(q => q + 1);
          }}
        />
      )}
    </>
  );
}

function Btn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={{
        background: active ? "rgba(254,226,226,0.7)" : "rgba(210,224,248,0.45)",
        border: `1.5px solid ${active ? "#fca5a5" : "rgba(190,212,245,0.6)"}`,
        boxShadow: "0 2px 8px rgba(80,120,210,0.10)",
      }}>
      {children}
    </button>
  );
}

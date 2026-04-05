"use client";

import { useState } from "react";
import { Menu, User, Mic, MicOff, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import VoiceSphere, { VoiceState, VOICE_COLORS } from "@/components/voice/VoiceSphere";
import VoiceCarousel from "@/components/voice/VoiceCarousel";
import VoiceQuestionModal from "@/components/voice/VoiceQuestionModal";
import VoiceExplainOverlay from "@/components/voice/VoiceExplainOverlay";
import VoiceChatModal from "@/components/voice/VoiceChatModal";

const QUESTIONS = [
  {
    id: "1", category: "Anlagedauer", text: "Für welchen Zeitraum möchten Sie veranlagen?",
    options: [
      { id: "a", value: "bis_3", label: "Bis 3 Jahre" },
      { id: "b", value: "3_bis_5", label: "3 bis 5 Jahre" },
      { id: "c", value: "5_bis_10", label: "5 bis 10 Jahre" },
      { id: "d", value: "ueber_10", label: "Über 10 Jahre" },
    ],
  },
  {
    id: "2", category: "Nachhaltigkeit", text: "Wünschen Sie Informationen zu nachhaltigen Veranlagungen?",
    options: [
      { id: "a", value: "ja", label: "Ja, bitte" },
      { id: "b", value: "nein", label: "Nein, danke" },
    ],
  },
  {
    id: "3", category: "Anlageziel", text: "Was möchten Sie mit dieser Veranlagung erreichen?",
    options: [
      { id: "a", value: "aufbau", label: "Vermögensaufbau" },
      { id: "b", value: "erhalt", label: "Kapitalerhalt" },
      { id: "c", value: "alters", label: "Altersvorsorge" },
      { id: "d", value: "sonstige", label: "Sonstige Sparziele" },
    ],
  },
  {
    id: "4", category: "Risikoprofil", text: "Wie würden Sie Ihre Risikobereitschaft einschätzen?",
    options: [
      { id: "a", value: "sehr_konservativ", label: "Sehr konservativ" },
      { id: "b", value: "konservativ", label: "Konservativ" },
      { id: "c", value: "ausgewogen", label: "Ausgewogen" },
      { id: "d", value: "wachstum", label: "Wachstumsorientiert" },
      { id: "e", value: "spekulativ", label: "Spekulativ" },
    ],
  },
  {
    id: "5", category: "Erfahrung", text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung gesammelt?",
    options: [
      { id: "a", value: "keine", label: "Keine Erfahrung" },
      { id: "b", value: "gering", label: "Geringe Erfahrung" },
      { id: "c", value: "gut", label: "Gute Kenntnisse" },
      { id: "d", value: "sehr", label: "Sehr erfahren" },
    ],
  },
  {
    id: "6", category: "Einkommen", text: "Wie hoch ist Ihr monatliches Nettoeinkommen?",
    options: [
      { id: "a", value: "bis_1500", label: "Bis 1.500 €" },
      { id: "b", value: "1500_3000", label: "1.500 bis 3.000 €" },
      { id: "c", value: "3000_5000", label: "3.000 bis 5.000 €" },
      { id: "d", value: "ueber_5000", label: "Über 5.000 €" },
    ],
  },
];

const N = QUESTIONS.length;
const wrap = (i: number) => ((i % N) + N) % N;

const STATUS_LABEL: Record<VoiceState, string> = {
  idle:      "Bereit...",
  speaking:  "PecunAI spricht",
  listening: "Listening...",
};

export default function SphereTestPage() {
  const [voiceState]   = useState<VoiceState>("listening");
  const [currentQ,     setCurrentQ]   = useState(2);
  const [isMuted,      setIsMuted]    = useState(false);
  const [modalOpen,    setModalOpen]  = useState(false);
  const [explainOpen,  setExplainOpen] = useState(false);
  const [chatOpen,     setChatOpen]    = useState(false);

  const color       = VOICE_COLORS[isMuted ? "idle" : voiceState];
  const activeQ     = QUESTIONS[wrap(currentQ)];

  return (
    <>
      <div
        className="h-screen flex flex-col overflow-hidden select-none"
        style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <Btn><Menu size={20} color="#3b82f6" strokeWidth={2.0} /></Btn>
          <span className="text-lg font-bold tracking-tight" style={{ color: "#3a5bd9" }}>Vox.2</span>
          <Btn><User size={20} color="#3b82f6" strokeWidth={2.0} /></Btn>
        </header>

        {/* ── Sphere hero ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center flex-1 min-h-0">
          <VoiceSphere voiceState={isMuted ? "idle" : voiceState} size={420} />
          <p className="mt-4 text-sm font-semibold tracking-wide transition-colors duration-500" style={{ color }}>
            {isMuted ? "Stumm – tippen Sie Ihre Antwort" : STATUS_LABEL[voiceState]}
          </p>
        </div>

        {/* ── Bottom panel ────────────────────────────────────────── */}
        <div
          className="flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(240,247,255,0.6) 20%, rgba(235,244,255,0.92) 100%)",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}
        >
          <VoiceCarousel
            questions={QUESTIONS}
            currentIndex={currentQ}
            onNext={() => setCurrentQ(q => q + 1)}
            onPrev={() => setCurrentQ(q => q - 1)}
            onActiveCardClick={() => setModalOpen(true)}
            onInfoClick={() => setExplainOpen(true)}
          />

          {/* ── Bottom Nav ──────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-5 py-4">
            <Btn active={isMuted} onClick={() => setIsMuted(m => !m)}>
              {isMuted
                ? <MicOff size={18} color="#ef4444" strokeWidth={2} />
                : <Mic    size={18} color="#3b82f6" strokeWidth={2} />}
            </Btn>

            <div className="flex items-center gap-5 px-5 py-4 rounded-full"
              style={{ background: "rgba(210,224,248,0.45)", border: "1.5px solid rgba(190,212,245,0.6)", boxShadow: "0 2px 8px rgba(80,120,210,0.10)" }}>
              <button onClick={() => setCurrentQ(q => q - 1)} className="px-1 transition-opacity" style={{ color: "#6b8de0" }}>
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <button onClick={() => setCurrentQ(q => q + 1)} className="px-1 transition-opacity" style={{ color: "#6b8de0" }}>
                <ChevronRight size={22} strokeWidth={1.5} />
              </button>
            </div>

            <Btn onClick={() => setChatOpen(true)}>
              <MessageSquare size={18} color="#8ba3d4" strokeWidth={2} />
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Chat modal ──────────────────────────────────────────── */}
      {chatOpen && <VoiceChatModal onClose={() => setChatOpen(false)} />}

      {/* ── Explain overlay ─────────────────────────────────────── */}
      {explainOpen && (
        <VoiceExplainOverlay
          footnote={{
            title: "Anlageziel verstehen",
            body:  "Bei der Festlegung Ihres Anlageziels ist es wichtig zu verstehen, ob Sie primär Vermögen aufbauen, Kapital erhalten, für das Alter vorsorgen oder andere spezifische Ziele verfolgen möchten. Jedes Ziel erfordert eine unterschiedliche Anlagestrategie, um optimal darauf ausgerichtet zu sein.",
            stats: [
              { label: "Stocks", value: 60, color: "#3b82f6" },
              { label: "Bonds",  value: 30, color: "#60a5fa" },
              { label: "Cash",   value: 10, color: "#93c5fd" },
            ],
          }}
          questionCategory={activeQ.category}
          questionText={activeQ.text}
          onClose={() => setExplainOpen(false)}
          onFollowUp={() => { /* voice follow-up — wired later */ }}
        />
      )}

      {/* ── Question modal ───────────────────────────────────────── */}
      {modalOpen && (
        <VoiceQuestionModal
          question={{
            number:  Number(activeQ.id),
            total:   19,
            text:    activeQ.text,
            options: activeQ.options ?? [],
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

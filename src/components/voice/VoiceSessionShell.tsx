"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Menu, User, Mic } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import VoiceCarousel, { CarouselQuestion } from "./VoiceCarousel";
import VoiceQuestionModal from "./VoiceQuestionModal";
import VoiceExplainOverlay from "./VoiceExplainOverlay";
import VoiceChatModal from "./VoiceChatModal";
import ControlBar from "./ControlBar";
import { useVoiceSession, SessionState } from "@/hooks/useVoiceSession";

// ── Status labels ─────────────────────────────────────────────────

const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "PecunAI begrüßt Sie...",
  speaking:    "PecunAI spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

// ── Props ─────────────────────────────────────────────────────────

interface VoiceSessionShellProps {
  sessionId:            string;
  questions:            CarouselQuestion[];
  initialQuestionIndex: number;
}

// ── Component ─────────────────────────────────────────────────────

export default function VoiceSessionShell({
  sessionId,
  questions,
  initialQuestionIndex,
}: VoiceSessionShellProps) {
  const router = useRouter();

  const { state, started, analyserNode, micAnalyserNode, micGranted, startSession, toggleMute, onAnswerConfirmed, onPrev } =
    useVoiceSession({ sessionId, questions, initialQuestionIndex });

  const [modalOpen,   setModalOpen]   = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [chatOpen,    setChatOpen]    = useState(false);

  // viewIndex drives the carousel visually; it can be browsed freely.
  // It syncs forward whenever the hook advances currentQuestionIndex (after an answer is saved).
  const [viewIndex, setViewIndex] = useState(initialQuestionIndex);
  useEffect(() => {
    setViewIndex(state.currentQuestionIndex);
  }, [state.currentQuestionIndex]);

  const n       = questions.length;
  const activeQ = n > 0 ? questions[Math.min(viewIndex, n - 1)] : null;
  const isMuted     = state.session === "muted";
  const isSpeaking  = ["speaking", "greeting", "resuming"].includes(state.session);
  const isListening = state.session === "listening";

  return (
    <>
      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="w-full px-6 py-5 relative z-10">
          <div className="flex items-center justify-between">
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width:          44,
                height:         44,
                background:     "rgba(255,255,255,0.6)",
                backdropFilter: "blur(10px)",
                border:         "1px solid rgba(255,255,255,0.5)",
                boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/customer/dashboard")}
            >
              <Menu size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>

            <motion.h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background:           "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                backgroundClip:       "text",
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Vox.2
            </motion.h1>

            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width:          44,
                height:         44,
                background:     "rgba(255,255,255,0.6)",
                backdropFilter: "blur(10px)",
                border:         "1px solid rgba(255,255,255,0.5)",
                boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <User size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>
          </div>
        </div>

        {/* ── Main — orb ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Background energy pulse */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <motion.div
              className="rounded-full"
              style={{
                width:      500,
                height:     500,
                background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 70%)",
                filter:     "blur(60px)",
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Orb */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <VoiceSphere
              isActive={started}
              isSpeaking={isSpeaking && !isMuted}
              isListening={isListening && !isMuted}
              size={380}
              analyserNode={analyserNode}
              micAnalyserNode={micAnalyserNode}
            />
          </motion.div>

          {/* Status text + mic hint */}
          <div className="relative z-30 mt-4 pb-[75px] flex flex-col items-center gap-1">
            <motion.p
              className="text-sm font-medium"
              style={{ color: "rgba(59,130,246,0.7)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {STATUS_LABEL[state.session]}
            </motion.p>

            {micGranted === false && (
              <p className="text-xs" style={{ color: "rgba(107,114,128,0.7)" }}>
                Kein Mikrofon – Tippen Sie Ihre Antworten
              </p>
            )}

            {state.session === "error" && state.errorMessage && (
              <p className="text-xs text-red-400">{state.errorMessage}</p>
            )}
          </div>
        </div>

        {/* ── Question Carousel ────────────────────────────────────── */}
        {n > 0 && (
          <motion.div
            className="relative z-20 -mt-24 mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <VoiceCarousel
              questions={questions}
              currentIndex={viewIndex}
              onNext={() => setViewIndex(i => (i + 1) % n)}
              onPrev={() => setViewIndex(i => (i - 1 + n) % n)}
              onActiveCardClick={() => setModalOpen(true)}
              onInfoClick={() => setExplainOpen(true)}
            />
          </motion.div>
        )}

        {/* ── Control Bar ──────────────────────────────────────────── */}
        <ControlBar
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onPrevious={() => setViewIndex(i => (i - 1 + n) % n)}
          onNext={() => setViewIndex(i => (i + 1) % n)}
          onChatClick={() => setChatOpen(true)}
        />
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}

      <VoiceChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {explainOpen && activeQ && (
        <VoiceExplainOverlay
          footnote={{
            title: `${activeQ.category} verstehen`,
            body:  "Bei der Festlegung Ihres Anlageziels ist es wichtig zu verstehen, ob Sie primär Vermögen aufbauen, Kapital erhalten, für das Alter vorsorgen oder andere spezifische Ziele verfolgen möchten.",
            stats: [
              { label: "Aktien",    value: 60, color: "rgba(59,130,246,0.8)"  },
              { label: "Anleihen",  value: 30, color: "rgba(147,197,253,0.8)" },
              { label: "Liquidität",value: 10, color: "rgba(191,219,254,0.8)" },
            ],
          }}
          questionCategory={activeQ.category}
          questionText={activeQ.text}
          onClose={() => setExplainOpen(false)}
          onFollowUp={() => { setChatOpen(true); setExplainOpen(false); }}
        />
      )}

      {modalOpen && activeQ && (
        <VoiceQuestionModal
          question={{
            number:           viewIndex + 1,
            total:            n,
            text:             activeQ.text,
            options:          activeQ.options ?? [],
            questionType:     activeQ.questionType,
            minValue:         activeQ.minValue,
            maxValue:         activeQ.maxValue,
            inputPlaceholder: activeQ.inputPlaceholder,
          }}
          onClose={() => setModalOpen(false)}
          onNext={async value => {
            setModalOpen(false);
            if (activeQ) await onAnswerConfirmed(activeQ, value);
          }}
        />
      )}

      {/* ── Tap-to-start overlay ─────────────────────────────────── */}
      {!started && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
          style={{
            background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={startSession}
        >
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              className="flex items-center justify-center rounded-full"
              style={{
                width:      88,
                height:     88,
                background: "rgba(59,130,246,0.1)",
                border:     "1px solid rgba(59,130,246,0.2)",
              }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mic size={36} style={{ color: "rgba(59,130,246,0.8)" }} strokeWidth={1.5} />
            </motion.div>

            <div className="flex flex-col items-center gap-1">
              <motion.h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background:           "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                }}
              >
                PecunAI Beratung
              </motion.h1>
              <p className="text-sm" style={{ color: "rgba(59,130,246,0.6)" }}>
                Tippen um zu starten
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

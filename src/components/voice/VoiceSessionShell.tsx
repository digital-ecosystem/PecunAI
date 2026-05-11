"use client";

import { useState, useEffect, useRef } from "react";
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

  const { state, started, analyserNode, micAnalyserNode, micGranted, isAISpeaking, startSession, toggleMute, onAnswerConfirmed, clearPendingVoiceAnswer, onPrev, skipQuestion, activeCardId, pendingVoiceAnswer, savedAnswers, explainOverlayData, requestExplanation, closeExplainOverlay } =
    useVoiceSession({ sessionId, questions, initialQuestionIndex });

  const [modalOpen, setModalOpen] = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);

  // Derived from hook state — overlay is open whenever the AI has set explain data
  const explainOpen = explainOverlayData !== null;

  // Set when the customer manually closes the modal — prevents it from immediately re-opening.
  // Cleared when activeCardId changes (AI moved to a new question), so the next question auto-opens normally.
  const suppressAutoModalRef = useRef(false);

  useEffect(() => {
    suppressAutoModalRef.current = false;
  }, [activeCardId]);

  // Mic-denied: auto-open the modal when the AI finishes speaking so the customer
  // doesn't have to manually find and tap the carousel card.
  // suppressAutoModalRef prevents re-opening after a manual close until the question changes.
  useEffect(() => {
    if (micGranted === false && state.session === "listening" && !modalOpen && !suppressAutoModalRef.current) {
      setModalOpen(true);
    }
  }, [micGranted, state.session, modalOpen]);

  // viewIndex is derived directly from activeCardId — the hook's explicit source of truth
  // for which question the AI is currently on. No state machine sync needed.
  const viewIndex = activeCardId
    ? Math.max(0, questions.findIndex(q => q.id === activeCardId))
    : initialQuestionIndex;

  const n       = questions.length;
  const activeQ = n > 0 ? questions[Math.min(viewIndex, n - 1)] : null;

  // When the AI proposes an answer, use the question it's actually on — not the carousel position.
  // This avoids any viewIndex timing race where the modal renders before setViewIndex propagates.
  const modalQ = pendingVoiceAnswer
    ? (questions.find(q => q.id === pendingVoiceAnswer.questionId) ?? activeQ)
    : activeQ;
  const modalQIndex = pendingVoiceAnswer
    ? questions.findIndex(q => q.id === pendingVoiceAnswer.questionId)
    : viewIndex;
  const isMuted           = state.session === "muted";
  const sessionIsSpeaking = ["speaking", "greeting", "resuming"].includes(state.session);
  const isSpeaking        = !isMuted && (sessionIsSpeaking || isAISpeaking);
  const isListening       = state.session === "listening";

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
              isSpeaking={isSpeaking}
              isListening={isListening && !isMuted}
              size={380}
              analyserNode={isMuted ? null : analyserNode}
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
              onNext={() => {
                if (state.session !== "listening") return;
                if (viewIndex >= n - 1) return;
                skipQuestion(questions[viewIndex]);
              }}
              onPrev={() => {
                if (state.session !== "listening") return;
                if (viewIndex === 0) return;
                onPrev();
              }}
              onActiveCardClick={() => setModalOpen(true)}
              onInfoClick={requestExplanation}
            />
          </motion.div>
        )}

        {/* ── Control Bar ──────────────────────────────────────────── */}
        <ControlBar
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onPrevious={() => {
            if (state.session !== "listening") return;
            if (viewIndex === 0) return;
            onPrev();
          }}
          onNext={() => {
            if (state.session !== "listening") return;
            if (viewIndex >= n - 1) return;
            skipQuestion(questions[viewIndex]);
          }}
          onChatClick={() => setChatOpen(true)}
          micGranted={micGranted}
        />
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}

      <VoiceChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {explainOpen && activeQ && explainOverlayData && (
        <VoiceExplainOverlay
          footnote={{
            title:     explainOverlayData.title,
            keyPoints: explainOverlayData.keyPoints,
            stats:     explainOverlayData.stats,
          }}
          questionCategory={activeQ.category}
          questionText={activeQ.text}
          analyserNode={analyserNode}
          micAnalyserNode={micAnalyserNode}
          onClose={closeExplainOverlay}
          onFollowUp={closeExplainOverlay}
        />
      )}

      {modalOpen && modalQ && (
        <VoiceQuestionModal
          key={modalQ.id}
          question={{
            number:           modalQIndex + 1,
            total:            n,
            text:             modalQ.text,
            options:          modalQ.options ?? [],
            questionType:     modalQ.questionType,
            minValue:         modalQ.minValue,
            maxValue:         modalQ.maxValue,
            inputPlaceholder: modalQ.inputPlaceholder,
          }}
          preSelectedValue={
            pendingVoiceAnswer?.questionId === modalQ.id
              ? pendingVoiceAnswer.value
              : savedAnswers[modalQ.id] ?? undefined
          }
          onClose={() => {
            suppressAutoModalRef.current = true;
            setModalOpen(false);
            clearPendingVoiceAnswer();
          }}
          onNext={async value => {
            setModalOpen(false);
            clearPendingVoiceAnswer();
            if (modalQ) await onAnswerConfirmed(modalQ, value);
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

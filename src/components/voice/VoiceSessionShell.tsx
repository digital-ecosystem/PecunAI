"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, User, Mic, VolumeX, Hand } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import VoiceCarousel, { CarouselQuestion } from "./VoiceCarousel";
import VoiceQuestionModal from "./VoiceQuestionModal";
import VoiceExplainOverlay from "./VoiceExplainOverlay";
import VoiceChatModal from "./VoiceChatModal";
import ControlBar from "./ControlBar";
import VoiceProductPhase from "./VoiceProductPhase";
import VoiceTermsPhase from "./VoiceTermsPhase";
import { useVoiceSession, SessionState } from "@/hooks/useVoiceSession";

// ── Phase slide variants ──────────────────────────────────────────

const phaseSlideVariants = {
  enter: (dir: "forward" | "backward") => ({
    x: dir === "forward" ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (dir: "forward" | "backward") => ({
    x: dir === "forward" ? "-100%" : "100%",
  }),
};

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
  initialTermsPhase?:   'terms2' | 'skip' | null;
}

// ── Component ─────────────────────────────────────────────────────

export default function VoiceSessionShell({
  sessionId,
  questions,
  initialQuestionIndex,
  initialTermsPhase,
}: VoiceSessionShellProps) {
  const router = useRouter();

  const { state, started, analyserNode, micAnalyserNode, micGranted, isAISpeaking, bargeInActive, voiceAnswerCount, startSession, toggleMute, onAnswerConfirmed, clearPendingVoiceAnswer, onPrev, skipQuestion, stopAudio, activeCardId, pendingVoiceAnswer, savedAnswers, explainOverlayData, explainTriggerClose, requestExplanation, closeExplainOverlay, chatMessages, isChatAITyping, notifyChatOpen, sendChatMessage, voicePhase, termsSubStep, productSuggestion, confirmProduct, revisitQuestions, moveToTerms1, confirmTerms1, confirmTerms2, confirmSustainabilityTerms } =
    useVoiceSession({ sessionId, questions, initialQuestionIndex, initialTermsPhase });

  // Track phase transition direction for the slide animation.
  // Updated synchronously during render so the direction is correct before motion reads it.
  const prevPhaseRef   = useRef(voicePhase);
  const slideDirection = useRef<"forward" | "backward">("forward");
  if ((voicePhase === 1 || voicePhase === 2) && voicePhase !== prevPhaseRef.current) {
    slideDirection.current = voicePhase > prevPhaseRef.current ? "forward" : "backward";
    prevPhaseRef.current   = voicePhase;
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);

  // Derived from hook state — overlay is open whenever the AI has set explain data
  const explainOpen = explainOverlayData !== null;

  // Set when the customer manually closes the modal — prevents it from immediately re-opening.
  // suppressAutoModalRef: set when user manually closes the modal; cleared on next card change.
  const suppressAutoModalRef = useRef(false);
  // hasSpokenForCardRef: true once the AI has started speaking since the active card changed.
  // Prevents the modal from opening immediately on skip/prev/phase-start before the AI speaks.
  const hasSpokenForCardRef = useRef(false);

  useEffect(() => {
    suppressAutoModalRef.current = false;
    hasSpokenForCardRef.current  = false;
    setModalOpen(false);
  }, [activeCardId]);

  // Close the modal whenever the voice path saves an answer successfully.
  // The voice path normally closes the modal by calling setCard() (which changes activeCardId
  // and triggers the effect above). But some paths don't advance the card — the KB overlay blocker
  // (Q12/13/14 = "none") opens the explain overlay without a card change, and the Q3/Q4/Q7
  // session-ending blockers redirect without a card change. Without this effect those paths
  // leave the modal sitting open under the overlay or during the AI goodbye.
  useEffect(() => {
    if (voiceAnswerCount === 0) return; // skip initial render
    setModalOpen(false);
    suppressAutoModalRef.current = true; // prevent auto-modal re-opening on the same card
  }, [voiceAnswerCount]);

  // Reset state when entering the questions phase.
  // Root cause: effects run unconditionally (before the early return that shows VoiceTermsPhase),
  // so the auto-modal effect fires during phase 0 while the modal is invisible. When voicePhase
  // becomes 1 the early return disappears and the modal is immediately visible with stale true state.
  // Fix: clear both the flag and any stale modalOpen state when entering phase 1.
  useEffect(() => {
    if (voicePhase === 1) {
      hasSpokenForCardRef.current = false;
      setModalOpen(false);
    }
  }, [voicePhase]);

  // Track when AI starts speaking so we know it has asked the current question.
  useEffect(() => {
    if (isAISpeaking) hasSpokenForCardRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAISpeaking]);

  // Auto-open the modal for choice questions — but only after the AI has spoken AND finished.
  // This prevents immediate open on skip/prev navigation or phase start, where state is
  // already "listening" before the AI has asked the new question.
  // voicePhase guard: effects run before the early-return that hides the modal during phase 0,
  // so without this guard the effect fires during terms and leaves modalOpen=true as hidden state.
  useEffect(() => {
    if (voicePhase !== 1) return;                              // only auto-open during questions phase
    if (termsSubStep === 'sustainabilityTerms') return;        // sustainability overlay is showing
    if (bargeInActive) return;                                 // barge-in in flight — wrong card's modal would open
    if (!hasSpokenForCardRef.current) return;                  // AI hasn't spoken for this card yet
    if (isAISpeaking) return;                                  // AI still playing audio
    if (state.session !== "listening") return;
    if (!activeQ?.options?.length) return;
    if (modalOpen) return;
    if (suppressAutoModalRef.current) return;
    if (chatOpen) return;
    if (explainOpen) return;
    if (!started) return;
    setModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardId, isAISpeaking, state.session, voicePhase, termsSubStep, bargeInActive]);

  useEffect(() => {
    notifyChatOpen(chatOpen);
    if (!chatOpen) {
      // Allow the auto-modal to re-open once the AI speaks the question again.
      // Without this reset, a user who closed the modal before opening chat would
      // see suppressAutoModalRef=true on return and never get the modal back.
      suppressAutoModalRef.current = false;
    }
  }, [chatOpen, notifyChatOpen]);

  // Phase 0 auto-advance: when AI finishes the intro speech, transition to terms1 screen
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    if (prevSpeakingRef.current && !isAISpeaking && voicePhase === 0 && termsSubStep === 'intro') {
      moveToTerms1();
    }
    prevSpeakingRef.current = isAISpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAISpeaking]);

  // Mic-denied: auto-open the modal when the AI finishes speaking so the customer
  // doesn't have to manually find and tap the carousel card.
  // suppressAutoModalRef prevents re-opening after a manual close until the question changes.
  useEffect(() => {
    if (micGranted === false && state.session === "listening" && !modalOpen && !suppressAutoModalRef.current && !chatOpen && !explainOpen) {
      setModalOpen(true);
    }
  }, [micGranted, state.session, modalOpen, explainOpen]);

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

  // ── Tap-to-start overlay — shared across all three phase branches ─
  const tapOverlay = !started ? (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex flex-col items-center gap-5 w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        {/* Pulsing mic orb */}
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{ width: 88, height: 88, background: "rgba(59,130,246,0.1)", border: "1.5px solid rgba(59,130,246,0.2)" }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mic size={36} style={{ color: "rgba(59,130,246,0.8)" }} strokeWidth={1.5} />
        </motion.div>

        {/* Title */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background:           "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
            }}
          >
            PecunAI Beratung
          </h1>
          <p className="text-sm" style={{ color: "rgba(100,116,139,0.85)" }}>
            Ihre persönliche KI-Finanzberatung
          </p>
        </div>

        {/* Instruction cards */}
        {([
          {
            icon: <Mic size={17} style={{ color: "rgba(59,130,246,0.85)" }} />,
            title: "Sprachbasierte Beratung",
            desc:  "PecunAI führt Sie per Stimme durch die gesamte Beratung.",
          },
          {
            icon: <VolumeX size={17} style={{ color: "rgba(59,130,246,0.85)" }} />,
            title: "Ruhige Umgebung empfohlen",
            desc:  "Bitte sorgen Sie für eine Umgebung ohne Hintergrundgeräusche.",
          },
          {
            icon: <Hand size={17} style={{ color: "rgba(59,130,246,0.85)" }} />,
            title: "Tippen als Alternative",
            desc:  "Alle Antworten können auch durch Antippen gegeben werden.",
          },
        ] as const).map((item, i) => (
          <motion.div
            key={i}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background:     "rgba(255,255,255,0.75)",
              backdropFilter: "blur(10px)",
              border:         "1px solid rgba(59,130,246,0.1)",
              boxShadow:      "0 2px 8px rgba(59,130,246,0.06)",
            }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.4 }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 34, height: 34, background: "rgba(59,130,246,0.08)" }}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "rgba(15,23,42,0.85)" }}>
                {item.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(100,116,139,0.75)" }}>
                {item.desc}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Start button */}
        <motion.button
          className="w-full rounded-2xl text-white font-semibold text-base"
          style={{
            height:     54,
            background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            boxShadow:  "0 4px 20px rgba(59,130,246,0.38)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          onClick={startSession}
        >
          Beratung starten
        </motion.button>
      </motion.div>
    </motion.div>
  ) : null;

  // ── Phase 0 — intro: orb + status, no carousel or control bar ───
  if (voicePhase === 0 && termsSubStep === 'intro') {
    return (
      <>
        <div
          className="min-h-screen flex flex-col relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)",
          }}
        >
          {/* Header */}
          <div className="w-full px-6 py-5 relative z-10">
            <div className="flex items-center justify-center">
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
            </div>
          </div>

          {/* Orb */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
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
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <VoiceSphere
                isActive={started}
                isSpeaking={isSpeaking}
                isListening={false}
                size={380}
                analyserNode={isMuted ? null : analyserNode}
                micAnalyserNode={null}
              />
            </motion.div>
            <div className="relative z-30 mt-4 flex flex-col items-center gap-1">
              <motion.p
                className="text-sm font-medium"
                style={{ color: "rgba(59,130,246,0.7)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {STATUS_LABEL[state.session]}
              </motion.p>
            </div>
          </div>
        </div>

        {tapOverlay}
      </>
    );
  }

  // ── Phase 0 — terms: document + confirm button ────────────────────
  if (voicePhase === 0 && (termsSubStep === 'terms1' || termsSubStep === 'terms2')) {
    return (
      <>
        <VoiceTermsPhase
          key={termsSubStep}
          which={termsSubStep}
          isSpeaking={isSpeaking}
          onConfirm={termsSubStep === 'terms1'
            ? () => { stopAudio(); return confirmTerms1(); }
            : () => { stopAudio(); return confirmTerms2(); }}
        />
        {!started && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center cursor-pointer"
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

  return (
    <>
      {/* ── Phase 1 / 2 slide container ───────────────────────────── */}
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
        <AnimatePresence initial={false} custom={slideDirection.current} mode="sync">
          {voicePhase === 2 && productSuggestion ? (
            <motion.div
              key="phase-2"
              custom={slideDirection.current}
              variants={phaseSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, minHeight: "100vh", willChange: "transform" }}
            >
              <VoiceProductPhase
                product={productSuggestion}
                isSpeaking={isSpeaking}
                isListening={isListening}
                isMuted={isMuted}
                sessionState={state.session}
                onMuteToggle={toggleMute}
                onChatClick={() => setChatOpen(true)}
                onConfirm={confirmProduct}
                onRevisit={revisitQuestions}
              />
            </motion.div>
          ) : (
            <motion.div
              key="phase-1"
              custom={slideDirection.current}
              variants={phaseSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, minHeight: "100vh", willChange: "transform" }}
            >
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
              isActive={(explainOpen || chatOpen) ? false : started}
              isSpeaking={(explainOpen || chatOpen) ? false : isSpeaking}
              isListening={(explainOpen || chatOpen) ? false : (isListening && !isMuted)}
              size={380}
              analyserNode={(explainOpen || chatOpen) ? null : (isMuted ? null : analyserNode)}
              micAnalyserNode={(explainOpen || chatOpen) ? null : micAnalyserNode}
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
                if (viewIndex >= n - 1) return;
                stopAudio();
                skipQuestion(questions[viewIndex]);
              }}
              onPrev={() => {
                if (viewIndex === 0) return;
                stopAudio();
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
            if (viewIndex === 0) return;
            stopAudio();
            onPrev();
          }}
          onNext={() => {
            if (viewIndex >= n - 1) return;
            stopAudio();
            skipQuestion(questions[viewIndex]);
          }}
          onChatClick={() => setChatOpen(true)}
          micGranted={micGranted}
        />
      </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Overlays (fixed-position, outside the slide container) ── */}

      {termsSubStep === 'sustainabilityTerms' && (
        <VoiceTermsPhase
          which="sustainabilityTerms"
          isSpeaking={isSpeaking}
          onConfirm={() => { stopAudio(); return confirmSustainabilityTerms(); }}
        />
      )}

      <VoiceChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        isAITyping={isChatAITyping}
      />

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
          isAISpeaking={isAISpeaking}
          triggerClose={explainTriggerClose}
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
            questionOrder:    modalQ.questionOrder,
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
            suppressAutoModalRef.current = true;
            stopAudio();
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

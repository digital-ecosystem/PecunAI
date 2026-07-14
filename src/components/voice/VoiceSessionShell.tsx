"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, User, Mic, VolumeX, Hand, Check, ChevronRight } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import VoiceCarousel, { CarouselQuestion } from "./VoiceCarousel";
import { ExpandedQuestionCard, computeExpandedRect } from "./ExpandedQuestionCard";
import { PhaseOneNeuralModel } from "./PhaseOneNeuralModel";
import type { FrameRect } from "./frameMath";
import VoiceExplainOverlay from "./VoiceExplainOverlay";
import VoiceChatModal from "./VoiceChatModal";
import ControlBar from "./ControlBar";
import VoiceProductPhase from "./VoiceProductPhase";
import VoiceTermsPhase from "./VoiceTermsPhase";
import VoicePersonalInfoForm from "./VoicePersonalInfoForm";
import VoiceInvestmentForm from "./VoiceInvestmentForm";
import VoiceContractDocuments from "./VoiceContractDocuments";
import VoiceSessionReview from "./VoiceSessionReview";
import VoiceSigningPhase from "./VoiceSigningPhase";
import VoiceMicAccessModal from "./VoiceMicAccessModal";
import VoiceRecordingDisclaimerModal from "./VoiceRecordingDisclaimerModal";
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
  initialTermsPhase?:   'terms2' | 'skip' | 'sustainabilityTerms' | null;
  termsVectorId?:       string | null;
  initialAnsweredIds?:  string[];
  initialSkippedIds?:   string[];
  initialSavedAnswers?: Record<string, string>;
  initialVoicePhase?:   0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  initialIsRevisiting?: boolean;
}

// ── Revisit chevron navigation ──────────────────────────────────────
// Sub-questions (12.1/13.1/14.1 — "how many transactions") only ever apply if the parent
// question's answer was "good" ("Habe ich genutzt"). Revisit browsing walks the flat question
// list positionally, so without this it shows those cards even when the parent's answer makes
// them irrelevant. See private-documents/after-demo/PHASE_1_REVISIT_FIX_PLAN.md.
function isSubQuestionRelevant(
  q:            CarouselQuestion,
  questions:    CarouselQuestion[],
  savedAnswers: Record<string, string>,
): boolean {
  if (q.questionOrder === undefined || q.questionOrder % 1 === 0) return true; // not a sub-question
  const parent = questions.find(p => p.questionOrder === Math.floor(q.questionOrder!));
  return !parent || savedAnswers[parent.id] === "good";
}

function findRevisitStep(
  questions:    CarouselQuestion[],
  savedAnswers: Record<string, string>,
  fromIndex:    number,
  step:         1 | -1,
): number {
  let idx = fromIndex + step;
  while (idx >= 0 && idx < questions.length) {
    if (isSubQuestionRelevant(questions[idx], questions, savedAnswers)) return idx;
    idx += step;
  }
  return -1;
}

// ── Component ─────────────────────────────────────────────────────

export default function VoiceSessionShell({
  sessionId,
  questions,
  initialQuestionIndex,
  initialTermsPhase,
  termsVectorId,
  initialAnsweredIds,
  initialSkippedIds,
  initialSavedAnswers,
  initialVoicePhase,
  initialIsRevisiting,
}: VoiceSessionShellProps) {
  const router = useRouter();

  const { state, started, analyserNode, micAnalyserNode, micDenied, retryMicAccess, recordingDisclaimerConfirmed, confirmRecordingDisclaimer, isAISpeaking, bargeInActive, voiceAnswerCount, startSession, toggleMute, onAnswerConfirmed, clearPendingVoiceAnswer, onPrev, skipQuestion, stopAudio, startPTT, activeCardId, pendingVoiceAnswer, savedAnswers, explainOverlayData, explainTriggerClose, requestExplanation, closeExplainOverlay, chatMessages, phase6ChatMessages, isChatAITyping, notifyChatOpen, sendChatMessage, sendPhase6ChatMessage, submitPTTQuestion, submitPhase1Answer, voicePhase, termsSubStep, productSuggestion, advanceToPersonalInfo, isTransitioningToPersonalInfo, onPersonalInfoSubmitted, primeReconnectAudio, confirmInvestment, confirmContracts, confirmReadyToSign, isRevisiting, scrollCarousel, revisitQuestions, advancePhase, moveToTerms1, confirmTerms1, confirmTerms2, confirmSustainabilityTerms, fastMode, toggleFastMode, postExplainReaskId, clearPostExplainReask } =
    useVoiceSession({
      sessionId,
      questions,
      initialQuestionIndex,
      initialTermsPhase,
      termsVectorId:       termsVectorId ?? null,
      initialAnsweredIds:  initialAnsweredIds  ?? [],
      initialSkippedIds:   initialSkippedIds   ?? [],
      initialSavedAnswers: initialSavedAnswers ?? {},
      initialVoicePhase,
      initialIsRevisiting,
    });

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

  // ── Phase 1 question-card morph (orb ⇄ neural cardFrame) ──────────────
  // modalOpen (above) still owns "should the answer UI be showing" — untouched,
  // still flipped by the exact same onClose/onNext handlers as before.
  //
  // Round 3 (see PHASE_1_QUESTION_CARD_MORPH_PLAN.md): a single persistent
  // PhaseOneNeuralModel canvas stays mounted for the whole of Phase 1, and its
  // shape/frameRect are derived directly from modalOpen every render — no
  // separate transition-direction state machine, no reveal timers, nothing
  // that can get stuck. orbOrigin/expandedRect only depend on viewport size,
  // not on when a card opens, so they're measured once (mount + resize), not
  // re-measured per expand/collapse.
  const [orbOrigin, setOrbOrigin] = useState<{ x: number; y: number } | null>(null);
  const [expandedRect, setExpandedRect] = useState<FrameRect | null>(null);
  const orbWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const rect = orbWrapperRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        setOrbOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      setExpandedRect(computeExpandedRect(window.innerWidth, window.innerHeight));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Drives the Phase 1 sphere's listening visualization — see the sphere wiring below for why
  // this can't just reuse the generic `isListening` (state.session === "listening") once Phase
  // 1 is PTT-only. See private-documents/after-demo/PHASE_1_PTT_PLAN.md.
  const [isPhase1PTTActive, setIsPhase1PTTActive] = useState(false);

  // Derived from hook state — overlay is open whenever the AI has set explain data
  const explainOpen = explainOverlayData !== null;

  // Set when the customer manually closes the modal — prevents it from immediately re-opening.
  // suppressAutoModalRef: set when user manually closes the modal; cleared on next card change.
  const suppressAutoModalRef = useRef(false);
  // hasSpokenForCardRef: true once the AI has started speaking since the active card changed.
  // Prevents the modal from opening immediately on skip/prev/phase-start before the AI speaks.
  const hasSpokenForCardRef = useRef(false);

  // Close the modal whenever the voice path saves an answer successfully.
  // The voice path normally closes the modal by calling setCard() (which changes activeCardId
  // and triggers the effect below). But some paths don't advance the card — the KB overlay blocker
  // (Q12/13/14 = "none") opens the explain overlay without a card change, and the Q3/Q4/Q7
  // session-ending blockers redirect without a card change. Without this effect those paths
  // leave the modal sitting open under the overlay or during the AI goodbye.
  // ORDERING: this effect must be declared BEFORE the activeCardId effect so that when both
  // fire in the same render (normal voice answer), activeCardId runs second and resets
  // suppressAutoModalRef back to false — allowing the auto-modal to open for the next question.
  useEffect(() => {
    if (voiceAnswerCount === 0) return; // skip initial render
    setModalOpen(false);
    suppressAutoModalRef.current = true; // prevent auto-modal re-opening on the same card
  }, [voiceAnswerCount]);

  useEffect(() => {
    suppressAutoModalRef.current = false;
    // If the AI is already speaking when the card changes, the previous response contained
    // audio + submit_answer in the same turn. isAISpeakingRef stays true through the card
    // transition so setIsAISpeaking(true) never re-fires for the new card's audio — meaning
    // the isAISpeaking effect below never sets hasSpokenForCardRef. Credit the in-progress
    // speech to the new card so the modal opens when that audio ends.
    // isAISpeaking is intentionally NOT in the dep array — this effect must only run on card
    // changes, not on every speaking toggle (that would reset suppressAutoModalRef mid-question).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    hasSpokenForCardRef.current  = isAISpeaking;
    setModalOpen(false);
  }, [activeCardId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isRevisiting) return;                                  // browsing to pick a question — modal opens only after AI navigates to one
    if (termsSubStep === 'sustainabilityTerms') return;        // sustainability overlay is showing
    if (bargeInActive) return;                                 // barge-in in flight — wrong card's modal would open
    // Fast Mode: the AI never speaks the question, so hasSpokenForCardRef/isAISpeaking would
    // never satisfy the normal gates below — bypass them and open as soon as the card is active.
    // See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
    if (!fastMode) {
      if (!hasSpokenForCardRef.current) return;                // AI hasn't spoken for this card yet
      if (isAISpeaking) return;                                // AI still playing audio
    }
    if (state.session !== "listening") return;
    // Outside Fast Mode, only choice questions auto-open (number/text questions rely on the AI's
    // spoken cue to prompt the customer to tap or hold the mic). Fast Mode has no spoken cue at
    // all for any question type, so every type needs to auto-open there. See
    // private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
    if (!activeQ) return;
    if (!fastMode && !activeQ.options?.length) return;
    if (modalOpen) return;
    if (suppressAutoModalRef.current) return;
    if (chatOpen) return;
    if (explainOpen) return;
    if (!started) return;
    setModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardId, isAISpeaking, state.session, voicePhase, termsSubStep, bargeInActive, isRevisiting, fastMode]);

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

  // ── Tap-to-resume overlay — Phase 4/5/6 only ───────────────────────
  // These three phases need an active WebSocket (unlike the silent Phase 3/7), but on a cold
  // resume (browser refresh) `started` is false and nothing else in this component sets it —
  // AudioContext/mic can't be created without a user gesture, so a tap is required here too.
  // See private-documents/voice-resume-fix/VOICE_RESUME_FIX_PLAN.md. Reuses startSession()
  // as-is (it's phase-agnostic) — once `started` flips true, the WS effect opens on its own.
  const resumeTapOverlay = !started ? (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center cursor-pointer"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
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
          style={{ width: 88, height: 88, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
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
            Willkommen zurück
          </motion.h1>
          <p className="text-sm" style={{ color: "rgba(59,130,246,0.6)" }}>
            Tippen um fortzufahren
          </p>
        </div>
      </motion.div>
    </motion.div>
  ) : null;

  // ── Recording disclaimer: blocks every phase, checked before mic access ──────────────
  // Shown once per session (persisted, same localStorage pattern as the sustainability
  // disclosure) before the customer can even reach the tap-to-start screen — must come before
  // the mic-access check below, since nothing about starting the session has happened yet at
  // this point. See private-documents/after-demo/RECORDING_DISCLAIMER_PLAN.md.
  if (!recordingDisclaimerConfirmed) {
    return <VoiceRecordingDisclaimerModal onConfirm={confirmRecordingDisclaimer} />;
  }

  // ── Mic access required: blocks every phase ─────────────────────────
  // Mic access is mandatory — every phase uses push-to-talk. Checked before any phase branch
  // below (including the Phase 3/7 silent screens) so a denial always takes over, whether it
  // came from a fresh tap-to-start, a cold-resume tap, or the live Phase 3→4 handoff's
  // reconnectVoice() (voicePhase already flips to 4 synchronously before that runs, so this
  // check must come first to intercept it). See
  // private-documents/after-demo/MIC_ACCESS_REQUIRED_PLAN.md.
  if (micDenied) {
    return <VoiceMicAccessModal onRetry={retryMicAccess} />;
  }

  // ── Phase 3 — Personal Info: silent, tap-only, no voice UI at all ───
  // Checked first and unconditionally on voicePhase, independent of `started` — this phase
  // never opens a WebSocket, so there is no tap-to-start gate to get past. Covers both the
  // live transition (advanceToPersonalInfo already disconnected voice before flipping the
  // phase) and a fresh page load resuming directly into Phase 3.
  if (voicePhase === 3) {
    return <VoicePersonalInfoForm sessionId={sessionId} onSubmitted={onPersonalInfoSubmitted} onPrimeAudio={primeReconnectAudio} />;
  }

  // ── Phase 7 — Signing: silent, tap-only, no voice UI at all — same treatment as Phase 3 ───
  // Checked unconditionally on voicePhase, independent of `started` — this phase never opens
  // a WebSocket either. Covers both the live transition (confirmReadyToSign already
  // disconnected voice before flipping the phase) and a fresh page load resuming into Phase 7.
  if (voicePhase === 7) {
    return <VoiceSigningPhase sessionId={sessionId} />;
  }

  // ── Phase 4 — Investment Form: AI-guided, mirrors Phase 2's voice-frame + PTT pattern ───
  // Guarded on productSuggestion being loaded — during the brief reconnect window right
  // after a live Phase 3→4 handoff (WS reopening, session.created/session.updated round trip),
  // voicePhase is already 4 but the AI hasn't re-greeted yet. Also covers a cold resume
  // (browser refresh) directly into Phase 4 — productSuggestion is populated by the REST
  // rehydrate effect in useVoiceSession.ts (mirrors Phase 2's), independent of `started`, so
  // this renders even before the tap-to-resume overlay below is dismissed. Fall through to the
  // orb screen for the narrow window before either path has productSuggestion ready yet.
  if (voicePhase === 4 && productSuggestion) {
    return (
      <>
        <VoiceInvestmentForm
          product={productSuggestion}
          questions={questions}
          answers={savedAnswers}
          isSpeaking={isSpeaking}
          sessionState={state.session}
          onPTTStart={startPTT}
          onPTTRelease={() => submitPTTQuestion('phase4')}
          onConfirm={() => { stopAudio(); return confirmInvestment(); }}
        />
        {resumeTapOverlay}
      </>
    );
  }

  // ── Phase 5 — Contract Document: AI-guided, mirrors Phase 4's voice-frame + PTT pattern ───
  // No productSuggestion-style readiness guard needed — Phase 4→5 has no reconnect/privacy-pause
  // gap to guard against, voice stays continuously connected the whole time during a live
  // handoff. `resumeTapOverlay` covers the cold-resume case (browser refresh) instead.
  if (voicePhase === 5) {
    return (
      <>
        <VoiceContractDocuments
          sessionId={sessionId}
          questions={questions}
          answers={savedAnswers}
          isSpeaking={isSpeaking}
          sessionState={state.session}
          onPTTStart={startPTT}
          onPTTRelease={() => submitPTTQuestion('phase5')}
          onConfirm={() => { stopAudio(); return confirmContracts(); }}
        />
        {resumeTapOverlay}
      </>
    );
  }

  // ── Phase 6 — Final Q&A: AI-guided, PTT-only open Q&A over the whole session, before
  // the Phase 6→7 privacy pause into Signing. No reconnect-window guard needed, same as
  // Phase 5 — Phase 5→6 keeps the connection alive throughout during a live handoff.
  // `resumeTapOverlay` covers the cold-resume case (browser refresh) instead.
  if (voicePhase === 6) {
    return (
      <>
        <VoiceSessionReview
          isSpeaking={isSpeaking}
          sessionState={state.session}
          analyserNode={analyserNode}
          micAnalyserNode={micAnalyserNode}
          onPTTStart={startPTT}
          onPTTRelease={() => submitPTTQuestion('phase6')}
          onConfirm={() => { stopAudio(); return confirmReadyToSign(); }}
          onChatClick={() => setChatOpen(true)}
          isChatOpen={chatOpen}
        />
        <VoiceChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={phase6ChatMessages}
          onSendMessage={sendPhase6ChatMessage}
          isAITyping={isChatAITyping}
        />
        {resumeTapOverlay}
      </>
    );
  }

  // ── Phase 0 intro, the Phase 2→3 privacy-pause transition, and the Phase 4 reconnect window ───
  // Reused as-is: same "just the voice bubble" screen the session opens with. Covers the
  // transition out of Phase 2 (until the privacy-pause line finishes and voicePhase flips to
  // 3), and the brief moment between voicePhase flipping to 4 and productSuggestion/the AI
  // re-greet actually being ready (see the voicePhase === 4 branch above).
  if ((voicePhase === 0 && termsSubStep === 'intro') || isTransitioningToPersonalInfo || voicePhase === 4) {
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

          {/* Skip intro — Phase 0 intro only, not the Phase 2→3 / Phase 4 reuses of this screen.
              Jumps straight to the Terms1 (4money) document instead of waiting for the AI to
              finish introducing PecunAI. See
              private-documents/after-demo/PHASE_0_INTRO_SKIP_PLAN.md. */}
          {voicePhase === 0 && termsSubStep === 'intro' && (
            <motion.button
              className="fixed top-5 right-5 z-20 flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                background:     "rgba(255,255,255,0.85)",
                backdropFilter: "blur(10px)",
                border:         "1.5px solid rgba(59,130,246,0.5)",
                color:          "rgba(37,99,235,0.9)",
                boxShadow:      "0 2px 8px rgba(59,130,246,0.06)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { stopAudio(); moveToTerms1(); }}
            >
              Überspringen
              <ChevronRight size={16} />
            </motion.button>
          )}

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
          onPTTStart={startPTT}
          onPTTRelease={submitPTTQuestion}
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
                onPTTStart={startPTT}
                onPTTRelease={() => submitPTTQuestion('phase2')}
                onConfirm={() => { stopAudio(); return advanceToPersonalInfo(); }}
                onRevisit={() => { stopAudio(); revisitQuestions(); }}
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

          {/* Orb placeholder — reserves the same layout space the orb always
              occupied and anchors sphereCenter for PhaseOneNeuralModel (rendered
              once, fixed-position, elsewhere below). The actual orb/cardFrame
              visual is drawn by that persistent canvas, not here — see Round 3
              in PHASE_1_QUESTION_CARD_MORPH_PLAN.md for why this no longer
              renders VoiceSphere directly for Phase 1. */}
          <div ref={orbWrapperRef} className="relative z-10" style={{ width: 380, height: 380 }} />

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
                // Carousel position stays put while a card is expanded — nothing
                // relies on the compact rect anymore, but rotating the carousel
                // underneath an open card would still look wrong.
                if (modalOpen) return;
                if (isRevisiting) {
                  const nextIdx = findRevisitStep(questions, savedAnswers, viewIndex, 1);
                  if (nextIdx === -1) return;
                  stopAudio();
                  scrollCarousel(questions[nextIdx].id);
                  return;
                }
                if (viewIndex >= n - 1) return;
                stopAudio();
                skipQuestion(questions[viewIndex]);
              }}
              onPrev={() => {
                if (modalOpen) return;
                if (isRevisiting) {
                  const prevIdx = findRevisitStep(questions, savedAnswers, viewIndex, -1);
                  if (prevIdx === -1) return;
                  stopAudio();
                  scrollCarousel(questions[prevIdx].id);
                  return;
                }
                if (viewIndex === 0) return;
                stopAudio();
                onPrev();
              }}
              onActiveCardExpand={() => setModalOpen(true)}
              onInfoClick={requestExplanation}
              expandedQuestionId={modalOpen ? modalQ?.id ?? null : null}
            />
          </motion.div>
        )}

        {/* ── Revisit: tap alternative to voice for "I'm done, back to Phase 2" ────── */}
        {isRevisiting && (
          <motion.div
            className="relative z-20 mb-6 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.button
              className="flex items-center gap-2 rounded-full px-6 py-3"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)",
                boxShadow:  "0 4px 16px rgba(59,130,246,0.3)",
              }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { if (modalOpen) return; stopAudio(); suppressAutoModalRef.current = true; advancePhase(); }}
            >
              <Check size={18} style={{ color: "white" }} />
              <span className="text-sm font-medium text-white">Fertig – Empfehlung ansehen</span>
            </motion.button>
          </motion.div>
        )}

        {/* ── Control Bar ──────────────────────────────────────────── */}
        <ControlBar
          onPTTStart={() => { startPTT(); setIsPhase1PTTActive(true); }}
          onPTTRelease={() => { submitPhase1Answer(); setIsPhase1PTTActive(false); }}
          isPTTActive={isPhase1PTTActive}
          onPrevious={() => {
            if (modalOpen) return;
            if (isRevisiting) {
              const prevIdx = findRevisitStep(questions, savedAnswers, viewIndex, -1);
              if (prevIdx === -1) return;
              stopAudio();
              scrollCarousel(questions[prevIdx].id);
              return;
            }
            if (viewIndex === 0) return;
            stopAudio();
            onPrev();
          }}
          onNext={() => {
            if (modalOpen) return;
            if (isRevisiting) {
              const nextIdx = findRevisitStep(questions, savedAnswers, viewIndex, 1);
              if (nextIdx === -1) return;
              stopAudio();
              scrollCarousel(questions[nextIdx].id);
              return;
            }
            if (viewIndex >= n - 1) return;
            stopAudio();
            skipQuestion(questions[viewIndex]);
          }}
          onChatClick={() => setChatOpen(true)}
          isFastMode={fastMode}
          onFastModeToggle={toggleFastMode}
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
          onPTTStart={startPTT}
          onPTTRelease={submitPTTQuestion}
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
          isAISpeaking={isAISpeaking}
          triggerClose={explainTriggerClose}
          onClose={() => { suppressAutoModalRef.current = false; closeExplainOverlay(); }}
          onFollowUp={() => { suppressAutoModalRef.current = false; closeExplainOverlay(); }}
        />
      )}

      {/* Persistent Phase 1 orb ⇄ cardFrame canvas — mounted once, never
          unmounted; shape/frameRect are derived straight from modalOpen every
          render. See PhaseOneNeuralModel.tsx and Round 3 in
          PHASE_1_QUESTION_CARD_MORPH_PLAN.md for why this replaced the earlier
          one-shot mount/unmount transition component. */}
      {voicePhase === 1 && orbOrigin && (
        <PhaseOneNeuralModel
          shape={modalOpen ? "cardFrame" : "orb"}
          frameRect={modalOpen ? expandedRect : null}
          sphereCenter={orbOrigin}
          sphereRadius={380 * 0.3}
          isSpeaking={isSpeaking}
          isListening={isPhase1PTTActive}
          containerWidth={typeof window !== "undefined" ? window.innerWidth : 0}
          containerHeight={typeof window !== "undefined" ? window.innerHeight : 0}
        />
      )}

      <AnimatePresence>
        {modalOpen && expandedRect && modalQ && (
          <ExpandedQuestionCard
            key={modalQ.id}
            rect={expandedRect}
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
            contextMessage={
              postExplainReaskId === modalQ.id
                ? "Sie haben die Erklärung gesehen — beantworten Sie nun bitte die Frage."
                : undefined
            }
            onClose={() => {
              suppressAutoModalRef.current = true;
              setModalOpen(false);
              clearPendingVoiceAnswer();
              clearPostExplainReask();
            }}
            onNext={async (value: string) => {
              suppressAutoModalRef.current = true;
              stopAudio();
              setModalOpen(false);
              clearPendingVoiceAnswer();
              clearPostExplainReask();
              if (modalQ) await onAnswerConfirmed(modalQ, value);
            }}
          />
        )}
      </AnimatePresence>

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

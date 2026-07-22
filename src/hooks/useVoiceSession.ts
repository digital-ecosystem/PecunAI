"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import { SessionState, Action, VoiceSessionState, ProductData, ExplainOverlayStat, ExplainOverlayData, ChatMessage } from "./voice/types";
import { makeInitial, reducer } from "./voice/reducer";
import { base64ToPCM16AudioBuffer, SAMPLE_RATE } from "./voice/audio";
import { handleFunctionCall as _handleFunctionCall } from "./voice/handleFunctionCall";
import { handleWsMessage } from "./voice/wsMessageHandler";
import { handleAnswerConfirmed as _handleAnswerConfirmed } from "./voice/handleAnswerConfirmed";
import { handlePrev, handleSkipQuestion, handleRequestExplanation, handleCloseExplainOverlay, handleScrollCarousel, handleRevisitQuestions } from "./voice/handleNavigation";
import { handleMoveToTerms1, handleConfirmTerms1, handleConfirmTerms2, handleConfirmSustainabilityTerms } from "./voice/handleTerms";
import { handleNotifyChatOpen } from "./voice/handleChat";
import { PRIVACY_PAUSE_PERSONAL_INFO_INSTRUCTIONS, PRIVACY_PAUSE_SIGNING_INSTRUCTIONS, FINAL_QA_INTRO_INSTRUCTIONS, CONTRACT_DOCUMENT_INTRO_INSTRUCTIONS, ADVISOR_PERSONA, GERMAN_SPEECH_DIRECTIVE } from "./voice/prompts";
import type { VoiceContext } from "./voice/voiceContext";

// re-export types consumed by VoiceSessionShell and other components
export type { SessionState, VoiceSessionState, ProductData, ExplainOverlayStat, ExplainOverlayData, ChatMessage };

// ── Hook ──────────────────────────────────────────────────────────

interface UseVoiceSessionOptions {
  sessionId:            string;
  questions:            CarouselQuestion[];
  initialQuestionIndex: number;
  initialTermsPhase?:   'terms2' | 'skip' | 'sustainabilityTerms' | null;
  termsVectorId:        string | null;
  initialAnsweredIds?:  string[];
  initialSkippedIds?:   string[];
  initialSavedAnswers?: Record<string, string>;
  initialVoicePhase?:   0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  initialIsRevisiting?: boolean;
}

export function useVoiceSession({
  sessionId,
  questions,
  initialQuestionIndex,
  initialTermsPhase,
  termsVectorId,
  initialAnsweredIds  = [],
  initialSkippedIds   = [],
  initialSavedAnswers = {},
  initialVoicePhase,
  initialIsRevisiting = false,
}: UseVoiceSessionOptions) {
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, makeInitial(initialQuestionIndex));
  const [started, setStarted] = useState(false);
  // True once the customer has acknowledged the recording/transcript disclaimer this session —
  // persisted to localStorage (mirrors sustainabilityConfirmedRef below) so it never shows twice
  // for the same session, even across a refresh. Gates every phase via VoiceSessionShell's
  // top-level check, before the tap-to-start screen. See
  // private-documents/after-demo/RECORDING_DISCLAIMER_PLAN.md.
  const [recordingDisclaimerConfirmed, setRecordingDisclaimerConfirmed] = useState(false);
  // Bumped to force the WS lifecycle effect to open a fresh connection — used when
  // re-entering voice after a silent phase (3, 7). See disconnectVoice/reconnectVoice.
  const [voiceConnectionEpoch, setVoiceConnectionEpoch] = useState(0);

  // Exposed to UI components for waveform / sphere visualization
  const [analyserNode,    setAnalyserNode]    = useState<AnalyserNode | null>(null);
  const [micAnalyserNode, setMicAnalyserNode] = useState<AnalyserNode | null>(null);
  // True whenever a mic request (startSession/reconnectVoice) just failed — mic access is
  // mandatory, so this blocks the session via VoiceMicAccessModal until it succeeds. See
  // private-documents/after-demo/MIC_ACCESS_REQUIRED_PLAN.md.
  const [micDenied,       setMicDenied]        = useState(false);
  const [isAISpeaking,    setIsAISpeaking]    = useState(false);
  const isAISpeakingRef = useRef(false);
  const [bargeInActive,   setBargeInActive]   = useState(false);
  const bargeInActiveRef = useRef(false);
  // Increments each time the voice path successfully saves an answer — lets the shell close
  // the modal immediately without waiting for a card change (e.g. KB blocker, Q3/Q4/Q7 blockers).
  const [voiceAnswerCount, setVoiceAnswerCount] = useState(0);

  // Phase 0 / 1 / 2 — 0 = terms/intro, 1 = questions, 2 = product suggestion
  const startPhase: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = initialVoicePhase ?? (initialTermsPhase === 'skip' ? 1 : 0);
  const [voicePhase,        setVoicePhase]        = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(startPhase);
  const voicePhaseRef                             = useRef<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(startPhase);
  const [productSuggestion, setProductSuggestion] = useState<ProductData | null>(null);
  // True from the moment the customer confirms the product until the privacy-pause
  // announcement finishes and voicePhase actually flips to 3 — shows the plain orb screen
  // (same as session start) instead of leaving the Phase 2 product screen up mid-speech.
  const [isTransitioningToPersonalInfo, setIsTransitioningToPersonalInfo] = useState(false);
  // Same idea, for the Phase 6→7 privacy pause (Signing) — shows the plain orb screen from
  // the moment the customer is ready to sign until the pause announcement finishes.
  const [isTransitioningToSigning, setIsTransitioningToSigning] = useState(false);

  // Phase 0 sub-step: which screen within the intro/terms gate
  const [termsSubStep, setTermsSubStep] = useState<'intro' | 'terms1' | 'terms2' | 'sustainabilityTerms' | null>(
    initialTermsPhase === 'sustainabilityTerms' ? 'sustainabilityTerms' :
    initialTermsPhase === 'skip'               ? null    :
    initialTermsPhase === 'terms2'             ? 'terms2': 'intro'
  );
  const termsSubStepRef = useRef<'intro' | 'terms1' | 'terms2' | 'sustainabilityTerms' | null>(
    initialTermsPhase === 'sustainabilityTerms' ? 'sustainabilityTerms' :
    initialTermsPhase === 'skip'               ? null    :
    initialTermsPhase === 'terms2'             ? 'terms2': 'intro'
  );

  // Explain overlay — set by explain_topic tool call, cleared on close_explanation or manual close
  const [explainOverlayData,   setExplainOverlayData]   = useState<ExplainOverlayData | null>(null);
  // Tells the overlay to start its closing animation (voice-triggered close path)
  const [explainTriggerClose, setExplainTriggerClose] = useState(false);

  // Chat log — mirrors all questions and answers for the chat modal
  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
  // Phase 6's own isolated chat — never shares data with chatMessages above. See
  // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
  const [phase6ChatMessages, setPhase6ChatMessages] = useState<ChatMessage[]>([]);
  const [isChatAITyping, setIsChatAITyping] = useState(false);

  // Pending voice answer — set by highlight_answer, cleared on submit or rejection
  const [pendingVoiceAnswer, setPendingVoiceAnswer] = useState<{
    questionId: string;
    value:      string;
    label:      string;
  } | null>(null);

  // All confirmed answers in this session — keyed by questionId.
  // Used to pre-populate the modal when user taps a card for an already-answered question.
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>(initialSavedAnswers);
  const savedAnswersRef = useRef<Record<string, string>>(initialSavedAnswers);

  // Dedicated state for the carousel card position — ONLY updated when we know exactly
  // what question the AI will talk about next. Decoupled from the state machine index.
  const [activeCardId, setActiveCardId] = useState<string | null>(
    questions[initialQuestionIndex]?.id ?? null
  );
  // Ref mirror of activeCardId — readable inside stable callbacks without stale closure.
  const activeCardIdRef = useRef<string | null>(questions[initialQuestionIndex]?.id ?? null);

  // Stable ref for the initial question index — set once on mount.
  // Used in session.created so the resume index is always reliable regardless of state timing.
  const initialIndexRef  = useRef(initialQuestionIndex);
  // Guards against duplicate mic setup / response.create when session.update is re-sent mid-session (e.g. on skip).
  const sessionConfiguredRef = useRef(false);
  // Tracks answered question IDs in the current session — injected into each AI response so it never loses track.
  const answeredIdsRef   = useRef<Set<string>>(new Set(initialAnsweredIds));
  // Tracks explicitly skipped question IDs — cleared when the question is later answered.
  const skippedIdsRef    = useRef<Set<string>>(new Set(initialSkippedIds));
  // Tracks question IDs that were explained via explain_topic — used to instruct AI to re-ask with context after returning.
  const explainedQuestionsRef = useRef<Set<string>>(new Set());
  // One skip at a time — locked until the AI finishes speaking and returns to "listening".
  const skipInProgressRef = useRef(false);
  // Tracks whether the circle-back transition has already been announced this session.
  const circleBackActiveRef = useRef(false);
  // True once the customer has confirmed the sustainability disclosure — prevents the modal from
  // showing more than once per session (e.g. if Q2 is skipped and later circles back).
  // TODO: persist in DB instead of localStorage when the session-state API supports it (Sprint 4).
  const sustainabilityConfirmedRef = useRef(false);
  // Session language — German by default; the customer can switch to English via the
  // language-choice modal shown after the recording disclaimer (see
  // private-documents/LANGUAGE_SELECT_MODAL_PLAN.md). Persisted per session so a
  // refresh-resume rebuilds the system prompt in the chosen language without re-asking.
  const langRef = useRef<"de" | "en">("de");
  const [languageSelected, setLanguageSelected] = useState(false);
  // Same guard for button-initiated prev — prevents AI from calling navigate("prev") a second time.
  const prevInProgressRef = useRef(false);
  // Debounces revisit chevron browsing — only the question the customer settles on triggers
  // an AI prompt, not every intermediate card passed through. See
  // private-documents/after-demo/PHASE_1_REVISIT_FIX_PLAN.md.
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which Q12/13/14 IDs have already been given the one-time detailed explanation for a
  // "Kenne ich nicht" answer — lets the two-strike algorithm tell a first "none" apart from a
  // second one. See private-documents/after-demo/ASSET_KNOWLEDGE_EXPLAIN_PLAN.md.
  const assetKnowledgeShownRef = useRef<Set<string>>(new Set());
  // True when the customer has toggled Fast Mode on for Phase 1 — the AI stops auto-narrating
  // questions (still available on demand via PTT/info icon). Not persisted — always resets to
  // off, matching the default. See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
  const fastModeRef = useRef(false);
  const [fastMode, setFastMode] = useState(false);
  // Set when an explain overlay closes in Fast Mode and the same question needs a silent re-ask
  // — holds that question's id so VoiceSessionShell can show an in-modal hint instead of the AI
  // speaking. Cleared once the customer leaves that modal (answers or closes it). See
  // private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
  const [postExplainReaskId, setPostExplainReaskId] = useState<string | null>(null);
  // True while customer is in Phase 1 revisit mode — suppresses auto-advance on submit_answer so
  // the user can change multiple answers freely before confirm_product() triggers advancePhase().
  const isRevisitingRef                            = useRef(initialIsRevisiting);
  const [isRevisiting, setIsRevisiting_internal]   = useState(initialIsRevisiting);

  // Internal refs — stable across renders
  const wsRef              = useRef<WebSocket | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const gainRef            = useRef<GainNode | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef    = useRef<number>(0);
  const audioEndTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCall             = useRef<{ callId: string; name: string; args: string } | null>(null);
  const aiTextBufferRef         = useRef<string>("");   // text-mode (chat open): response.output_text.* events
  const aiAudioTranscriptRef    = useRef<string>("");   // voice-mode: response.output_audio_transcript.* events
  const lastAITranscriptRef     = useRef<string>("");   // captures final transcript of current response for cost monitoring
  const pendingVoiceTranscriptRef = useRef<string | null>(null); // verbatim transcript of last user speech turn
  const currentSpeechItemIdRef    = useRef<string | null>(null); // item_id of the current user speech turn
  const applyPendingTranscriptRef = useRef<((transcript: string) => void) | null>(null); // retroactive chat bubble update when transcript arrives late
  const needsTranscriptBubbleRef  = useRef(false); // set when response.done fires before transcript for a non-submit_answer turn
  const questionsRef       = useRef(questions);
  const stateRef           = useRef(state);
  const micStreamRef       = useRef<MediaStream | null>(null);
  const micSourceRef       = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef     = useRef<AudioWorkletNode | null>(null);
  const micAnalyserRef     = useRef<AnalyserNode | null>(null);
  // Tracks the in-flight audioWorklet.addModule() promise so a second setupAudio() call
  // (e.g. reconnectVoice()'s, after primeReconnectAudio() already created the AudioContext)
  // still awaits worklet readiness instead of short-circuiting on the audioCtxRef.current
  // guard alone — session.updated's `new AudioWorkletNode(...)` throws if the module isn't
  // registered yet, which silently aborts that handler before it ever triggers AI speech.
  const audioWorkletReadyRef = useRef<Promise<void> | null>(null);
  const mutedRef               = useRef(false); // source of truth for mute — persists across state transitions
  const explainOpenRef         = useRef(false); // mirrors explainOverlayData !== null for stable WS closures
  const latencyStartRef        = useRef<number>(0); // VOICE-001: timestamp when user speech stopped, for latency measurement
  const activeSourcesRef        = useRef<AudioBufferSourceNode[]>([]); // all currently scheduled/playing audio sources — cleared on stopAudio
  const serverResponseActiveRef    = useRef(false); // true between response.created and response.done — prevents spurious cancel when no active response
  // Response ID we're currently willing to accept audio for — set on every response.created,
  // invalidated (null) by stopAudio()/barge-in. response.cancel stops future generation but
  // doesn't retroactively discard audio already generated and in flight; without this, stale
  // deltas for a response we've already moved past keep getting scheduled and played. See
  // private-documents/after-demo/PHASE_0_INTRO_SKIP_PLAN.md.
  const activeResponseIdRef       = useRef<string | null>(null);
  // True from sending a barge-able response.create (Phase 0's intro) until ANY response.created
  // arrives — "a response was requested but isn't born yet". Together with
  // pendingResponseAfterCancelRef this closes the intro-skip race: skipping before the intro's
  // response.created meant there was nothing to cancel, the intro then claimed
  // activeResponseIdRef on birth (audio played over the terms1 screen), and the terms1
  // response.create collided with it ("conversation_already_has_active_response"). See
  // private-documents/PHASE_0_INTRO_SKIP_RACE_PLAN.md.
  const awaitingResponseCreatedRef = useRef(false);
  // A response.create parked until the currently-alive response dies: fired on response.done,
  // and any response born while this is set gets cancelled immediately (audio never accepted).
  const pendingResponseAfterCancelRef = useRef<object | null>(null);
  const knowledgeBlockerNextQRef   = useRef<CarouselQuestion | null>(null); // next question to ask after a knowledge-blocker overlay closes
  const kbExplanationStartedRef    = useRef(false); // true once the first explanation audio delta arrives — guards against stale cancelled-response audio.done closing the overlay early
  const kbExplanationResponseIdRef = useRef<string | null>(null); // response ID of the KB explanation response — stale cancelled-response events have a different ID and are ignored
  // Callback to run once the CURRENT AI response's audio finishes playing — checked in scheduleAIDone.
  // Used to sequence phase transitions (e.g. privacy-pause announcements) after the line is fully spoken.
  const pendingPhaseTransitionRef  = useRef<(() => void) | null>(null);
  const chatOpenRef            = useRef(false); // true while chat modal is open
  const chatAnsweredRef        = useRef(0);     // count of answers given while chat was open
  const voiceThreadIdRef       = useRef<string | null>(null); // threadId from chat/init, used to persist V2 chat messages
  const explainIdleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetExplainIdleRef    = useRef<() => void>(() => {});
  const productVectorIdRef     = useRef<string | null>(null); // vector store ID for the recommended product (set in advancePhase)
  const productRef             = useRef<ProductData | null>(null); // stable product data ref for session.updated Phase 2 branch
  const pttVectorStoreRef      = useRef<string>(termsVectorId ?? ""); // active vector store for current PTT context
  const pttActiveRef           = useRef(false); // true while PTT button is held — bypasses sustainability mic guard
  const pttContextRef          = useRef<'terms1' | 'terms2' | 'sustainabilityTerms' | 'phase1' | 'phase2' | 'phase4' | 'phase5' | 'phase6' | null>(null); // set while PTT response is in flight — cleared on response.done to restore VAD
  const pttSearchPendingRef    = useRef(false);  // true after commit — waiting for transcription to run search server-side
  const pttDocLabelRef         = useRef<string>(""); // human-readable doc name for PTT response instructions
  const pttPartialTranscriptRef   = useRef<string>(""); // accumulated delta text for speculative search
  const pttSpeculativeSearchRef   = useRef<Promise<string> | null>(null); // in-flight speculative search promise

  // Bundle passed to all extracted voice/* handler functions — populated every render via Object.assign below.
  const ctxRef = useRef<VoiceContext>({} as VoiceContext);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { stateRef.current    = state;     }, [state]);

  // Language helper — read langRef.current at call-time so it always reflects the active language
  const langTag  = () => langRef.current === "de"
    ? GERMAN_SPEECH_DIRECTIVE
    : `English only.`;


  // Keeps activeCardIdRef in sync with state so callbacks can read it without stale closures.
  const setCard = useCallback((id: string | null) => {
    activeCardIdRef.current = id;
    setActiveCardId(id);
    useVoiceSessionStore.getState().setActiveCard(id);
  }, []);

  // Initialise sustainabilityConfirmedRef from localStorage so the disclosure is never shown twice
  // even if the page is refreshed mid-session before Sprint 4 persists skip-state to the DB.
  useEffect(() => {
    try {
      const key = `doguide_sus_${sessionId}`;
      if (localStorage.getItem(key)) sustainabilityConfirmedRef.current = true;
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Same pattern as sustainabilityConfirmedRef above, for the recording/transcript disclaimer —
  // see private-documents/after-demo/RECORDING_DISCLAIMER_PLAN.md.
  useEffect(() => {
    try {
      if (localStorage.getItem(`doguide_recording_disclaimer_${sessionId}`)) {
        setRecordingDisclaimerConfirmed(true);
      }
    } catch {}
  }, [sessionId]);

  const confirmRecordingDisclaimer = useCallback(() => {
    setRecordingDisclaimerConfirmed(true);
    try { localStorage.setItem(`doguide_recording_disclaimer_${sessionId}`, "1"); } catch {}
  }, [sessionId]);

  // Same pattern again for the language choice — restore BEFORE the WS opens (the choice
  // gate blocks tap-to-start, and langRef feeds buildSystemPrompt at session.created).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`doguide_lang_${sessionId}`);
      if (stored === "de" || stored === "en") {
        langRef.current = stored;
        setLanguageSelected(true);
      }
    } catch {}
  }, [sessionId]);

  const selectLanguage = useCallback((lang: "de" | "en") => {
    langRef.current = lang;
    setLanguageSelected(true);
    try { localStorage.setItem(`doguide_lang_${sessionId}`, lang); } catch {}
  }, [sessionId]);

  const appendChatMessage = useCallback((text: string, sender: "ai" | "user", questionId?: string) => {
    setChatMessages(prev => [...prev, {
      id:        `${sender}-${Date.now()}`,
      questionId,
      text,
      sender,
      timestamp: new Date(),
    }]);
  }, []);

  // Phase 6's own isolated append — writes to phase6ChatMessages only, and persists the
  // updated array into stepData.voice.phase6Chat (never the shared Thread/Message table that
  // backs Phase 1's chat). See private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
  const appendPhase6ChatMessage = useCallback((text: string, sender: "ai" | "user") => {
    setPhase6ChatMessages(prev => {
      const updated: ChatMessage[] = [...prev, { id: `${sender}-${Date.now()}`, text, sender, timestamp: new Date() }];
      fetch(`/api/qa-session/${sessionId}/voice-state`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Required field on this route; harmless resend — Phase 1 is long complete by Phase 6.
          lastQuestionIndex: questionsRef.current.length,
          phase6Chat: updated.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
        }),
      }).catch(() => {});
      return updated;
    });
  }, [sessionId]);

  // ── Audio setup ────────────────────────────────────────────────

  const setupAudio = useCallback(async () => {
    if (audioCtxRef.current) {
      // Context already exists (e.g. primeReconnectAudio() created it synchronously at
      // click-time) — still await worklet readiness rather than returning immediately.
      if (audioWorkletReadyRef.current) await audioWorkletReadyRef.current;
      return;
    }
    const ctx      = new AudioContext({ sampleRate: SAMPLE_RATE });
    const gain     = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    // Gain controls audio output volume (mute = gain 0).
    // Analyser is NOT in the gain chain — sources connect to it directly in scheduleChunk
    // so the sphere always sees the raw signal even when muted.
    gain.connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainRef.current     = gain;
    analyserRef.current = analyser;
    setAnalyserNode(analyser);
    audioWorkletReadyRef.current = ctx.audioWorklet.addModule("/pcm-processor.js");
    await audioWorkletReadyRef.current;
  }, []);

  const scheduleChunk = useCallback((base64: string) => {
    try {
      const ctx  = audioCtxRef.current;
      const gain = gainRef.current;
      if (!ctx || !gain) {
        console.warn("[voice] scheduleChunk: no AudioContext or GainNode");
        return;
      }

      console.log("[voice] audio chunk — ctx.state:", ctx.state, "base64 length:", base64.length);

      // Resume suspended context (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume().then(() => console.log("[voice] AudioContext resumed"));
      }

      if (!base64 || base64.length === 0) return;

      const buf    = base64ToPCM16AudioBuffer(base64, ctx);
      if (buf.length === 0) return;

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(gain);                          // audio output — silenced when muted
      if (analyserRef.current) source.connect(analyserRef.current); // visualization — always sees signal

      const startAt          = Math.max(nextPlayTimeRef.current, ctx.currentTime + 0.02);
      source.start(startAt);
      nextPlayTimeRef.current = startAt + buf.duration;
      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };
    } catch (err) {
      console.error("[voice] scheduleChunk error:", err);
    }
  }, []);

  // ── WebSocket send helper ──────────────────────────────────────

  const send = useCallback((event: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      const t = (event as Record<string, unknown>).type as string;
      console.log("[voice] →", t);
      ws.send(JSON.stringify(event));
    } else {
      console.warn("[voice] send dropped — WS not open:", (event as Record<string, unknown>).type);
    }
  }, []);

  // ── Explain overlay idle timer ────────────────────────────────

  const resetExplainIdleTimer = useCallback(() => {
    if (explainIdleTimerRef.current) clearTimeout(explainIdleTimerRef.current);
    explainIdleTimerRef.current = setTimeout(() => {
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "[SYSTEM: Customer has been silent for 30 seconds in the explanation overlay. Check in naturally — ask if everything makes sense and if they're ready to go back to the question.]" }],
        },
      });
      send({ type: "response.create" });
    }, 30_000);
  }, [send]);

  // Keep a stable ref so the WS closure can call the latest version
  useEffect(() => { resetExplainIdleRef.current = resetExplainIdleTimer; }, [resetExplainIdleTimer]);
  useEffect(() => { voicePhaseRef.current = voicePhase; useVoiceSessionStore.getState().setPhase(voicePhase as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7); }, [voicePhase]);
  useEffect(() => { termsSubStepRef.current = termsSubStep; useVoiceSessionStore.getState().setTermsSubStep(termsSubStep); }, [termsSubStep]);

  // Phase 2 OR Phase 4 resume — re-fetch product data on mount so productRef and
  // productSuggestion are populated before the user taps to continue. The WS isn't open yet
  // so send() calls are no-ops. Phase 4 needs this too (added 2026-07-07, see
  // private-documents/voice-resume-fix/VOICE_RESUME_FIX_PLAN.md) — VoiceSessionShell's
  // `voicePhase === 4 && productSuggestion` guard would otherwise never pass on a cold resume,
  // since productSuggestion is normally only populated live during Phase 2's voice-tool flow.
  useEffect(() => {
    if (startPhase !== 2 && startPhase !== 4) return;
    const refetch = async () => {
      try {
        const durationQ      = questionsRef.current.find(q => q.questionOrder === 2);
        const riskQ          = questionsRef.current.find(q => q.questionOrder === 5);
        const durationAnswer = durationQ ? savedAnswersRef.current[durationQ.id] : undefined;
        const riskAnswer     = riskQ     ? savedAnswersRef.current[riskQ.id]     : undefined;
        const params = new URLSearchParams();
        if (durationAnswer) params.set("duration", durationAnswer);
        if (riskAnswer)     params.set("risk",     riskAnswer);
        const res  = await fetch(`/api/phase/product?${params.toString()}`);
        const json = await res.json();
        const product: ProductData = json.data ?? json;
        productRef.current             = product;
        productVectorIdRef.current     = product.aiSettings?.vectorId ?? null;
        setProductSuggestion(product);
      } catch {
        // Silent — Phase 2 screen will still render, AI greeting will be generic
      }
    };
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 6 ONLY — rehydrate phase6ChatMessages from stepData.voice.phase6Chat on cold resume.
  // Phase 6's chat is intentionally isolated from the main session's Thread/Message history
  // (which backs Phase 1's chat, the full running transcript) — persisting through the same
  // voice-state resume blob used by lastQuestionIndex/skippedIds/etc. means there is no
  // shared-storage path for Phase 1 content to ever leak into Phase 6's conversation. See
  // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
  useEffect(() => {
    if (startPhase !== 6) return;
    fetch(`/api/qa-session/${sessionId}/voice-state`)
      .then(res => res.json())
      .then(json => {
        const raw = json?.phase6Chat;
        if (Array.isArray(raw) && raw.length) {
          setPhase6ChatMessages(raw.map((m: { id: string; text: string; sender: "ai" | "user"; timestamp: string }) => ({
            ...m, timestamp: new Date(m.timestamp),
          })));
        }
      })
      .catch(() => console.warn("[voice] Phase 6 chat history rehydrate failed"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop the idle timer whenever the overlay opens or closes
  useEffect(() => {
    explainOpenRef.current = explainOverlayData !== null;
    if (!explainOverlayData) {
      if (explainIdleTimerRef.current) { clearTimeout(explainIdleTimerRef.current); explainIdleTimerRef.current = null; }
      return;
    }
    resetExplainIdleTimer();
    return () => {
      if (explainIdleTimerRef.current) { clearTimeout(explainIdleTimerRef.current); explainIdleTimerRef.current = null; }
    };
  }, [explainOverlayData, resetExplainIdleTimer]);

  // ── REST helpers ───────────────────────────────────────────────

  const saveAnswer = useCallback(async (questionId: string, value: string) => {
    const q = questionsRef.current.find(q => q.id === questionId);
    if (!q) return;
    await fetch(`/api/answers?id=${sessionId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId,
        answer:       value,
        question:     q.text,
        options:      q.options ?? [],
        questionType: q.questionType ?? "choice",
      }),
    });
  }, [sessionId]);

  const saveVoiceState = useCallback(async (index: number) => {
    try {
      const res = await fetch(`/api/qa-session/${sessionId}/voice-state`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastQuestionIndex: index,
          skippedIds:        [...skippedIdsRef.current],
          voicePhase:        voicePhaseRef.current,
          termsSubStep:      termsSubStepRef.current,
          isRevisiting:      isRevisitingRef.current,
        }),
      });
      if (!res.ok) {
        console.warn("[voice] saveVoiceState PATCH failed:", res.status, "index:", index);
      } else {
        console.log("[voice] saveVoiceState saved index:", index);
      }
    } catch (err) {
      console.warn("[voice] saveVoiceState error:", err, "index:", index);
    }
  }, [sessionId]);

  const advancePhase = useCallback(async () => {
    const wasRevisiting = isRevisitingRef.current;
    isRevisitingRef.current = false; // clear revisit mode before fetching product
    setIsRevisiting_internal(false);
    useVoiceSessionStore.getState().setIsRevisiting(false);

    // Bridging message — without this, the strong conversation-history pull from the AI's own
    // recent "want to change anything else?" turn can outweigh the response.create override
    // below, same failure mode advanceToPersonalInfo() already guards against for its own
    // transition. See private-documents/after-demo/PHASE_1_REVISIT_FIX_PLAN.md.
    if (wasRevisiting) {
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: "[SYSTEM: The revisit is now over. Do NOT continue asking about changing answers or revisiting topics — the customer is moving on to see the updated product recommendation.]",
        }]},
      });
    }
    const durationQ      = questionsRef.current.find(q => q.questionOrder === 2);
    const riskQ          = questionsRef.current.find(q => q.questionOrder === 5);
    const durationAnswer = durationQ ? savedAnswersRef.current[durationQ.id] : undefined;
    const riskAnswer     = riskQ     ? savedAnswersRef.current[riskQ.id]     : undefined;

    try {
      const params = new URLSearchParams();
      if (durationAnswer) params.set("duration", durationAnswer);
      if (riskAnswer)     params.set("risk",     riskAnswer);
      const productRes = await fetch(`/api/phase/product?${params.toString()}`);
      const productJson = await productRes.json();
      const product: ProductData = productJson.data ?? productJson;

      await fetch("/api/phase/suggest-product", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qaSessionId:      sessionId,
          productId:        product.id,
          name:             product.name,
          shortName:        product.name,
          description:      product.description,
          fileName:         product.fileName,
          suggestionReason: `Selected based on ${durationAnswer} duration and ${riskAnswer} risk preference`,
          confidenceScore:  product.score / 100,
        }),
      });

      await fetch("/api/phase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phase: "SUGGESTIONS" }),
      });

      // Create or get the Thread for this session so V2 chat messages are persisted
      try {
        const initRes  = await fetch("/api/phase/chat/init", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, productId: product.id }),
        });
        const initJson = await initRes.json();
        if (initJson?.threadId) voiceThreadIdRef.current = initJson.threadId;
      } catch {
        console.warn("[voice] chat/init failed — chat messages will not be persisted to DB");
      }

      productRef.current             = product;
      productVectorIdRef.current     = product.aiSettings?.vectorId ?? null;
      setProductSuggestion(product);
      voicePhaseRef.current = 2;
      setVoicePhase(2);
      saveVoiceState(questionsRef.current.length).catch(() => {});
      send({
        type: "session.update",
        session: { type: "realtime", audio: { input: { turn_detection: null } } },
      });

      // Cap the product prompt to avoid oversized WebSocket frames through proxies
      const productPrompt = (product.aiSettings?.prompt ?? "").slice(0, 3000);

      const systemMsg = [
        `[SYSTEM: Phase 1 complete. Recommended portfolio: "${product.fullName}".`,
        `Investment horizon answered: ${durationAnswer ?? "unknown"}. Risk tolerance answered: ${riskAnswer ?? "unknown"}.`,
        `Product knowledge base:\n${productPrompt}`,
        `Your role now:`,
        `1. Announce "${product.fullName}" by public name only — NEVER say "${product.name}"`,
        `2. Explain WHY it was recommended based on the customer's answers (horizon + risk)`,
        `3. Tell the customer the full PDF brochure is visible on screen — invite them to read it`,
        `4. Mention there are navigation buttons (← →) below the PDF to page through it`,
        `5. Answer customer questions using the product knowledge base above`,
        `6. When customer confirms: call confirm_product()`,
        `7. If customer wants to revisit Phase 1: call revisit_questions()]`,
      ].join("\n");

      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: systemMsg }] },
      });

      const opening = product.aiSettings?.firstMessage
        ? `Open with this client-approved message (adapt naturally for voice, do not read verbatim): "${product.aiSettings.firstMessage}"`
        : `Erklären Sie in 2–3 Sätzen, WARUM dieses Portfolio passt — Anlagehorizont von ${durationAnswer ?? `${product.from}–${product.to} Jahren`} und ${riskAnswer ?? product.risk} Risikoprofil.`;

      send({
        type: "response.create",
        response: {
          instructions: [
            ADVISOR_PERSONA(langRef.current),
            `Nennen Sie das empfohlene Portfolio „${product.fullName}" — nennen Sie NIEMALS den internen Code „${product.name}".`,
            opening,
            `Mention the SRI (Synthetic Risk Indicator) rating of ${product.sri} out of 7 — this is an EU regulatory requirement.`,
            `Erwähnen Sie außerdem, dass die PDF-Broschüre auf dem Bildschirm zu sehen ist und mit den Pfeil-Buttons geblättert werden kann. Laden Sie zu Fragen ein.`,
            `Sachlich und professionell — kein Verkaufsgespräch.`,
          ].join(" "),
        },
      });
    } catch (err) {
      console.error("[voice] advancePhase error:", err);
      router.push("/customer/dashboard");
    }
  }, [sessionId, router, send]);

  // ── Function call handler ──────────────────────────────────────

  const handleFunctionCall = useCallback(
    (name: string, args: string, callId: string) => _handleFunctionCall(name, args, callId, ctxRef.current),
    []
  );

  // ── Schedule AI_DONE after audio finishes playing ──────────────

  const scheduleAIDone = useCallback(() => {
    if (audioEndTimer.current) clearTimeout(audioEndTimer.current);
    const ctx = audioCtxRef.current;
    if (!ctx) {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      // Auto-close any open explanation (general or KB) once its audio finishes — see
      // private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
      if (explainOpenRef.current && kbExplanationStartedRef.current) {
        kbExplanationStartedRef.current = false;
        setExplainTriggerClose(true);
      }
      if (pendingPhaseTransitionRef.current) {
        const fn = pendingPhaseTransitionRef.current;
        pendingPhaseTransitionRef.current = null;
        fn();
      }
      return;
    }
    const remaining = Math.max(0, (nextPlayTimeRef.current - ctx.currentTime)) * 1000;
    audioEndTimer.current = setTimeout(() => {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!pendingCall.current && !mutedRef.current) dispatch({ type: "AI_DONE" });
      // Auto-close any open explanation (general or KB) once its audio finishes — see
      // private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
      if (explainOpenRef.current && kbExplanationStartedRef.current) {
        kbExplanationStartedRef.current = false;
        setExplainTriggerClose(true);
      }
      if (pendingPhaseTransitionRef.current) {
        const fn = pendingPhaseTransitionRef.current;
        pendingPhaseTransitionRef.current = null;
        fn();
      }
    }, remaining + 200);
  }, []);

  // ── Stop AI audio (tap barge-in) ──────────────────────────────
  // Immediately kills buffered audio, cancels the current OpenAI response,
  // and returns the session to "listening" so navigation can proceed.
  const stopAudio = useCallback(() => {
    // Kill every scheduled / in-flight AudioBufferSourceNode
    activeSourcesRef.current.forEach(s => { try { s.stop(0); } catch {} });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    // Reject any further audio.delta/done events for the response we just stopped caring about —
    // see activeResponseIdRef's declaration above.
    activeResponseIdRef.current = null;
    if (audioEndTimer.current) {
      clearTimeout(audioEndTimer.current);
      audioEndTimer.current = null;
    }
    // Cancel only if the server is still generating a response.
    // serverResponseActiveRef is true only between response.created and response.done,
    // so this never fires when audio is local-only (response already done server-side).
    if (serverResponseActiveRef.current) send({ type: "response.cancel" });
    // Drop any in-flight function call so response.done doesn't replay it
    pendingCall.current = null;
    isAISpeakingRef.current = false;
    setIsAISpeaking(false);
    // Unlock navigation guards so the tap action can run immediately
    skipInProgressRef.current = false;
    prevInProgressRef.current = false;
    if (!mutedRef.current) dispatch({ type: "AI_DONE" });
  }, [send]);

  /** Sphere-tap barge-in for the between-phase privacy-pause announcements
   *  (Phase 2→3, Phase 6→7): stops the speech AND immediately runs the phase
   *  transition that scheduleAIDone would have fired when the announcement
   *  audio ended. Plain stopAudio() would strand the transition forever —
   *  it clears the audio-end timer, and pendingPhaseTransitionRef is only
   *  ever consumed by that timer's callback. Null-safe: with no pending
   *  transition (already fired, or none scheduled) this degrades to a
   *  normal barge-in. See private-documents/SPHERE_TAP_TO_STOP_PLAN.md. */
  const skipPendingTransition = useCallback(() => {
    stopAudio();
    const fn = pendingPhaseTransitionRef.current;
    pendingPhaseTransitionRef.current = null;
    fn?.();
  }, [stopAudio]);

  // ── Voice connection lifecycle (silent-phase support) ─────────
  // Tears down WS + mic — used to go silent for Phases 3 & 6. Also reused as the
  // true-unmount cleanup (see the dedicated effect below) since it's idempotent and safe
  // to call on an already-torn-down connection.
  //
  // Deliberately SUSPENDS the AudioContext rather than closing it. The actual privacy
  // requirement is "no live mic capture, no WebSocket to OpenAI" — both handled below. A
  // suspended AudioContext with no mic connected and no socket to send/receive through
  // carries no privacy risk on its own. Closing and recreating a *second* AudioContext deep
  // in an async reconnect chain (PATCH request → compliance check → reconnectVoice()) proved
  // unreliable across three separate fix attempts, all chasing the same "browser silently
  // won't actually start the new context" symptom — no amount of resume-timing precision
  // reliably re-earns the autoplay/gesture credential for a context created that deep in a
  // callback chain. Resuming the one context created back at startSession()'s direct click
  // is far more robust: it was already granted "activated" status once, and stays granted.
  const disconnectVoice = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    micAnalyserRef.current?.disconnect();
    micAnalyserRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    audioCtxRef.current?.suspend();
    if (gainRef.current) gainRef.current.gain.value = 0; // belt-and-suspenders — no audible output while suspended
    sessionConfiguredRef.current = false; // session.updated guard is per-connection
  }, []);

  // Resumes the long-lived AudioContext (suspended, not closed, by disconnectVoice above)
  // and bumps voiceConnectionEpoch to make the WS effect open a fresh connection. setupAudio()
  // is a no-op here — the context already exists from startSession() and is never destroyed.
  const reconnectVoice = useCallback(async () => {
    await setupAudio();
    audioCtxRef.current?.resume();
    if (gainRef.current && !mutedRef.current) gainRef.current.gain.value = 1;
    console.log("[voice] reconnectVoice — ctx.state after resume:", audioCtxRef.current?.state);
    // Mic access is mandatory — block the session (via VoiceMicAccessModal) rather than
    // silently proceeding without one. See private-documents/after-demo/MIC_ACCESS_REQUIRED_PLAN.md.
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicDenied(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicDenied(false);
    } catch {
      setMicDenied(true);
      return;
    }
    setVoiceConnectionEpoch(e => e + 1);
  }, [setupAudio]);

  /** Must be called SYNCHRONOUSLY from a user-gesture handler (e.g. the Personal Info
   *  "Weiter" button's onClick) — resumes the long-lived AudioContext right there, before
   *  any async work, belt-and-suspenders on top of reconnectVoice()'s own resume() call.
   *  Simple by design now: disconnectVoice() suspends rather than closes the context, so
   *  there is nothing to create here — just resume the one context that was already
   *  unlocked back at startSession()'s original click. */
  const primeReconnectAudio = useCallback(() => {
    audioCtxRef.current?.resume();
    console.log("[voice] primeReconnectAudio — ctx.state immediately after sync resume:", audioCtxRef.current?.state);
  }, []);

  /** Announces the Phase 3 privacy pause, then disconnects voice entirely once the AI
   *  finishes speaking (see pendingPhaseTransitionRef / scheduleAIDone). Single entry point
   *  for BOTH the Phase 2 tap-confirm button AND the AI's own confirm_product tool call —
   *  see handleFunctionCall.ts, which calls this via VoiceContext for the voice-triggered path. */
  const advanceToPersonalInfo = useCallback(() => {
    setIsTransitioningToPersonalInfo(true); // switch to the plain orb screen immediately
    pendingPhaseTransitionRef.current = () => {
      disconnectVoice();
      voicePhaseRef.current = 3;
      setVoicePhase(3);
      setIsTransitioningToPersonalInfo(false);
      saveVoiceState(questionsRef.current.length).catch(() => {});
      fetch("/api/phase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, phase: "PERSONAL_INFO" }),
      }).catch(() => {});
    };
    // Explicit system message before the override response.create — every other phase
    // transition in this codebase does this (advancePhase, confirmInvestment, the terms
    // confirmations). Without it, the strong conversation-history pull from the extended
    // Phase 2 product discussion (name, price, features, PTT Q&A) can outweigh the
    // per-response instructions override, causing the AI to keep talking about the product
    // instead of announcing the privacy pause.
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: Phase 2 (product discussion) is now complete. Do NOT continue discussing the product. The customer is moving to Personal Info — announce the privacy pause now.]",
      }]},
    });
    send({
      type: "response.create",
      response: { instructions: PRIVACY_PAUSE_PERSONAL_INFO_INSTRUCTIONS(langRef.current) },
    });
  }, [sessionId, send, saveVoiceState, disconnectVoice]);

  /** Single entry point for both the Phase 4 tap-confirm button AND the AI's own
   *  confirm_investment tool call — see handleFunctionCall.ts. No privacy pause here:
   *  Phase 5 (Contract Document) is AI-guided too, voice stays connected throughout. */
  const confirmInvestment = useCallback(async () => {
    voicePhaseRef.current = 5;
    setVoicePhase(5);
    saveVoiceState(questionsRef.current.length).catch(() => {});
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "CONTRACT_DOCUMENT" }),
    }).catch(() => {});
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: Customer confirmed the investment costs and terms. Now entering Contract Document phase — the customer will review and sign the required documents.]",
      }]},
    });
    send({
      type: "response.create",
      response: { instructions: CONTRACT_DOCUMENT_INTRO_INSTRUCTIONS(langRef.current) },
    });
  }, [sessionId, send, saveVoiceState]);

  /** Single entry point for both the Phase 5 tap-confirm button AND the AI's own
   *  confirm_contracts tool call — see handleFunctionCall.ts. No privacy pause here:
   *  Phase 6 (Final Q&A) is AI-guided too, voice stays connected throughout — same as
   *  confirmInvestment above. The privacy-pause-into-Signing logic that used to live here
   *  moved to confirmReadyToSign() below when Phase 6 (Final Q&A) was inserted between
   *  Contract Document and Signing (renumbering Signing from Phase 6 to Phase 7). */
  const confirmContracts = useCallback(() => {
    voicePhaseRef.current = 6;
    setVoicePhase(6);
    saveVoiceState(questionsRef.current.length).catch(() => {});
    fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "CHAT" }),
    }).catch(() => {});
    // Explicit system message before the override response.create — required, see the
    // Phase 3 "bug 4" postmortem (PHASE_3_PERSONAL_INFO_PLAN.md). Without it, extended
    // Phase 5 conversation history (PTT questions about the contracts) can outweigh the
    // per-response instructions override.
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: Phase 5 (contract document review) is now complete. The customer is moving to a final open Q&A before signing — greet them per the final-Q&A instructions now.]",
      }]},
    });
    send({
      type: "response.create",
      response: { instructions: FINAL_QA_INTRO_INSTRUCTIONS(langRef.current) },
    });
  }, [sessionId, send, saveVoiceState]);

  /** Single entry point for both the Phase 6 tap-confirm button ("Weiter zur Unterschrift")
   *  AND the AI's own confirm_ready_to_sign tool call — see handleFunctionCall.ts. DOES need
   *  a privacy pause: Phase 7 (Signing) is silent, same treatment as the Phase 2→3 transition
   *  (see advanceToPersonalInfo above). This is what confirmContracts() used to do directly,
   *  before Phase 6 (Final Q&A) was inserted between Contract Document and Signing. */
  const confirmReadyToSign = useCallback(() => {
    setIsTransitioningToSigning(true); // switch to the plain orb screen immediately
    pendingPhaseTransitionRef.current = () => {
      disconnectVoice();
      voicePhaseRef.current = 7;
      setVoicePhase(7);
      setIsTransitioningToSigning(false);
      saveVoiceState(questionsRef.current.length).catch(() => {});
      fetch("/api/phase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, phase: "RESULT_PDF" }),
      }).catch(() => {});
    };
    // Explicit system message before the override response.create — required, see the
    // Phase 3 "bug 4" postmortem (PHASE_3_PERSONAL_INFO_PLAN.md). Without it, extended
    // Phase 6 conversation history (PTT questions across the whole session) can outweigh the
    // per-response instructions override, and the AI keeps answering questions instead of
    // announcing the privacy pause.
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: The final Q&A is now complete. Do NOT continue answering questions. The customer is ready to sign — announce the privacy pause now.]",
      }]},
    });
    send({
      type: "response.create",
      response: { instructions: PRIVACY_PAUSE_SIGNING_INSTRUCTIONS(langRef.current) },
    });
  }, [sessionId, send, saveVoiceState, disconnectVoice]);

  Object.assign(ctxRef.current, {
    // config
    sessionId, termsVectorId, router,
    // callbacks
    send, dispatch, setCard, appendChatMessage, appendPhase6ChatMessage,
    saveAnswer, saveVoiceState, advancePhase,
    scheduleAIDone, scheduleChunk, handleFunctionCall,
    disconnectVoice, reconnectVoice, advanceToPersonalInfo, confirmInvestment, confirmContracts, confirmReadyToSign,
    // state setters
    setIsAISpeaking, setBargeInActive, setSavedAnswers, setChatMessages,
    setIsChatAITyping, setPendingVoiceAnswer, setExplainOverlayData,
    setExplainTriggerClose, setTermsSubStep, setVoicePhase,
    setProductSuggestion, setVoiceAnswerCount, setIsRevisiting_internal,
    setMicAnalyserNode, setPostExplainReaskId,
    // refs (all stable — same object reference every render)
    wsRef, audioCtxRef, gainRef, analyserRef, nextPlayTimeRef, audioEndTimer,
    pendingCall, aiTextBufferRef, aiAudioTranscriptRef, lastAITranscriptRef,
    pendingVoiceTranscriptRef, currentSpeechItemIdRef, applyPendingTranscriptRef,
    needsTranscriptBubbleRef, questionsRef, stateRef, micStreamRef, micSourceRef,
    workletNodeRef, micAnalyserRef, mutedRef, explainOpenRef, latencyStartRef,
    activeSourcesRef, serverResponseActiveRef, activeResponseIdRef, awaitingResponseCreatedRef, pendingResponseAfterCancelRef, knowledgeBlockerNextQRef,
    kbExplanationStartedRef, kbExplanationResponseIdRef, pendingPhaseTransitionRef,
    chatOpenRef, chatAnsweredRef,
    voiceThreadIdRef, explainIdleTimerRef, resetExplainIdleRef, productVectorIdRef,
    productRef, pttVectorStoreRef, pttActiveRef, pttContextRef, pttSearchPendingRef,
    pttDocLabelRef, pttPartialTranscriptRef, pttSpeculativeSearchRef, savedAnswersRef,
    answeredIdsRef, skippedIdsRef, explainedQuestionsRef, activeCardIdRef, voicePhaseRef,
    termsSubStepRef, langRef, isRevisitingRef, sustainabilityConfirmedRef,
    isAISpeakingRef, bargeInActiveRef, sessionConfiguredRef, initialIndexRef,
    circleBackActiveRef, skipInProgressRef, prevInProgressRef, scrollDebounceTimerRef,
    assetKnowledgeShownRef, fastModeRef,
  } satisfies VoiceContext);

  // ── WebSocket lifecycle ────────────────────────────────────────

  useEffect(() => {
    if (!started) return;

    // AudioContext was already created and resumed in startSession() (user gesture).
    // Just ensure it's still running in case the browser suspended it again.
    audioCtxRef.current?.resume();

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${window.location.host}/api/realtime/proxy`;

    dispatch({ type: "CONNECT" });
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[voice] WS open");
      dispatch({ type: "CONNECTED" });
      // Wait for session.created before sending session.update
    };

    ws.onmessage = async (event: MessageEvent) => {
      const raw = event.data instanceof Blob ? await event.data.text() : (event.data as string);
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw); } catch { return; }
      await handleWsMessage(msg, ctxRef.current);
    };

    ws.onclose = (e) => {
      console.log("[voice] WS closed", e.code, e.reason);
      if (stateRef.current.session !== "error") {
        dispatch({ type: "ERROR", message: "Verbindung unterbrochen – tippen Sie weiter" });
      }
    };

    ws.onerror = () => dispatch({ type: "ERROR", message: "WebSocket-Fehler" });

    // Per-connection cleanup — only ever closes THIS websocket + its response timers.
    // Deliberately does NOT touch the audio graph or mic stream: this effect now re-runs
    // on every voiceConnectionEpoch bump (reconnecting after a silent phase), and
    // reconnectVoice() builds the new AudioContext/mic stream BEFORE bumping the epoch —
    // tearing down audio here would race with and destroy those freshly-built resources.
    // Full audio/mic teardown lives in disconnectVoice() (explicit) and the true-unmount
    // effect below (automatic) instead.
    return () => {
      ws.close();
      if (audioEndTimer.current) clearTimeout(audioEndTimer.current);
      if (explainIdleTimerRef.current) { clearTimeout(explainIdleTimerRef.current); explainIdleTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, voiceConnectionEpoch]); // re-runs on tap-to-start AND on reconnectVoice()

  // True unmount only (navigating away) — full audio/mic/WS teardown.
  // disconnectVoice is a stable useCallback ([] deps), so this cleanup fires exactly once,
  // on unmount, never on a voiceConnectionEpoch bump.
  useEffect(() => {
    return () => { disconnectVoice(); };
  }, [disconnectVoice]);

  // ── Visibility: pause / resume ─────────────────────────────────

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        dispatch({ type: "PAUSE" });
        if (gainRef.current) gainRef.current.gain.value = 0;
      } else {
        const wasMuted = mutedRef.current;
        if (gainRef.current) gainRef.current.gain.value = wasMuted ? 0 : 1;
        dispatch({ type: "RESUME" });
        const t = setTimeout(() => {
          dispatch({ type: "RESUMING_DONE" });
          if (wasMuted) dispatch({ type: "MUTE" }); // restore muted state after resume
        }, 1500);
        return () => clearTimeout(t);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Unlock skip/prev when AI finishes speaking and session returns to "listening".
  useEffect(() => {
    if (state.session === "listening") {
      skipInProgressRef.current = false;
      prevInProgressRef.current = false;
    }
  }, [state.session]);

  // ── Public API ─────────────────────────────────────────────────

  /** Toggles Phase 1 Fast Mode — see private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
   *  Ref updated synchronously (so the very next answer-submission call sees the new value even
   *  within the same tick) alongside the state (for the ControlBar button's own re-render).
   *  Turning it ON cuts off any narration already in flight via stopAudio() (the same
   *  barge-in mechanism the Prev/Next buttons use) — otherwise the customer would have to
   *  wait for the AI to finish the sentence it was already mid-way through before the
   *  silence actually takes effect. */
  const toggleFastMode = useCallback(() => {
    const next = !fastModeRef.current;
    fastModeRef.current = next;
    setFastMode(next);
    if (next) stopAudio();
  }, [stopAudio]);

  const toggleMute = useCallback(() => {
    const isMuted = mutedRef.current;
    if (isMuted) {
      mutedRef.current = false;
      dispatch({ type: "UNMUTE" });
      if (gainRef.current) gainRef.current.gain.value = 1;
    } else {
      mutedRef.current = true;
      dispatch({ type: "MUTE" });
      if (gainRef.current) gainRef.current.gain.value = 0;
    }
  }, []);

  /** Tap-based answer — saves to DB and tells AI to continue */
  const onAnswerConfirmed = useCallback(
    (q: CarouselQuestion, v: string) => _handleAnswerConfirmed(q, v, ctxRef.current),
    []
  );

  /** Clears the AI-proposed highlight — called when customer rejects or modal closes without submitting */
  const clearPendingVoiceAnswer = useCallback(() => {
    setPendingVoiceAnswer(null);
  }, []);

  /** Clears the Fast Mode post-explanation re-ask hint — called when the customer leaves that
   *  modal, whether by answering or by closing it. See
   *  private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md. */
  const clearPostExplainReask = useCallback(() => {
    setPostExplainReaskId(null);
  }, []);

  const onPrev = useCallback(() => handlePrev(ctxRef.current), []);

  const skipQuestion = useCallback(
    (question: CarouselQuestion) => handleSkipQuestion(question, ctxRef.current),
    []
  );

  /** Sends a system message prompting the AI to call explain_topic for the current question. */
  const requestExplanation = useCallback(() => handleRequestExplanation(ctxRef.current), []);

  /** Closes the explain overlay and tells the AI to resume. Called by the overlay's back button or after voice-triggered animation. */
  const closeExplainOverlay = useCallback(() => handleCloseExplainOverlay(ctxRef.current), []);

  /** Called when the chat modal opens or closes. Silences audio on open; on close with queued answers,
   *  resets the audio buffer and sends one consolidated re-prompt so the AI speaks once. */
  const notifyChatOpen = useCallback(
    (open: boolean) => handleNotifyChatOpen(open, ctxRef.current),
    []
  );

  /** Called by VoicePersonalInfoForm once the customer submits with no compliance stop.
   *  Advances to Phase 4 and reconnects voice — the session.created/session.updated
   *  branches added in Step 2 (voicePhaseRef.current === 4) handle sending
   *  PHASE4_REENTRY_SYSTEM_PROMPT and triggering the AI's re-greet once the new
   *  connection is live. voicePhaseRef must be set BEFORE reconnectVoice() so those
   *  branches see the correct phase when the new connection's session.created fires. */
  const onPersonalInfoSubmitted = useCallback(async () => {
    voicePhaseRef.current = 4;
    setVoicePhase(4);
    saveVoiceState(questionsRef.current.length).catch(() => {});
    fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "INVESTMENT_FORM" }),
    }).catch(() => {});
    await reconnectVoice();
  }, [sessionId, saveVoiceState, reconnectVoice]);

  /** Pure carousel scroll — moves the card position with no AI message, no skip, no DB write.
   *  Used by the shell's next/prev buttons in revisit mode so browsing doesn't corrupt skippedIds. */
  const scrollCarousel = useCallback(
    (id: string) => handleScrollCarousel(id, ctxRef.current),
    []
  );

  /** Tap handler — customer wants to revisit Phase 1 answers (Phase 2 button) */
  const revisitQuestions = useCallback(() => handleRevisitQuestions(ctxRef.current), []);

  // ── Phase 0 — terms gate ───────────────────────────────────────

  /** Called from VoiceSessionShell when intro speech ends (isAISpeaking goes false in Phase 0 intro) */
  const moveToTerms1 = useCallback(() => handleMoveToTerms1(ctxRef.current), []);

  /** Customer tapped "Ich bestätige" on the 4money (terms1) document */
  const confirmTerms1 = useCallback(() => handleConfirmTerms1(ctxRef.current), []);

  /** Customer tapped "Ich bestätige" on the froots (terms2) document — transitions to Phase 1 */
  const confirmTerms2 = useCallback(() => handleConfirmTerms2(ctxRef.current), []);

  /** Customer tapped "Verstanden" on the sustainability disclosure — dismisses modal and advances. */
  const confirmSustainabilityTerms = useCallback(
    () => handleConfirmSustainabilityTerms(ctxRef.current),
    []
  );

  /** Must be called from a user-gesture handler (tap/click) to unlock AudioContext.
   *  Mic access is mandatory — on denial, blocks the session via VoiceMicAccessModal instead of
   *  silently falling back to tap-only. See private-documents/after-demo/MIC_ACCESS_REQUIRED_PLAN.md. */
  const startSession = useCallback(async () => {
    await setupAudio();
    audioCtxRef.current?.resume();

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicDenied(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicDenied(false);
    } catch {
      setMicDenied(true);
      return;
    }

    setStarted(true);
  }, [setupAudio]);

  /** Retries whichever mic-acquiring step last failed — startSession() before the session has
   *  opened, reconnectVoice() for the Phase 3→4 handoff. Single entry point for
   *  VoiceMicAccessModal's retry button. */
  const retryMicAccess = useCallback(() => {
    if (started) {
      reconnectVoice();
    } else {
      startSession();
    }
  }, [started, startSession, reconnectVoice]);

  const startPTT = useCallback(() => {
    pttActiveRef.current = true;
    stopAudio();

    // Defensive — clears any residual buffered audio before this press starts. With the
    // mic-streaming worklet gate correctly blocking audio outside an active PTT hold (see
    // private-documents/after-demo/PHASE_1_PTT_PLAN.md), there shouldn't be anything to clear,
    // but this is cheap insurance against any edge-case timing gap. Applies to every PTT phase.
    send({ type: "input_audio_buffer.clear" });

    // Disable VAD on PTT-only screens so the customer's speech doesn't trigger an
    // auto-response — we fire response.create manually on PTT release instead.
    const isDocumentScreen =
      voicePhaseRef.current === 0 ||
      termsSubStepRef.current === 'sustainabilityTerms' ||
      voicePhaseRef.current === 1 ||
      voicePhaseRef.current === 2 ||
      voicePhaseRef.current === 4 ||
      voicePhaseRef.current === 5 ||
      voicePhaseRef.current === 6;

    if (isDocumentScreen) {
      send({
        type: "session.update",
        session: { type: "realtime", audio: { input: { turn_detection: null } } },
      });
    }
  }, [stopAudio, send]);

  const submitPTTQuestion = useCallback((context: 'terms1' | 'terms2' | 'sustainabilityTerms' | 'phase2' | 'phase4' | 'phase5' | 'phase6') => {
    pttActiveRef.current  = false;
    pttContextRef.current = context; // response.done will clear this and restore VAD

    // Set the correct vector store for this PTT context — no hardcoded fallbacks.
    // 'phase4' and 'phase6' intentionally fall into the else branch — they reuse termsVectorId
    // (the shared global store). No new vector store needed for either — see
    // private-documents/phase-4-investment-form/PHASE_4_INVESTMENT_FORM_PLAN.md and
    // private-documents/phase-6-final-qa/PHASE_6_FINAL_QA_PLAN.md.
    // 'phase5' uses a temporary local stand-in (see PHASE_5_LOCAL_KNOWLEDGE_PLAN.md) — none of
    // the shared store's documents cover the actual contract PDFs, so this sentinel routes
    // /api/documents/search to a local embeddings-based search over the 8 contract knowledge
    // docs in /Vektordatenbank/ instead. Swap this back to a real vector store ID once
    // those docs are uploaded to one.
    pttVectorStoreRef.current = context === 'phase2'
      ? (productVectorIdRef.current ?? termsVectorId ?? "")
      : context === 'phase5'
      ? "local:phase5-contracts"
      : (termsVectorId ?? "");

    if (!pttVectorStoreRef.current) {
      // No vector store configured — tell the AI to apologise rather than searching
      send({
        type: "response.create",
        response: {
          instructions: `You are Digital Onboarding Guide. The document search system is not configured for this session. Apologize briefly and let the customer know you cannot search the document right now. ${langTag()}`,
        },
      });
      return;
    }

    pttDocLabelRef.current = context === 'phase2'
      ? "the recommended product PDF"
      : context === 'phase4'
      ? "the costs and fees document"
      : context === 'phase5'
      ? "the contract documents"
      : context === 'phase6'
      ? "anything covered in the session"
      : context === 'terms1'
      ? "the 4money company information document"
      : context === 'terms2'
      ? "the froots GmbH document"
      : "the sustainability risks disclosure";

    // Commit the buffered audio — closes the user's speech turn on the server.
    // VAD is disabled during PTT so this is the only way OpenAI knows the turn ended.
    // We do NOT send response.create here. The transcription.completed event fires next
    // with the exact transcript. We run the search there and embed results directly
    // in response.create — bypassing the unreliable model function-call step entirely.
    pttPartialTranscriptRef.current  = "";
    pttSpeculativeSearchRef.current  = null;
    pttSearchPendingRef.current      = true;
    send({ type: "input_audio_buffer.commit" });
  }, [send, termsVectorId]);

  // Phase 1's PTT release handler — deliberately much simpler than submitPTTQuestion above.
  // This isn't document Q&A, it's the customer's actual answer to the current interview
  // question — the model needs to reason about it via the full Phase 1 system prompt and
  // tools (submit_answer/navigate/highlight_answer/explain_topic), exactly as it already does
  // for VAD-triggered turns. No vector search, no instructions override. Fired immediately
  // after commit rather than waiting for transcription.completed — mirrors how VAD-mode
  // already auto-responds without a separate transcription round-trip gating it. See
  // private-documents/after-demo/PHASE_1_PTT_PLAN.md.
  const submitPhase1Answer = useCallback(() => {
    pttActiveRef.current        = false;
    pttSearchPendingRef.current = false; // defensive — ensure no stray search branch fires
    pttContextRef.current       = 'phase1'; // response.done will see this and skip the VAD restore
    send({ type: "input_audio_buffer.commit" });
    send({ type: "response.create" });
  }, [send]);

  const sendChatMessage = useCallback((text: string) => {
    appendChatMessage(text, "user");
    setIsChatAITyping(true);
    // Persist to DB if we have a thread (Phase 2+)
    if (voiceThreadIdRef.current) {
      fetch("/api/phase/chat/message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "user", content: text }),
      }).catch(() => console.warn("[voice] failed to persist chat message"));
    }
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    });
    send({ type: "response.create", response: { output_modalities: ["text"] } });
  }, [send, appendChatMessage]);

  // Phase 6's own isolated send — never touches chatMessages, voiceThreadIdRef, or the
  // /api/phase/chat/message Thread persistence route. Also does the same document-grounded
  // search PTT already does for Phase 6, so both input channels answer consistently instead
  // of chat relying on the model's unguided knowledge — see
  // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md ("Revision 3").
  const sendPhase6ChatMessage = useCallback(async (text: string) => {
    appendPhase6ChatMessage(text, "user");
    setIsChatAITyping(true);
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    });

    if (!termsVectorId) {
      send({
        type: "response.create",
        response: {
          output_modalities: ["text"],
          instructions: `You are Digital Onboarding Guide. The document search system is not configured for this session. Apologize briefly. ${langTag()}`,
        },
      });
      return;
    }

    try {
      const res  = await fetch("/api/documents/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: text, vectorStoreId: termsVectorId }),
      });
      const data    = await res.json() as { results?: string };
      const results = data.results ?? "";
      const instructions = (!results || results.trim() === "" || results === "No relevant content found.")
        ? `Sie sind Digital Onboarding Guide. ${langTag()} Die Suche hat für diese Frage keine passende Antwort gefunden. Teilen Sie dem Kunden freundlich mit, dass diese spezifische Information nicht verfügbar ist, und laden Sie ihn ein, eine andere Frage zu stellen.`
        : `Sie sind Digital Onboarding Guide. ${langTag()} Die Dokumentensuche hat folgende Informationen geliefert:\n\n${results}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.`;
      send({ type: "response.create", response: { output_modalities: ["text"], instructions } });
    } catch {
      send({
        type: "response.create",
        response: {
          output_modalities: ["text"],
          instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Bei der Dokumentensuche ist ein technischer Fehler aufgetreten. Entschuldigen Sie sich kurz und bitten Sie den Kunden, es erneut zu versuchen.`,
        },
      });
    }
  }, [send, appendPhase6ChatMessage, termsVectorId]);

  return {
    state,
    started,
    analyserNode,
    micAnalyserNode,
    micDenied,
    retryMicAccess,
    recordingDisclaimerConfirmed,
    confirmRecordingDisclaimer,
    languageSelected,
    selectLanguage,
    isAISpeaking,
    bargeInActive,
    voiceAnswerCount,
    pendingVoiceAnswer,
    savedAnswers,
    explainOverlayData,
    explainTriggerClose,
    chatMessages,
    phase6ChatMessages,
    voicePhase,
    termsSubStep,
    productSuggestion,
    advanceToPersonalInfo,
    isTransitioningToPersonalInfo,
    onPersonalInfoSubmitted,
    confirmInvestment,
    confirmContracts,
    confirmReadyToSign,
    isTransitioningToSigning,
    primeReconnectAudio,
    isRevisiting,
    scrollCarousel,
    revisitQuestions,
    advancePhase,
    moveToTerms1,
    confirmTerms1,
    confirmTerms2,
    confirmSustainabilityTerms,
    notifyChatOpen,
    startSession,
    toggleMute,
    onAnswerConfirmed,
    clearPendingVoiceAnswer,
    onPrev,
    skipQuestion,
    stopAudio,
    skipPendingTransition,
    activeCardId,
    requestExplanation,
    closeExplainOverlay,
    sendChatMessage,
    sendPhase6ChatMessage,
    startPTT,
    submitPTTQuestion,
    submitPhase1Answer,
    isChatAITyping,
    fastMode,
    toggleFastMode,
    postExplainReaskId,
    clearPostExplainReask,
  };
}

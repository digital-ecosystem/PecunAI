import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import type { Action, VoiceSessionState, ProductData, ExplainOverlayData, ChatMessage } from "./types";

export type TermsSubStep = 'intro' | 'terms1' | 'terms2' | 'sustainabilityTerms' | null;
export type PttContext    = 'terms1' | 'terms2' | 'sustainabilityTerms' | 'phase1' | 'phase2' | 'phase4' | 'phase5' | 'phase6' | null;

export interface VoiceContext {
  // Session config
  sessionId:     string;
  termsVectorId: string | null;
  router:        { push: (path: string) => void };

  // Stable callbacks
  send:               (msg: object) => void;
  dispatch:           Dispatch<Action>;
  setCard:            (id: string | null) => void;
  appendChatMessage:  (text: string, sender: "ai" | "user", questionId?: string) => void;
  appendPhase6ChatMessage: (text: string, sender: "ai" | "user") => void;
  saveAnswer:         (questionId: string, value: string) => Promise<void>;
  saveVoiceState:     (questionIndex: number) => Promise<void>;
  advancePhase:       () => Promise<void>;
  scheduleAIDone:     () => void;
  scheduleChunk:      (base64: string) => void;
  handleFunctionCall: (name: string, args: string, callId: string) => Promise<void>;
  disconnectVoice:    () => void;
  reconnectVoice:     () => Promise<void>;
  advanceToPersonalInfo: () => void;
  confirmInvestment:     () => Promise<void>;
  confirmContracts:      () => void;
  confirmReadyToSign:    () => void;

  // State setters
  setIsAISpeaking:          (v: boolean) => void;
  setBargeInActive:         (v: boolean) => void;
  setSavedAnswers:          Dispatch<SetStateAction<Record<string, string>>>;
  setChatMessages:          Dispatch<SetStateAction<ChatMessage[]>>;
  setIsChatAITyping:        (v: boolean) => void;
  setPendingVoiceAnswer:    (v: { questionId: string; value: string; label: string } | null) => void;
  setExplainOverlayData:    (v: ExplainOverlayData | null) => void;
  setExplainTriggerClose:   (v: boolean) => void;
  setTermsSubStep:          (v: TermsSubStep) => void;
  setVoicePhase:            (v: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  setProductSuggestion:     (v: ProductData | null) => void;
  setVoiceAnswerCount:      Dispatch<SetStateAction<number>>;
  setIsRevisiting_internal: (v: boolean) => void;
  setMicAnalyserNode:       (v: AnalyserNode | null) => void;

  // Refs
  wsRef:                     MutableRefObject<WebSocket | null>;
  audioCtxRef:               MutableRefObject<AudioContext | null>;
  gainRef:                   MutableRefObject<GainNode | null>;
  analyserRef:               MutableRefObject<AnalyserNode | null>;
  nextPlayTimeRef:           MutableRefObject<number>;
  audioEndTimer:             MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pendingCall:               MutableRefObject<{ callId: string; name: string; args: string } | null>;
  aiTextBufferRef:           MutableRefObject<string>;
  aiAudioTranscriptRef:      MutableRefObject<string>;
  lastAITranscriptRef:       MutableRefObject<string>;
  pendingVoiceTranscriptRef: MutableRefObject<string | null>;
  currentSpeechItemIdRef:    MutableRefObject<string | null>;
  applyPendingTranscriptRef: MutableRefObject<((transcript: string) => void) | null>;
  needsTranscriptBubbleRef:  MutableRefObject<boolean>;
  questionsRef:              MutableRefObject<CarouselQuestion[]>;
  stateRef:                  MutableRefObject<VoiceSessionState>;
  micStreamRef:              MutableRefObject<MediaStream | null>;
  micSourceRef:              MutableRefObject<MediaStreamAudioSourceNode | null>;
  workletNodeRef:            MutableRefObject<AudioWorkletNode | null>;
  micAnalyserRef:            MutableRefObject<AnalyserNode | null>;
  mutedRef:                  MutableRefObject<boolean>;
  explainOpenRef:            MutableRefObject<boolean>;
  latencyStartRef:           MutableRefObject<number>;
  activeSourcesRef:          MutableRefObject<AudioBufferSourceNode[]>;
  serverResponseActiveRef:   MutableRefObject<boolean>;
  knowledgeBlockerNextQRef:  MutableRefObject<CarouselQuestion | null>;
  kbExplanationStartedRef:   MutableRefObject<boolean>;
  kbExplanationResponseIdRef:MutableRefObject<string | null>;
  pendingPhaseTransitionRef: MutableRefObject<(() => void) | null>;
  chatOpenRef:               MutableRefObject<boolean>;
  chatAnsweredRef:           MutableRefObject<number>;
  voiceThreadIdRef:          MutableRefObject<string | null>;
  explainIdleTimerRef:       MutableRefObject<ReturnType<typeof setTimeout> | null>;
  resetExplainIdleRef:       MutableRefObject<() => void>;
  productVectorIdRef:        MutableRefObject<string | null>;
  productRef:                MutableRefObject<ProductData | null>;
  pttVectorStoreRef:         MutableRefObject<string>;
  pttActiveRef:              MutableRefObject<boolean>;
  pttContextRef:             MutableRefObject<PttContext>;
  pttSearchPendingRef:       MutableRefObject<boolean>;
  pttDocLabelRef:            MutableRefObject<string>;
  pttPartialTranscriptRef:   MutableRefObject<string>;
  pttSpeculativeSearchRef:   MutableRefObject<Promise<string> | null>;
  savedAnswersRef:           MutableRefObject<Record<string, string>>;
  answeredIdsRef:            MutableRefObject<Set<string>>;
  skippedIdsRef:             MutableRefObject<Set<string>>;
  explainedQuestionsRef:     MutableRefObject<Set<string>>;
  activeCardIdRef:           MutableRefObject<string | null>;
  voicePhaseRef:             MutableRefObject<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>;
  termsSubStepRef:           MutableRefObject<TermsSubStep>;
  langRef:                   MutableRefObject<"de" | "en">;
  isRevisitingRef:           MutableRefObject<boolean>;
  sustainabilityConfirmedRef:MutableRefObject<boolean>;
  micGrantedRef:             MutableRefObject<boolean | null>;
  isAISpeakingRef:           MutableRefObject<boolean>;
  bargeInActiveRef:          MutableRefObject<boolean>;
  sessionConfiguredRef:      MutableRefObject<boolean>;
  initialIndexRef:           MutableRefObject<number>;
  circleBackActiveRef:       MutableRefObject<boolean>;
  skipInProgressRef:         MutableRefObject<boolean>;
  prevInProgressRef:         MutableRefObject<boolean>;
  scrollDebounceTimerRef:    MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

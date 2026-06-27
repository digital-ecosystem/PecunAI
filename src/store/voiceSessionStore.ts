import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────

export interface VoiceSessionSnapshot {
  sessionId:    string | null;
  voicePhase:   0 | 1 | 2;
  termsSubStep: "intro" | "terms1" | "terms2" | "sustainabilityTerms" | null;
  activeCardId: string | null;
  // Arrays (not Sets) — JSON-serializable for localStorage persistence.
  // Convert to Set only when O(1) lookup is needed.
  answeredIds:  string[];
  skippedIds:   string[];
  savedAnswers: Record<string, string>;
  // True while customer is in Phase 1 revisit mode. Persisted so the auto-advance
  // guard survives browser close/reopen without looping back to Phase 2.
  isRevisiting: boolean;
}

interface VoiceSessionActions {
  hydrate:          (data: Partial<VoiceSessionSnapshot> & { sessionId: string }) => void;
  markAnswered:     (id: string, value: string) => void;
  markSkipped:      (id: string) => void;
  unmarkSkipped:    (id: string) => void;
  setActiveCard:    (id: string | null) => void;
  setPhase:         (phase: 0 | 1 | 2) => void;
  setTermsSubStep:  (step: VoiceSessionSnapshot["termsSubStep"]) => void;
  setIsRevisiting:  (v: boolean) => void;
  reset:            () => void;
}

type VoiceSessionStore = VoiceSessionSnapshot & VoiceSessionActions;

// ── Initial state ─────────────────────────────────────────────────

const INITIAL_STATE: VoiceSessionSnapshot = {
  sessionId:    null,
  voicePhase:   0,
  termsSubStep: "intro",
  activeCardId: null,
  answeredIds:  [],
  skippedIds:   [],
  savedAnswers: {},
  isRevisiting: false,
};

// ── Store ─────────────────────────────────────────────────────────

export const useVoiceSessionStore = create<VoiceSessionStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      hydrate: (data) =>
        set((state) => ({ ...state, ...data })),

      markAnswered: (id, value) =>
        set((state) => ({
          answeredIds:  state.answeredIds.includes(id) ? state.answeredIds : [...state.answeredIds, id],
          skippedIds:   state.skippedIds.filter((s) => s !== id),
          savedAnswers: { ...state.savedAnswers, [id]: value },
        })),

      markSkipped: (id) =>
        set((state) => ({
          skippedIds: state.skippedIds.includes(id) ? state.skippedIds : [...state.skippedIds, id],
        })),

      unmarkSkipped: (id) =>
        set((state) => ({
          skippedIds: state.skippedIds.filter((s) => s !== id),
        })),

      setActiveCard:   (id)   => set({ activeCardId: id }),
      setPhase:        (p)    => set({ voicePhase: p }),
      setTermsSubStep: (step) => set({ termsSubStep: step }),
      setIsRevisiting: (v)    => set({ isRevisiting: v }),
      reset:           ()     => set(INITIAL_STATE),
    }),
    {
      name:    "pecunai-voice-session",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return sessionStorage; // SSR guard
        return localStorage;
      }),
      // Only persist data fields, not actions.
      partialize: (state): VoiceSessionSnapshot => ({
        sessionId:    state.sessionId,
        voicePhase:   state.voicePhase,
        termsSubStep: state.termsSubStep,
        activeCardId: state.activeCardId,
        answeredIds:  state.answeredIds,
        skippedIds:   state.skippedIds,
        savedAnswers: state.savedAnswers,
        isRevisiting: state.isRevisiting,
      }),
    }
  )
);

import { VoiceSessionState, Action } from "./types";

export const makeInitial = (startIndex = 0): VoiceSessionState => ({
  session:              "idle",
  prevSession:          null,
  currentQuestionIndex: startIndex,
  errorMessage:         null,
});

export function reducer(state: VoiceSessionState, action: Action): VoiceSessionState {
  switch (action.type) {
    case "CONNECT":         return { ...state, session: "connecting" };
    case "CONNECTED":       return { ...state, session: "greeting" };
    case "AI_SPEAKING":     return { ...state, session: "speaking" };
    case "AI_DONE":         return { ...state, session: "listening" };
    case "ANSWER_RECEIVED": return { ...state, session: state.session === "muted" ? "muted" : "processing" };
    case "ANSWER_SAVED":    return {
      ...state,
      session:              state.session === "muted" ? "muted" : "speaking",
      prevSession:          state.session === "muted" ? "speaking" : state.prevSession,
      currentQuestionIndex: state.currentQuestionIndex + 1,
    };
    case "MUTE":            return { ...state, session: "muted",   prevSession: state.session };
    case "UNMUTE":          return { ...state, session: state.prevSession ?? "listening", prevSession: null };
    case "PAUSE":           return { ...state, session: "paused" };
    case "RESUME":          return { ...state, session: "resuming" };
    case "RESUMING_DONE":   return { ...state, session: "listening" };
    case "ERROR":           return { ...state, session: "error", errorMessage: action.message };
    case "SET_INDEX":       return { ...state, currentQuestionIndex: action.index };
    case "RESET":           return makeInitial();
    default:                return state;
  }
}

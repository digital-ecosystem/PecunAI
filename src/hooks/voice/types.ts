// ── State machine types ───────────────────────────────────────────

export type SessionState =
  | "idle"
  | "connecting"
  | "greeting"
  | "speaking"
  | "listening"
  | "processing"
  | "muted"
  | "paused"
  | "resuming"
  | "error";

export type Action =
  | { type: "CONNECT" }
  | { type: "CONNECTED" }
  | { type: "AI_SPEAKING" }
  | { type: "AI_DONE" }
  | { type: "ANSWER_RECEIVED" }
  | { type: "ANSWER_SAVED" }
  | { type: "MUTE" }
  | { type: "UNMUTE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESUMING_DONE" }
  | { type: "ERROR"; message: string }
  | { type: "SET_INDEX"; index: number }
  | { type: "RESET" };

export interface VoiceSessionState {
  session:              SessionState;
  prevSession:          SessionState | null;
  currentQuestionIndex: number;
  errorMessage:         string | null;
}

// ── Domain types ──────────────────────────────────────────────────

export interface ProductData {
  id:          string;
  name:        string;
  fullName:    string;
  description: string;
  fileName:    string;
  from:        number;
  to:          number;
  risk:        string;
  riskType:    string;
  sri:         string;
  score:       number;
  aiSettings:  {
    prompt:        string;
    firstMessage?: string;
    vectorId?:     string;
  };
}

export interface ExplainOverlayStat {
  label: string;
  value: number;
  color: string;
}

export interface ExplainOverlayData {
  title:     string;
  keyPoints: string[];
  stats:     ExplainOverlayStat[];
}

export interface ChatMessage {
  id:          string;
  questionId?: string;
  text:        string;
  sender:      "ai" | "user";
  timestamp:   Date;
}

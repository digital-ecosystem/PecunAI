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

export interface ExplainOverlayData {
  title:     string;
  /** Short bullet highlights — what the AI-driven `explain_topic` overlay shows while it
   *  speaks the full explanation. Empty for the Q12/13/14 asset-knowledge overlays, which
   *  render `bodyText` instead. */
  keyPoints: string[];
  /** Long-form regulatory text rendered as headed sections in place of the bullets. Set only
   *  by ASSET_CLASS_OVERLAY (Q12/13/14), where the client requires their complete text on
   *  screen — see private-documents/after-demo/ASSET_EXPLAIN_FULL_TEXT_PLAN.md. */
  bodyText?: string;
}

export interface ChatMessage {
  id:          string;
  questionId?: string;
  text:        string;
  sender:      "ai" | "user";
  timestamp:   Date;
}

/** Which Phase 1 compliance rule an answer triggered. */
export type ComplianceStopKind = "q3" | "q4" | "q7" | "assetKnowledge";

export interface ComplianceStop {
  kind:   ComplianceStopKind;
  /** Recorded in stepData.sessionBlocked — these strings are the existing ones. */
  reason: string;
  /** Q12/13/14 only: the asset class, needed for the assistant's closing message. */
  assetTitle?: string;
}

/**
 * An answer that would end the session, held while the customer confirms it.
 * Nothing is saved and nothing is blocked until they do. See
 * private-documents/after-demo/COMPLIANCE_STOP_CONFIRMATION_PLAN.md.
 */
export interface PendingComplianceStop {
  stop:         ComplianceStop;
  questionId:   string;
  /** The answer as stored, kept so the confirm path can save it. */
  value:        string;
  /** Shown back to the customer so a misclick is visible. */
  questionText: string;
  answerLabel:  string;
  /** Voice answers need the assistant told to re-ask; tap answers do not. */
  source:       "tap" | "voice";
}

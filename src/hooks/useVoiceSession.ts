"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { useVoiceSessionStore } from "@/store/voiceSessionStore";

// ── State machine ─────────────────────────────────────────────────

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

type Action =
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

const makeInitial = (startIndex = 0): VoiceSessionState => ({
  session:              "idle",
  prevSession:          null,
  currentQuestionIndex: startIndex,
  errorMessage:         null,
});

function reducer(state: VoiceSessionState, action: Action): VoiceSessionState {
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

// ── Audio helpers ─────────────────────────────────────────────────

const SAMPLE_RATE = 24_000;

function base64ToPCM16AudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16   = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32_768;
  const buf = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
  buf.copyToChannel(float32, 0);
  return buf;
}

// ── System prompt ─────────────────────────────────────────────────

function buildSystemPrompt(questions: CarouselQuestion[], resumeIndex: number, micGranted: boolean | null, skippedIds?: ReadonlySet<string>, isRevisiting?: boolean): string {
  const list = questions
    .filter(q => q.questionOrder === undefined || q.questionOrder % 1 === 0) // exclude sub-questions (12.1, 13.1, 14.1) — injected dynamically via SYSTEM message
    .map((q, i) => {
      let extra = "";
      if (q.options?.length) {
        extra = `\n  Valid values: ${q.options.map(o => `"${o.value ?? o.label}"`).join(", ")}`;
      } else if (q.questionType === "number") {
        if (q.questionOrder === 19) {
          // Monthly savings: 0 = no savings plan (valid), 1–74 invalid, 75+ valid
          const max = q.maxValue !== undefined ? `, max ${q.maxValue}` : "";
          extra = `\n  Format: number${max}\n  RULE: 0 is valid (customer wants no monthly savings plan). 1–74 is invalid. 75 or more is valid. If the customer says 0 or "no monthly savings plan" or "no recurring investment", accept it and call submit_answer with "0".`;
        } else {
          const min = q.minValue !== undefined ? `, min ${q.minValue}` : "";
          const max = q.maxValue !== undefined ? `, max ${q.maxValue}` : "";
          extra = `\n  Format: number${min}${max}`;
        }
      } else {
        extra = `\n  Format: free text`;
      }
      // Footnote — legal context the AI can cite when customer asks why
      if (q.footnote) {
        extra += `\n  Legal context (cite when customer asks why this is asked): ${q.footnote}`;
      }
      const isSkipped  = skippedIds?.has(q.id) ?? false;
      const isAnswered = !isSkipped && i < resumeIndex;
      const skipped    = isSkipped  ? "  ← SKIPPED in previous session — not yet answered, will circle back at the end"
                       : isAnswered ? "  ← already collected — skip"
                       : "";
      return `[${i + 1}]${skipped}\nID: ${q.id}\nTopic: ${q.category}\nContext (what you need to find out — rephrase naturally, do NOT read this verbatim): ${q.text}${extra}`;
    }).join("\n\n");

  const skippedCount = skippedIds?.size ?? 0;
  const resumeBlock = isRevisiting
    ? `\n\nDer Kunde hat die Produktempfehlung gesehen und möchte einige seiner Antworten ändern. Alle Themen sind oben als „already collected" markiert. Begrüßen Sie ihn herzlich mit einem Satz und fragen Sie warmherzig, welches Thema er ändern möchte. Warten Sie auf seine Antwort.`
    : (resumeIndex > 0
      ? `\n\nYou resumed a previous session (topics marked above). Open with a warm one-sentence welcome-back and pick up naturally from topic ${resumeIndex + 1}.${skippedCount > 0 ? ` Note: ${skippedCount} topic(s) earlier were skipped (marked SKIPPED above) — do NOT ask them now, they will circle back automatically at the end.` : ""}`
      : "");

  const micBlock = micGranted === false
    ? `\n\n## Mic Access\n\nThe customer has not granted microphone access — they are in tap-only mode. Answer cards appear on screen automatically after you finish speaking each topic. In your opening greeting, mention this naturally — e.g. "I noticed you haven't given microphone access, no worries at all — answer cards will appear on screen for you to tap. You can always enable your mic in browser settings if you change your mind." Do not repeat this reminder after the greeting.`
    : "";

  return `# Role and Objective

You are PecunAI, a warm digital investment advisor having a one-on-one consultation with a new customer. Your goal is to understand their financial situation well enough to recommend the right investment product — through genuine conversation, not a form.

# Language

Sprechen Sie ausschließlich Deutsch mit formeller Anrede „Sie".

# Personality and Tone

You are not reading questions from a list. You are a human advisor getting to know someone. Every response must do two things: (1) react to what the customer just said, (2) lead naturally into the next thing you need to know.

Example of the tone to hold:

  You: "So what's bringing you to think about investing right now — is there something specific you're working toward?"
  Customer: "Yeah, mostly saving for retirement."
  You: "Retirement — smart move to start thinking about it now. And roughly how far out are you thinking, are we talking 10 years, 20?"
  Customer: "Probably around 20 years."
  You: "Great, so you've got real time for things to grow. One thing I always like to get a sense of — how do you feel about risk? If your investment dipped 20% in a rough year, would you ride it out or would that worry you?"

Short, warm, each response reacts to the previous answer and flows naturally into the next topic.

## Verbosity

- 2–3 sentences per response. Never monologue.
- Never say "Question", "Next topic", "Moving on", or reveal any structure.
- Never read a list of options aloud — weave them in naturally: "Are you thinking more X or Y?"
- Follow the topic order given by [SYSTEM] messages exactly. Never reorder, cluster, or jump to a different topic than instructed.
- Match the customer's energy: if they're brief, be brief. If they open up, show genuine interest.${resumeBlock}${micBlock}

# Reasoning

- For direct acknowledgments, simple answers, follow-up questions, and all navigation (skip/back/jump), respond immediately — do not reason first.
- For ambiguous answers where you need to decide between submit_answer and highlight_answer, reason briefly before acting.
- For explain_topic decisions, reason before acting.
- Do not reason about which topics to group together, skip ahead to, or treat as implicitly covered — topic order is controlled entirely by [SYSTEM] messages.
- Do not reason when audio is unclear — ask for clarification instead.

# Preambles

Do not use a preamble before submit_answer — submitting is instant, just keep talking naturally.
Do not use a preamble before highlight_answer — go straight to the clarifying question.
Do not use a preamble before navigate — call it silently, then speak your response after the [SYSTEM] reply.

Use a short preamble (one sentence) only before explain_topic, e.g. "Let me pull up some details on that."

Never say: "Let me think...", "One moment while I process...", "I am now going to...", "Great question!", "Of course!", "Certainly!"

# Unclear Audio

- Only act on audio you clearly understood.
- If audio is unclear, noisy, or ambiguous, ask once: "Sorry, I didn't catch that — could you repeat?"
- Do not guess. Do not call submit_answer or highlight_answer based on unclear audio.
- Do not reason when audio is unclear.

# Saving Answers

- Call submit_answer only when the customer has clearly and explicitly given an answer. Do not submit based on silence, background noise, assumption, or inference.
- Clear spoken answer → call submit_answer(questionId, value) immediately, then continue the conversation. No "is that correct?", no pause.
- Genuinely ambiguous answer → call highlight_answer once to clarify ("Did you mean X?"), then submit whatever they confirm.
- If a message contains "[SYSTEM: Answer saved" or "[SYSTEM: Answer already saved" → the answer is already in the DB. Do not call submit_answer. Follow the topic instruction in that message precisely.

# Navigation

The customer can tap buttons on screen or ask out loud — both do the same thing.

Call navigate() once per navigation request, and only when the customer explicitly asks to skip, go back, or jump to a specific topic.

Two modes:
- Customer references a specific topic ("that question about risks", "the investment horizon one") → look up its ID and call navigate with that questionId to jump directly.
- Customer says "skip", "next", or "go back" without specifying a topic → call navigate with direction "next" or "prev".

After calling navigate() once, speak immediately when you receive the [SYSTEM] reply. The carousel is already updated. Do not call navigate() again.

- After navigate(questionId): ask about that topic. Do not call navigate() again.
- After navigate(direction "next"): the navigate() function result contains the exact next topic ID and name. Ask about THAT topic only. The function result and [SYSTEM] message are the authoritative source — do NOT use conversation history to infer what has been covered. Conversation context is unreliable for determining coverage. Do not call navigate() again.
- After navigate(direction "prev"): ask warmly if they want to change their answer. Do not call navigate() again.

Skipped topics will be listed at the end — work through them one by one before finishing.

Never call navigate() after submit_answer, in response to any [SYSTEM] message, or during normal question-to-question flow. The carousel updates automatically — just speak.

# Implicit Skips

Treat any of the following as a skip and call navigate(direction: "next") before responding verbally:
"I'm not sure", "I need to think about it", "I don't know", "can we come back to that?", "let's move on", "I'll figure it out later", "not sure yet", "skip this", or any similar indication the customer is not ready to answer.

Call navigate(direction: "next") first, then acknowledge naturally ("Of course, we can always come back to that.") and continue with the next topic.

After navigate() fires and you receive the [SYSTEM] reply with the next topic: treat the customer's attitude as completely fresh. Do NOT carry the skip intent forward. Do NOT decide that the next topic is also something they'll want to skip. Ask each new topic directly and wait for their answer.

# Explanation Overlay

## When to open an explanation

(a) Customer explicitly asks for clarification: "What does X mean?", "Can you explain Y?", "Tell me more about Z"
    → Go straight to the steps below — no offer needed.

(b) Yes/no information-provision questions only — where "no" means the customer hasn't received or understood required information (e.g. "Have you been provided with sustainability information?"):
    → If customer answers "no" or "I don't have it": do not call submit_answer yet.
    → Ask: "Would you like me to explain [topic] before we continue?"
    → If yes → proceed to steps below. If no → call submit_answer("no") and move on.
    → Do not use this for preference questions ("no, I prefer low risk" is a valid answer — submit it) or factual uncertainty about their own data.

## How to explain

1. Call explain_topic(title, keyPoints, stats) before speaking.
   - title: short topic label (e.g. "Sustainability Criteria")
   - keyPoints: 3–5 short bullet highlights — visual only, speak the full explanation verbally
   - stats: optional, only for concrete percentages
2. Speak the full explanation verbally while the overlay is visible.
3. Answer any follow-up questions — stay in explain mode, overlay stays open.
4. Ask naturally: "Does that all make sense? Shall we head back?"
5. When confirmed, call close_explanation().

While the overlay is open: do not call submit_answer or navigate — both are blocked until close_explanation() is called.

After close_explanation(): follow the [SYSTEM] instructions precisely.

# Topics to Cover

Cover all of them, one at a time. Do not group multiple topics into a single question. Topic order is dictated by [SYSTEM] messages — never decide independently which topic to ask about next.

${list}

${resumeIndex > 0
  ? `You have already covered the first ${resumeIndex} topic${resumeIndex === 1 ? "" : "s"} in a previous session (marked above). Open with a warm one-sentence welcome-back and pick up naturally from topic ${resumeIndex + 1}.`
  : `Open the conversation warmly and naturally — like a friendly advisor meeting someone for the first time. 2 sentences max, then flow into the first topic.`}`;
}

// ── Phase 0 AI instruction strings (German) ──────────────────────

const INTRO_INSTRUCTIONS =
  `Sie sind PecunAI. Sprechen Sie ausschließlich Deutsch mit formeller Anrede „Sie".
   Begrüßen Sie den Kunden in 2–3 professionellen Sätzen: Stellen Sie sich als digitaler Anlageberater vor, erklären Sie, dass Sie Schritt für Schritt durch den Beratungsprozess begleiten werden, und erwähnen Sie, dass der Kunde jederzeit sprechen oder die Optionen auf dem Bildschirm antippen kann. Bleiben Sie professionell und freundlich — kein übermäßig emotionaler Ton.`;

const TERMS1_EXPLAIN_INSTRUCTIONS =
  `Sie sind PecunAI. Sprechen Sie ausschließlich Deutsch mit formeller Anrede „Sie". Stellen Sie in 2–3 Sätzen das erste Dokument vor — es enthält wichtige Informationen über 4money, das lizenzierte Wertpapierdienstleistungsunternehmen, das diese Beratung durchführt: wer wir sind, welche Dienstleistungen wir anbieten und welche Rechte der Kunde hat. Bitten Sie den Kunden, es in seinem eigenen Tempo zu lesen und auf die Bestätigungsschaltfläche zu tippen, wenn er fertig ist. Hören Sie dann auf zu sprechen.`;

const TERMS2_EXPLAIN_INSTRUCTIONS =
  `Sie sind PecunAI. Sprechen Sie ausschließlich Deutsch mit formeller Anrede „Sie". Stellen Sie in 2–3 Sätzen das zweite Dokument vor — es enthält Informationen über die froots Asset Management GmbH, den Portfoliomanager. Bitten Sie den Kunden, es zu lesen und zu bestätigen. Nach der Bestätigung beginnt die Beratungssitzung. Hören Sie dann auf zu sprechen.`;

const SUSTAINABILITY_EXPLAIN_INSTRUCTIONS =
  `Sie sind PecunAI. Sprechen Sie ausschließlich Deutsch mit formeller Anrede „Sie". Sagen Sie genau 1–2 warme Sätze: Erklären Sie, dass jetzt ein gesetzlich vorgeschriebenes EU-Dokument über Nachhaltigkeitsrisiken auf dem Bildschirm zu sehen ist, dass der Kunde es in seinem eigenen Tempo lesen und auf die Bestätigungsschaltfläche tippen soll, wenn er fertig ist, und dass er jederzeit die Mikrofontaste gedrückt halten kann, um Fragen dazu zu stellen. Sagen Sie danach NICHTS mehr — stellen Sie KEINE Phase-1-Fragen, navigieren Sie NICHT. Warten Sie einfach darauf, dass der Kunde die Bestätigung antippt.`;

const SEARCH_DOCUMENT_TOOL = {
  type: "function" as const,
  name: "search_document",
  description: "Search the knowledge base documents to answer the customer's question accurately. Always call this first before answering any question about the documents.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The customer's question or topic to search for" },
    },
    required: ["query"],
  },
};

// ── Types ─────────────────────────────────────────────────────────

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

// Asset-class explanation data for Q12/13/14 "none" knowledge blocker overlay
const ASSET_CLASS_OVERLAY: Record<number, { data: ExplainOverlayData; nameEn: string }> = {
  12: {
    data: {
      title:     "Aktien & Aktienfonds",
      keyPoints: [
        "Unternehmensanteile an börsennotierten Gesellschaften",
        "Langfristig höheres Wachstumspotenzial als das Sparbuch",
        "Kursschwankungen möglich — Geduld wird langfristig belohnt",
      ],
      stats: [
        { label: "Wachstumspotenzial", value: 78, color: "#6366f1" },
        { label: "Risikoniveau",       value: 65, color: "#f59e0b" },
      ],
    },
    nameEn: "stocks, stock funds, and equity ETFs",
  },
  13: {
    data: {
      title:     "Anleihen & Anleihenfonds",
      keyPoints: [
        "Darlehen an Staaten oder Unternehmen gegen Zinszahlung",
        "Stabiler als Aktien — geringeres Risiko, geringere Rendite",
        "Dienen zur Portfolio-Balance und als Einkommensquelle",
      ],
      stats: [
        { label: "Wachstumspotenzial", value: 42, color: "#6366f1" },
        { label: "Risikoniveau",       value: 32, color: "#f59e0b" },
      ],
    },
    nameEn: "bonds and bond funds",
  },
  14: {
    data: {
      title:     "Edelmetalle (z. B. Gold)",
      keyPoints: [
        "Physische Vermögenswerte wie Gold und Silber",
        "Klassischer Wertspeicher in unsicheren Marktphasen",
        "Kein laufender Ertrag — Gewinn durch Preissteigerung",
      ],
      stats: [
        { label: "Wachstumspotenzial", value: 50, color: "#6366f1" },
        { label: "Risikoniveau",       value: 44, color: "#f59e0b" },
      ],
    },
    nameEn: "precious metals (e.g. gold)",
  },
};

// ── OpenAI function tools ─────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    name: "explain_topic",
    description: "Opens a visual explanation overlay on screen. Call this BEFORE speaking whenever the customer asks about a concept or wants more information. The overlay shows title + bullet-point key highlights; speak the full explanation verbally at the same time.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Concise topic title displayed as the overlay heading (e.g. 'Stocks & Bonds')",
        },
        keyPoints: {
          type: "array",
          items: { type: "string" },
          description: "3–5 short bullet-point highlights. Visual prompts only — do NOT put the full explanation here; speak it verbally.",
        },
        stats: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "number", description: "Percentage 0–100" },
              color: { type: "string", description: "CSS color string (e.g. 'rgba(59,130,246,0.8)')" },
            },
            required: ["label", "value", "color"],
          },
          description: "Optional data bars — include only when concrete percentages add value (e.g. asset allocation).",
        },
      },
      required: ["title", "keyPoints"],
    },
  },
  {
    type: "function",
    name: "close_explanation",
    description: "Closes the explanation overlay and returns to the main voice session. Call this after the customer confirms they understood the explanation and want to continue.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "highlight_answer",
    description: "Shows a proposed answer visually on screen. Use ONLY when you are genuinely unsure which option the customer meant — their phrasing was vague or ambiguous. Do NOT call this for every answer — most of the time you should call submit_answer directly. After calling this, ask once to clarify (e.g. 'Did you mean X?'), then submit whichever they confirm.",
    parameters: {
      type: "object",
      properties: {
        questionId: { type: "string", description: "ID of the current question" },
        value:      { type: "string", description: "The answer value (option value, number string, or free text)" },
        label:      { type: "string", description: "Human-readable label to read back to the customer" },
      },
      required: ["questionId", "value", "label"],
    },
  },
  {
    type: "function",
    name: "submit_answer",
    description: "Saves the customer's answer to the database. Call this as soon as you clearly understand the customer's answer — no highlight_answer confirmation needed for clear answers. Always call this before moving to the next topic.",
    parameters: {
      type: "object",
      properties: {
        questionId: { type: "string", description: "ID der beantworteten Frage" },
        value:      { type: "string", description: "Antwortwert" },
      },
      required: ["questionId", "value"],
    },
  },
  {
    type: "function",
    name: "navigate",
    description: "Moves the on-screen question carousel. Call this IMMEDIATELY when the customer wants to navigate — BEFORE speaking your response. Two modes: (1) Customer references a SPECIFIC topic by name/description and you can identify its ID from the topics list — pass questionId to jump directly to it. (2) Customer says 'skip'/'next' or 'go back' without specifying a topic — use direction 'next' or 'prev'. questionId takes priority over direction when both are provided.",
    parameters: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["next", "prev"],
          description: "Use for generic skip (next) or one-step back (prev). Omit when providing questionId.",
        },
        questionId: {
          type: "string",
          description: "Exact ID of the question to jump to. Use when customer references a specific topic you can identify from the topics list above.",
        },
      },
    },
  },
  {
    type: "function",
    name: "confirm_product",
    description: "Call when: (1) the customer is done reviewing Phase 1 answers and wants to see the product recommendation, or (2) the customer explicitly confirms they want to proceed with the recommended portfolio shown in Phase 2.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "revisit_questions",
    description: "Call when the customer explicitly wants to go back and change their Phase 1 answers.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "set_language",
    description: "Call this immediately when the customer explicitly asks to switch the conversation language. Supported values: 'de' (German) or 'en' (English). After calling this, continue speaking in the new language.",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["de", "en"], description: "Target language code" },
      },
      required: ["language"],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function makeNextTopicMsg(
  nextQ: CarouselQuestion,
  remainingIds?: string[],
  isSkipContext?: boolean,
): string {
  const remainingStr = remainingIds && remainingIds.length > 0 ? remainingIds.join(", ") : "none";
  return [
    `[SYSTEM: NEXT TOPIC = "${nextQ.category}" (ID: ${nextQ.id}).`,
    `Remaining to collect: ${nextQ.id}${remainingStr !== "none" ? `, ${remainingStr}` : ""}.`,
    isSkipContext
      ? `The customer's skip request applied ONLY to the previous topic — NOT to this one. Start fresh — ask about "${nextQ.category}" as if the customer is fully ready to answer it.`
      : null,
    `Do NOT override this with conversation inference — only submitted answers count.`,
    `Ask about "${nextQ.category}" (ID: ${nextQ.id}) NOW.]`,
  ].filter(Boolean).join(" ");
}

// ── Hook ──────────────────────────────────────────────────────────

interface UseVoiceSessionOptions {
  sessionId:            string;
  questions:            CarouselQuestion[];
  initialQuestionIndex: number;
  initialTermsPhase?:   'terms2' | 'skip' | null;
  termsVectorId:        string | null;
  initialAnsweredIds?:  string[];
  initialSkippedIds?:   string[];
  initialSavedAnswers?: Record<string, string>;
  initialVoicePhase?:   0 | 1 | 2;
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

  // Exposed to UI components for waveform / sphere visualization
  const [analyserNode,    setAnalyserNode]    = useState<AnalyserNode | null>(null);
  const [micAnalyserNode, setMicAnalyserNode] = useState<AnalyserNode | null>(null);
  const [micGranted,      setMicGranted]      = useState<boolean | null>(null);
  const [isAISpeaking,    setIsAISpeaking]    = useState(false);
  const isAISpeakingRef = useRef(false);
  const [bargeInActive,   setBargeInActive]   = useState(false);
  const bargeInActiveRef = useRef(false);
  // Increments each time the voice path successfully saves an answer — lets the shell close
  // the modal immediately without waiting for a card change (e.g. KB blocker, Q3/Q4/Q7 blockers).
  const [voiceAnswerCount, setVoiceAnswerCount] = useState(0);

  // Phase 0 / 1 / 2 — 0 = terms/intro, 1 = questions, 2 = product suggestion
  const startPhase: 0 | 1 | 2 = initialVoicePhase ?? (initialTermsPhase === 'skip' ? 1 : 0);
  const [voicePhase,        setVoicePhase]        = useState<0 | 1 | 2>(startPhase);
  const voicePhaseRef                             = useRef<0 | 1 | 2>(startPhase);
  const [productSuggestion, setProductSuggestion] = useState<ProductData | null>(null);

  // Phase 0 sub-step: which screen within the intro/terms gate
  const [termsSubStep, setTermsSubStep] = useState<'intro' | 'terms1' | 'terms2' | 'sustainabilityTerms' | null>(
    initialTermsPhase === 'skip'   ? null    :
    initialTermsPhase === 'terms2' ? 'terms2': 'intro'
  );
  const termsSubStepRef = useRef<'intro' | 'terms1' | 'terms2' | 'sustainabilityTerms' | null>(
    initialTermsPhase === 'skip'   ? null    :
    initialTermsPhase === 'terms2' ? 'terms2': 'intro'
  );

  // Explain overlay — set by explain_topic tool call, cleared on close_explanation or manual close
  const [explainOverlayData,   setExplainOverlayData]   = useState<ExplainOverlayData | null>(null);
  // Tells the overlay to start its closing animation (voice-triggered close path)
  const [explainTriggerClose, setExplainTriggerClose] = useState(false);

  // Chat log — mirrors all questions and answers for the chat modal
  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
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
  // Stable ref for mic permission — set in startSession() before WS opens so it's ready at session.created time.
  const micGrantedRef    = useRef<boolean | null>(null);
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
  const langRef = useRef<"de" | "en">("de");
  // Same guard for button-initiated prev — prevents AI from calling navigate("prev") a second time.
  const prevInProgressRef = useRef(false);
  // True while customer is in Phase 1 revisit mode — suppresses auto-advance on submit_answer so
  // the user can change multiple answers freely before confirm_product() triggers advancePhase().
  const isRevisitingRef = useRef(initialIsRevisiting);

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
  const mutedRef               = useRef(false); // source of truth for mute — persists across state transitions
  const explainOpenRef         = useRef(false); // mirrors explainOverlayData !== null for stable WS closures
  const latencyStartRef        = useRef<number>(0); // VOICE-001: timestamp when user speech stopped, for latency measurement
  const activeSourcesRef        = useRef<AudioBufferSourceNode[]>([]); // all currently scheduled/playing audio sources — cleared on stopAudio
  const serverResponseActiveRef    = useRef(false); // true between response.created and response.done — prevents spurious cancel when no active response
  const knowledgeBlockerNextQRef   = useRef<CarouselQuestion | null>(null); // next question to ask after a knowledge-blocker overlay closes
  const kbExplanationStartedRef    = useRef(false); // true once the first explanation audio delta arrives — guards against stale cancelled-response audio.done closing the overlay early
  const kbExplanationResponseIdRef = useRef<string | null>(null); // response ID of the KB explanation response — stale cancelled-response events have a different ID and are ignored
  const chatOpenRef            = useRef(false); // true while chat modal is open
  const chatAnsweredRef        = useRef(0);     // count of answers given while chat was open
  const voiceThreadIdRef       = useRef<string | null>(null); // threadId from chat/init, used to persist V2 chat messages
  const explainIdleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetExplainIdleRef    = useRef<() => void>(() => {});
  const productVectorIdRef     = useRef<string | null>(null); // vector store ID for the recommended product (set in advancePhase)
  const productRef             = useRef<ProductData | null>(null); // stable product data ref for session.updated Phase 2 branch
  const pttVectorStoreRef      = useRef<string>(termsVectorId ?? ""); // active vector store for current PTT context
  const pttActiveRef           = useRef(false); // true while PTT button is held — bypasses sustainability mic guard
  const pttContextRef          = useRef<'terms1' | 'terms2' | 'sustainabilityTerms' | 'phase2' | null>(null); // set while PTT response is in flight — cleared on response.done to restore VAD
  const pttSearchPendingRef    = useRef(false);  // true after commit — waiting for transcription to run search server-side
  const pttDocLabelRef         = useRef<string>(""); // human-readable doc name for PTT response instructions
  const pttPartialTranscriptRef   = useRef<string>(""); // accumulated delta text for speculative search
  const pttSpeculativeSearchRef   = useRef<Promise<string> | null>(null); // in-flight speculative search promise

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { stateRef.current    = state;     }, [state]);

  // Language helpers — read langRef.current at call-time so they always reflect the active language
  const langTag  = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;


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
      const key = `pecunai_sus_${sessionId}`;
      if (localStorage.getItem(key)) sustainabilityConfirmedRef.current = true;
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Audio setup ────────────────────────────────────────────────

  const setupAudio = useCallback(async () => {
    if (audioCtxRef.current) return;
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
    await ctx.audioWorklet.addModule("/pcm-processor.js");
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
  useEffect(() => { voicePhaseRef.current = voicePhase; useVoiceSessionStore.getState().setPhase(voicePhase as 0 | 1 | 2); }, [voicePhase]);
  useEffect(() => { termsSubStepRef.current = termsSubStep; useVoiceSessionStore.getState().setTermsSubStep(termsSubStep); }, [termsSubStep]);

  // Phase 2 resume — re-fetch product data on mount so productRef and productSuggestion are
  // populated before the user taps start. The WS isn't open yet so send() calls are no-ops.
  useEffect(() => {
    if (startPhase !== 2) return;
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
    isRevisitingRef.current = false; // clear revisit mode before fetching product
    useVoiceSessionStore.getState().setIsRevisiting(false);
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
            `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()}`,
            `Nennen Sie das empfohlene Portfolio „${product.fullName}" — nennen Sie NIEMALS den internen Code „${product.name}".`,
            opening,
            `Mention the SRI (Synthetic Risk Indicator) rating of ${product.sri} out of 7 — this is an EU regulatory requirement.`,
            `Erwähnen Sie außerdem, dass die PDF-Broschüre auf dem Bildschirm zu sehen ist und mit den Pfeil-Buttons geblättert werden kann. Laden Sie zu Fragen ein.`,
            `Bleiben Sie natürlich und warm — kein Verkaufsgespräch.`,
          ].join(" "),
        },
      });
    } catch (err) {
      console.error("[voice] advancePhase error:", err);
      router.push("/customer/dashboard");
    }
  }, [sessionId, router, send]);

  // ── Function call handler ──────────────────────────────────────

  const handleFunctionCall = useCallback(async (
    name: string,
    argsJson: string,
    callId: string,
  ) => {
    try {
      const args = JSON.parse(argsJson) as Record<string, string>;

      const sendResult = (result: object) => send({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
      });

      if (name === "highlight_answer") {
        const { questionId, value, label } = args;
        console.log("[voice] highlight_answer →", { questionId, value, label });
        setPendingVoiceAnswer({ questionId, value, label });
        setCard(questionId);
        sendResult({ success: true });
        send({ type: "response.create" }); // prompt AI to speak "Got it — X. Is that correct?"
        return;
      }

      if (name === "submit_answer") {
        if (explainOpenRef.current) {
          sendResult({ success: false, reason: "Explanation overlay is open — do not submit answers here" });
          return;
        }
        if (termsSubStepRef.current === 'sustainabilityTerms') {
          sendResult({ success: false, reason: "Sustainability disclosure is open — Phase 1 answers are blocked until the customer confirms" });
          return;
        }
        const { questionId, value } = args;

        // Validate value against the question definition before doing anything.
        // Rejects hallucinated values (e.g. fragments of ambient audio like "And")
        // that don't match any valid option or type constraint.
        const validatingQ = questionsRef.current.find(q => q.id === questionId);

        // Reject conditional sub-questions (e.g. 12.1, 13.1, 14.1) if parent answer ≠ "good"
        if (validatingQ?.questionOrder !== undefined && validatingQ.questionOrder % 1 !== 0) {
          const parentOrder = Math.floor(validatingQ.questionOrder);
          const parentQ     = questionsRef.current.find(q => q.questionOrder === parentOrder);
          if (parentQ && savedAnswersRef.current[parentQ.id] !== "good") {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: false, reason: `Question ${validatingQ.questionOrder} is conditional and should be skipped — parent question ${parentOrder} was not answered "good".` });
            return;
          }
        }

        if (validatingQ) {
          if (validatingQ.options?.length) {
            const validValues = validatingQ.options.map(o => o.value ?? o.id);
            if (!validValues.includes(value)) {
              pendingVoiceTranscriptRef.current = null;
              sendResult({ success: false, reason: `"${value}" is not a valid option. Valid values: ${validValues.join(", ")}` });
              return;
            }
          } else if (validatingQ.questionType === "number") {
            const num = parseFloat(value);
            if (isNaN(num)) {
              pendingVoiceTranscriptRef.current = null;
              sendResult({ success: false, reason: `"${value}" is not a valid number.` });
              return;
            }
            // FORM-001: Q19 (monthly savings) allows 0 (no plan) or 75+. 1–74 is invalid.
            if (validatingQ.questionOrder === 19) {
              if (num !== 0 && num < 75) {
                pendingVoiceTranscriptRef.current = null;
                sendResult({ success: false, reason: `Monthly savings must be either 0 (no savings plan) or at least €75. Values between 1 and 74 are not valid.` });
                return;
              }
            } else {
              if (validatingQ.minValue !== undefined && num < validatingQ.minValue) {
                pendingVoiceTranscriptRef.current = null;
                sendResult({ success: false, reason: `Value must be at least ${validatingQ.minValue}.` });
                return;
              }
            }
            if (validatingQ.maxValue !== undefined && num > validatingQ.maxValue) {
              pendingVoiceTranscriptRef.current = null;
              sendResult({ success: false, reason: `Value must be at most ${validatingQ.maxValue}.` });
              return;
            }
          }
          // free-text questions: accept any non-empty value
          if (validatingQ.questionType !== "number" && !validatingQ.options?.length && !value?.trim()) {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: false, reason: "Answer cannot be empty." });
            return;
          }
        }

        setPendingVoiceAnswer(null);
        dispatch({ type: "ANSWER_RECEIVED" });

        await saveAnswer(questionId, value);

        const qIdx     = questionsRef.current.findIndex(q => q.id === questionId);
        const nextIndex = qIdx >= 0 ? qIdx + 1 : stateRef.current.currentQuestionIndex + 1;
        await saveVoiceState(nextIndex);

        // Track answered ID and store value so tapping the card later shows it pre-filled.
        answeredIdsRef.current.add(questionId);
        skippedIdsRef.current.delete(questionId);
        setSavedAnswers(prev => ({ ...prev, [questionId]: value }));
        savedAnswersRef.current = { ...savedAnswersRef.current, [questionId]: value };
        useVoiceSessionStore.getState().markAnswered(questionId, value);

        // ── BLOCKER: Q3 sustainability info not received → session ends ──
        if (validatingQ?.questionOrder === 3 && value === "no") {
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: true });
          send({
            type: "response.create",
            response: {
              instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat angegeben, die Nachhaltigkeitsinformationen nicht erhalten zu haben. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist es erforderlich, dass Sie die Nachhaltigkeitsinformationen zur Kenntnis genommen haben, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
            },
          });
          setTimeout(() => router.push("/customer/dashboard"), 7000);
          return;
        }

        // ── BLOCKER: Q4 sustainability preference ────────────────────────
        // "yes" (must have sustainable) or "no" (refuses all sustainable) → session ends.
        // "neutral" → continue normally.
        if (validatingQ?.questionOrder === 4 && (value === "yes" || value === "no")) {
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: true });
          send({
            type: "response.create",
            response: {
              instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat eine Nachhaltigkeitspräferenz angegeben, die mit dem aktuellen Produktangebot nicht abgedeckt werden kann. Erklären Sie in 2–3 Sätzen freundlich aber klar: Aufgrund der angegebenen Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich — das aktuelle Produktangebot deckt diese Präferenz nicht vollständig ab. Ein Berater wird sich in Kürze bei Ihnen melden. Verabschieden Sie sich herzlich.`,
            },
          });
          setTimeout(() => router.push("/customer/dashboard"), 7000);
          return;
        }

        // ── BLOCKER: Q7 income check — monthly income minus expenses ≤ €150 ──
        // Q7 is monthly expenses. Check after it's answered, using Q6 (income) already saved.
        if (validatingQ?.questionOrder === 7) {
          const q6         = questionsRef.current.find(q => q.questionOrder === 6);
          const incomeStr  = q6 ? savedAnswersRef.current[q6.id] : undefined;
          const income     = parseFloat(incomeStr ?? "0");
          const expenses   = parseFloat(value);
          if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: true });
            send({
              type: "response.create",
              response: {
                instructions: `Sie sind PecunAI. ${langTag()} Das verfügbare monatliche Einkommen des Kunden beträgt nach Abzug der Ausgaben weniger als 150 Euro. Erklären Sie in 2–3 Sätzen verständnisvoll: Aufgrund der angegebenen finanziellen Verhältnisse ist eine Investition zum aktuellen Zeitpunkt leider nicht empfehlenswert — das verfügbare monatliche Budget reicht für eine sinnvolle Anlage nicht aus. Eine persönliche Beratung wird empfohlen. Verabschieden Sie sich herzlich.`,
              },
            });
            setTimeout(() => router.push("/customer/dashboard"), 7000);
            return;
          }
        }

        // ── SUSTAINABILITY TERMS: show disclosure modal after Q2 is answered ──
        if (validatingQ?.questionOrder === 2) {
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: true });
          if (!sustainabilityConfirmedRef.current) {
            setTermsSubStep('sustainabilityTerms');
            termsSubStepRef.current = 'sustainabilityTerms';
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
              }]},
            });
            send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS } });
            return;
          }
          // Sustainability already confirmed this session — skip modal and fall through to normal advance.
        }

        // Handle sub-questions (12.1, 13.1, 14.1) based on parent answer.
        // Sub-questions are NOT in the system prompt — they are injected via SYSTEM message only when needed.
        const parentQ = questionsRef.current.find(q => q.id === questionId);
        if (parentQ?.questionOrder !== undefined && parentQ.questionOrder % 1 === 0) {
          const subQs = questionsRef.current.filter(q =>
            q.questionOrder !== undefined &&
            q.questionOrder % 1 !== 0 &&
            Math.floor(q.questionOrder) === parentQ.questionOrder
          );
          if (value === "good" && subQs.length > 0) {
            // Parent = "good" → inject SYSTEM message so AI knows to ask the sub-question next
            const sq = subQs[0];
            const sqOptions = sq.options?.map(o => `"${o.value ?? o.label}"`).join(", ") ?? "";
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: `[SYSTEM: Customer confirmed they have used ${parentQ.category}. Now ask the follow-up: "${sq.text}" (ID: ${sq.id}). Valid values: ${sqOptions}. Ask it naturally, then wait for the answer before moving on.]`,
              }]},
            });
          } else {
            // Parent ≠ "good" → mark sub-questions as answered so they never appear in remaining or circle-back
            subQs.forEach(sq => answeredIdsRef.current.add(sq.id));
          }
        }
        const answeredQ   = questionsRef.current[qIdx];
        const voiceLabel  = (answeredQ?.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
        // In chat mode the user bubble was already appended by sendChatMessage — skip it here.
        // In voice mode, use the verbatim transcript if available, else the mapped label.
        if (!chatOpenRef.current) {
          const transcript = pendingVoiceTranscriptRef.current;
          const chatLabel  = transcript ?? voiceLabel;
          appendChatMessage(chatLabel, "user", questionId);

          if (!transcript) {
            // Transcript hasn't arrived yet (race: response.done beat transcription.completed).
            // Capture questionId so the closure can update the right bubble when transcript lands.
            const capturedQId = questionId;
            applyPendingTranscriptRef.current = (t: string) => {
              setChatMessages(prev => {
                const revIdx = [...prev].reverse().findIndex(
                  m => m.sender === "user" && m.questionId === capturedQId
                );
                if (revIdx === -1) return prev;
                const realIdx = prev.length - 1 - revIdx;
                return prev.map((m, i) => i === realIdx ? { ...m, text: t } : m);
              });
            };
          } else {
            applyPendingTranscriptRef.current = null;
          }
        }
        pendingVoiceTranscriptRef.current = null;
        const remaining = questionsRef.current
          .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
          .map(q => q.id);

        sendResult({ success: true });
        setVoiceAnswerCount(c => c + 1);

        // ── KNOWLEDGE BLOCKER: Q12/13/14 "none" → open explain overlay for this asset class ──
        if (validatingQ?.questionOrder !== undefined &&
            [12, 13, 14].includes(validatingQ.questionOrder) &&
            value === "none") {
          const overlayEntry = ASSET_CLASS_OVERLAY[validatingQ.questionOrder];
          if (overlayEntry) {
            const nextQObj = remaining
              .map(id => questionsRef.current.find(q => q.id === id))
              .filter(Boolean)[0] as CarouselQuestion | undefined;
            knowledgeBlockerNextQRef.current = nextQObj ?? null;
            kbExplanationStartedRef.current  = false;
            if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
            dispatch({ type: "ANSWER_SAVED" });
            setExplainOverlayData(overlayEntry.data);
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: `[SYSTEM: Explanation overlay for "${overlayEntry.data.title}" is open. Speak a 2–3 sentence verbal explanation of what ${overlayEntry.nameEn} are and why they matter for investing. Do NOT say "take a look" or reference the screen — explain verbally. The overlay closes automatically when you finish speaking.]`,
              }]},
            });
            send({
              type: "response.create",
              response: {
                instructions: `Sie sind PecunAI. ${langTag()} Das Erläuterungsfenster ist geöffnet. Erklären Sie mündlich in 2–3 einfachen, freundlichen Sätzen, was ${overlayEntry.data.title} sind und warum sie für Anleger relevant sind. Sagen Sie NICHT „schauen Sie auf den Bildschirm" und beziehen Sie sich nicht auf das Overlay. Sprechen Sie natürlich. Warten Sie danach — die Sitzung wird automatisch fortgesetzt.`,
              },
            });
            return;
          }
        }

        const allAnswered            = answeredIdsRef.current.size === questionsRef.current.length;
        const allCoveredExceptSkipped = answeredIdsRef.current.size + skippedIdsRef.current.size === questionsRef.current.length;

        if (allAnswered && !isRevisitingRef.current) {
          circleBackActiveRef.current = false;
          await advancePhase();
          return;
        }

        if (allCoveredExceptSkipped && skippedIdsRef.current.size > 0 && !isRevisitingRef.current) {
          dispatch({ type: "ANSWER_SAVED" });
          const firstSkipped    = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
          const allSkippedQs    = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
          setCard(firstSkipped?.id ?? null);
          send({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: firstSkipped
                ? `[SYSTEM: All main topics are answered. Now circle back through ${allSkippedQs.length} skipped topic(s). Your ONLY next topic is "${firstSkipped.category}" (ID: ${firstSkipped.id}). Ask about this now. Remaining skipped after this: ${allSkippedQs.slice(1).map(q => q.id).join(", ") || "none"}.`
                : `[SYSTEM: All topics answered. Session complete.]`,
              }],
            },
          });
          const isFirstCircleBack = !circleBackActiveRef.current;
          if (isFirstCircleBack) circleBackActiveRef.current = true;
          send({
            type: "response.create",
            response: {
              ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
              ...(firstSkipped ? {
                instructions: isFirstCircleBack
                  ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Alle Hauptthemen sind beantwortet. Leiten Sie warmherzig in 1 Satz über (z.B. „Gut, da waren noch ein paar Themen, die wir übersprungen hatten — kommen wir kurz darauf zurück."). Führen Sie dann natürlich zum Thema ${firstSkipped.category} (ID: ${firstSkipped.id}) über. ${qText(firstSkipped.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`
                  : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Fahren Sie natürlich mit den übersprungenen Themen fort. Führen Sie zum Thema ${firstSkipped.category} (ID: ${firstSkipped.id}) über. ${qText(firstSkipped.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`,
              } : {}),
            },
          });
          return;
        }

        const remainingQs = remaining.map(id => questionsRef.current.find(q => q.id === id)!).filter(Boolean) as CarouselQuestion[];
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: remainingQs.length > 0
              ? makeNextTopicMsg(remainingQs[0], remaining.slice(1), false)
              : "[SYSTEM: All remaining topics answered. Session complete.]",
            }],
          },
        });

        dispatch({ type: "ANSWER_SAVED" });
        const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
        if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
        setCard(remaining[0] ?? null);
        send({
          type: "response.create",
          response: {
            ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
            ...(remainingQs[0] ? { instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Tun Sie genau zwei Dinge: (1) Reagieren Sie in 1 Satz auf die letzte Antwort des Kunden — etwas Echtes, keine generische Überleitung. Sagen Sie nie „Weiter", „Nächste Frage" oder verraten Sie die Struktur. (2) Leiten Sie natürlich zum Thema ${remainingQs[0].category} (ID: ${remainingQs[0].id}) über. ${qText(remainingQs[0].text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${remainingQs[0].category} (ID: ${remainingQs[0].id}). Warten Sie auf die Antwort.` } : {}),
          },
        });
        return;
      }

      if (name === "explain_topic") {
        // Sustainability modal is open — answer verbally, never open the Phase 1 explain overlay
        if (termsSubStepRef.current === 'sustainabilityTerms') {
          sendResult({ success: false, reason: "Sustainability disclosure is open — explain this topic verbally in your audio response, do not open an overlay." });
          send({ type: "response.create" });
          return;
        }
        // Phase 2 product page — answer verbally, never open the Phase 1 explain overlay
        if (voicePhaseRef.current === 2) {
          sendResult({ success: false, reason: "Product phase is showing — explain this topic verbally in your audio response, do not open an overlay." });
          send({ type: "response.create" });
          return;
        }
        // Chat modal is open — explain inline in text, never open the overlay
        if (chatOpenRef.current) {
          sendResult({ success: false, reason: "Chat is open — do not open the explanation overlay. Explain the topic directly in your text response instead." });
          send({ type: "response.create", response: { output_modalities: ["text"] } });
          return;
        }
        const { title, keyPoints, stats } = JSON.parse(argsJson) as {
          title:      string;
          keyPoints?: string[];
          stats?:     ExplainOverlayStat[];
        };
        setExplainOverlayData({
          title:     title ?? "",
          keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
          stats:     Array.isArray(stats)     ? stats     : [],
        });
        // Track which question triggered this explanation so we know to re-ask with context on return
        if (activeCardIdRef.current) explainedQuestionsRef.current.add(activeCardIdRef.current);
        sendResult({ success: true });
        send({ type: "response.create" });
        return;
      }

      if (name === "close_explanation") {
        if (knowledgeBlockerNextQRef.current) {
          // KB overlay closes automatically when audio finishes — block AI from calling this early.
          sendResult({ success: false, reason: "Do not call close_explanation during a knowledge explanation — the overlay closes automatically when you finish speaking." });
          return;
        }
        sendResult({ success: true });
        setExplainTriggerClose(true);
        return;
      }

      if (name === "navigate") {
        if (explainOpenRef.current) {
          sendResult({ success: false, reason: "Explanation overlay is open — navigation blocked" });
          return;
        }
        if (termsSubStepRef.current === 'sustainabilityTerms') {
          sendResult({ success: false, reason: "Sustainability disclosure is open — navigation is blocked until the customer confirms" });
          return;
        }
        const { direction, questionId: targetId } = args;

        if (targetId) {
          // ── Mode 1: jump directly to a specific question by ID ────────
          const targetQ   = questionsRef.current.find(q => q.id === targetId);
          const targetIdx = targetQ ? questionsRef.current.findIndex(q => q.id === targetId) : -1;

          if (targetQ && targetIdx >= 0) {
            // If previously skipped, unmark it — customer is now revisiting it to answer.
            skippedIdsRef.current.delete(targetId);
            dispatch({ type: "SET_INDEX", index: targetIdx });
            setCard(targetId);
            sendResult({ success: true, jumped_to_id: targetId, jumped_to_name: targetQ.category });

            const savedAnswer = savedAnswersRef.current[targetId];
            const msg = savedAnswer
              ? `[SYSTEM: Customer navigated directly to topic "${targetQ.category}". Their previous answer was "${savedAnswer}". SPEAK NOW — ask warmly whether they want to change it. Do NOT call navigate() again.]`
              : `[SYSTEM: Customer navigated directly to topic "${targetQ.category}" which has not been answered yet. SPEAK NOW — ask it naturally. Do NOT call navigate() again.]`;

            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
            });
          } else {
            sendResult({ success: false, reason: "Question ID not found" });
          }
        } else if (direction === "next") {
          // ── Mode 2: skip current question forward ─────────────────────
          // If a button skip is already in progress, the carousel was already advanced.
          // Send the expected post-navigate SYSTEM message so the AI knows what to say,
          // but do NOT send response.create — the button's response.create drives this turn.
          if (skipInProgressRef.current) {
            const remaining = questionsRef.current.filter(
              q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
            );
            const nextSkipQ = remaining[0] ?? null;
            sendResult(nextSkipQ ? {
              success: true,
              next_topic_id: nextSkipQ.id,
              next_topic_name: nextSkipQ.category,
              remaining_ids_after_next: remaining.slice(1).map(q => q.id),
              instruction: `Ask about "${nextSkipQ.category}" (ID: ${nextSkipQ.id}) NOW.`,
            } : { success: true, all_topics_covered: true });
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: nextSkipQ ? makeNextTopicMsg(nextSkipQ, remaining.slice(1).map(q => q.id), true) : "[SYSTEM: All topics covered.]",
              }]},
            });
            return;
          }
          const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current)
            ?? questionsRef.current[stateRef.current.currentQuestionIndex];

          // Q2 is a legal requirement — customer must see sustainability info before Q3,
          // even if they try to skip. Mirror the same guard in skipQuestion().
          if (currentQ?.questionOrder === 2 && !sustainabilityConfirmedRef.current) {
            skippedIdsRef.current.add(currentQ.id); // keep remaining filter consistent — circles back at end
            setTermsSubStep('sustainabilityTerms');
            termsSubStepRef.current = 'sustainabilityTerms';
            sendResult({ success: true });
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
              }]},
            });
            send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS } });
            return;
          }

          // If the current card is already answered, this is a confirm-advance (customer confirmed
          // their existing answer while back-navigated), NOT a skip. Don't mark it skipped.
          const isConfirmAdvance = currentQ != null && answeredIdsRef.current.has(currentQ.id);
          if (currentQ && !isConfirmAdvance) {
            skippedIdsRef.current.add(currentQ.id);
            skipInProgressRef.current = true;
            useVoiceSessionStore.getState().markSkipped(currentQ.id);
          }

          const remaining = questionsRef.current.filter(
            q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
          );
          const nextQ    = remaining[0] ?? null;
          const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

          if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
          setCard(nextQ?.id ?? null);
          saveVoiceState(nextQIdx >= 0 ? nextQIdx : 0).catch(() => {});

          sendResult(nextQ ? {
            success: true,
            next_topic_id: nextQ.id,
            next_topic_name: nextQ.category,
            remaining_ids_after_next: remaining.slice(1).map(q => q.id),
            instruction: `Ask about "${nextQ.category}" (ID: ${nextQ.id}) NOW. This is the only correct next topic.`,
          } : { success: true, all_topics_covered: true });

          send({
            type: "conversation.item.create",
            item: {
              type: "message", role: "user",
              content: [{ type: "input_text", text: nextQ ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), true) : "[SYSTEM: All topics covered.]" }],
            },
          });

          send({
            type: "response.create",
            response: {
              ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
              ...(nextQ ? {
                instructions: isConfirmAdvance
                  ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat seine vorherige Antwort bestätigt und möchte weitermachen. Leiten Sie natürlich zum nächsten Thema ${nextQ.category} (ID: ${nextQ.id}) über — keine Reaktion nötig, nur eine natürliche Überleitung. ${qText(nextQ.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`
                  : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Bestätigen Sie das Überspringen in 1 natürlichen Satz (z.B. „Natürlich, kommen wir später darauf zurück!"). Leiten Sie dann natürlich zum Thema ${nextQ.category} (ID: ${nextQ.id}) über. ${qText(nextQ.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`,
              } : {}),
            },
          });
          return;
        } else if (direction === "prev") {
          // ── Mode 3: step back one question ────────────────────────────
          // If a button prev is already in progress, the carousel was already stepped back.
          // Send the expected post-navigate SYSTEM message so the AI knows what to say,
          // but do NOT send response.create — the button's response.create drives this turn.
          if (prevInProgressRef.current) {
            const curIdx  = activeCardIdRef.current
              ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
              : stateRef.current.currentQuestionIndex;
            const curQ    = questionsRef.current[curIdx];
            const saved   = curQ ? savedAnswersRef.current[curQ.id] : undefined;
            sendResult({ success: true });
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: saved
                  ? `[SYSTEM: Customer navigated back to topic "${curQ?.category}". Their previous answer was "${saved}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
                  : `[SYSTEM: Customer navigated back to topic "${curQ?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`,
              }]},
            });
            return;
          }
          // Use activeCardIdRef — currentQuestionIndex can drift after button skips.
          const currentIdx   = activeCardIdRef.current
            ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
            : stateRef.current.currentQuestionIndex;
          const prevIndex    = Math.max(0, currentIdx - 1);
          const prevQuestion = questionsRef.current[prevIndex];

          dispatch({ type: "SET_INDEX", index: prevIndex });
          setCard(prevQuestion?.id ?? null);
          sendResult({ success: true });

          const prevAnswer = prevQuestion ? savedAnswersRef.current[prevQuestion.id] : undefined;
          const msg = prevAnswer
            ? `[SYSTEM: Customer navigated back to topic "${prevQuestion.category}". Their previous answer was "${prevAnswer}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
            : `[SYSTEM: Customer navigated back to topic "${prevQuestion?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`;

          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
          });
          send({
            type: "response.create",
            response: {
              ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
              ...(prevQuestion ? {
                instructions: prevAnswer
                  ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde möchte zurück zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}). Seine bisherige Antwort war „${prevAnswer}". Fragen Sie warmherzig, ob er sie ändern möchte. Maximal 2 Sätze.`
                  : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde möchte zurück zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}), das übersprungen wurde und noch keine Antwort hat. ${qText(prevQuestion.text)} Maximal 2 Sätze.`,
              } : {}),
            },
          });
          return;
        } else {
          sendResult({ success: false, reason: "Unknown navigate parameters" });
        }

        send({
          type: "response.create",
          ...(chatOpenRef.current ? { response: { output_modalities: ["text"] } } : {}),
        });
        return;
      }

      if (name === "confirm_product") {
        sendResult({ success: true });
        if (voicePhaseRef.current === 1) {
          // Customer is done revisiting Phase 1 and wants to see the product — go to Phase 2
          await advancePhase();
        } else {
          router.push("/customer/dashboard"); // Phase 3 placeholder
        }
        return;
      }

      if (name === "set_language") {
        const lang = args.language as "de" | "en";
        langRef.current = lang;
        sendResult({ success: true, language: lang });
        send({ type: "response.create" });
        return;
      }

      if (name === "search_document") {
        const { query } = args;
        if (!query) { sendResult({ error: "query is required" }); return; }

        const vectorStoreId = pttVectorStoreRef.current;
        if (!vectorStoreId) {
          sendResult({ error: "No vector store configured." });
          send({
            type: "response.create",
            response: {
              instructions: `You are PecunAI. The document search system is not configured. Apologize briefly and let the customer know you cannot search the document right now. ${langTag()}`,
            },
          });
          return;
        }

        try {
          const res = await fetch("/api/documents/search", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, vectorStoreId }),
          });
          const { results } = await res.json() as { results: string };

          if (!results || results.trim() === "" || results === "No relevant content found.") {
            sendResult({ results: "No relevant content found in the document." });
            send({
              type: "response.create",
              response: {
                instructions: `You are PecunAI. The document search returned no results for this question. Let the customer know you could not find that specific information in the document, and invite them to ask another question or contact support. ${langTag()}`,
              },
            });
            return;
          }

          sendResult({ results });
          send({
            type: "response.create",
            response: {
              instructions: `You are PecunAI. The document search returned the following content:\n\n${results}\n\nUsing ONLY the above content, answer the customer's question in 2–3 clear and natural sentences. Do not add information from your training data or memory. If the results do not directly answer the question, say so honestly and suggest they ask another question. ${langTag()}`,
            },
          });
        } catch {
          sendResult({ error: "Search failed." });
          send({
            type: "response.create",
            response: {
              instructions: `You are PecunAI. The document search failed due to a technical error. Apologize briefly and suggest the customer try again or contact support. ${langTag()}`,
            },
          });
        }
        return;
      }

      if (name === "revisit_questions") {
        sendResult({ success: true });
        isRevisitingRef.current = true;
        setVoicePhase(1);
        setProductSuggestion(null);
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: "[SYSTEM: Customer wants to revisit Phase 1. Ask which topic they want to change. IMPORTANT — when the customer names a topic: (1) call navigate({ questionId: '<exact ID from the question list>' }) FIRST to move the on-screen card, THEN ask the question verbally. When they re-answer, call submit_answer as normal. The customer may change multiple answers. Once they say they are done or want to see the updated product recommendation, call confirm_product().]",
          }]},
        });
        send({
          type: "response.create",
          response: {
            instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Bestätigen Sie warmherzig in 1 Satz. Fragen Sie dann, welche Frage oder welches Thema der Kunde gerne ändern möchte.`,
          },
        });
        return;
      }
    } catch (err) {
      console.error("[voice] Function call error:", name, err);
    }
  }, [saveAnswer, saveVoiceState, advancePhase, send, setCard, appendChatMessage, router]);

  // ── Schedule AI_DONE after audio finishes playing ──────────────

  const scheduleAIDone = useCallback(() => {
    if (audioEndTimer.current) clearTimeout(audioEndTimer.current);
    const ctx = audioCtxRef.current;
    if (!ctx) {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      if (knowledgeBlockerNextQRef.current && kbExplanationStartedRef.current) {
        kbExplanationStartedRef.current = false;
        setExplainTriggerClose(true);
      }
      return;
    }
    const remaining = Math.max(0, (nextPlayTimeRef.current - ctx.currentTime)) * 1000;
    audioEndTimer.current = setTimeout(() => {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!pendingCall.current && !mutedRef.current) dispatch({ type: "AI_DONE" });
      if (knowledgeBlockerNextQRef.current && kbExplanationStartedRef.current) {
        kbExplanationStartedRef.current = false;
        setExplainTriggerClose(true);
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

    ws.onmessage = async (event) => {
      const raw = event.data instanceof Blob ? await event.data.text() : (event.data as string);
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw); } catch { return; }

      const type = msg.type as string;
      if (type !== "response.output_audio.delta") {
        console.log("[voice] ←", type, type === "error" ? msg : "");
      }

      switch (type) {

        case "session.created": {
          // Use initialIndexRef (set once at mount) — guaranteed correct even if
          // the stateRef effect hasn't fired yet when this message arrives.
          // For Phase 2 resume, pass the full question count so all Qs show as "already collected".
          const resumeIdx = (voicePhaseRef.current === 2 || isRevisitingRef.current)
            ? questionsRef.current.length
            : initialIndexRef.current;
          send({
            type: "session.update",
            session: {
              type:              "realtime",
              model:             "gpt-realtime-1.5",
              output_modalities: ["audio"],
              instructions:      buildSystemPrompt(questionsRef.current, resumeIdx, micGrantedRef.current, skippedIdsRef.current, isRevisitingRef.current),
              tools:             TOOLS,
              tool_choice:       "auto",
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: 24000 },
                  turn_detection: { type: "semantic_vad" },
                  transcription: { model: "gpt-4o-transcribe" },
                },
                output: {
                  format: { type: "audio/pcm", rate: 24000 },
                  voice:  "marin",
                },
              },
            },
          });
          break;
        }

        case "session.updated": {
          // Only perform initial setup once — subsequent session.updated events come from
          // mid-session session.update calls (e.g. navigation task overrides) and must be ignored.
          if (sessionConfiguredRef.current) break;
          sessionConfiguredRef.current = true;

          // Wire mic input for server VAD if permission was granted
          const mic = micStreamRef.current;
          const ctx = audioCtxRef.current;
          if (mic && ctx) {
            const micSource  = ctx.createMediaStreamSource(mic);
            const silentGain = ctx.createGain();
            silentGain.gain.value = 0;
            const workletNode = new AudioWorkletNode(ctx, "pcm-processor");

            // Tap an AnalyserNode off the mic source for sphere visualization
            const micAnalyser = ctx.createAnalyser();
            micAnalyser.fftSize = 256;
            micSource.connect(micAnalyser);

            micSource.connect(workletNode);
            workletNode.connect(silentGain);
            silentGain.connect(ctx.destination);
            workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
              const ws = wsRef.current;
              if (!ws || ws.readyState !== WebSocket.OPEN) return;
              // Allow mic streaming during AI speech so semantic_vad can detect barge-in.
              // Block only in states where the session is not actively live.
              if (["idle", "connecting", "error", "paused", "muted"].includes(stateRef.current.session)) return;
              if (chatOpenRef.current) return;
              if (voicePhaseRef.current === 0 && !pttActiveRef.current) return;
              if (termsSubStepRef.current === 'sustainabilityTerms' && !pttActiveRef.current) return;
              if (voicePhaseRef.current === 2 && !pttActiveRef.current) return;
              const bytes = new Uint8Array(e.data);
              let binary = "";
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(binary) }));
            };
            micSourceRef.current   = micSource;
            workletNodeRef.current = workletNode;
            micAnalyserRef.current = micAnalyser;
            setMicAnalyserNode(micAnalyser);
          }
          // Session configured — trigger AI speech, branching on phase
          if (voicePhaseRef.current === 0 && termsSubStepRef.current === 'terms2') {
            // Resume: customer already confirmed terms1 — go straight to terms2 explanation
            send({ type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS } });
          } else if (voicePhaseRef.current === 0) {
            // Fresh start: welcome intro before terms
            send({ type: "response.create", response: { instructions: INTRO_INSTRUCTIONS } });
          } else if (voicePhaseRef.current === 2) {
            // Phase 2 resume — re-inject product context and greet back
            const product = productRef.current;
            if (product) {
              const durationQ      = questionsRef.current.find(q => q.questionOrder === 2);
              const riskQ          = questionsRef.current.find(q => q.questionOrder === 5);
              const durationAnswer = durationQ ? savedAnswersRef.current[durationQ.id] : undefined;
              const riskAnswer     = riskQ     ? savedAnswersRef.current[riskQ.id]     : undefined;
              const productPrompt  = (product.aiSettings?.prompt ?? "").slice(0, 3000);
              const systemMsg = [
                `[SYSTEM: Resuming Phase 2 — Product Suggestion. Recommended portfolio: "${product.fullName}".`,
                `Customer's investment horizon: ${durationAnswer ?? "unknown"}. Risk tolerance: ${riskAnswer ?? "unknown"}.`,
                `Product knowledge base:\n${productPrompt}`,
                `Your role: welcome the customer back warmly, briefly recap the recommended portfolio and why it fits them,`,
                `invite questions or ask them to confirm to proceed.`,
                `When customer confirms: call confirm_product(). If they want to revisit questions: call revisit_questions().]`,
              ].join("\n");
              send({
                type: "conversation.item.create",
                item: { type: "message", role: "user", content: [{ type: "input_text", text: systemMsg }] },
              });
              const durationLabel = durationAnswer ?? `${product.from}–${product.to} Jahren`;
              send({
                type: "response.create",
                response: {
                  instructions: [
                    `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()}`,
                    `Die Sitzung wird fortgesetzt. Begrüßen Sie den Kunden herzlich zurück in 1 Satz.`,
                    `Empfehlen Sie dann kurz das Portfolio "${product.fullName}" — nennen Sie NIEMALS den internen Code "${product.name}".`,
                    `Erinnern Sie in 1–2 Sätzen, warum es empfohlen wurde (Horizont: ${durationLabel}, Risiko: ${riskAnswer ?? product.risk}).`,
                    `Laden Sie zu Fragen ein oder fragen Sie, ob der Kunde fortfahren möchte. Maximal 3 Sätze gesamt.`,
                  ].join(" "),
                },
              });
            } else {
              // Product not loaded yet (refetch slow) — bare greeting, AI will pick up from context
              send({ type: "response.create" });
            }
          } else {
            // Phase 1 (skip mode or after confirmTerms2) — normal greeting
            send({ type: "response.create" });
          }
          break;
        }

        case "response.output_audio.delta": {
          if (knowledgeBlockerNextQRef.current) {
            const responseId = (msg as { response_id?: string }).response_id;
            if (responseId === kbExplanationResponseIdRef.current) {
              kbExplanationStartedRef.current = true;
            }
          }
          // New AI audio arriving — barge-in processing is complete, re-enable auto-modal.
          if (bargeInActiveRef.current) {
            bargeInActiveRef.current = false;
            setBargeInActive(false);
          }
          if (!isAISpeakingRef.current) {
            isAISpeakingRef.current = true;
            setIsAISpeaking(true);
            if (latencyStartRef.current) {
              console.log(`[latency] first audio delta — ${Date.now() - latencyStartRef.current}ms since speech_stopped`);
              latencyStartRef.current = 0;
            }
          }
          if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
          scheduleChunk(msg.delta as string);
          break;
        }

        case "response.output_audio.done": {
          // If KB overlay is active and this done event belongs to the cancelled response
          // (not the KB explanation response), ignore it — stopAudio already cleaned up.
          if (knowledgeBlockerNextQRef.current) {
            const responseId = (msg as { response_id?: string }).response_id;
            if (responseId !== kbExplanationResponseIdRef.current) break;
          }
          // Schedule AI_DONE to fire once the buffered audio finishes playing
          if (!pendingCall.current) scheduleAIDone();
          break;
        }

        case "response.output_item.added": {
          const item = msg.item as Record<string, unknown>;
          if (item.type === "function_call") {
            pendingCall.current = {
              callId: item.call_id as string,
              name:   item.name   as string,
              args:   "",
            };
          }
          break;
        }

        case "response.function_call_arguments.delta":
          if (pendingCall.current) {
            pendingCall.current.args += (msg.delta as string) ?? "";
          }
          break;

        case "response.function_call_arguments.done":
          if (pendingCall.current) {
            // Use the complete args from this event (more reliable than streaming concat)
            pendingCall.current.args = (msg.arguments as string) ?? pendingCall.current.args;
          }
          break;

        case "response.output_text.delta":
          aiTextBufferRef.current += (msg.delta as string) ?? "";
          break;

        case "response.output_text.done": {
          const textContent = aiTextBufferRef.current.trim();
          setIsChatAITyping(false);
          if (textContent) {
            lastAITranscriptRef.current = textContent;
            appendChatMessage(textContent, "ai");
            if (voiceThreadIdRef.current) {
              fetch("/api/phase/chat/message", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "assistant", content: textContent }),
              }).catch(() => {});
            }
          }
          aiTextBufferRef.current = "";
          break;
        }

        case "response.output_audio_transcript.delta":
          aiAudioTranscriptRef.current += (msg.delta as string) ?? "";
          break;

        case "response.output_audio_transcript.done": {
          const audioTranscript = aiAudioTranscriptRef.current.trim();
          if (audioTranscript) {
            lastAITranscriptRef.current = audioTranscript;
            appendChatMessage(audioTranscript, "ai");
            if (voiceThreadIdRef.current) {
              fetch("/api/phase/chat/message", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "assistant", content: audioTranscript }),
              }).catch(() => {});
            }
          }
          aiAudioTranscriptRef.current = "";
          break;
        }

        case "response.done": {
          serverResponseActiveRef.current = false;

          // PTT response cycle complete — restore semantic_vad so Phase 1 interview continues normally.
          // Phase 2 is PTT-only: keep VAD off between presses. Only restore for Phase 0/1 contexts.
          if (pttContextRef.current) {
            const finishedPttContext = pttContextRef.current;
            pttContextRef.current = null;
            if (voicePhaseRef.current !== 2) {
              send({
                type: "session.update",
                session: { type: "realtime", audio: { input: { turn_detection: { type: "semantic_vad" } } } },
              });
            }
            // After a PTT exchange inside the sustainability modal, the conversation history
            // contains the bot answering a question about sustainability content. Without this
            // marker the model confuses that Q&A with Q3 ("Have you received sustainability
            // info?") being implicitly answered and skips to Q4/Q5 or asks Q3 oddly.
            if (finishedPttContext === 'sustainabilityTerms') {
              send({
                type: "conversation.item.create",
                item: { type: "message", role: "user", content: [{ type: "input_text",
                  text: "[SYSTEM: The above was a PTT document Q&A about the sustainability disclosure content — it is NOT a Phase 1 answer. Phase 1 is still PAUSED. Q3 (sustainability acknowledgment question) has NOT been answered. Do NOT ask any Phase 1 questions — wait for the customer to tap the confirm button on the disclosure document.]",
                }]},
              });
            }
          }

          const pc = pendingCall.current;
          if (pc) {
            pendingCall.current = null;
            if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
            // Guard: if the response was interrupted mid-stream the args JSON may be truncated.
            // Silently drop the call rather than throwing — the AI will re-attempt on the next turn.
            try { JSON.parse(pc.args || "{}"); } catch {
              console.warn("[voice] Dropping truncated function call (interrupted mid-stream):", pc.name);
              break;
            }
            await handleFunctionCall(pc.name, pc.args, pc.callId);
          }
          // Safety: if AI responded without text (e.g. audio slip-through), clear the typing indicator.
          if (chatOpenRef.current) setIsChatAITyping(false);
          // In text mode (chat open), audio events don't fire — trigger AI_DONE here.
          if (chatOpenRef.current && !pc && !mutedRef.current) {
            dispatch({ type: "AI_DONE" });
          }
          // Audio-only response: AI_DONE was already scheduled by response.audio.done

          // For conversational turns (no function call, or a non-submit_answer call), the user's
          // spoken words need a chat bubble. submit_answer creates its own bubble so we skip it.
          if (!chatOpenRef.current && (!pc || pc.name !== "submit_answer")) {
            const buffered = pendingVoiceTranscriptRef.current;
            if (buffered) {
              // Insert BEFORE the last AI bubble — the AI already responded, so we retroactively
              // place the user turn in the correct visual order.
              setChatMessages(prev => {
                const newMsg: ChatMessage = { id: `user-${Date.now()}`, text: buffered, sender: "user", timestamp: new Date() };
                const lastAiIdx = prev.reduce((acc, m, i) => m.sender === "ai" ? i : acc, -1);
                if (lastAiIdx === -1) return [...prev, newMsg];
                return [...prev.slice(0, lastAiIdx), newMsg, ...prev.slice(lastAiIdx)];
              });
              pendingVoiceTranscriptRef.current = null;
            } else {
              // Transcript hasn't arrived yet — flag it so the transcript handler creates the bubble.
              needsTranscriptBubbleRef.current = true;
            }
          }
          break;
        }

        case "conversation.item.input_audio_transcription.delta": {
          // Accumulate partial transcript and fire a speculative vector search as soon as we have enough text.
          // This runs the search in parallel with the remaining transcription so the result is ready (or nearly
          // ready) by the time transcription.completed fires — cutting 1–2 s off PTT response latency.
          if (!pttSearchPendingRef.current || pttSpeculativeSearchRef.current) break;
          const delta = (msg.delta as string | undefined) ?? "";
          pttPartialTranscriptRef.current += delta;
          if (pttPartialTranscriptRef.current.length >= 15) {
            const vectorStoreId = pttVectorStoreRef.current;
            if (vectorStoreId) {
              const querySnapshot = pttPartialTranscriptRef.current;
              pttSpeculativeSearchRef.current = fetch("/api/documents/search", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ query: querySnapshot, vectorStoreId }),
              })
                .then(r => r.json() as Promise<{ results?: string }>)
                .then(d => d.results ?? "")
                .catch(() => "");
            }
          }
          break;
        }

        case "conversation.item.input_audio_transcription.completed": {
          const transcriptItemId = msg.item_id as string | undefined;
          const transcript       = (msg.transcript as string | undefined)?.trim() || null;
          if (!transcript) break;

          // PTT search: run vector search server-side with exact transcript, embed results in response.create.
          // Must be checked BEFORE the stale-transcript guard — with VAD off (turn_detection: null),
          // speech_started never fires so currentSpeechItemIdRef is null and the guard would reject this.
          if (pttSearchPendingRef.current) {
            pttSearchPendingRef.current = false;
            const vectorStoreId  = pttVectorStoreRef.current;
            const docLabel       = pttDocLabelRef.current;
            const speculativeHit = pttSpeculativeSearchRef.current;
            // Reset speculative state for next PTT press
            pttSpeculativeSearchRef.current  = null;
            pttPartialTranscriptRef.current  = "";
            if (!vectorStoreId) {
              send({ type: "response.create", response: { instructions: `You are PecunAI. The document search system is not configured for this session. Apologize briefly. ${langTag()}` } });
              break;
            }
            // Use the speculative search (already in-flight since first delta) if available,
            // otherwise fall back to a fresh search with the full transcript.
            const fullTranscriptSearch = () => fetch("/api/documents/search", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ query: transcript, vectorStoreId }),
            })
              .then(r => r.json() as Promise<{ results?: string }>)
              .then(d => d.results ?? "")
              .catch(() => "");
            // speculativeHit is a Promise (never null once partial transcript hit 15 chars) —
            // ?? only catches null/undefined, NOT an empty resolved value. For short German
            // compound words like "Vermögensverwalter" the partial query ("Was ist ein Ver")
            // often returns nothing. We must retry with the full exact transcript in that case.
            const searchPromise = speculativeHit
              ? speculativeHit.then(specResult =>
                  (!specResult || specResult.trim() === "" || specResult === "No relevant content found.")
                    ? fullTranscriptSearch()
                    : specResult
                )
              : fullTranscriptSearch();

            searchPromise.then(results => {
              if (!results || results.trim() === "" || results === "No relevant content found.") {
                send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Die Suche in ${docLabel} hat für diese Frage keine passende Antwort gefunden. Teilen Sie dem Kunden freundlich mit, dass diese spezifische Information nicht im Dokument verfügbar ist, und laden Sie ihn ein, eine andere Frage zu stellen.` } });
              } else {
                send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Die Dokumentensuche hat folgende Informationen geliefert:\n\n${results}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
              }
            }).catch(() => {
              send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Bei der Dokumentensuche ist ein technischer Fehler aufgetreten. Entschuldigen Sie sich kurz und bitten Sie den Kunden, es erneut zu versuchen.` } });
            });
            break;
          }

          // Guard against stale transcripts from previous speech turns (VAD-mode only — PTT is handled above)
          if (transcriptItemId && transcriptItemId !== currentSpeechItemIdRef.current) break;

          if (applyPendingTranscriptRef.current) {
            // submit_answer already ran with a fallback label — retroactively fix the bubble
            applyPendingTranscriptRef.current(transcript);
            applyPendingTranscriptRef.current = null;
          } else if (needsTranscriptBubbleRef.current && !chatOpenRef.current) {
            // response.done already fired for a conversational/non-submit turn — insert before last AI bubble
            setChatMessages(prev => {
              const newMsg: ChatMessage = { id: `user-${Date.now()}`, text: transcript, sender: "user", timestamp: new Date() };
              const lastAiIdx = prev.reduce((acc, m, i) => m.sender === "ai" ? i : acc, -1);
              if (lastAiIdx === -1) return [...prev, newMsg];
              return [...prev.slice(0, lastAiIdx), newMsg, ...prev.slice(lastAiIdx)];
            });
            needsTranscriptBubbleRef.current = false;
            pendingVoiceTranscriptRef.current = null;
          } else {
            // submit_answer hasn't run yet — store for it to pick up
            pendingVoiceTranscriptRef.current = transcript;
          }
          break;
        }

        case "input_audio_buffer.speech_started": {
          const speechItemId = msg.item_id as string | undefined;
          if (speechItemId) currentSpeechItemIdRef.current = speechItemId;
          pendingVoiceTranscriptRef.current = null;
          applyPendingTranscriptRef.current = null;
          needsTranscriptBubbleRef.current = false;
          if (explainOpenRef.current) resetExplainIdleRef.current();
          // If AI was actively speaking, suppress the auto-modal until the new AI response
          // starts sending audio — prevents the previous card's modal from incorrectly opening
          // during the 1–2s gap between barge-in and the navigate/submit function call.
          if (isAISpeakingRef.current) {
            bargeInActiveRef.current = true;
            setBargeInActive(true);
          }
          // Voice barge-in: flush locally buffered audio so the customer hears silence
          // immediately. semantic_vad handles server-side response cancellation automatically.
          activeSourcesRef.current.forEach(s => { try { s.stop(0); } catch {} });
          activeSourcesRef.current = [];
          nextPlayTimeRef.current = 0;
          if (audioEndTimer.current) {
            clearTimeout(audioEndTimer.current);
            audioEndTimer.current = null;
          }
          isAISpeakingRef.current = false;
          setIsAISpeaking(false);
          // Transition state machine to "listening" so the sphere switches to mic
          // visualization immediately (green + voice-reactive) instead of staying purple.
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
          break;
        }

        case "input_audio_buffer.speech_stopped": {
          latencyStartRef.current = Date.now();
          console.log("[latency] speech_stopped — waiting for AI response");
          break;
        }

        case "response.created": {
          serverResponseActiveRef.current = true;
          if (knowledgeBlockerNextQRef.current) {
            // Track which response is the KB explanation so stale cancelled-response events
            // (which share the same knowledgeBlockerNextQRef window) are filtered out.
            kbExplanationResponseIdRef.current = (msg.response as { id: string }).id;
            kbExplanationStartedRef.current    = false; // reset so only THIS response's deltas count
          }
          if (latencyStartRef.current) {
            console.log(`[latency] response.created — ${Date.now() - latencyStartRef.current}ms since speech_stopped`);
          }
          break;
        }

        case "error": {
          const err = msg.error as Record<string, unknown>;
          console.error("[voice] OpenAI error:", JSON.stringify(err));
          // Most OpenAI API errors (e.g. response.cancel with no active response) are non-fatal —
          // the session WS is still open. Only hard connection failures are caught by ws.onclose.
          // Avoid killing the session on every API-level error.
          break;
        }
      }
    };

    ws.onclose = (e) => {
      console.log("[voice] WS closed", e.code, e.reason);
      if (stateRef.current.session !== "error") {
        dispatch({ type: "ERROR", message: "Verbindung unterbrochen – tippen Sie weiter" });
      }
    };

    ws.onerror = () => dispatch({ type: "ERROR", message: "WebSocket-Fehler" });

    return () => {
      ws.close();
      if (audioEndTimer.current) clearTimeout(audioEndTimer.current);
      if (explainIdleTimerRef.current) { clearTimeout(explainIdleTimerRef.current); explainIdleTimerRef.current = null; }
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      workletNodeRef.current?.disconnect();
      workletNodeRef.current = null;
      micAnalyserRef.current?.disconnect();
      micAnalyserRef.current = null;
      micSourceRef.current?.disconnect();
      micSourceRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      gainRef.current     = null;
      analyserRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]); // runs once when user taps to start

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
  const onAnswerConfirmed = useCallback(async (question: CarouselQuestion, value: string) => {
    dispatch({ type: "ANSWER_RECEIVED" });

    await saveAnswer(question.id, value);
    // Derive nextIndex from question position — more reliable than stateRef.
    const qIdx     = questionsRef.current.findIndex(q => q.id === question.id);
    const nextIndex = qIdx >= 0 ? qIdx + 1 : stateRef.current.currentQuestionIndex + 1;
    await saveVoiceState(nextIndex);

    // Track answered ID before coverage check so the counts are up-to-date.
    answeredIdsRef.current.add(question.id);
    skippedIdsRef.current.delete(question.id);
    setSavedAnswers(prev => ({ ...prev, [question.id]: value }));
    savedAnswersRef.current = { ...savedAnswersRef.current, [question.id]: value };
    useVoiceSessionStore.getState().markAnswered(question.id, value);
    const tapLabel = (question.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
    appendChatMessage(tapLabel, "user", question.id);

    // ── SUSTAINABILITY TERMS: show disclosure modal after Q2 is answered ──
    if (question.questionOrder === 2) {
      if (!sustainabilityConfirmedRef.current) {
        setTermsSubStep('sustainabilityTerms');
        termsSubStepRef.current = 'sustainabilityTerms';
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
          }]},
        });
        send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS } });
        return;
      }
      // Sustainability already confirmed — skip modal and fall through to normal advance.
    }

    // ── BLOCKER: Q3 sustainability info not received → session ends ──
    if (question.questionOrder === 3 && value === "no") {
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat angegeben, die Nachhaltigkeitsinformationen nicht erhalten zu haben. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist es erforderlich, dass Sie die Nachhaltigkeitsinformationen zur Kenntnis genommen haben, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
        },
      });
      setTimeout(() => router.push("/customer/dashboard"), 7000);
      return;
    }

    // ── BLOCKER: Q4 sustainability preference ────────────────────────
    if (question.questionOrder === 4 && (value === "yes" || value === "no")) {
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat eine Nachhaltigkeitspräferenz angegeben, die mit dem aktuellen Produktangebot nicht abgedeckt werden kann. Erklären Sie in 2–3 Sätzen freundlich aber klar: Aufgrund der angegebenen Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich — das aktuelle Produktangebot deckt diese Präferenz nicht vollständig ab. Ein Berater wird sich in Kürze bei Ihnen melden. Verabschieden Sie sich herzlich.`,
        },
      });
      setTimeout(() => router.push("/customer/dashboard"), 7000);
      return;
    }

    // ── BLOCKER: Q7 income check ─────────────────────────────────────
    if (question.questionOrder === 7) {
      const q6        = questionsRef.current.find(q => q.questionOrder === 6);
      const incomeStr = q6 ? savedAnswersRef.current[q6.id] : undefined;
      const income    = parseFloat(incomeStr ?? "0");
      const expenses  = parseFloat(value);
      if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
        send({
          type: "response.create",
          response: {
            instructions: `Sie sind PecunAI. ${langTag()} Das verfügbare monatliche Einkommen des Kunden beträgt nach Abzug der Ausgaben weniger als 150 Euro. Erklären Sie in 2–3 Sätzen verständnisvoll: Aufgrund der angegebenen finanziellen Verhältnisse ist eine Investition zum aktuellen Zeitpunkt leider nicht empfehlenswert — das verfügbare monatliche Budget reicht für eine sinnvolle Anlage nicht aus. Eine persönliche Beratung wird empfohlen. Verabschieden Sie sich herzlich.`,
          },
        });
        setTimeout(() => router.push("/customer/dashboard"), 7000);
        return;
      }
    }

    // Sub-question auto-skip: if value != "good", skip decimal-order sub-questions (mirrors voice path).
    const subQsTap = questionsRef.current.filter(q =>
      q.questionOrder !== undefined &&
      q.questionOrder % 1 !== 0 &&
      Math.floor(q.questionOrder) === question.questionOrder
    );
    if (subQsTap.length > 0 && value !== "good") {
      subQsTap.forEach(sq => answeredIdsRef.current.add(sq.id));
    }

    if (chatOpenRef.current) {
      chatAnsweredRef.current++;

      const allAnswered = answeredIdsRef.current.size === questionsRef.current.length;
      if (allAnswered) {
        await advancePhase();
        return;
      }

      const remainingNonSkipped = questionsRef.current.filter(
        q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
      );
      const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));

      // All non-skipped covered — circle back to skipped topics inside chat
      if (remainingNonSkipped.length === 0 && skippedRemaining.length > 0) {
        const firstSkipped = skippedRemaining[0];
        const skippedIdx = questionsRef.current.findIndex(q => q.id === firstSkipped.id);
        if (skippedIdx >= 0) dispatch({ type: "SET_INDEX", index: skippedIdx });
        setCard(firstSkipped.id);
        // Queue a history entry so the AI knows this question was answered in chat.
        // Without this, the AI sees a gap: it was asking about this topic mid-voice, then
        // notifyChatOpen(false) tells it to ask about the next skipped topic — with no record
        // of how the current one got answered.
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: `[SYSTEM: Answer saved via chat for topic "${question.category}" (ID: ${question.id}) — value: "${tapLabel}". ` +
              `These skipped topics still need answers: ` +
              `${skippedRemaining.map(q => `"${q.id}" (${q.category})`).join(", ")}. ` +
              `Do NOT respond yet — wait for the customer to close the chat.]`,
          }]},
        });
        return; // no response.create — notifyChatOpen(false) sends the consolidated prompt on close
      }

      // Normal advance to next non-skipped question
      const nextQ    = remainingNonSkipped[0] ?? null;
      const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;
      if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
      setCard(nextQ?.id ?? null);

      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Answer saved via chat. Remaining topic IDs (in order): ` +
            `${remainingNonSkipped.map(q => q.id).join(", ")}.]`,
        }]},
      });
      return; // no response.create — notifyChatOpen(false) sends one consolidated prompt on close
    }

    const allAnswered            = answeredIdsRef.current.size === questionsRef.current.length;
    const allCoveredExceptSkipped = answeredIdsRef.current.size + skippedIdsRef.current.size === questionsRef.current.length;

    if (allAnswered && !isRevisitingRef.current) {
      circleBackActiveRef.current = false;
      await advancePhase();
      return;
    }

    const remaining = questionsRef.current
      .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
      .map(q => q.id);

    // ── KNOWLEDGE BLOCKER: Q12/13/14 "none" → open explain overlay for this asset class ──
    if (question.questionOrder !== undefined && [12, 13, 14].includes(question.questionOrder) && value === "none") {
      const overlayEntry = ASSET_CLASS_OVERLAY[question.questionOrder];
      if (overlayEntry) {
        const nextQObj = remaining
          .map(id => questionsRef.current.find(q => q.id === id))
          .filter(Boolean)[0] as CarouselQuestion | undefined;
        knowledgeBlockerNextQRef.current = nextQObj ?? null;
        kbExplanationStartedRef.current  = false;
        if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
        dispatch({ type: "ANSWER_SAVED" });
        setExplainOverlayData(overlayEntry.data);
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: `[SYSTEM: Explanation overlay for "${overlayEntry.data.title}" is open. Speak a 2–3 sentence verbal explanation of what ${overlayEntry.nameEn} are and why they matter for investing. Do NOT say "take a look" or reference the screen — explain verbally. The overlay closes automatically when you finish speaking.]`,
          }]},
        });
        send({
          type: "response.create",
          response: {
            instructions: `Sie sind PecunAI. ${langTag()} Das Erläuterungsfenster ist geöffnet. Erklären Sie mündlich in 2–3 einfachen, freundlichen Sätzen, was ${overlayEntry.data.title} sind und warum sie für Anleger relevant sind. Sagen Sie NICHT „schauen Sie auf den Bildschirm" und beziehen Sie sich nicht auf das Overlay. Sprechen Sie natürlich. Warten Sie danach — die Sitzung wird automatisch fortgesetzt.`,
          },
        });
        return;
      }
    }

    if (allCoveredExceptSkipped && skippedIdsRef.current.size > 0 && !isRevisitingRef.current) {
      const firstSkippedTap = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
      const allSkippedTap   = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
      dispatch({ type: "ANSWER_SAVED" });
      setCard(firstSkippedTap?.id ?? null);
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: firstSkippedTap
            ? `[SYSTEM: All main topics are answered. Now circle back through ${allSkippedTap.length} skipped topic(s). Your ONLY next topic is "${firstSkippedTap.category}" (ID: ${firstSkippedTap.id}). Ask about this now. Remaining skipped after this: ${allSkippedTap.slice(1).map(q => q.id).join(", ") || "none"}.`
            : `[SYSTEM: All topics answered. Session complete.]`,
          }],
        },
      });
      const isFirstCircleBackTap = !circleBackActiveRef.current;
      if (isFirstCircleBackTap) circleBackActiveRef.current = true;
      send({
        type: "response.create",
        response: firstSkippedTap ? {
          instructions: isFirstCircleBackTap
            ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Alle Hauptthemen sind beantwortet. Leiten Sie warmherzig in 1 Satz über. Führen Sie dann natürlich zum Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}) über. ${qText(firstSkippedTap.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`
            : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Fahren Sie natürlich mit den übersprungenen Themen fort. Führen Sie zum Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}) über. ${qText(firstSkippedTap.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`,
        } : {},
      });
      return;
    }

    dispatch({ type: "ANSWER_SAVED" });
    const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
    if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
    setCard(remaining[0] ?? null);

    const label = (question.options ?? []).find(o => o.value === value)?.label ?? value;
    const remainingQsTap = remaining.map(id => questionsRef.current.find(q => q.id === id)!).filter(Boolean) as CarouselQuestion[];
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: remainingQsTap.length > 0
          ? `[SYSTEM: Answer already saved — do NOT call submit_answer. The customer tapped "${label}". ${makeNextTopicMsg(remainingQsTap[0], remaining.slice(1), false).replace("[SYSTEM: ", "")}`
          : `[SYSTEM: Answer already saved. All topics complete.]`,
        }],
      },
    });
    send({
      type: "response.create",
      response: remainingQsTap[0] ? {
        instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Tun Sie genau zwei Dinge: (1) Reagieren Sie in 1 Satz auf die getippte Antwort des Kunden — etwas Echtes über seine Wahl, keine generische Überleitung. Sagen Sie nie „Weiter" oder „Nächste Frage". (2) Leiten Sie natürlich zum Thema ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}) über. ${qText(remainingQsTap[0].text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}). Warten Sie auf die Antwort.`,
      } : {},
    });
  }, [saveAnswer, saveVoiceState, advancePhase, send, appendChatMessage, router]);

  /** Clears the AI-proposed highlight — called when customer rejects or modal closes without submitting */
  const clearPendingVoiceAnswer = useCallback(() => {
    setPendingVoiceAnswer(null);
  }, []);

  const onPrev = useCallback(() => {
    // Derive current position from activeCardIdRef — the true carousel source of truth.
    // currentQuestionIndex can drift stale after button skips (which don't always dispatch SET_INDEX).
    const currentIdx = activeCardIdRef.current
      ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
      : stateRef.current.currentQuestionIndex;
    if (currentIdx <= 0) return;
    const prevIndex = currentIdx - 1;
    const prevQuestion = questionsRef.current[prevIndex];
    // Mark button nav in progress so navigate("prev") from the AI doesn't step back again.
    prevInProgressRef.current = true;
    dispatch({ type: "SET_INDEX", index: prevIndex });
    setCard(questionsRef.current[prevIndex]?.id ?? null);

    const prevAnswer = prevQuestion ? savedAnswersRef.current[prevQuestion.id] : undefined;
    const msg = prevAnswer
      ? `[SYSTEM: Customer navigated back to topic "${prevQuestion.category}". Their previous answer was "${prevAnswer}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
      : `[SYSTEM: Customer navigated back to topic "${prevQuestion?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`;

    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
    });
    send({
      type: "response.create",
      response: prevQuestion ? {
        instructions: prevAnswer
          ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat zurücknavigiert zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}). Seine bisherige Antwort war „${prevAnswer}". Fragen Sie warmherzig in 1–2 Sätzen, ob er sie ändern möchte. Warten Sie auf die Antwort.`
          : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat zurücknavigiert zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}), das übersprungen wurde und noch keine Antwort hat. ${qText(prevQuestion.text)} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
      } : {},
    });
  }, [send]);

  const skipQuestion = useCallback((question: CarouselQuestion) => {
    if (skipInProgressRef.current) return; // block until AI finishes and session returns to "listening"
    skipInProgressRef.current = true;

    // Q2 is the sustainability acknowledgment — show the disclosure on first encounter (legal requirement).
    // If already confirmed this session (sustainabilityConfirmedRef), skip the modal and let the
    // normal skip flow handle Q2 like any other question.
    if (question.questionOrder === 2 && !sustainabilityConfirmedRef.current) {
      skippedIdsRef.current.add(question.id); // keep remaining filter consistent — circles back at end
      setTermsSubStep('sustainabilityTerms');
      termsSubStepRef.current = 'sustainabilityTerms';
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
        }]},
      });
      send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS } });
      return;
    }

    skippedIdsRef.current.add(question.id);
    useVoiceSessionStore.getState().markSkipped(question.id);

    // Use the same remaining algorithm as navigate("next") — not raw index+1,
    // which could land on an already-answered or already-skipped slot.
    const remaining = questionsRef.current.filter(
      q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
    );
    const nextQ    = remaining[0] ?? null;
    const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

    if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
    setCard(nextQ?.id ?? null);
    saveVoiceState(nextQIdx >= 0 ? nextQIdx : 0).catch(() => {});

    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: nextQ
          ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), true)
          : "[SYSTEM: All remaining topics are either answered or skipped — circle-back phase will follow.]",
        }],
      },
    });
    send({
      type: "response.create",
      response: nextQ ? {
        instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Bestätigen Sie das Überspringen in 1 natürlichen Satz (z.B. „Natürlich, kommen wir später darauf zurück!"). Leiten Sie dann natürlich zum Thema ${nextQ.category} (ID: ${nextQ.id}) über. ${qText(nextQ.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`,
      } : {},
    });
  }, [send]);

  /** Sends a system message prompting the AI to call explain_topic for the current question. */
  const requestExplanation = useCallback(() => {
    const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current)
      ?? questionsRef.current[stateRef.current.currentQuestionIndex];
    if (!currentQ) return;
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: `[SYSTEM: Customer tapped the info button on "${currentQ.category}". Use explain_topic to open the overlay and explain this concept clearly.]` }],
      },
    });
    send({ type: "response.create" });
  }, [send]);

  /** Closes the explain overlay and tells the AI to resume. Called by the overlay's back button or after voice-triggered animation. */
  const closeExplainOverlay = useCallback(() => {
    setExplainTriggerClose(false);
    setExplainOverlayData(null);
    if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });

    // ── Knowledge-blocker path: advance carousel and ask the stored next question ──
    const kbNextQ = knowledgeBlockerNextQRef.current;
    if (kbNextQ) {
      knowledgeBlockerNextQRef.current    = null;
      kbExplanationResponseIdRef.current  = null;
      const nextIdx = questionsRef.current.findIndex(q => q.id === kbNextQ.id);
      if (nextIdx >= 0) dispatch({ type: "SET_INDEX", index: nextIdx });
      setCard(kbNextQ.id);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Explanation overlay closed. Now ask the next question naturally: "${kbNextQ.text}" (ID: ${kbNextQ.id}). Wait for the customer's answer.]`,
        }]},
      });
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI. ${langTag()} Die Erklärung ist abgeschlossen. Leiten Sie natürlich zur nächsten Frage über. ${qText(kbNextQ.text)} (ID: ${kbNextQ.id}). Kurz und herzlich. Warten Sie auf die Antwort des Kunden.`,
        },
      });
      return;
    }

    const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current);
    if (currentQ) setCard(currentQ.id);

    const wasExplained    = currentQ ? explainedQuestionsRef.current.has(currentQ.id) : false;
    const alreadyAnswered = currentQ ? answeredIdsRef.current.has(currentQ.id) : false;
    const navInstruction  = currentQ ? ` Call navigate(questionId: "${currentQ.id}") first to sync the carousel.` : "";

    let nextInstruction: string;
    if (wasExplained && currentQ && !alreadyAnswered) {
      nextInstruction = ` Then re-ask the "${currentQ.category}" question naturally with context — e.g. "Now that I've walked you through that, [original question]?" — wait for their answer and submit it.`;
    } else if (currentQ && !alreadyAnswered) {
      nextInstruction = ` Then continue naturally with the "${currentQ.category}" question.`;
    } else {
      nextInstruction = " Then resume the consultation naturally.";
    }

    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: `[SYSTEM: Customer manually closed the explanation overlay.${navInstruction}${nextInstruction}]` }],
      },
    });
    send({ type: "response.create" });
  }, [send, setCard]);

  /** Called when the chat modal opens or closes. Silences audio on open; on close with queued answers,
   *  resets the audio buffer and sends one consolidated re-prompt so the AI speaks once. */
  const notifyChatOpen = useCallback((open: boolean) => {
    if (open) {
      chatOpenRef.current   = true;
      chatAnsweredRef.current = 0;
      pendingVoiceTranscriptRef.current = null;
      setIsChatAITyping(false);
      if (gainRef.current) gainRef.current.gain.value = 0;
    } else {
      chatOpenRef.current = false;
      if (gainRef.current) gainRef.current.gain.value = mutedRef.current ? 0 : 1;

      // Cancel any in-flight text response before sending the new audio response.
      // Without this, response.create would error if OpenAI still has an active response
      // (e.g. user closed chat while the AI was still generating a reply).
      if (serverResponseActiveRef.current) {
        send({ type: "response.cancel" });
        serverResponseActiveRef.current = false;
      }

      // Move state to "processing" immediately so the sphere shows neutral (not green/listening)
      // during the ~1s gap before the AI starts speaking its audio response.
      // This also blocks the auto-modal from firing during the gap (modal requires state="listening").
      if (!mutedRef.current) dispatch({ type: "ANSWER_RECEIVED" });

      // Flush stale buffered audio that accumulated while gain was 0.
      if (audioCtxRef.current) nextPlayTimeRef.current = audioCtxRef.current.currentTime;

      const remainingNonSkipped = questionsRef.current.filter(
        q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
      );
      const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
      const currentQ         = questionsRef.current.find(q => q.id === activeCardIdRef.current);

      // The question the AI must ask next — used to pin response.create instructions.
      const nextToAsk = remainingNonSkipped.length > 0
        ? (currentQ ?? remainingNonSkipped[0])
        : skippedRemaining[0] ?? null;

      let systemText: string;
      if (chatAnsweredRef.current > 0) {
        if (remainingNonSkipped.length === 0 && skippedRemaining.length > 0) {
          // All non-skipped done — AI must circle back to skipped topics
          const skippedList = skippedRemaining.map(q => `"${q.id}" (${q.category})`).join(", ");
          systemText =
            `[SYSTEM: Customer answered ${chatAnsweredRef.current} question(s) via chat. ` +
            `All main topics covered. These topics were skipped earlier and still need answers: ` +
            `${skippedList}. The carousel is already showing the first skipped topic. ` +
            `Ask about it naturally and continue through them one by one. ` +
            `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
        } else {
          const remainingIds = remainingNonSkipped.map(q => q.id).join(", ") || "none";
          const skippedPart  = skippedRemaining.length > 0
            ? ` Skipped topics to circle back to later: ${skippedRemaining.map(q => q.id).join(", ")}.`
            : "";
          systemText =
            `[SYSTEM: Customer answered ${chatAnsweredRef.current} question(s) via chat. ` +
            `Current topic: "${currentQ?.category ?? "unknown"}"` +
            (currentQ ? ` (ID: ${currentQ.id})` : "") + `. ` +
            `Remaining topic IDs (in order): ${remainingIds}.` +
            `${skippedPart} Resume naturally from the current topic. ` +
            `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
        }
      } else {
        // User had a text conversation (questions, clarifications) but answered nothing formally.
        const currentTopic = nextToAsk
          ? `"${nextToAsk.category}" (ID: ${nextToAsk.id})`
          : "the current topic";
        systemText =
          `[SYSTEM: The customer was asking questions via text chat and has now returned to voice. ` +
          `Resume the voice advisory interview from ${currentTopic}. ` +
          `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
      }

      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: systemText }]},
      });
      send({
        type: "response.create",
        response: nextToAsk ? {
          // No welcome-back preamble — just pick up naturally where the session left off.
          // The customer knows they closed chat; no ceremony needed.
          instructions: `You are PecunAI — a warm investment advisor. ${langTag()} Continue the voice interview naturally — no preamble or welcome-back line. Ask directly about ${nextToAsk.category} (ID: ${nextToAsk.id}). ${qText(nextToAsk.text)} Maximum 1–2 sentences. Do NOT call submit_answer — wait for the customer to respond by voice.`,
        } : {},
      });
    }
  }, [send]);

  /** Tap handler — customer confirms the recommended product (Phase 2 button) */
  const confirmProduct = useCallback(() => {
    router.push("/customer/dashboard"); // Phase 3 placeholder
  }, [router]);

  /** Tap handler — customer wants to revisit Phase 1 answers (Phase 2 button) */
  const revisitQuestions = useCallback(() => {
    isRevisitingRef.current = true;
    voicePhaseRef.current   = 1;  // set ref before saveVoiceState reads it
    saveVoiceState(questionsRef.current.length).catch(() => {});  // persist isRevisiting: true + voicePhase: 1
    useVoiceSessionStore.getState().setIsRevisiting(true);        // Zustand dual-write for same-browser path
    setVoicePhase(1);
    setProductSuggestion(null);
    send({
      type: "session.update",
      session: { type: "realtime", audio: { input: { turn_detection: { type: "semantic_vad" } } } },
    });
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: Customer tapped Revisit. Ask which topic they want to change. IMPORTANT — when the customer names a topic: (1) call navigate({ questionId: '<exact ID from the question list>' }) FIRST to move the on-screen card, THEN ask the question verbally. When they re-answer, call submit_answer as normal. The customer may change multiple answers. Once they say they are done or want to see the updated product recommendation, call confirm_product().]",
      }]},
    });
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat auf Zurück getippt. Bestätigen Sie warmherzig in 1 Satz und fragen Sie, welches Thema er ändern möchte.`,
      },
    });
  }, [send, saveVoiceState]);

  // ── Phase 0 — terms gate ───────────────────────────────────────

  /** Called from VoiceSessionShell when intro speech ends (isAISpeaking goes false in Phase 0 intro) */
  const moveToTerms1 = useCallback(async () => {
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "TERMS1" }),
    });
    termsSubStepRef.current = 'terms1';
    setTermsSubStep('terms1');
    saveVoiceState(0).catch(() => {});
    send({ type: "response.create", response: { instructions: TERMS1_EXPLAIN_INSTRUCTIONS } });
  }, [sessionId, send, saveVoiceState]);

  /** Customer tapped "Ich bestätige" on the 4money (terms1) document */
  const confirmTerms1 = useCallback(async () => {
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "TERMS_FROOTS" }),
    });
    termsSubStepRef.current = 'terms2';
    setTermsSubStep('terms2');
    saveVoiceState(0).catch(() => {});
    send({ type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS } });
  }, [sessionId, send, saveVoiceState]);

  /** Customer tapped "Ich bestätige" on the froots (terms2) document — transitions to Phase 1 */
  const confirmTerms2 = useCallback(async () => {
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionId, phase: "QUESTIONS1" }),
    });
    voicePhaseRef.current   = 1;
    termsSubStepRef.current = null;
    setTermsSubStep(null);
    setVoicePhase(1);
    saveVoiceState(0).catch(() => {});
    send({
      type: "conversation.item.create",
      item: {
        type:    "message",
        role:    "user",
        content: [{ type: "input_text", text: "[SYSTEM: Terms confirmed. Starting Phase 1 — risk profile questions. Begin with the first topic.]" }],
      },
    });
    send({ type: "response.create" });
  }, [sessionId, send, saveVoiceState]);

  /** Customer tapped "Verstanden" on the sustainability disclosure — dismisses modal and advances. */
  const confirmSustainabilityTerms = useCallback(async () => {
    setTermsSubStep(null);
    termsSubStepRef.current = null;

    // Mark as confirmed so the modal is never shown again this session.
    sustainabilityConfirmedRef.current = true;
    try { localStorage.setItem(`pecunai_sus_${sessionId}`, "1"); } catch {}

    // If Q2 was skipped (not answered), promote it to answered so it doesn't appear in circle-back.
    const q2 = questionsRef.current.find(q => q.questionOrder === 2);
    if (q2 && skippedIdsRef.current.has(q2.id)) {
      skippedIdsRef.current.delete(q2.id);
      answeredIdsRef.current.add(q2.id);
    }

    const q3 = questionsRef.current.find(q => q.questionOrder === 3);
    // Recompute remaining after the Q2 skipped→answered promotion above.
    const remaining = questionsRef.current
      .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
      .map(q => q.id);

    // Resume SYSTEM message — counters the "PHASE 1 PAUSED" entry still in history and
    // prevents the AI from calling explain_topic because ESG was just discussed.
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: Customer confirmed the sustainability disclosure. PHASE 1 RESUMED. Do NOT call explain_topic — ask the next question directly without opening any overlay.]",
      }]},
    });

    if (q3 && !answeredIdsRef.current.has(q3.id)) {
      // Normal first-time flow: Q3 not yet answered — navigate to Q3 and ask it.
      const q3Idx = questionsRef.current.findIndex(q => q.id === q3.id);
      if (q3Idx >= 0) dispatch({ type: "SET_INDEX", index: q3Idx });
      setCard(q3.id);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: makeNextTopicMsg(q3, remaining.slice(1), false),
        }]},
      });
      const q3Options = q3.options?.length
        ? ` Valid values the customer must choose from: ${q3.options.map(o => `"${o.value ?? o.label}"`).join(", ")}.`
        : "";
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat die Nachhaltigkeitsinformationen gelesen und bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Fragen Sie jetzt direkt, ob der Kunde die Nachhaltigkeitsinformationen zur Kenntnis genommen hat. ${qText(q3.text)}${q3Options} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
        },
      });
    } else {
      // Q3 is already answered (e.g. sustainability was shown during circle-back).
      // Navigate to the actual next remaining question instead of looping back to Q3.
      const nextId = remaining[0] ?? null;
      const nextQ  = nextId ? questionsRef.current.find(q => q.id === nextId) : null;
      if (nextQ) {
        const nextQIdx = questionsRef.current.findIndex(q => q.id === nextQ.id);
        if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
        setCard(nextQ.id);
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: makeNextTopicMsg(nextQ, remaining.slice(1), false),
          }]},
        });
        send({
          type: "response.create",
          response: {
            instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat die Nachhaltigkeitsinformationen bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Leiten Sie natürlich zum nächsten Thema über. ${qText(nextQ.text)} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
          },
        });
      }
    }
  }, [send, setCard, sessionId]);

  /** Must be called from a user-gesture handler (tap/click) to unlock AudioContext */
  const startSession = useCallback(async () => {
    await setupAudio();
    audioCtxRef.current?.resume();

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        micGrantedRef.current = true;
        setMicGranted(true);
      } else {
        micGrantedRef.current = false;
        setMicGranted(false);
      }
    } catch {
      micGrantedRef.current = false;
      setMicGranted(false); // silent tap-only fallback — no error shown
    }

    setStarted(true);
  }, [setupAudio]);

  const startPTT = useCallback(() => {
    pttActiveRef.current = true;
    stopAudio();

    // Disable VAD on document screens so the customer's speech doesn't trigger an
    // auto-response — we fire response.create manually on PTT release instead.
    const isDocumentScreen =
      voicePhaseRef.current === 0 ||
      termsSubStepRef.current === 'sustainabilityTerms' ||
      voicePhaseRef.current === 2;

    if (isDocumentScreen) {
      send({
        type: "session.update",
        session: { type: "realtime", audio: { input: { turn_detection: null } } },
      });
    }
  }, [stopAudio, send]);

  const submitPTTQuestion = useCallback((context: 'terms1' | 'terms2' | 'sustainabilityTerms' | 'phase2') => {
    pttActiveRef.current  = false;
    pttContextRef.current = context; // response.done will clear this and restore VAD

    // Set the correct vector store for this PTT context — no hardcoded fallbacks
    pttVectorStoreRef.current = context === 'phase2'
      ? (productVectorIdRef.current ?? termsVectorId ?? "")
      : (termsVectorId ?? "");

    if (!pttVectorStoreRef.current) {
      // No vector store configured — tell the AI to apologise rather than searching
      send({
        type: "response.create",
        response: {
          instructions: `You are PecunAI. The document search system is not configured for this session. Apologize briefly and let the customer know you cannot search the document right now. ${langTag()}`,
        },
      });
      return;
    }

    pttDocLabelRef.current = context === 'phase2'
      ? "the recommended product PDF"
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

  return {
    state,
    started,
    analyserNode,
    micAnalyserNode,
    micGranted,
    isAISpeaking,
    bargeInActive,
    voiceAnswerCount,
    pendingVoiceAnswer,
    savedAnswers,
    explainOverlayData,
    explainTriggerClose,
    chatMessages,
    voicePhase,
    termsSubStep,
    productSuggestion,
    confirmProduct,
    revisitQuestions,
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
    activeCardId,
    requestExplanation,
    closeExplainOverlay,
    sendChatMessage,
    startPTT,
    submitPTTQuestion,
    isChatAITyping,
  };
}

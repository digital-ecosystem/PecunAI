"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CarouselQuestion } from "@/components/voice/VoiceCarousel";

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

// DEV: English for testing. For production restore German: "Sprechen Sie ausschließlich Deutsch, formelle Anrede „Sie""
function buildSystemPrompt(questions: CarouselQuestion[], resumeIndex: number, micGranted: boolean | null): string {
  const list = questions.map((q, i) => {
    let extra = "";
    if (q.options?.length) {
      extra = `\n  Valid values: ${q.options.map(o => `"${o.value ?? o.label}"`).join(", ")}`;
    } else if (q.questionType === "number") {
      const min = q.minValue !== undefined ? `, min ${q.minValue}` : "";
      const max = q.maxValue !== undefined ? `, max ${q.maxValue}` : "";
      extra = `\n  Format: number${min}${max}`;
    } else {
      extra = `\n  Format: free text`;
    }
    const skipped = i < resumeIndex ? "  ← already collected — skip" : "";
    return `[${i + 1}]${skipped}\nID: ${q.id}\nTopic: ${q.category}\nContext (what you need to find out — rephrase naturally, do NOT read this verbatim): ${q.text}${extra}`;
  }).join("\n\n");

  const resumeBlock = resumeIndex > 0
    ? `\n\nYou already collected topics 1–${resumeIndex} in a previous session (marked above). Open with a warm one-sentence welcome-back and pick up naturally from topic ${resumeIndex + 1}.`
    : "";

  const micBlock = micGranted === false
    ? `\n\n## Mic Access\n\nThe customer has not granted microphone access — they are in tap-only mode. Answer cards appear on screen automatically after you finish speaking each topic. In your opening greeting, mention this naturally — e.g. "I noticed you haven't given microphone access, no worries at all — answer cards will appear on screen for you to tap. You can always enable your mic in browser settings if you change your mind." Do not repeat this reminder after the greeting.`
    : "";

  return `# Role and Objective

You are PecunAI, a warm digital investment advisor having a one-on-one consultation with a new customer. Your goal is to understand their financial situation well enough to recommend the right investment product — through genuine conversation, not a form.

# Language

// DEV — restore German with formal "Sie" address for production
English only in this DEV environment. Always reply in English regardless of what language the customer uses.

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

// ── Types ─────────────────────────────────────────────────────────

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
];

// ── Helpers ───────────────────────────────────────────────────────

function makeNextTopicMsg(
  nextQ: CarouselQuestion,
  remainingIds?: string[],
  answeredIds?: string[],
): string {
  const answeredStr  = answeredIds ? (answeredIds.length ? answeredIds.join(", ") : "none") : null;
  const remainingStr = remainingIds && remainingIds.length > 0 ? remainingIds.join(", ") : "none";
  return [
    `[SYSTEM: NEXT TOPIC = "${nextQ.category}" (ID: ${nextQ.id}).`,
    answeredStr !== null ? `Formally submitted answers: ${answeredStr}.` : "",
    `Remaining to collect: ${nextQ.id}${remainingStr !== "none" ? `, ${remainingStr}` : ""}.`,
    `The navigate() function result confirms this. Do NOT override with conversation inference — only submitted answers count.`,
    `The customer's skip request applied ONLY to the previous topic — NOT to this one. Start fresh — ask about "${nextQ.category}" as if the customer is fully ready to answer it. Do NOT apply skip logic to this topic.`,
    `Ask about "${nextQ.category}" NOW.]`,
  ].filter(Boolean).join(" ");
}

// ── Hook ──────────────────────────────────────────────────────────

interface UseVoiceSessionOptions {
  sessionId:            string;
  questions:            CarouselQuestion[];
  initialQuestionIndex: number;
}

export function useVoiceSession({
  sessionId,
  questions,
  initialQuestionIndex,
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

  // Explain overlay — set by explain_topic tool call, cleared on close_explanation or manual close
  const [explainOverlayData, setExplainOverlayData] = useState<ExplainOverlayData | null>(null);

  // Chat log — mirrors all questions and answers for the chat modal
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Pending voice answer — set by highlight_answer, cleared on submit or rejection
  const [pendingVoiceAnswer, setPendingVoiceAnswer] = useState<{
    questionId: string;
    value:      string;
    label:      string;
  } | null>(null);

  // All confirmed answers in this session — keyed by questionId.
  // Used to pre-populate the modal when user taps a card for an already-answered question.
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const savedAnswersRef = useRef<Record<string, string>>({});

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
  const answeredIdsRef   = useRef<Set<string>>(new Set());
  // Tracks explicitly skipped question IDs — cleared when the question is later answered.
  const skippedIdsRef    = useRef<Set<string>>(new Set());
  // Tracks question IDs that were explained via explain_topic — used to instruct AI to re-ask with context after returning.
  const explainedQuestionsRef = useRef<Set<string>>(new Set());
  // One skip at a time — locked until the AI finishes speaking and returns to "listening".
  const skipInProgressRef = useRef(false);
  // Same guard for button-initiated prev — prevents AI from calling navigate("prev") a second time.
  const prevInProgressRef = useRef(false);

  // Internal refs — stable across renders
  const wsRef              = useRef<WebSocket | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const gainRef            = useRef<GainNode | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef    = useRef<number>(0);
  const audioEndTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCall        = useRef<{ callId: string; name: string; args: string } | null>(null);
  const questionsRef       = useRef(questions);
  const stateRef           = useRef(state);
  const micStreamRef       = useRef<MediaStream | null>(null);
  const micSourceRef       = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef     = useRef<AudioWorkletNode | null>(null);
  const micAnalyserRef     = useRef<AnalyserNode | null>(null);
  const mutedRef               = useRef(false); // source of truth for mute — persists across state transitions
  const explainOpenRef         = useRef(false); // mirrors explainOverlayData !== null for stable WS closures
  const chatOpenRef            = useRef(false); // true while chat modal is open
  const chatAnsweredRef        = useRef(0);     // count of answers given while chat was open
  const explainIdleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetExplainIdleRef    = useRef<() => void>(() => {});

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { stateRef.current    = state;     }, [state]);

  // Append an AI bubble to the chat log whenever the active question changes (and session is running).
  useEffect(() => {
    if (!started || !activeCardId) return;
    const q = questionsRef.current.find(q => q.id === activeCardId);
    if (!q) return;
    setChatMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.sender === "ai" && last.questionId === q.id) return prev;
      return [...prev, {
        id:        `ai-${q.id}-${Date.now()}`,
        questionId: q.id,
        text:      q.text,
        sender:    "ai",
        timestamp: new Date(),
      }];
    });
  }, [activeCardId, started]);

  // Keeps activeCardIdRef in sync with state so callbacks can read it without stale closures.
  const setCard = useCallback((id: string | null) => {
    activeCardIdRef.current = id;
    setActiveCardId(id);
  }, []);

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
        body: JSON.stringify({ lastQuestionIndex: index }),
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
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, phase: "SUGGESTIONS" }),
    });
    router.push("/customer/dashboard");
  }, [sessionId, router]);

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
        const { questionId, value } = args;
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
        const answeredQ   = questionsRef.current[qIdx];
        const voiceLabel  = (answeredQ?.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
        appendChatMessage(voiceLabel, "user", questionId);
        const remaining = questionsRef.current
          .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
          .map(q => q.id);

        sendResult({ success: true });

        const allAnswered            = answeredIdsRef.current.size === questionsRef.current.length;
        const allCoveredExceptSkipped = answeredIdsRef.current.size + skippedIdsRef.current.size === questionsRef.current.length;

        if (allAnswered) {
          await advancePhase();
          return;
        }

        if (allCoveredExceptSkipped && skippedIdsRef.current.size > 0) {
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
          send({ type: "response.create" });
          return;
        }

        const remainingQs = remaining.map(id => questionsRef.current.find(q => q.id === id)!).filter(Boolean) as CarouselQuestion[];
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: remainingQs.length > 0
              ? makeNextTopicMsg(remainingQs[0], remaining.slice(1), Array.from(answeredIdsRef.current))
              : "[SYSTEM: All remaining topics answered. Session complete.]",
            }],
          },
        });

        dispatch({ type: "ANSWER_SAVED" });
        const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
        if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
        setCard(remaining[0] ?? null);
        send({ type: "response.create" });
        return;
      }

      if (name === "explain_topic") {
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
        setExplainOverlayData(null);
        if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
        const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current);
        if (currentQ) setCard(currentQ.id);
        sendResult({ success: true });

        const wasExplained  = currentQ ? explainedQuestionsRef.current.has(currentQ.id) : false;
        const alreadyAnswered = currentQ ? answeredIdsRef.current.has(currentQ.id) : false;
        const navInstruction = currentQ ? ` Call navigate(questionId: "${currentQ.id}") first to sync the carousel.` : "";

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
            content: [{ type: "input_text", text: `[SYSTEM: Explanation overlay closed.${navInstruction}${nextInstruction}]` }],
          },
        });
        send({ type: "response.create" });
        return;
      }

      if (name === "navigate") {
        if (explainOpenRef.current) {
          sendResult({ success: false, reason: "Explanation overlay is open — navigation blocked" });
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
              formally_answered_ids: Array.from(answeredIdsRef.current),
              remaining_ids_after_next: remaining.slice(1).map(q => q.id),
              instruction: `Ask about "${nextSkipQ.category}" (ID: ${nextSkipQ.id}) NOW.`,
            } : { success: true, all_topics_covered: true });
            send({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text",
                text: nextSkipQ ? makeNextTopicMsg(nextSkipQ, remaining.slice(1).map(q => q.id), Array.from(answeredIdsRef.current)) : "[SYSTEM: All topics covered.]",
              }]},
            });
            return;
          }
          const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current)
            ?? questionsRef.current[stateRef.current.currentQuestionIndex];

          // If the current card is already answered, this is a confirm-advance (customer confirmed
          // their existing answer while back-navigated), NOT a skip. Don't mark it skipped.
          const isConfirmAdvance = currentQ != null && answeredIdsRef.current.has(currentQ.id);
          if (currentQ && !isConfirmAdvance) {
            skippedIdsRef.current.add(currentQ.id);
            skipInProgressRef.current = true;
          }

          const remaining = questionsRef.current.filter(
            q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
          );
          const nextQ    = remaining[0] ?? null;
          const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

          if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
          setCard(nextQ?.id ?? null);

          sendResult(nextQ ? {
            success: true,
            next_topic_id: nextQ.id,
            next_topic_name: nextQ.category,
            formally_answered_ids: Array.from(answeredIdsRef.current),
            remaining_ids_after_next: remaining.slice(1).map(q => q.id),
            instruction: `Ask about "${nextQ.category}" (ID: ${nextQ.id}) NOW. This is the only correct next topic.`,
          } : { success: true, all_topics_covered: true });

          send({
            type: "conversation.item.create",
            item: {
              type: "message", role: "user",
              content: [{ type: "input_text", text: nextQ ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), Array.from(answeredIdsRef.current)) : "[SYSTEM: All topics covered.]" }],
            },
          });

          send({
            type: "response.create",
            response: nextQ ? {
              instructions: isConfirmAdvance
                ? `The customer confirmed their previous answer and wants to move forward. Continue naturally to the next topic. Ask the customer about ${nextQ.category} by rephrasing this question in your warm advisor voice — reply in English only: "${nextQ.text}". Ask ONLY this question. Wait for the customer's answer.`
                : `The customer just skipped a topic. Acknowledge in one natural sentence (e.g. "Of course, we can always come back to that!"). Then ask the customer about ${nextQ.category} by rephrasing this question in your warm advisor voice — reply in English only: "${nextQ.text}". Ask ONLY this question. Do not ask about any other topic. Do not skip this question. Wait for the customer's answer.`,
            } : {},
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
        } else {
          sendResult({ success: false, reason: "Unknown navigate parameters" });
        }

        send({ type: "response.create" });
        return;
      }
    } catch (err) {
      console.error("[voice] Function call error:", name, err);
    }
  }, [saveAnswer, saveVoiceState, advancePhase, send, setCard, appendChatMessage]);

  // ── Schedule AI_DONE after audio finishes playing ──────────────

  const scheduleAIDone = useCallback(() => {
    if (audioEndTimer.current) clearTimeout(audioEndTimer.current);
    const ctx = audioCtxRef.current;
    if (!ctx) {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      return;
    }
    const remaining = Math.max(0, (nextPlayTimeRef.current - ctx.currentTime)) * 1000;
    audioEndTimer.current = setTimeout(() => {
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      if (!pendingCall.current && !mutedRef.current) dispatch({ type: "AI_DONE" });
    }, remaining + 200);
  }, []);

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
          send({
            type: "session.update",
            session: {
              type:              "realtime",
              model:             "gpt-realtime-2",
              output_modalities: ["audio"],
              instructions:      buildSystemPrompt(questionsRef.current, initialIndexRef.current, micGrantedRef.current),
              tools:             TOOLS,
              tool_choice:       "auto",
              reasoning:         { effort: "minimal" },
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: 24000 },
                  turn_detection: { type: "semantic_vad" },
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
              if (stateRef.current.session !== "listening") return;
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
          // Session configured — trigger the AI to speak its greeting
          send({ type: "response.create" });
          break;
        }

        case "response.output_audio.delta": {
          if (!isAISpeakingRef.current) {
            isAISpeakingRef.current = true;
            setIsAISpeaking(true);
          }
          if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
          scheduleChunk(msg.delta as string);
          break;
        }

        case "response.output_audio.done":
          // Schedule AI_DONE to fire once the buffered audio finishes playing
          if (!pendingCall.current) scheduleAIDone();
          break;

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

        case "response.done": {
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
          // Audio-only response: AI_DONE was already scheduled by response.audio.done
          break;
        }

        case "input_audio_buffer.speech_started": {
          // Customer started speaking — reset explain-overlay idle timer if open
          if (explainOpenRef.current) resetExplainIdleRef.current();
          break;
        }

        case "error": {
          const err = msg.error as Record<string, unknown>;
          console.error("[voice] OpenAI error:", err);
          dispatch({ type: "ERROR", message: String(err?.message ?? "Verbindungsfehler") });
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
    const tapLabel = (question.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
    appendChatMessage(tapLabel, "user", question.id);

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

    if (allAnswered) {
      await advancePhase();
      return;
    }

    const remaining = questionsRef.current
      .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
      .map(q => q.id);

    if (allCoveredExceptSkipped && skippedIdsRef.current.size > 0) {
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
      send({ type: "response.create" });
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
          ? `[SYSTEM: Answer already saved — do NOT call submit_answer. The customer tapped "${label}". ${makeNextTopicMsg(remainingQsTap[0], remaining.slice(1), Array.from(answeredIdsRef.current)).replace("[SYSTEM: ", "")}`
          : `[SYSTEM: Answer already saved. All topics complete.]`,
        }],
      },
    });
    send({ type: "response.create" });
  }, [saveAnswer, saveVoiceState, advancePhase, send, appendChatMessage]);

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
    send({ type: "response.create" });
  }, [send]);

  const skipQuestion = useCallback((question: CarouselQuestion) => {
    if (skipInProgressRef.current) return; // block until AI finishes and session returns to "listening"
    skipInProgressRef.current = true;

    skippedIdsRef.current.add(question.id);

    // Use the same remaining algorithm as navigate("next") — not raw index+1,
    // which could land on an already-answered or already-skipped slot.
    const remaining = questionsRef.current.filter(
      q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
    );
    const nextQ    = remaining[0] ?? null;
    const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

    if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
    setCard(nextQ?.id ?? null);

    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: nextQ
          ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), Array.from(answeredIdsRef.current))
          : "[SYSTEM: All remaining topics are either answered or skipped — circle-back phase will follow.]",
        }],
      },
    });
    send({ type: "response.create" });
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

  /** Closes the explain overlay and tells the AI to resume. Called by the overlay's back button. */
  const closeExplainOverlay = useCallback(() => {
    setExplainOverlayData(null);
    if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
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
      if (gainRef.current) gainRef.current.gain.value = 0;
    } else {
      chatOpenRef.current = false;
      if (gainRef.current) gainRef.current.gain.value = mutedRef.current ? 0 : 1;

      if (chatAnsweredRef.current > 0) {
        // Flush the audio queue so stale buffered speech doesn't play
        if (audioCtxRef.current) nextPlayTimeRef.current = audioCtxRef.current.currentTime;

        const remainingNonSkipped = questionsRef.current.filter(
          q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
        );
        const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
        const currentQ         = questionsRef.current.find(q => q.id === activeCardIdRef.current);

        let systemText: string;
        if (remainingNonSkipped.length === 0 && skippedRemaining.length > 0) {
          // All non-skipped done — AI must circle back to skipped topics
          const skippedList = skippedRemaining.map(q => `"${q.id}" (${q.category})`).join(", ");
          systemText =
            `[SYSTEM: Customer answered ${chatAnsweredRef.current} question(s) via chat. ` +
            `All main topics covered. These topics were skipped earlier and still need answers: ` +
            `${skippedList}. The carousel is already showing the first skipped topic. ` +
            `Ask about it naturally and continue through them one by one.]`;
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
            `${skippedPart} Resume naturally from the current topic.]`;
        }

        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text: systemText }]},
        });
        send({ type: "response.create" });
      }
    }
  }, [send]);

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

  return {
    state,
    started,
    analyserNode,
    micAnalyserNode,
    micGranted,
    isAISpeaking,
    pendingVoiceAnswer,
    savedAnswers,
    explainOverlayData,
    chatMessages,
    notifyChatOpen,
    startSession,
    toggleMute,
    onAnswerConfirmed,
    clearPendingVoiceAnswer,
    onPrev,
    skipQuestion,
    activeCardId,
    requestExplanation,
    closeExplainOverlay,
  };
}

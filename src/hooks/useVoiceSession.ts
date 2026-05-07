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
    const skipped = i < resumeIndex ? "  ← ALREADY COLLECTED — SKIP" : "";
    return `[${i + 1}]${skipped}\nID: ${q.id}\nTopic: ${q.category}\nContext (what you need to find out — rephrase naturally, do NOT read this verbatim): ${q.text}${extra}`;
  }).join("\n\n");

  const resumeBlock = resumeIndex > 0
    ? `\n\nRESUME: You already collected data points 1–${resumeIndex} in a previous session (marked SKIP). Do not revisit them. After a brief warm welcome-back, pick up naturally from data point ${resumeIndex + 1}.`
    : "";

  const micBlock = micGranted === false
    ? `\n\nMIC ACCESS: The customer has NOT granted microphone access — they are in tap-only mode. An answer card will automatically appear on screen after you finish speaking each topic. In your opening greeting, naturally mention this — e.g. "I noticed you haven't given microphone access, no worries at all — answer cards will appear on screen for you to tap. You can always enable your mic in browser settings if you change your mind. Let's get started!" Do not repeat this mic reminder after the greeting.`
    : "";

  return `You are PecunAI, a warm digital investment advisor having a one-on-one consultation with a new customer. Your goal is to understand their financial situation well enough to recommend the right investment product — through genuine conversation, not a form.

// DEV — restore German with formal "Sie" address for production
LANGUAGE: ENGLISH ONLY in this DEV environment. Always reply in English regardless of what language the customer uses.

HOW TO SOUND NATURAL — read this carefully:
You are NOT reading questions from a list. You are a human advisor getting to know someone.
Every response must do two things: (1) react to what they just said, (2) lead naturally into the next thing you need to know.

EXAMPLE of the tone you should have:
  You: "So what's bringing you to think about investing right now — is there something specific you're working toward?"
  Customer: "Yeah, mostly saving for retirement."
  You: "Retirement — smart move to start thinking about it now. And roughly how far out are you thinking, are we talking 10 years, 20?"
  Customer: "Probably around 20 years."
  You: "Great, so you've got real time for things to grow. One thing I always like to get a sense of — how do you feel about risk? If your investment dipped 20% in a rough year, would you ride it out or would that worry you?"

Notice: short, warm, each response reacts to the previous answer and flows naturally into the next topic. That is the standard you should hold yourself to.

RULES:
- Max 2–3 sentences per response. Never monologue.
- Never say "Question", "Next topic", "Moving on", or reveal any structure.
- Never read a list of options aloud. If choices exist, weave them in naturally: "Are you thinking more X or Y?"
- Group related topics together where it feels natural — don't jump awkwardly between unrelated subjects.
- Match the customer's energy: if they're brief, be brief. If they open up, show genuine interest.${resumeBlock}${micBlock}

SAVING ANSWERS:
- Only call submit_answer when the customer has CLEARLY and EXPLICITLY spoken or tapped an answer. Do NOT submit based on silence, background noise, assumption, or inference — wait for them to actually respond.
- Clear spoken answer → call submit_answer(questionId, value) immediately, then keep the conversation going. No "is that correct?", no pause.
- Genuinely ambiguous answer → call highlight_answer once to clarify ("Did you mean X?"), then submit whatever they confirm.
- Message contains "[SYSTEM: Answer saved" or "[SYSTEM: Answer already saved" → the answer is already in the DB. Do NOT call submit_answer. The message will also tell you which topic IDs are still uncollected — use that list to know exactly what to cover next. React to the answer naturally and move to the first remaining ID.

NAVIGATION:
- The customer can tap "back" to revisit a previous topic or "skip" to move past the current one.
- On back: you will receive a [SYSTEM: Customer navigated back...] message — react naturally and ask if they want to change their answer.
- On skip: you will receive a [SYSTEM: Customer skipped...] message — acknowledge briefly and continue.
- Skipped topics will be listed at the end — work through them one by one before finishing.

TOPICS TO COVER (cover all of them — do not skip any — group naturally where it makes sense):

${list}

${resumeIndex > 0
  ? `You have already covered the first ${resumeIndex} topic${resumeIndex === 1 ? "" : "s"} in a previous session. Open with a warm one-sentence welcome-back ("Good to have you back!") and pick up naturally from topic ${resumeIndex + 1}.`
  : `Open the conversation warmly and naturally — like a friendly advisor meeting someone for the first time. 2 sentences max, then flow into the first topic.`}`;
}

// ── OpenAI function tools ─────────────────────────────────────────

const TOOLS = [
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
    description: "Wechselt zur nächsten oder vorherigen Frage.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["next", "prev"] },
      },
      required: ["direction"],
    },
  },
];

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

  // Stable ref for the initial question index — set once on mount.
  // Used in session.created so the resume index is always reliable regardless of state timing.
  const initialIndexRef  = useRef(initialQuestionIndex);
  // Stable ref for mic permission — set in startSession() before WS opens so it's ready at session.created time.
  const micGrantedRef    = useRef<boolean | null>(null);
  // Tracks answered question IDs in the current session — injected into each AI response so it never loses track.
  const answeredIdsRef   = useRef<Set<string>>(new Set());
  // Tracks explicitly skipped question IDs — cleared when the question is later answered.
  const skippedIdsRef    = useRef<Set<string>>(new Set());
  // One skip at a time — locked until the AI finishes speaking and returns to "listening".
  const skipInProgressRef = useRef(false);

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
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micAnalyserRef     = useRef<AnalyserNode | null>(null);
  const mutedRef           = useRef(false); // source of truth for mute — persists across state transitions

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { stateRef.current    = state;     }, [state]);

  // ── Audio setup ────────────────────────────────────────────────

  const setupAudio = useCallback(() => {
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
        setActiveCardId(questionId);
        sendResult({ success: true });
        send({ type: "response.create" }); // prompt AI to speak "Got it — X. Is that correct?"
        return;
      }

      if (name === "submit_answer") {
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
          const skippedList = questionsRef.current
            .filter(q => skippedIdsRef.current.has(q.id))
            .map(q => `"${q.id}" (topic: ${q.category})`)
            .join(", ");
          dispatch({ type: "ANSWER_SAVED" });
          const firstSkipped = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
          setActiveCardId(firstSkipped?.id ?? null);
          send({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: `[SYSTEM: All main topics have been covered. ${skippedIdsRef.current.size} topic(s) were skipped earlier: ${skippedList}. Circle back to them now one by one, naturally. After all are answered, the session will complete.]` }],
            },
          });
          send({ type: "response.create" });
          return;
        }

        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: `[SYSTEM: Answer saved. Remaining uncollected topic IDs (in order): ${remaining.join(", ")}. Continue naturally with the FIRST one in this list.]` }],
          },
        });

        dispatch({ type: "ANSWER_SAVED" });
        const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
        if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
        setActiveCardId(remaining[0] ?? null);
        send({ type: "response.create" });
        return;
      }

      if (name === "navigate") {
        const { direction } = args;
        sendResult({ success: true });

        if (direction === "prev") {
          const newIndex = Math.max(0, stateRef.current.currentQuestionIndex - 1);
          dispatch({ type: "SET_INDEX", index: newIndex });
        }
        // "next" is handled naturally by the conversation context
        send({ type: "response.create" });
        return;
      }
    } catch (err) {
      console.error("[voice] Function call error:", name, err);
    }
  }, [saveAnswer, saveVoiceState, advancePhase, send]);

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
      if (type !== "response.audio.delta") {
        console.log("[voice] ←", type, type === "error" ? msg : "");
      }

      switch (type) {

        case "session.created": {
          // Use initialIndexRef (set once at mount) — guaranteed correct even if
          // the stateRef effect hasn't fired yet when this message arrives.
          send({
            type: "session.update",
            session: {
              modalities:    ["text", "audio"] as string[],
              voice:         "shimmer",
              instructions:  buildSystemPrompt(questionsRef.current, initialIndexRef.current, micGrantedRef.current),
              tools:         TOOLS,
              turn_detection: {
                type:                "server_vad",
                threshold:           0.7,   // higher = less sensitive to background noise
                prefix_padding_ms:   300,
                silence_duration_ms: 700,
              },
            },
          });
          break;
        }

        case "session.updated": {
          // Wire mic input for server VAD if permission was granted
          const mic = micStreamRef.current;
          const ctx = audioCtxRef.current;
          if (mic && ctx) {
            const micSource  = ctx.createMediaStreamSource(mic);
            const silentGain = ctx.createGain();
            silentGain.gain.value = 0;
            const processor  = ctx.createScriptProcessor(4096, 1, 1);

            // Tap an AnalyserNode off the mic source for sphere visualization
            const micAnalyser  = ctx.createAnalyser();
            micAnalyser.fftSize = 256;
            micSource.connect(micAnalyser);

            micSource.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(ctx.destination);
            processor.onaudioprocess = (e: AudioProcessingEvent) => {
              const ws = wsRef.current;
              if (!ws || ws.readyState !== WebSocket.OPEN) return;
              if (stateRef.current.session !== "listening") return;
              const float32 = e.inputBuffer.getChannelData(0);
              const pcm16   = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)));
              }
              const bytes = new Uint8Array(pcm16.buffer);
              let binary = "";
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(binary) }));
            };
            micSourceRef.current       = micSource;
            scriptProcessorRef.current = processor;
            micAnalyserRef.current     = micAnalyser;
            setMicAnalyserNode(micAnalyser);
          }
          // Session configured — trigger the AI to speak its greeting
          send({ type: "response.create" });
          break;
        }

        case "response.audio.delta": {
          if (!isAISpeakingRef.current) {
            isAISpeakingRef.current = true;
            setIsAISpeaking(true);
          }
          if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
          scheduleChunk(msg.delta as string);
          break;
        }

        case "response.audio.done":
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
            await handleFunctionCall(pc.name, pc.args, pc.callId);
          }
          // Audio-only response: AI_DONE was already scheduled by response.audio.done
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
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      scriptProcessorRef.current?.disconnect();
      scriptProcessorRef.current = null;
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

  // Unlock skip when AI finishes speaking and session returns to "listening".
  useEffect(() => {
    if (state.session === "listening") skipInProgressRef.current = false;
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
      const skippedList = questionsRef.current
        .filter(q => skippedIdsRef.current.has(q.id))
        .map(q => `"${q.id}" (topic: ${q.category})`)
        .join(", ");
      dispatch({ type: "ANSWER_SAVED" });
      const firstSkipped = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
      setActiveCardId(firstSkipped?.id ?? null);
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `[SYSTEM: All main topics have been covered. ${skippedIdsRef.current.size} topic(s) were skipped earlier: ${skippedList}. Circle back to them now one by one, naturally. After all are answered, the session will complete.]` }],
        },
      });
      send({ type: "response.create" });
      return;
    }

    dispatch({ type: "ANSWER_SAVED" });
    const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
    if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
    setActiveCardId(remaining[0] ?? null);

    const label = (question.options ?? []).find(o => o.value === value)?.label ?? value;
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: `[SYSTEM: Answer already saved — do NOT call submit_answer. Remaining uncollected topic IDs (in order): ${remaining.join(", ")}. Continue naturally with the FIRST one in this list.] The customer tapped their answer: "${label}"` }],
      },
    });
    send({ type: "response.create" });
  }, [saveAnswer, saveVoiceState, advancePhase, send]);

  /** Clears the AI-proposed highlight — called when customer rejects or modal closes without submitting */
  const clearPendingVoiceAnswer = useCallback(() => {
    setPendingVoiceAnswer(null);
  }, []);

  const onPrev = useCallback(() => {
    if (stateRef.current.currentQuestionIndex === 0) return;
    const prevIndex = stateRef.current.currentQuestionIndex - 1;
    const prevQuestion = questionsRef.current[prevIndex];
    dispatch({ type: "SET_INDEX", index: prevIndex });
    setActiveCardId(questionsRef.current[prevIndex]?.id ?? null);

    const prevAnswer = prevQuestion ? savedAnswersRef.current[prevQuestion.id] : undefined;
    const msg = prevAnswer
      ? `[SYSTEM: Customer navigated back to topic "${prevQuestion.category}". Their previous answer was "${prevAnswer}". Ask warmly whether they want to change it — e.g. "You went back to [topic] — you said [X] before, did you want to revisit that?"]`
      : `[SYSTEM: Customer navigated back to topic "${prevQuestion?.category}" which has not been answered yet. Ask it naturally.]`;

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
    const questionIdx = questionsRef.current.findIndex(q => q.id === question.id);
    setActiveCardId(questionsRef.current[questionIdx + 1]?.id ?? null);

    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: `[SYSTEM: Customer skipped the topic "${question.category}". Acknowledge briefly ("No problem, we can come back to that") and move naturally to the next topic.]` }],
      },
    });
    send({ type: "response.create" });
  }, [send]);

  /** Must be called from a user-gesture handler (tap/click) to unlock AudioContext */
  const startSession = useCallback(async () => {
    setupAudio();
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
    startSession,
    toggleMute,
    onAnswerConfirmed,
    clearPendingVoiceAnswer,
    onPrev,
    skipQuestion,
    activeCardId,
  };
}

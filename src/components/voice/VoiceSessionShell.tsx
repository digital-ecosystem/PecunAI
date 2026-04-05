"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, User, Mic, MicOff, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import VoiceSphere, { VoiceState, VOICE_COLORS } from "./VoiceSphere";
import VoiceCarousel, { CarouselQuestion } from "./VoiceCarousel";
import VoiceQuestionModal from "./VoiceQuestionModal";
import VoiceExplainOverlay from "./VoiceExplainOverlay";
import VoiceChatModal from "./VoiceChatModal";

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
  | { type: "RESET" };

interface ShellState {
  session:              SessionState;
  prevSession:          SessionState | null; // saved for mute → unmute
  currentQuestionIndex: number;
  errorMessage:         string | null;
}

const initialState: ShellState = {
  session:              "idle",
  prevSession:          null,
  currentQuestionIndex:  0,
  errorMessage:         null,
};

function reducer(state: ShellState, action: Action): ShellState {
  switch (action.type) {
    case "CONNECT":
      return { ...state, session: "connecting" };
    case "CONNECTED":
      return { ...state, session: "greeting" };
    case "AI_SPEAKING":
      return { ...state, session: "speaking" };
    case "AI_DONE":
      return { ...state, session: "listening" };
    case "ANSWER_RECEIVED":
      return { ...state, session: "processing" };
    case "ANSWER_SAVED":
      return { ...state, session: "speaking", currentQuestionIndex: state.currentQuestionIndex + 1 };
    case "MUTE":
      return { ...state, session: "muted", prevSession: state.session };
    case "UNMUTE":
      return { ...state, session: state.prevSession ?? "listening", prevSession: null };
    case "PAUSE":
      return { ...state, session: "paused" };
    case "RESUME":
      return { ...state, session: "resuming" };
    case "RESUMING_DONE":
      return { ...state, session: "listening" };
    case "ERROR":
      return { ...state, session: "error", errorMessage: action.message };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ── Derived helpers ───────────────────────────────────────────────

/** Map session state → VoiceSphere animation state */
function toVoiceState(s: SessionState): VoiceState {
  if (s === "speaking" || s === "greeting" || s === "resuming") return "speaking";
  if (s === "listening") return "listening";
  return "idle";
}

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

// ── Component ─────────────────────────────────────────────────────

interface VoiceSessionShellProps {
  sessionId: string;
  questions: CarouselQuestion[];
}

export default function VoiceSessionShell({ sessionId, questions }: VoiceSessionShellProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [modalOpen,   setModalOpen]   = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [chatOpen,    setChatOpen]    = useState(false);

  const n           = questions.length;
  const wrap        = (i: number) => n > 0 ? ((i % n) + n) % n : 0;
  const activeQ     = questions[wrap(state.currentQuestionIndex)];
  const isMuted     = state.session === "muted";
  const sphereState = toVoiceState(state.session);
  const color       = VOICE_COLORS[sphereState];

  // ── Simulated greeting on mount ────────────────────────────────
  useEffect(() => {
    dispatch({ type: "CONNECT" });
    const t1 = setTimeout(() => dispatch({ type: "CONNECTED"   }), 800);
    const t2 = setTimeout(() => dispatch({ type: "AI_SPEAKING" }), 1600);
    const t3 = setTimeout(() => dispatch({ type: "AI_DONE"     }), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // ── Visibility: pause / resume when tab goes background ───────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        dispatch({ type: "PAUSE" });
      } else {
        dispatch({ type: "RESUME" });
        const t = setTimeout(() => dispatch({ type: "RESUMING_DONE" }), 1500);
        return () => clearTimeout(t);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── REST helpers ──────────────────────────────────────────────

  const saveAnswer = useCallback(async (question: CarouselQuestion, selectedOptionId: string) => {
    const selectedOption = (question.options ?? []).find(o => o.id === selectedOptionId);
    await fetch(`/api/answers?id=${sessionId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId:   question.id,
        answer:       selectedOption?.value ?? selectedOptionId,
        question:     question.text,
        options:      question.options ?? [],
        questionType: question.questionType ?? "choice",
      }),
    });
  }, [sessionId]);

  const saveVoiceState = useCallback(async (lastQuestionIndex: number) => {
    await fetch(`/api/qa-session/${sessionId}/voice-state`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastQuestionIndex }),
    });
  }, [sessionId]);

  const advancePhase = useCallback(async () => {
    await fetch("/api/phase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, phase: "SUGGESTIONS" }),
    });
    router.push("/customer/dashboard");
  }, [sessionId, router]);

  // ── Answer confirmed (from modal) ─────────────────────────────

  const handleAnswerConfirmed = useCallback(async (selectedOptionId: string) => {
    setModalOpen(false);
    if (!activeQ) return;

    dispatch({ type: "ANSWER_RECEIVED" });

    await saveAnswer(activeQ, selectedOptionId);

    const nextIndex = state.currentQuestionIndex + 1;
    await saveVoiceState(nextIndex);

    if (nextIndex >= n) {
      await advancePhase();
      return;
    }

    dispatch({ type: "ANSWER_SAVED" });
    setTimeout(() => dispatch({ type: "AI_DONE" }), 1200);
  }, [activeQ, state.currentQuestionIndex, n, saveAnswer, saveVoiceState, advancePhase]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleMute = useCallback(() => {
    dispatch({ type: isMuted ? "UNMUTE" : "MUTE" });
  }, [isMuted]);

  const goNext = useCallback(() => {
    dispatch({ type: "ANSWER_SAVED" });
    setTimeout(() => dispatch({ type: "AI_DONE" }), 1200);
  }, []);

  const goPrev = useCallback(() => {
    dispatch({ type: "ANSWER_RECEIVED" });
    setTimeout(() => dispatch({ type: "AI_DONE" }), 300);
  }, []);

  return (
    <>
      <div
        className="h-screen flex flex-col overflow-hidden select-none"
        style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <Btn onClick={() => router.push("/customer/dashboard")}>
            <Menu size={20} color="#3b82f6" strokeWidth={2} />
          </Btn>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold tracking-tight" style={{ color: "#3a5bd9" }}>Vox.2</span>
            <span className="text-[10px] font-medium tracking-widest uppercase"
              style={{ color: STATE_COLOR[state.session] }}>
              {state.session}
            </span>
          </div>
          <Btn>
            <User size={20} color="#3b82f6" strokeWidth={2} />
          </Btn>
        </header>

        {/* ── Sphere ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center flex-1 min-h-0">
          <VoiceSphere voiceState={sphereState} size={420} />
          <p className="mt-4 text-sm font-semibold tracking-wide transition-colors duration-500"
            style={{ color }}>
            {STATUS_LABEL[state.session]}
          </p>

          {state.session === "error" && (
            <p className="mt-2 text-xs text-red-400">{state.errorMessage}</p>
          )}
        </div>

        {/* ── Bottom panel ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(240,247,255,0.6) 20%, rgba(235,244,255,0.92) 100%)",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}
        >
          {questions.length > 0 && (
            <VoiceCarousel
              questions={questions}
              currentIndex={state.currentQuestionIndex}
              onNext={goNext}
              onPrev={goPrev}
              onActiveCardClick={() => setModalOpen(true)}
              onInfoClick={() => setExplainOpen(true)}
            />
          )}

          {/* ── Nav bar ────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-5 py-4">
            <Btn active={isMuted} onClick={handleMute}>
              {isMuted
                ? <MicOff size={18} color="#ef4444" strokeWidth={2} />
                : <Mic    size={18} color="#3b82f6"  strokeWidth={2} />}
            </Btn>

            <div className="flex items-center gap-5 px-5 py-4 rounded-full"
              style={{ background: "rgba(210,224,248,0.45)", border: "1.5px solid rgba(190,212,245,0.6)", boxShadow: "0 2px 8px rgba(80,120,210,0.10)" }}>
              <button onClick={goPrev} style={{ color: "#6b8de0" }}>
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setModalOpen(true)}
                disabled={state.session === "processing" || state.session === "connecting"}
                style={{ color: state.session === "listening" || state.session === "muted" ? "#6b8de0" : "#c3d3ef" }}
              >
                <ChevronRight size={22} strokeWidth={1.5} />
              </button>
            </div>

            <Btn onClick={() => setChatOpen(true)}>
              <MessageSquare size={18} color="#8ba3d4" strokeWidth={2} />
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      {chatOpen && <VoiceChatModal onClose={() => setChatOpen(false)} />}

      {explainOpen && activeQ && (
        <VoiceExplainOverlay
          footnote={{
            title: `${activeQ.category} verstehen`,
            body:  "Bei der Festlegung Ihres Anlageziels ist es wichtig zu verstehen, ob Sie primär Vermögen aufbauen, Kapital erhalten, für das Alter vorsorgen oder andere spezifische Ziele verfolgen möchten.",
            stats: [
              { label: "Stocks", value: 60, color: "#3b82f6" },
              { label: "Bonds",  value: 30, color: "#60a5fa" },
              { label: "Cash",   value: 10, color: "#93c5fd" },
            ],
          }}
          questionCategory={activeQ.category}
          questionText={activeQ.text}
          onClose={() => setExplainOpen(false)}
          onFollowUp={() => { setChatOpen(true); setExplainOpen(false); }}
        />
      )}

      {modalOpen && activeQ && (
        <VoiceQuestionModal
          question={{
            number:           state.currentQuestionIndex + 1,
            total:            n,
            text:             activeQ.text,
            options:          activeQ.options ?? [],
            questionType:     activeQ.questionType,
            minValue:         activeQ.minValue,
            maxValue:         activeQ.maxValue,
            inputPlaceholder: activeQ.inputPlaceholder,
          }}
          onClose={() => setModalOpen(false)}
          onNext={handleAnswerConfirmed}
        />
      )}
    </>
  );
}

// ── State indicator colours (dev helper shown under title) ────────
const STATE_COLOR: Record<SessionState, string> = {
  idle:        "#94a3b8",
  connecting:  "#f59e0b",
  greeting:    "#8b5cf6",
  speaking:    "#3b82f6",
  listening:   "#22c55e",
  processing:  "#f59e0b",
  muted:       "#ef4444",
  paused:      "#94a3b8",
  resuming:    "#8b5cf6",
  error:       "#ef4444",
};

// ── Reusable button ───────────────────────────────────────────────
function Btn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={{
        background: active ? "rgba(254,226,226,0.7)" : "rgba(210,224,248,0.45)",
        border: `1.5px solid ${active ? "#fca5a5" : "rgba(190,212,245,0.6)"}`,
        boxShadow: "0 2px 8px rgba(80,120,210,0.10)",
      }}>
      {children}
    </button>
  );
}

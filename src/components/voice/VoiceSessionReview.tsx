"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Mic, MessageCircle, ArrowLeft } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import { SphereToFrameTransition } from "./SphereToFrameTransition";
import type { FrameRect } from "./frameMath";
import type { SessionState } from "@/hooks/useVoiceSession";

// ── Status labels — same map as VoiceSessionShell / VoiceInvestmentForm / VoiceContractDocuments ──
const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "Digital Onboarding Guide begrüßt Sie...",
  speaking:    "Digital Onboarding Guide spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

interface VoiceSessionReviewProps {
  isSpeaking:      boolean;
  sessionState:    SessionState;
  analyserNode:    AnalyserNode | null;
  micAnalyserNode: AnalyserNode | null;
  onPTTStart:      () => void;
  onPTTRelease:    () => void;
  onConfirm:       () => void;
  /** One phase back → Phase 5 (Contract Documents). Optional; renders a subtle "Zurück" button. */
  onBack?:         () => void;
  onChatClick:     () => void;
  isChatOpen:      boolean;
  /** Phase 5's frame rect at handoff time. When set at mount, the contracts
   *  frame visibly collapses into this screen's sphere (which IS the
   *  destination — Phase 6 is a sphere screen). Null on cold resume. */
  entryFrameRect?: FrameRect | null;
  /** Tap-to-stop on the sphere: barge in on AI speech (and, during the
   *  6→7 signing-pause announcement, skip straight to the signing phase —
   *  the shell passes the matching handler). */
  onSphereTap?:    () => void;
}

// Phase 6 — Final Q&A: the last AI-guided moment before signing. Visually the same orb
// screen as Phase 0's intro / the Phase 4 reconnect placeholder, plus a PTT button (this
// phase IS interactive, unlike that passive orb screen) and a "Weiter zur Unterschrift"
// confirm button (always enabled — no checkbox gate, this isn't a compliance screen).
export default function VoiceSessionReview({
  isSpeaking,
  sessionState,
  analyserNode,
  micAnalyserNode,
  onPTTStart,
  onPTTRelease,
  onConfirm,
  onBack,
  onChatClick,
  isChatOpen,
  entryFrameRect,
  onSphereTap,
}: VoiceSessionReviewProps) {
  const [isPTTActive, setIsPTTActive] = useState(false);

  // ── Entry collapse (Phase 5's frame → this screen's sphere) — the pause-
  // screen pattern: the one-shot canvas flies the contracts frame's nodes
  // into the sphere position while the real sphere/buttons stay hidden, then
  // everything fades in as the collapse mostly lands.
  const [entryStart]  = useState(entryFrameRect ?? null); // snapshot at mount
  const [entryCenter] = useState(() =>
    entryFrameRect && typeof window !== "undefined"
      ? { x: window.innerWidth / 2, y: 84 + (window.innerHeight - 84) / 2 }
      : null
  );
  const [collapsing, setCollapsing] = useState(!!entryFrameRect);
  const [revealed,   setRevealed]   = useState(!entryFrameRect);

  // Safety net: never leave the screen stuck mid-collapse.
  useEffect(() => {
    if (!collapsing) return;
    const t = setTimeout(() => {
      setRevealed(true);
      setCollapsing(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [collapsing]);

  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* Header — Vox.2 title, plus a one-step-back button on the left (Phase 6 → 5). */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          {onBack ? (
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              aria-label="Einen Schritt zurück"
            >
              <ArrowLeft size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>
          ) : <div style={{ width: 44, height: 44 }} />}
          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>
          <div style={{ width: 44, height: 44 }} />
        </div>
      </div>

      {/* Entry collapse — Phase 5's contracts frame flies into the sphere position. */}
      {collapsing && entryStart && entryCenter && (
        <SphereToFrameTransition
          direction="toOrb"
          sphereCenter={entryCenter}
          sphereRadius={380 * 0.3}
          contentRect={entryStart}
          onMostlyDone={() => setRevealed(true)}
          onComplete={() => setCollapsing(false)}
        />
      )}

      {/* Orb — same background pulse + VoiceSphere as the shared orb screen */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <motion.div
            className="rounded-full"
            style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 70%)", filter: "blur(60px)" }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.div
          className={`relative z-10${onSphereTap ? " cursor-pointer" : ""}`}
          initial={{ opacity: 0, scale: 0.9 }}
          // Hidden while the collapse canvas flies the frame in; fades in as
          // it mostly lands (scale pinned at 1 on that path so the real
          // sphere appears exactly where the nodes converge).
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : entryStart ? 1 : 0.9 }}
          transition={{ duration: entryStart ? 0.35 : 0.6 }}
          onClick={onSphereTap}
        >
          <VoiceSphere
            isActive={true}
            isSpeaking={isSpeaking}
            isListening={isPTTActive}
            size={380}
            analyserNode={isPTTActive ? null : analyserNode}
            micAnalyserNode={isPTTActive ? micAnalyserNode : null}
          />
        </motion.div>

        <motion.div
          className="relative z-30 mt-4 flex flex-col items-center gap-4"
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: revealed ? "auto" : "none" }}
        >
          <motion.p
            className="text-sm font-medium"
            style={{ color: "rgba(59,130,246,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {statusLabel}
          </motion.p>

          <motion.button
            className="text-sm font-semibold rounded-2xl text-white py-3 px-8"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
          >
            Weiter zur Unterschrift
          </motion.button>
        </motion.div>
      </div>

      {/* Chat button — fixed bottom-left, mirrors the PTT button on the opposite corner.
          Hidden while chat is open, same as PTT, so neither floats on top of the modal.
          Both also wait for the entry collapse to land (revealed). */}
      {!isChatOpen && revealed && (
        <div className="fixed bottom-8 left-6 z-[60]">
          <motion.button
            className="flex items-center justify-center rounded-full shadow-xl border-2"
            style={{
              width: 64, height: 64,
              background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              borderColor: "rgba(59,130,246,0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onChatClick}
          >
            <MessageCircle className="text-white" size={26} />
          </motion.button>
        </div>
      )}

      {/* PTT button — fixed bottom-right, identical to Phases 2/4/5. Hidden while chat is
          open — the chat modal is a 70vh bottom sheet and would otherwise sit underneath it. */}
      {!isChatOpen && revealed && (
        <div className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]">
          {!isPTTActive && !isSpeaking && (
            <p className="text-xs font-medium text-center" style={{ color: "rgba(59,130,246,0.7)" }}>
              Halten zum<br />Sprechen
            </p>
          )}
          <motion.button
            className="flex items-center justify-center rounded-full shadow-xl border-2 ptt-button"
            style={{
              width: 64, height: 64,
              background: isPTTActive
                ? "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(29,78,216,1) 100%)"
                : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              borderColor: isPTTActive ? "rgba(29,78,216,0.8)" : "rgba(59,130,246,0.3)",
            }}
            animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
            transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
            onMouseDown={() => { setIsPTTActive(true); onPTTStart(); }}
            onMouseUp={() => { setIsPTTActive(false); onPTTRelease(); }}
            onMouseLeave={isPTTActive ? () => { setIsPTTActive(false); onPTTRelease(); } : undefined}
            onTouchStart={() => { setIsPTTActive(true); onPTTStart(); }}
            onTouchEnd={() => { setIsPTTActive(false); onPTTRelease(); }}
            onTouchCancel={() => { setIsPTTActive(false); onPTTRelease(); }}
          >
            <Mic className="text-white" size={26} />
          </motion.button>
        </div>
      )}
    </div>
  );
}

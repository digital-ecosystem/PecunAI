"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import type { SessionState } from "@/hooks/useVoiceSession";

// ── Status labels — same map as VoiceSessionShell / VoiceInvestmentForm / VoiceContractDocuments ──
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

interface VoiceSessionReviewProps {
  isSpeaking:      boolean;
  sessionState:    SessionState;
  analyserNode:    AnalyserNode | null;
  micAnalyserNode: AnalyserNode | null;
  onPTTStart:      () => void;
  onPTTRelease:    () => void;
  onConfirm:       () => void;
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
}: VoiceSessionReviewProps) {
  const [isPTTActive, setIsPTTActive] = useState(false);

  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* Header — same Vox.2 title as every other phase */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-center">
          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>
        </div>
      </div>

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
          className="relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
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

        <div className="relative z-30 mt-4 flex flex-col items-center gap-4">
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
        </div>
      </div>

      {/* PTT button — fixed bottom-right, identical to Phases 2/4/5 */}
      <div className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]">
        {!isPTTActive && !isSpeaking && (
          <p className="text-xs font-medium text-center" style={{ color: "rgba(59,130,246,0.7)" }}>
            Halten zum<br />Sprechen
          </p>
        )}
        <motion.button
          className="flex items-center justify-center rounded-full shadow-xl border-2"
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
    </div>
  );
}

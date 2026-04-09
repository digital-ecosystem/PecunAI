"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, TrendingUp, DollarSign, PieChart } from "lucide-react";
import VoiceSphere from "./VoiceSphere";

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface VoiceExplainOverlayProps {
  footnote: {
    title: string;
    body:  string;
    stats: Stat[];
  };
  questionCategory: string;
  questionText:     string;
  onClose:          () => void;
  onFollowUp:       () => void;
}

const BAR_COUNT = 40;
const BASE_H    = 4;
const MAX_H     = 80;

function WaveformBars() {
  // Generate stable random heights once per mount
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, () => [
        Math.random() * MAX_H + 20,
        Math.random() * MAX_H + 20,
      ]),
    [],
  );

  return (
    <div className="flex items-center justify-center gap-1 h-24 px-8">
      {bars.map(([h1, h2], i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width:      2.5,
            background: "linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(147,197,253,0.6) 100%)",
            boxShadow:  "0 0 8px rgba(59,130,246,0.4)",
          }}
          animate={{ height: [BASE_H, h1, h2, BASE_H] }}
          transition={{
            duration: 1.2,
            repeat:   Infinity,
            ease:     "easeInOut",
            delay:    i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceExplainOverlay({
  footnote,
  questionCategory,
  questionText,
  onClose,
  onFollowUp,
}: VoiceExplainOverlayProps) {
  const [showTransition, setShowTransition] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowTransition(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 30%, rgba(249,250,251,1) 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Ambient background waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-full h-96"
          style={{
            top: 0,
            background:
              "radial-gradient(ellipse at top, rgba(59,130,246,0.12) 0%, transparent 60%)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-full h-96"
          style={{
            top: 100,
            background:
              "radial-gradient(ellipse at top, rgba(147,197,253,0.08) 0%, transparent 50%)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      {/* ── Entry transition ───────────────────────────────────────── */}
      {/* Phantom orb shrinks up + fades; phantom question card slides down + fades */}
      <AnimatePresence>
        {showTransition && (
          <>
            {/* Orb: starts centred, shrinks toward top and fades */}
            <motion.div
              key="transition-orb"
              className="fixed z-[60] flex items-center justify-center pointer-events-none"
              initial={{ top: "50%", left: "50%", x: "-50%", y: "-50%" }}
              animate={{
                top: "80px",
                scale: [1, 0.4],
                opacity: [1, 0.8, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <VoiceSphere isActive isSpeaking size={280} analyserNode={null} />
            </motion.div>

            {/* Question card: slides down and fades */}
            <motion.div
              key="transition-card"
              className="fixed z-[60] px-6 pointer-events-none"
              style={{
                width: "100%",
                maxWidth: "400px",
                left: "50%",
                x: "-50%",
              }}
              initial={{ bottom: "120px" }}
              animate={{ bottom: "-100px", opacity: [1, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                className="relative overflow-hidden rounded-3xl px-6 py-5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow:
                    "0 0 40px rgba(59,130,246,0.6), 0 8px 32px rgba(59,130,246,0.15)",
                }}
              >
                {questionCategory && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "rgba(59,130,246,0.8)" }}
                  >
                    {questionCategory}
                  </div>
                )}
                <p
                  className="text-base font-medium"
                  style={{ color: "rgba(15,23,42,0.9)" }}
                >
                  {questionText}
                </p>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)",
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header — back button ───────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full px-6 py-5 flex-shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: showTransition ? 0 : 1 }}
        transition={{ delay: showTransition ? 0 : 0.3, duration: 0.4 }}
      >
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:          44,
            height:         44,
            background:     "rgba(255,255,255,0.7)",
            backdropFilter: "blur(10px)",
            border:         "1px solid rgba(255,255,255,0.6)",
            boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
        >
          <ArrowLeft size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
        </motion.button>
      </motion.div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col px-6 pb-8 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: showTransition ? 0 : 1,
          y:       showTransition ? 20 : 0,
        }}
        transition={{ delay: showTransition ? 0 : 0.5, duration: 0.6 }}
      >
        {/* Waveform — matches Figma design */}
        <WaveformBars />
        <p
          className="text-center text-sm font-medium pt-3 mb-8"
          style={{ color: "rgba(59,130,246,0.7)" }}
        >
          AI erklärt...
        </p>

        {/* Explanation panel */}
        <div className="mb-6">
          <div
            className="w-full rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.6)",
              boxShadow:
                "0 20px 60px rgba(59,130,246,0.2), 0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {/* Accent bar */}
            <div
              className="w-full h-1"
              style={{
                background:
                  "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)",
              }}
            />

            <div className="p-6">
              {/* Icon row */}
              <div className="flex items-center gap-4 mb-4">
                {[
                  { Icon: TrendingUp, color: "rgba(34,197,94,0.8)"  },
                  { Icon: DollarSign, color: "rgba(59,130,246,0.8)"  },
                  { Icon: PieChart,   color: "rgba(168,85,247,0.8)"  },
                ].map(({ Icon, color }, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-center rounded-2xl"
                    style={{
                      width:      48,
                      height:     48,
                      background: `${color}15`,
                      border:     `1px solid ${color}25`,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Icon size={24} style={{ color }} />
                  </motion.div>
                ))}
              </div>

              {/* Title */}
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "rgba(15,23,42,0.95)" }}
              >
                {footnote.title}
              </h3>

              {/* Body */}
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "rgba(71,85,105,0.8)" }}
              >
                {footnote.body}
              </p>

              {/* Data bars */}
              <div className="space-y-3">
                {footnote.stats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-medium"
                        style={{ color: "rgba(71,85,105,0.7)" }}
                      >
                        {stat.label}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: stat.color }}
                      >
                        {stat.value}%
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(226,232,240,0.5)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: stat.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{
                          duration: 1,
                          delay:    0.3 + i * 0.1,
                          ease:     "easeOut",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* "Ihre Frage" question card */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "rgba(100,116,139,0.6)" }}
          >
            Ihre Frage
          </p>
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.5)",
              boxShadow:
                "0 8px 32px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {questionCategory && (
              <div
                className="text-xs font-medium mb-2"
                style={{ color: "rgba(59,130,246,0.8)" }}
              >
                {questionCategory}
              </div>
            )}
            <p
              className="text-base font-medium"
              style={{ color: "rgba(15,23,42,0.9)" }}
            >
              {questionText}
            </p>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* Tap hint */}
        <motion.button
          className="mt-8 text-center w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onFollowUp}
        >
          <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>
            Tippen Sie irgendwo, um eine Nachfrage zu stellen
          </p>
        </motion.button>
      </motion.div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(249,250,251,1) 0%, transparent 100%)",
        }}
      />
    </motion.div>
  );
}

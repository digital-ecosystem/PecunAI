"use client";

import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, DollarSign, PieChart, X, MessageSquare } from "lucide-react";

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

const ICONS = [TrendingUp, DollarSign, PieChart];

export default function VoiceExplainOverlay({
  footnote,
  onClose,
  onFollowUp,
}: VoiceExplainOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full rounded-t-3xl overflow-hidden"
          style={{
            background:     "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)",
            backdropFilter: "blur(20px)",
            border:         "1px solid rgba(255,255,255,0.6)",
            boxShadow:      "0 -8px 40px rgba(59,130,246,0.15)",
            maxHeight:      "80vh",
            overflowY:      "auto",
          }}
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Accent bar */}
          <div
            className="w-full h-1"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)" }}
          />

          <div className="p-6">
            {/* Header row */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                {ICONS.map((Icon, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-center rounded-2xl"
                    style={{
                      width: 44, height: 44,
                      background: `${footnote.stats[i]?.color ?? "rgba(59,130,246,0.8)"}22`,
                      border: `1px solid ${footnote.stats[i]?.color ?? "rgba(59,130,246,0.8)"}33`,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Icon size={22} style={{ color: footnote.stats[i]?.color ?? "rgba(59,130,246,0.8)" }} />
                  </motion.div>
                ))}
              </div>
              <motion.button
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                <X size={18} style={{ color: "rgba(59,130,246,0.7)" }} />
              </motion.button>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-3" style={{ color: "rgba(15,23,42,0.95)" }}>
              {footnote.title}
            </h3>

            {/* Body */}
            <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(71,85,105,0.8)" }}>
              {footnote.body}
            </p>

            {/* Stats bars */}
            <div className="space-y-3 mb-6">
              {footnote.stats.map((stat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "rgba(71,85,105,0.7)" }}>
                      {stat.label}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: stat.color }}>
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
                      transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Follow-up button */}
            <motion.button
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
                color: "white",
                boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              onClick={onFollowUp}
            >
              <MessageSquare size={16} />
              Frage stellen
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

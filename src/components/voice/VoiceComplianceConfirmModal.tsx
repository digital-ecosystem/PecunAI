"use client";

import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

interface VoiceComplianceConfirmModalProps {
  /** The question being answered, shown so the customer can check what they replied to. */
  questionText: string;
  /** The chosen answer, as a readable label rather than its stored value. */
  answerLabel:  string;
  /** Confirm — the session ends and an advisor takes over. */
  onConfirm:    () => void;
  /** Go back and answer again. Nothing has been saved at this point. */
  onChange:     () => void;
}

export default function VoiceComplianceConfirmModal({
  questionText,
  answerLabel,
  onConfirm,
  onChange,
}: VoiceComplianceConfirmModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(180deg, rgba(255,251,235,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-confirm-title"
    >
      <motion.div
        className="flex flex-col items-center gap-5 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 88, height: 88, background: "rgba(245,158,11,0.1)", border: "1.5px solid rgba(245,158,11,0.25)" }}
        >
          <AlertTriangle size={36} style={{ color: "rgba(217,119,6,0.85)" }} strokeWidth={1.5} />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            id="compliance-confirm-title"
            className="text-xl font-bold"
            style={{ color: "rgba(15,23,42,0.9)" }}
          >
            Bitte bestätigen Sie Ihre Antwort
          </h1>
        </div>

        {/* What they actually answered — the misclick is only visible if we show it back. */}
        <div
          className="w-full flex flex-col gap-1.5 rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(148,163,184,0.25)" }}
        >
          <span className="text-xs" style={{ color: "rgba(100,116,139,0.85)" }}>
            {questionText}
          </span>
          <span className="text-sm font-semibold" style={{ color: "rgba(15,23,42,0.9)" }}>
            {answerLabel}
          </span>
        </div>

        <p className="text-sm text-center" style={{ color: "rgba(100,116,139,0.9)" }}>
          Mit dieser Antwort können wir die digitale Beratung nicht fortsetzen. Wir vermitteln Sie
          an einen persönlichen Berater, der sich bei Ihnen meldet. Diese Entscheidung lässt sich
          später nicht mehr rückgängig machen.
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <motion.button
            className="w-full flex items-center justify-center rounded-2xl py-3.5 px-6"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)",
              boxShadow:  "0 4px 16px rgba(59,130,246,0.3)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={onChange}
          >
            <span className="text-sm font-medium text-white">Antwort ändern</span>
          </motion.button>

          <motion.button
            className="w-full flex items-center justify-center rounded-2xl py-3.5 px-6"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(148,163,184,0.35)" }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
          >
            <span className="text-sm font-medium" style={{ color: "rgba(71,85,105,0.95)" }}>
              Ja, Antwort bestätigen
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

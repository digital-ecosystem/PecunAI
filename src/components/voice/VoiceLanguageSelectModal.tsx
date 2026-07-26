"use client";

import { motion } from "motion/react";
import { Languages } from "lucide-react";

interface VoiceLanguageSelectModalProps {
  onSelect: (lang: "de" | "en") => void;
}

// Blocking, shown once per session right after the recording disclaimer and before the
// tap-to-start screen — the session is held in German by default, and the customer can
// switch it to English here instead. Persisted via localStorage in useVoiceSession.ts,
// mirroring the recording-disclaimer pattern, so a refresh-resume keeps the choice. See
// private-documents/LANGUAGE_SELECT_MODAL_PLAN.md.
export default function VoiceLanguageSelectModal({ onSelect }: VoiceLanguageSelectModalProps) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex flex-col items-center gap-5 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{ width: 88, height: 88, background: "rgba(59,130,246,0.1)", border: "1.5px solid rgba(59,130,246,0.2)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Languages size={36} style={{ color: "rgba(59,130,246,0.8)" }} strokeWidth={1.5} />
        </motion.div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold" style={{ color: "rgba(15,23,42,0.9)" }}>
            Sprache / Language
          </h1>
          <p className="text-sm" style={{ color: "rgba(100,116,139,0.85)" }}>
            Diese Beratung wird standardmäßig auf Deutsch geführt.
          </p>
          <p className="text-sm" style={{ color: "rgba(100,116,139,0.85)" }}>
            This session is held in German by default. Would you like to switch to English
            instead?
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <motion.button
            className="w-full flex items-center justify-center rounded-2xl py-3.5 px-6"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)",
              boxShadow:  "0 4px 16px rgba(59,130,246,0.3)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("de")}
          >
            <span className="text-sm font-medium text-white">Weiter auf Deutsch</span>
          </motion.button>

          <motion.button
            className="w-full flex items-center justify-center rounded-2xl py-3.5 px-6"
            style={{
              background: "rgba(255,255,255,0.85)",
              border:     "1.5px solid rgba(59,130,246,0.5)",
              boxShadow:  "0 2px 8px rgba(59,130,246,0.06)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("en")}
          >
            <span className="text-sm font-medium" style={{ color: "rgba(37,99,235,0.9)" }}>
              Continue in English
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

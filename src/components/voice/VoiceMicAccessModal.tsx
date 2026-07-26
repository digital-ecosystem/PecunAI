"use client";

import { motion } from "motion/react";
import { MicOff, RefreshCw } from "lucide-react";

interface VoiceMicAccessModalProps {
  onRetry: () => void;
}

// Blocking, non-dismissible — mic access is mandatory for the whole session (every phase uses
// push-to-talk). Rendered as a single top-level early return in VoiceSessionShell, replacing
// whatever phase screen would otherwise show. See
// private-documents/after-demo/MIC_ACCESS_REQUIRED_PLAN.md.
export default function VoiceMicAccessModal({ onRetry }: VoiceMicAccessModalProps) {
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
          style={{ width: 88, height: 88, background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <MicOff size={36} style={{ color: "rgba(239,68,68,0.8)" }} strokeWidth={1.5} />
        </motion.div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold" style={{ color: "rgba(15,23,42,0.9)" }}>
            Mikrofonzugriff erforderlich
          </h1>
          <p className="text-sm" style={{ color: "rgba(100,116,139,0.85)" }}>
            Digital Onboarding Guide führt die gesamte Beratung per Stimme. Ohne Mikrofonzugriff kann die Sitzung leider nicht fortgesetzt werden.
          </p>
        </div>

        <motion.button
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)",
            boxShadow:  "0 4px 16px rgba(59,130,246,0.3)",
          }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
        >
          <RefreshCw size={18} style={{ color: "white" }} />
          <span className="text-sm font-medium text-white">Erneut versuchen</span>
        </motion.button>

        <div
          className="w-full rounded-2xl px-5 py-4"
          style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(226,232,240,0.8)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(100,116,139,0.7)" }}>
            Falls das nicht funktioniert
          </p>
          <div className="space-y-3 text-xs" style={{ color: "rgba(71,85,105,0.85)" }}>
            <div>
              <p className="font-medium mb-1" style={{ color: "rgba(51,65,85,0.9)" }}>iOS Safari</p>
              <p>Einstellungen → Safari → Einstellungen für Websites → Mikrofon → Erlauben</p>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: "rgba(51,65,85,0.9)" }}>Chrome / Firefox</p>
              <p>Schloss-Symbol in der Adressleiste antippen → Mikrofon aktivieren → Seite neu laden</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

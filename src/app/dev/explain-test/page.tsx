"use client";

/**
 * DEV-ONLY harness — mounts VoiceExplainOverlay with fake data over a fake
 * phase-1 backdrop to exercise the entry AND exit transitions without a live
 * session. Safe to delete.
 */

import { useState } from "react";
import VoiceExplainOverlay from "@/components/voice/VoiceExplainOverlay";
import VoiceSphere from "@/components/voice/VoiceSphere";

export default function ExplainTestPage() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* Fake phase-1 backdrop: real orb where the exit phantom lands */}
      <div className="flex-1 flex items-center justify-center">
        <VoiceSphere isActive isSpeaking={false} isListening={false} size={380} analyserNode={null} micAnalyserNode={null} />
      </div>
      <div className="mb-16 flex justify-center">
        <div className="rounded-3xl bg-white px-6 py-5 max-w-sm" style={{ boxShadow: "0 8px 32px rgba(59,130,246,0.15)" }}>
          <p className="text-xs mb-1" style={{ color: "rgba(59,130,246,0.8)" }}>Frage</p>
          <p className="text-sm font-medium" style={{ color: "rgba(15,23,42,0.9)" }}>
            Aktien – Wie schätzen Sie Ihre Kenntnisse über Aktien ein?
          </p>
        </div>
      </div>

      {!open && (
        <button
          id="reopen-btn"
          className="fixed top-2 left-2 z-[99] px-2 py-0.5 rounded border border-blue-300 text-blue-600 text-xs font-mono"
          onClick={() => setOpen(true)}
        >
          Reopen
        </button>
      )}

      {open && (
        <VoiceExplainOverlay
          footnote={{
            title: "Aktien verstehen",
            keyPoints: [
              "Aktien sind Anteile an einem Unternehmen.",
              "Kurse schwanken — höhere Renditechancen, höheres Risiko.",
              "Langfristige Anlage glättet Schwankungen.",
            ],
            stats: [
              { label: "Renditechance", value: 75, color: "rgba(34,197,94,1)" },
              { label: "Risiko", value: 65, color: "rgba(239,68,68,1)" },
            ],
          }}
          questionCategory="Frage"
          questionText="Aktien – Wie schätzen Sie Ihre Kenntnisse über Aktien ein?"
          analyserNode={null}
          isAISpeaking={false}
          onCloseStart={() => {}}
          onClose={() => setOpen(false)}
          onFollowUp={() => setOpen(false)}
        />
      )}
    </div>
  );
}

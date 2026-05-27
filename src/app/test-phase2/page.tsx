"use client";

import { useState } from "react";
import VoiceProductPhase from "@/components/voice/VoiceProductPhase";
import type { ProductData } from "@/hooks/useVoiceSession";

const MOCK_PRODUCT: ProductData = {
  id:          "vvkn3",
  name:        "VVKN3",
  fullName:    "Vermögensverwaltung Konservativ 3",
  description: "Konservative Vermögensverwaltung mit ausgewogenem Risikoprofil.",
  fileName:    "vvkn3_product_guide.pdf",
  from:        5,
  to:          10,
  risk:        "medium",
  riskType:    "balanced",
  sri:         "3",
  score:       72,
  aiSettings:  { prompt: "" },
};

export default function TestPhase2() {
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted,     setIsMuted]     = useState(false);

  return (
    <div>
      {/* ── Dev controls ──────────────────────────────────────────── */}
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 rounded-2xl px-4 py-3 text-xs"
        style={{
          background:     "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          color:          "#fff",
          minWidth:       120,
        }}
      >
        <p className="font-semibold mb-1 opacity-60">DEV</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isSpeaking}  onChange={e => setIsSpeaking(e.target.checked)}  />
          Speaking
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isListening} onChange={e => setIsListening(e.target.checked)} />
          Listening
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isMuted}     onChange={e => setIsMuted(e.target.checked)}     />
          Muted
        </label>
      </div>

      <VoiceProductPhase
        product={MOCK_PRODUCT}
        isSpeaking={isSpeaking}
        isListening={isListening}
        isMuted={isMuted}
        sessionState={isSpeaking ? "speaking" : isListening ? "listening" : "idle"}
        analyserNode={null}
        micAnalyserNode={null}
        onMuteToggle={() => setIsMuted(m => !m)}
        onChatClick={() => alert("chat")}
        onConfirm={() => alert("confirm")}
        onRevisit={() => alert("revisit")}
      />
    </div>
  );
}

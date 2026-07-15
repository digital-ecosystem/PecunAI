"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { FrameRect } from "./frameMath";
import { SustainabilityRisksInfo } from "@/components/terms/SustainabilityRisksInfo";

/**
 * The sustainability disclosure as a Phase 1 morph-target card — the white
 * document content only, centered at the same rect the expanded question
 * cards use. The neural frame around it is drawn by the persistent
 * PhaseOneNeuralModel canvas underneath (VoiceSessionShell flips its shape to
 * "cardFrame" while this is open), replacing the old full-screen
 * VoiceTermsPhase slide-in for this mid-phase-1 step. VoiceTermsPhase itself
 * still owns Phase 0's terms1/terms2 screens unchanged.
 *
 * Confirm contract ported from VoiceTermsPhase: button flips green
 * ("Bestätigt!") and onConfirm fires 1.5s later.
 */

interface SustainabilityTermsCardProps {
  rect: FrameRect;
  onConfirm: () => Promise<void> | void;
}

export function SustainabilityTermsCard({ rect, onConfirm }: SustainabilityTermsCardProps) {
  const [confirmed,  setConfirmed]  = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (confirming || confirmed) return;
    setConfirming(true);
    setConfirmed(true);
    setTimeout(() => { onConfirm(); }, 1500);
  };

  return (
    <motion.div
      className="fixed z-[56]"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.15 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
    >
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: Math.round(rect.w * 0.05),
          boxShadow: "0 20px 60px rgba(59,130,246,0.18), 0 4px 16px rgba(15,23,42,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <h2 className="text-base font-bold mb-1" style={{ color: "rgba(15,23,42,0.9)" }}>
            Nachhaltigkeitsinformationen
          </h2>
          <p className="text-xs" style={{ color: "rgba(59,130,246,0.7)" }}>
            Gesetzlich vorgeschriebene Information gemäß EU-Vorschriften
          </p>
        </div>

        {/* Document body — scrolls internally, same as the question cards */}
        <div className="flex-1 px-5 overflow-y-auto">
          <motion.div
            className="text-sm pb-2"
            style={{ color: "rgba(15,23,42,0.75)", lineHeight: 1.7 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.3 } }}
          >
            <SustainabilityRisksInfo />
          </motion.div>
        </div>

        {/* Confirm button */}
        <div className="flex-shrink-0 px-5 pb-4 pt-2">
          <motion.button
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: confirmed
                ? "linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(22,163,74,1) 100%)"
                : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              boxShadow: confirmed
                ? "0 4px 16px rgba(34,197,94,0.35)"
                : "0 4px 16px rgba(59,130,246,0.35)",
            }}
            whileTap={{ scale: 0.97 }}
            disabled={confirming}
            onClick={handleConfirm}
          >
            {confirmed ? "Bestätigt!" : "Ich bestätige"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default SustainabilityTermsCard;

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic } from "lucide-react";
import type { FrameRect } from "./frameMath";
import { LegalFrameCard } from "./LegalFrameCard";
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
        {/* Figma LegalFrameCard interior — badge (3/3), title, subtitle fixed;
            body scrolls alone; confirm button inside the card. */}
        <LegalFrameCard
          title="Nachhaltigkeitsinformationen"
          subtitle="Gesetzlich vorgeschriebene Information gemäß EU-Vorschriften"
          pageIndex={2}
          totalPages={3}
          confirmed={confirmed}
          confirming={confirming}
          onConfirm={handleConfirm}
        >
          <SustainabilityRisksInfo />
        </LegalFrameCard>
      </div>
    </motion.div>
  );
}

/**
 * Floating push-to-talk button shown alongside the disclosure card — ported
 * from VoiceTermsPhase's own PTT (same placement, styling, and hold
 * semantics). Needed because the card is ~88vh tall and covers the ControlBar,
 * making its PTT unreachable while the disclosure is open. Rendered by the
 * shell as a sibling of the card (NOT inside it — the card root animates
 * `scale`, and position:fixed inside a transformed ancestor anchors to the
 * ancestor instead of the viewport).
 */
export function SustainabilityPTTButton({
  isActive,
  isSpeaking,
  onStart,
  onRelease,
}: {
  isActive: boolean;
  isSpeaking: boolean;
  onStart: () => void;
  onRelease: () => void;
}) {
  return (
    <motion.div
      className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.3 } }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
    >
      <AnimatePresence>
        {!isActive && !isSpeaking && (
          <motion.p
            className="text-xs font-medium text-center"
            style={{ color: "rgba(59,130,246,0.7)" }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            Halten zum<br />Sprechen
          </motion.p>
        )}
      </AnimatePresence>
      <motion.button
        className="flex items-center justify-center rounded-full shadow-xl border-2 ptt-button"
        style={{
          width: 64, height: 64,
          background: isActive
            ? "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(29,78,216,1) 100%)"
            : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
          borderColor: isActive ? "rgba(29,78,216,0.8)" : "rgba(59,130,246,0.3)",
        }}
        animate={isActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
        transition={isActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
        onMouseDown={onStart}
        onMouseUp={onRelease}
        onMouseLeave={isActive ? onRelease : undefined}
        onTouchStart={onStart}
        onTouchEnd={onRelease}
        onTouchCancel={onRelease}
      >
        <Mic className="text-white" size={26} />
      </motion.button>
    </motion.div>
  );
}

export default SustainabilityTermsCard;

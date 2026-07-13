"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic } from "lucide-react";
import VoiceSphere from "./VoiceSphere";
import { AnimatedFrame } from "./AnimatedFrame";
import { FourMoneyInfo } from "@/components/terms/FourMoneyInfo";
import { FrootsCustomerInfo } from "@/components/terms/FrootsCustomerInfo";
import { SustainabilityRisksInfo } from "@/components/terms/SustainabilityRisksInfo";

interface VoiceTermsPhaseProps {
  which:          'terms1' | 'terms2' | 'sustainabilityTerms';
  isSpeaking:     boolean;
  onConfirm:      () => Promise<void>;
  onPTTStart?:   () => void;
  onPTTRelease?: (which: 'terms1' | 'terms2' | 'sustainabilityTerms') => void;
}

function getContentSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw >= 1024) {
    const maxH = Math.round(vh * 0.75);
    const w    = Math.min(Math.round(maxH * 0.62), 520);
    return { width: w, height: Math.min(maxH, 620) };
  } else if (vw >= 640) {
    return { width: 440, height: Math.min(Math.round(vh * 0.65), 560) };
  } else {
    const w = Math.min(Math.round(vw * 0.84), 340);
    return { width: w, height: Math.min(Math.round(w * 1.45), 520) };
  }
}

export default function VoiceTermsPhase({ which, isSpeaking, onConfirm, onPTTStart, onPTTRelease }: VoiceTermsPhaseProps) {
  const isTerms2 = which !== 'terms1';

  const [showTransition, setShowTransition] = useState(!isTerms2);
  const [confirmed,      setConfirmed]      = useState(false);
  const [confirming,     setConfirming]     = useState(false);
  const [isPTTActive,    setIsPTTActive]    = useState(false);
  // Start with null — set properly on first client render to avoid SSR mismatch
  const [contentSize,    setContentSize]    = useState<{ width: number; height: number } | null>(null);

  // Set real size on mount (runs only on client)
  useEffect(() => {
    setContentSize(getContentSize());
  }, []);

  useEffect(() => {
    const onResize = () => setContentSize(getContentSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isTerms2) return;
    const t = setTimeout(() => setShowTransition(false), 1500);
    return () => clearTimeout(t);
  }, [isTerms2]);

  const handleConfirm = () => {
    if (confirming || confirmed) return;
    setConfirming(true);
    setConfirmed(true);
    setTimeout(() => { onConfirm(); }, 1500);
  };

  const startPTT = useCallback(() => setIsPTTActive(true),  []);
  const stopPTT  = useCallback(() => setIsPTTActive(false), []);

  const title = which === 'terms2'
    ? "Asset Management by froots GmbH"
    : which === 'sustainabilityTerms'
    ? "Nachhaltigkeitsinformationen"
    : "4money";
  const subtitle = which === 'terms2'
    ? "Informationen über den Vermögensverwalter"
    : which === 'sustainabilityTerms'
    ? "Gesetzlich vorgeschriebene Information gemäß EU-Vorschriften"
    : "Information über das Wertpapierdienstleistungsunternehmen";

  const bg = "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)";

  const cw = contentSize?.width  ?? 0;
  const ch = contentSize?.height ?? 0;

  return (
    <motion.div
      className="fixed inset-0 z-50"
      style={{ background: bg }}
      initial={isTerms2 ? { x: "100%" } : {}}
      animate={isTerms2 ? { x: 0 }      : {}}
      transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* ── Entry transition (terms1 only) — phantom orb + card ───── */}
      {!isTerms2 && (
        <AnimatePresence>
          {showTransition && (
            <>
              <motion.div
                key="transition-orb"
                className="fixed z-[60] flex items-center justify-center pointer-events-none"
                initial={{ top: "50%", left: "50%", x: "-50%", y: "-50%" }}
                animate={{ top: "80px", scale: [1, 0.4], opacity: [1, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <VoiceSphere isActive isSpeaking size={280} analyserNode={null} />
              </motion.div>

              <motion.div
                key="transition-card"
                className="fixed z-[60] px-6 pointer-events-none"
                style={{ width: "100%", maxWidth: "400px", left: "50%", x: "-50%" }}
                initial={{ bottom: "120px" }}
                animate={{ bottom: "-100px", opacity: [1, 0.5, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
              >
                <div
                  className="relative overflow-hidden rounded-3xl px-6 py-5"
                  style={{
                    background:     "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                    backdropFilter: "blur(20px)",
                    border:         "1px solid rgba(255,255,255,0.5)",
                    boxShadow:      "0 0 40px rgba(59,130,246,0.6), 0 8px 32px rgba(59,130,246,0.15)",
                  }}
                >
                  <div className="text-xs font-medium mb-2" style={{ color: "rgba(59,130,246,0.8)" }}>
                    Dokumente
                  </div>
                  <p className="text-base font-medium" style={{ color: "rgba(15,23,42,0.9)" }}>
                    {title}
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Main content — matches reference App.tsx layout exactly ── */}
      {/* overflow-auto is on this full-screen container (same as reference).   */}
      {/* NO overflow on intermediate wrappers — canvas must not be clipped.   */}
      <div
        className="size-full flex flex-col items-center justify-center overflow-auto"
        style={{ paddingTop: 96, paddingBottom: 130, paddingLeft: 16, paddingRight: 16 }}
      >
        {contentSize && (
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: showTransition ? 0 : 1 }}
            transition={{ delay: showTransition ? 0 : 0.25, duration: 0.45 }}
          >
            {/* AnimatedFrame wrapping scrollable terms content */}
            <AnimatedFrame
              contentWidth={cw}
              contentHeight={ch}
              isSpeaking={isSpeaking}
              isListening={isPTTActive}
            >
              <div
                className="w-full h-full overflow-y-auto"
                style={{
                  background:   "rgba(255,255,255,0.97)",
                  borderRadius: Math.round(cw * 0.04),
                }}
              >
                <div className="px-5 py-4">
                  <h2 className="text-base font-bold mb-1" style={{ color: "rgba(15,23,42,0.9)" }}>{title}</h2>
                  <p className="text-xs mb-3" style={{ color: "rgba(59,130,246,0.7)" }}>{subtitle}</p>
                  <div className="text-sm" style={{ color: "rgba(15,23,42,0.75)", lineHeight: 1.7 }}>
                    {which === 'terms2'
                      ? <FrootsCustomerInfo />
                      : which === 'sustainabilityTerms'
                      ? <SustainabilityRisksInfo />
                      : <FourMoneyInfo />}
                  </div>
                </div>
              </div>
            </AnimatedFrame>

            {/* Confirm button — same width as frame, below it */}
            <motion.button
              className="py-4 rounded-2xl text-sm font-semibold text-white"
              style={{
                width: cw,
                background: confirmed
                  ? "linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(22,163,74,1) 100%)"
                  : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
                boxShadow: confirmed
                  ? "0 4px 16px rgba(34,197,94,0.35)"
                  : "0 4px 16px rgba(59,130,246,0.35)",
                marginTop: 40,
              }}
              whileTap={{ scale: 0.97 }}
              disabled={confirming}
              onClick={handleConfirm}
            >
              {confirmed ? "Bestätigt!" : "Ich bestätige"}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ── Push-to-talk button ── */}
      <div className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]">
        <AnimatePresence>
          {!isPTTActive && !isSpeaking && (
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
            background: isPTTActive
              ? "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(29,78,216,1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            borderColor: isPTTActive ? "rgba(29,78,216,0.8)" : "rgba(59,130,246,0.3)",
          }}
          animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
          transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
          onMouseDown={() => { startPTT(); onPTTStart?.(); }}
          onMouseUp={() => { stopPTT(); onPTTRelease?.(which); }}
          onMouseLeave={isPTTActive ? () => { stopPTT(); onPTTRelease?.(which); } : undefined}
          onTouchStart={() => { startPTT(); onPTTStart?.(); }}
          onTouchEnd={() => { stopPTT(); onPTTRelease?.(which); }}
          onTouchCancel={() => { stopPTT(); onPTTRelease?.(which); }}
        >
          <Mic className="text-white" size={26} />
        </motion.button>
      </div>
    </motion.div>
  );
}

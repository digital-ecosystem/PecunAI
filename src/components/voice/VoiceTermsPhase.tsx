"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import VoiceSphere from "./VoiceSphere";
import { FourMoneyInfo } from "@/components/terms/FourMoneyInfo";
import { FrootsCustomerInfo } from "@/components/terms/FrootsCustomerInfo";

interface VoiceTermsPhaseProps {
  which:      'terms1' | 'terms2';
  isSpeaking: boolean;
  onConfirm:  () => Promise<void>;
}

export default function VoiceTermsPhase({ which, onConfirm }: VoiceTermsPhaseProps) {
  // terms1: orb-dissolve transition plays for 1.5s before content appears
  // terms2: no orb — content is immediately visible as the screen slides in from the right
  const isTerms2 = which === 'terms2';

  const [showTransition, setShowTransition] = useState(!isTerms2);
  const [confirmed,      setConfirmed]      = useState(false);
  const [confirming,     setConfirming]     = useState(false);

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

  const title    = isTerms2 ? "Asset Management by froots GmbH" : "4money";
  const subtitle = isTerms2
    ? "Informationen über den Vermögensverwalter"
    : "Information über das Wertpapierdienstleistungsunternehmen";

  const bg = "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: bg }}
      // terms2: full-screen slide in from the right; terms1: no x animation (entry handled by orb transition)
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

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div
        className="w-full px-6 py-5 relative z-10 flex-shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: showTransition ? 0 : 1 }}
        transition={{ delay: showTransition ? 0 : 0.3, duration: 0.4 }}
      >
        <div className="flex items-center justify-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background:           "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
            }}
          >
            Vox.2
          </h1>
        </div>
      </motion.div>

      {/* ── Scrollable content ────────────────────────────────────── */}
      <motion.div
        className="flex-1 overflow-y-auto px-4 pb-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showTransition ? 0 : 1, y: showTransition ? 20 : 0 }}
        transition={{ duration: 0.4, delay: showTransition ? 0 : 0.2 }}
      >
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background:     "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
            backdropFilter: "blur(20px)",
            border:         "1px solid rgba(255,255,255,0.5)",
            boxShadow:      "0 8px 32px rgba(59,130,246,0.08)",
          }}
        >
          <div
            className="w-full h-1"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)" }}
          />
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold" style={{ color: "rgba(15,23,42,0.9)" }}>{title}</h2>
            <p className="text-xs mt-1" style={{ color: "rgba(59,130,246,0.7)" }}>{subtitle}</p>
          </div>
          <div className="px-5 pb-5 text-sm" style={{ color: "rgba(15,23,42,0.75)", lineHeight: 1.7 }}>
            {isTerms2 ? <FrootsCustomerInfo /> : <FourMoneyInfo />}
          </div>
        </div>
      </motion.div>

      {/* ── Fixed bottom confirm button ───────────────────────────── */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 z-10"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,1) 70%, rgba(255,255,255,0) 100%)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showTransition ? 0 : 1, y: showTransition ? 20 : 0 }}
        transition={{ duration: 0.4, delay: showTransition ? 0 : 0.3 }}
      >
        <motion.button
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white"
          style={{
            background: confirmed
              ? "linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(22,163,74,1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            boxShadow: confirmed
              ? "0 4px 16px rgba(34,197,94,0.35)"
              : "0 4px 16px rgba(59,130,246,0.35)",
            transition: "background 0.3s ease, box-shadow 0.3s ease",
          }}
          whileTap={{ scale: 0.97 }}
          disabled={confirming}
          onClick={handleConfirm}
        >
          {confirmed ? "Bestätigt!" : "Ich bestätige"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

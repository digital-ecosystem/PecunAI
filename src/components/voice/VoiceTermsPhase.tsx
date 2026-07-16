"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic } from "lucide-react";
import { AnimatedFrame } from "./AnimatedFrame";
import { SphereToFrameTransition } from "./SphereToFrameTransition";
import type { FrameRect } from "./frameMath";
import { FourMoneyInfo } from "@/components/terms/FourMoneyInfo";
import { FrootsCustomerInfo } from "@/components/terms/FrootsCustomerInfo";
import { SustainabilityRisksInfo } from "@/components/terms/SustainabilityRisksInfo";

// Matches VoiceSessionShell's intro-screen orb (size={380}) and its header
// height, so the morph starts from exactly where the live sphere was — no pop.
const INTRO_SPHERE_SIZE = 380;
const INTRO_HEADER_HEIGHT = 84;

function getSphereOrigin() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { x: vw / 2, y: INTRO_HEADER_HEIGHT + (vh - INTRO_HEADER_HEIGHT) / 2 };
}

interface VoiceTermsPhaseProps {
  which:          'terms1' | 'terms2' | 'sustainabilityTerms';
  isSpeaking:     boolean;
  onConfirm:      () => Promise<void>;
  onPTTStart?:   () => void;
  onPTTRelease?: (which: 'terms1' | 'terms2' | 'sustainabilityTerms') => void;
  /** Called when the LAST document (terms2) is confirmed, with the document
   *  box's viewport rect — the shell hands it to Phase 1's persistent canvas
   *  so the frame visibly collapses into the orb across the phase boundary. */
  onExitRect?:   (rect: FrameRect) => void;
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

export default function VoiceTermsPhase({ which, isSpeaking, onConfirm, onPTTStart, onPTTRelease, onExitRect }: VoiceTermsPhaseProps) {
  const isTerms2 = which !== 'terms1';

  const [showTransition, setShowTransition] = useState(!isTerms2);
  const [revealContent,  setRevealContent]  = useState(isTerms2);
  const [confirmed,      setConfirmed]      = useState(false);
  const [confirming,     setConfirming]     = useState(false);
  // Set when the final document is confirmed: the white card and buttons fade
  // out during the green-button pause so only the neural frame remains on
  // screen when the phase flips — Phase 1's canvas then picks the frame up at
  // this exact rect and collapses it into the orb.
  const [exiting,        setExiting]        = useState(false);
  const [isPTTActive,    setIsPTTActive]    = useState(false);
  // Start with null — set properly on first client render to avoid SSR mismatch
  const [contentSize,    setContentSize]    = useState<{ width: number; height: number } | null>(null);
  const [sphereOrigin,   setSphereOrigin]   = useState<{ x: number; y: number } | null>(null);
  const [contentRect,    setContentRect]    = useState<FrameRect | null>(null);

  const contentBoxRef = useRef<HTMLDivElement>(null);

  // Set real size on mount (runs only on client)
  useEffect(() => {
    setContentSize(getContentSize());
    setSphereOrigin(getSphereOrigin());
  }, []);

  // The shell keeps this instance mounted across terms1 → terms2 (no key), so
  // the AnimatedFrame stays wrapped and only the document content crossfades —
  // the Pecunai 2.0 reference's legal page flip, replacing the old full-screen
  // slide-in remount. On a document change, reset the confirm state the
  // previous document left behind.
  const prevWhichRef = useRef(which);
  useEffect(() => {
    if (prevWhichRef.current === which) return;
    prevWhichRef.current = which;
    setConfirmed(false);
    setConfirming(false);
  }, [which]);

  useEffect(() => {
    const onResize = () => {
      setContentSize(getContentSize());
      setSphereOrigin(getSphereOrigin());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure the real AnimatedFrame content box so the morph's frame target
  // wraps exactly where the document will actually appear.
  useEffect(() => {
    if (isTerms2 || !showTransition || !contentSize) return;

    let raf = 0;
    let attempts = 0;

    const measure = () => {
      const el = contentBoxRef.current;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) {
          setContentRect({ x: b.left, y: b.top, w: b.width, h: b.height });
          return;
        }
      }
      attempts += 1;
      if (attempts < 30) raf = requestAnimationFrame(measure);
    };

    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [isTerms2, showTransition, contentSize]);

  // Safety net: if the morph never reports back (e.g. the content rect never
  // resolves), reveal the real content and drop the transition canvas anyway
  // instead of leaving the screen stuck.
  useEffect(() => {
    if (isTerms2 || !showTransition) return;
    const t = setTimeout(() => {
      setRevealContent(true);
      setShowTransition(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [isTerms2, showTransition]);

  const handleConfirm = () => {
    if (confirming || confirmed) return;
    setConfirming(true);
    setConfirmed(true);
    if (which === 'terms2') {
      const b = contentBoxRef.current?.getBoundingClientRect();
      if (b && b.width > 0) onExitRect?.({ x: b.left, y: b.top, w: b.width, h: b.height });
      setExiting(true);
      // Tighter than terms1's 1.5s: the exit fade completes at ~0.75s and the
      // phase flip (and with it the frame → orb collapse) should follow
      // immediately — any longer and the empty frame idles around a blank
      // page. The remaining gap is just confirmTerms2's API roundtrip.
      setTimeout(() => { onConfirm(); }, 750);
      return;
    }
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
      {/* ── Entry transition (terms1 only) — sphere morphs into the document frame ── */}
      {!isTerms2 && showTransition && sphereOrigin && contentRect && (
        <SphereToFrameTransition
          sphereCenter={sphereOrigin}
          sphereRadius={INTRO_SPHERE_SIZE * 0.3}
          contentRect={contentRect}
          onMostlyDone={() => setRevealContent(true)}
          onComplete={() => setShowTransition(false)}
        />
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
            animate={{ opacity: revealContent ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* AnimatedFrame wrapping scrollable terms content. contentBoxRef
                measures this exact box (even while invisible) so the sphere
                morph's frame target lines up with where it will really sit. */}
            <div ref={contentBoxRef}>
              <AnimatedFrame
                contentWidth={cw}
                contentHeight={ch}
                isSpeaking={isSpeaking}
                isListening={isPTTActive}
              >
                <motion.div
                  className="w-full h-full"
                  style={{
                    background:   "rgba(255,255,255,0.97)",
                    borderRadius: Math.round(cw * 0.04),
                    overflow:     "hidden",
                  }}
                  animate={{ opacity: exiting ? 0 : 1 }}
                  transition={{ delay: exiting ? 0.3 : 0, duration: 0.45 }}
                >
                  {/* Keyed by document: when `which` changes on the live
                      instance, the old content fades out and the new fades in
                      INSIDE the persistent frame. The scroll container lives
                      on the keyed element so scroll position resets per
                      document. initial={false} keeps first mount unanimated
                      (revealContent already handles the entry fade). */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={which}
                      className="w-full h-full overflow-y-auto"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </AnimatedFrame>
            </div>

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
              animate={{ opacity: exiting ? 0 : 1 }}
              transition={{ delay: exiting ? 0.25 : 0, duration: 0.45 }}
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
      <motion.div
        className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]"
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ delay: exiting ? 0.25 : 0, duration: 0.45 }}
      >
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
      </motion.div>
    </motion.div>
  );
}

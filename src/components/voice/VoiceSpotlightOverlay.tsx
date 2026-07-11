"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceSpotlightOverlayProps {
  targetId: string;
  caption:  string;
  onSkip:   () => void;
}

interface Rect {
  top:    number;
  left:   number;
  width:  number;
  height: number;
  radius: number;
}

/** Dims the whole screen except a cutout around whichever element is currently being
 *  explained — used only for the Phase 1 first-time walkthrough. See
 *  private-documents/after-demo/PHASE_1_SPOTLIGHT_WALKTHROUGH_PLAN.md. */
export default function VoiceSpotlightOverlay({ targetId, caption, onSkip }: VoiceSpotlightOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(targetId);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(el).borderRadius) || 16;
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height, radius });
    };
    measure();
    window.addEventListener("resize", measure);
    // Cheap periodic re-measure — catches layout shifts (carousel transitions, etc.) without
    // needing a ResizeObserver for what's a brief, one-time onboarding sequence.
    const interval = setInterval(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(interval);
    };
  }, [targetId]);

  return (
    <div className="fixed inset-0 z-[80]">
      <AnimatePresence>
        {rect && (
          <motion.div
            key={targetId}
            className="absolute pointer-events-none"
            initial={false}
            animate={{
              top:    rect.top - 6,
              left:   rect.left - 6,
              width:  rect.width + 12,
              height: rect.height + 12,
            }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            style={{
              borderRadius: rect.radius + 6,
              boxShadow:    "0 0 0 9999px rgba(15,23,42,0.72)",
            }}
          />
        )}
      </AnimatePresence>

      {rect && (
        <motion.div
          key={`${targetId}-caption`}
          className="absolute pointer-events-none px-4 py-3 rounded-2xl max-w-xs text-center text-sm font-medium"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            top:     rect.top + rect.height + 16,
            left:    Math.max(16, Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 400) - 280)),
          }}
          transition={{ duration: 0.4 }}
          style={{
            background:     "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            color:          "rgba(15,23,42,0.9)",
            boxShadow:      "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          {caption}
        </motion.div>
      )}

      <button
        onClick={onSkip}
        className="fixed top-6 right-6 px-4 py-2 rounded-full text-sm font-medium"
        style={{
          background:     "rgba(255,255,255,0.9)",
          color:          "rgba(15,23,42,0.8)",
          backdropFilter: "blur(10px)",
          boxShadow:      "0 4px 16px rgba(0,0,0,0.15)",
        }}
      >
        Überspringen
      </button>
    </div>
  );
}

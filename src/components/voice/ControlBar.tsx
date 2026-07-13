"use client";

import { motion } from "motion/react";
import { Mic, MicOff, ChevronLeft, ChevronRight, MessageCircle, Zap } from "lucide-react";

interface ControlBarProps {
  onPTTStart:   () => void;
  onPTTRelease: () => void;
  isPTTActive:  boolean;
  onPrevious:   () => void;
  onNext:       () => void;
  onChatClick:  () => void;
  micGranted?:  boolean | null;
  isFastMode:      boolean;
  onFastModeToggle: () => void;
}

export default function ControlBar({
  onPTTStart,
  onPTTRelease,
  isPTTActive,
  onPrevious,
  onNext,
  onChatClick,
  micGranted,
  isFastMode,
  onFastModeToggle,
}: ControlBarProps) {
  const micDenied = micGranted === false;
  return (
    <div
      className="w-full px-6 py-4 rounded-t-3xl"
      style={{
        background:   "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)",
        backdropFilter: "blur(20px)",
        borderTop:    "1px solid rgba(255,255,255,0.5)",
        boxShadow:    "0 -4px 24px rgba(59, 130, 246, 0.08)",
      }}
    >
      <div className="flex items-center justify-between max-w-sm mx-auto">

        {/* Chat — moved to the left, matching Phase 6's convention */}
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:      56,
            height:     56,
            background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border:     "1px solid rgba(59,130,246,0.2)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={onChatClick}
        >
          <MessageCircle size={24} style={{ color: "rgba(59,130,246,0.8)" }} />
        </motion.button>

        {/* Prev / Next */}
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1"
          style={{
            background: "rgba(59,130,246,0.08)",
            border:     "1px solid rgba(59,130,246,0.15)",
          }}
        >
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPrevious}
          >
            <ChevronLeft size={20} style={{ color: "rgba(59,130,246,0.7)" }} />
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
          >
            <ChevronRight size={20} style={{ color: "rgba(59,130,246,0.7)" }} />
          </motion.button>
        </div>

        {/* Fast Mode toggle — before the PTT button. When on, the AI stops auto-narrating
            questions (still available on demand via PTT/info icon). See
            private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md. */}
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:      56,
            height:     56,
            background: isFastMode
              ? "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.15) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border: isFastMode
              ? "1px solid rgba(217,119,6,0.3)"
              : "1px solid rgba(59,130,246,0.2)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={onFastModeToggle}
        >
          <Zap
            size={24}
            style={{ color: isFastMode ? "rgba(217,119,6,0.9)" : "rgba(59,130,246,0.8)" }}
            fill={isFastMode ? "rgba(217,119,6,0.9)" : "none"}
          />
        </motion.button>

        {/* PTT hold-to-talk — moved to the right, matching every other PTT phase's convention.
            Replaces the old mute toggle (dropped — see private-documents/after-demo/
            PHASE_1_PTT_PLAN.md). Hold to speak, release to submit. */}
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:      56,
            height:     56,
            background: micDenied
              ? "linear-gradient(135deg, rgba(156,163,175,0.15) 0%, rgba(107,114,128,0.1) 100%)"
              : isPTTActive
              ? "linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(29,78,216,0.15) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border: micDenied
              ? "1px solid rgba(156,163,175,0.2)"
              : isPTTActive
              ? "1px solid rgba(29,78,216,0.3)"
              : "1px solid rgba(59,130,246,0.2)",
          }}
          animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
          transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
          onMouseDown={micDenied ? undefined : onPTTStart}
          onMouseUp={micDenied ? undefined : onPTTRelease}
          onMouseLeave={!micDenied && isPTTActive ? onPTTRelease : undefined}
          onTouchStart={micDenied ? undefined : onPTTStart}
          onTouchEnd={micDenied ? undefined : onPTTRelease}
          onTouchCancel={micDenied ? undefined : onPTTRelease}
        >
          {micDenied
            ? <MicOff size={24} style={{ color: "rgba(156,163,175,0.7)" }} />
            : <Mic    size={24} style={{ color: isPTTActive ? "rgba(29,78,216,0.9)" : "rgba(59,130,246,0.8)" }} />}
        </motion.button>

      </div>
    </div>
  );
}

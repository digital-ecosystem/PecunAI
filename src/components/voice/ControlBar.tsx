"use client";

import { motion } from "motion/react";
import { Mic, MicOff, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

interface ControlBarProps {
  isMuted:      boolean;
  onMuteToggle: () => void;
  onPrevious:   () => void;
  onNext:       () => void;
  onChatClick:  () => void;
  micGranted?:  boolean | null;
}

export default function ControlBar({
  isMuted,
  onMuteToggle,
  onPrevious,
  onNext,
  onChatClick,
  micGranted,
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

        {/* Mute toggle */}
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:      56,
            height:     56,
            background: micDenied
              ? "linear-gradient(135deg, rgba(156,163,175,0.15) 0%, rgba(107,114,128,0.1) 100%)"
              : isMuted
              ? "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border: micDenied
              ? "1px solid rgba(156,163,175,0.2)"
              : isMuted
              ? "1px solid rgba(239,68,68,0.2)"
              : "1px solid rgba(59,130,246,0.2)",
          }}
          whileTap={micDenied ? {} : { scale: 0.95 }}
          onClick={micDenied ? undefined : onMuteToggle}
        >
          {micDenied
            ? <MicOff size={24} style={{ color: "rgba(156,163,175,0.7)" }} />
            : isMuted
            ? <MicOff size={24} style={{ color: "rgba(239,68,68,0.8)" }} />
            : <Mic    size={24} style={{ color: "rgba(59,130,246,0.8)" }} />}
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

        {/* Chat */}
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

      </div>
    </div>
  );
}

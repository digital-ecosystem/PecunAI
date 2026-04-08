"use client";

import { motion } from "motion/react";
import { Info, Edit3 } from "lucide-react";

export interface CarouselQuestion {
  id: string;
  category: string;
  text: string;
  options?: { id: string; value: string; label: string }[];
  questionType?: string;
  minValue?: number;
  maxValue?: number;
  inputPlaceholder?: string;
}

interface VoiceCarouselProps {
  questions:          CarouselQuestion[];
  currentIndex:       number;
  onNext:             () => void;
  onPrev:             () => void;
  onActiveCardClick:  () => void;
  onInfoClick:        () => void;
}

export default function VoiceCarousel({
  questions,
  currentIndex,
  onActiveCardClick,
  onInfoClick,
}: VoiceCarouselProps) {
  const n = questions.length;

  const getRelativePos = (index: number) => {
    let diff = index - currentIndex;
    if (diff >  n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    return diff;
  };

  const getCardStyle = (rel: number) => {
    const abs = Math.abs(rel);
    let left: string, right: string, scale: number;

    if      (rel  === 0) { left = "50%";   right = "auto"; scale = 1;    }
    else if (rel  === 1) { left = "60%";   right = "auto"; scale = 0.85; }
    else if (rel  === -1){ left = "auto";  right = "60%";  scale = 0.85; }
    else if (rel  >= 2)  { left = "80%";   right = "auto"; scale = 0.7;  }
    else                 { left = "auto";  right = "80%";  scale = 0.7;  }

    return {
      left,
      right,
      top:       "50%",
      zIndex:    10 - abs,
      opacity:   abs > 2 ? 0 : 1 - abs * 0.2,
      width:     "300px",
      transform: rel === 0
        ? "translate(-50%, -50%) scale(1)"
        : `translate(0, -50%) scale(${scale})`,
    };
  };

  return (
    <div className="relative w-full" style={{ height: "240px" }}>
      {/* Edge fade masks */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          background:
            "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(239,246,255,0) 15%, rgba(239,246,255,0) 85%, rgba(239,246,255,1) 100%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-4xl mx-auto">
          {questions.map((q, index) => {
            const rel      = getRelativePos(index);
            const style    = getCardStyle(rel);
            const isActive = rel === 0;

            return (
              <motion.div
                key={q.id || index}
                className="absolute cursor-pointer"
                style={style}
                animate={style}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                onClick={isActive ? onActiveCardClick : undefined}
              >
                <motion.div
                  className="relative overflow-hidden rounded-3xl"
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background:     "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                    backdropFilter: "blur(20px)",
                    border:         "1px solid rgba(255,255,255,0.5)",
                    boxShadow: isActive
                      ? "0 0 40px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.4), 0 8px 32px rgba(59,130,246,0.15)"
                      : "0 8px 32px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.05)",
                  }}
                  animate={isActive ? {
                    boxShadow: [
                      "0 0 40px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.4), 0 8px 32px rgba(59,130,246,0.15)",
                      "0 0 50px rgba(59,130,246,0.8), 0 0 50px rgba(59,130,246,0.6), 0 8px 32px rgba(59,130,246,0.2)",
                      "0 0 40px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.4), 0 8px 32px rgba(59,130,246,0.15)",
                    ],
                  } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                  <div className="px-6 py-5">
                    {q.category && (
                      <div className="text-xs font-medium mb-2" style={{ color: "rgba(59,130,246,0.8)" }}>
                        {q.category}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-medium flex-1" style={{ color: "rgba(15,23,42,0.9)" }}>
                        {q.text}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            className="rounded-full p-2"
                            style={{ background: "rgba(59,130,246,0.1)" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => { e.stopPropagation(); onInfoClick(); }}
                          >
                            <Info size={18} style={{ color: "rgba(59,130,246,0.8)" }} />
                          </motion.button>
                          <Edit3 size={20} style={{ color: "rgba(59,130,246,0.6)" }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)" }}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

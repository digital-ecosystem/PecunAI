"use client";

import { motion } from "motion/react";
import { Info, Edit3 } from "lucide-react";
import { useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { FrameRect } from "./frameMath";

export interface CarouselQuestion {
  id: string;
  category: string;
  text: string;
  options?: { id: string; value: string; label: string }[];
  questionType?: string;
  minValue?: number;
  maxValue?: number;
  inputPlaceholder?: string;
  questionOrder?: number;
  footnote?: string;
}

interface VoiceCarouselProps {
  questions:          CarouselQuestion[];
  currentIndex:       number;
  onNext:             () => void;
  onPrev:             () => void;
  /** Tap on the active (center) card — request that it expand. */
  onActiveCardExpand: () => void;
  onInfoClick:        () => void;
  /** The question currently expanded elsewhere (centered on screen). Its
   *  compact rendering here goes invisible but stays mounted — nothing else
   *  in the carousel moves while a card is expanded. */
  expandedQuestionId: string | null;
  /** Round 21: reports the active (center) card's live viewport rect so the
   *  shell can grow the expanded card / neural frame FROM it. Covers both the
   *  tap-open and auto-open paths since it doesn't depend on a click. */
  onActiveCardRectChange?: (rect: FrameRect) => void;
}

export default function VoiceCarousel({
  questions,
  currentIndex,
  onNext,
  onPrev,
  onActiveCardExpand,
  onInfoClick,
  expandedQuestionId,
  onActiveCardRectChange,
}: VoiceCarouselProps) {
  const n             = questions.length;
  const pointerStartX = useRef<number | null>(null);
  const didSwipe      = useRef(false);
  // Round 22 fix: per-card element registry instead of a conditional
  // `ref={isActive ? activeCardRef : undefined}` — motion components attach
  // the external ref only at mount and IGNORE later ref-prop changes, so the
  // single ref stayed bound to whichever card was active at FIRST render and
  // every later question's morph grew from that card's side-slot rect (boss
  // report: "Q1 expands centered, Q2+ expand somewhere else"). Each card
  // registers its element once at mount; the poll picks the active one by
  // index per frame.
  const cardElsRef      = useRef<(HTMLDivElement | null)[]>([]);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // Report the active card's live on-screen rect (>0.75px-change gate, same
  // pattern the shell uses for orbOrigin) — the morph's grow-from origin. The
  // compact card stays mounted at its rest position even while a card is
  // expanded (just opacity 0), so this keeps reporting the correct rest rect
  // for the collapse target too.
  useEffect(() => {
    if (!onActiveCardRectChange) return;
    let raf = 0;
    let alive = true;
    let last: FrameRect | null = null;
    const tick = () => {
      const el = cardElsRef.current[currentIndexRef.current] ?? null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) {
          const next = { x: r.left, y: r.top, w: r.width, h: r.height };
          if (
            !last ||
            Math.abs(last.x - next.x) > 0.75 || Math.abs(last.y - next.y) > 0.75 ||
            Math.abs(last.w - next.w) > 0.75 || Math.abs(last.h - next.h) > 0.75
          ) {
            last = next;
            onActiveCardRectChange(next);
          }
        }
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [onActiveCardRectChange]);

  const SWIPE_THRESHOLD = 40;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = e.clientX;
    didSwipe.current      = false;
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    const dx = e.clientX - pointerStartX.current;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      didSwipe.current = true;
      if (dx < 0) onNext();
      else        onPrev();
    }
    pointerStartX.current = null;
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
  };

  const getRelativePos = (index: number) => {
    let diff = index - currentIndex;
    if (diff >  n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    return diff;
  };

  const getCardStyle = (rel: number) => {
    const abs = Math.abs(rel);
    let left: string, right: string, scale: number;

    if      (rel  === 0) { left = "50%";  right = "auto"; scale = 1;    }
    else if (rel  === 1) { left = "60%";  right = "auto"; scale = 0.85; }
    else if (rel  === -1){ left = "auto"; right = "60%";  scale = 0.85; }
    else if (rel  >= 2)  { left = "80%";  right = "auto"; scale = 0.7;  }
    else                 { left = "auto"; right = "80%";  scale = 0.7;  }

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
    <div
      className="relative w-full select-none"
      style={{ height: "240px", touchAction: "pan-y" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
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
            const baseStyle = getCardStyle(rel);
            const isActive = rel === 0;
            const anyExpanded    = expandedQuestionId !== null;
            const isExpandedCard = anyExpanded && q.id === expandedQuestionId;
            // pointerEvents/opacity must be present in EVERY branch: a value
            // introduced through `animate` is never restored by Framer Motion
            // once it's simply omitted again, so the card would stay stuck
            // invisible/unclickable after its first expand/collapse cycle.
            const style = isExpandedCard
              ? { ...baseStyle, opacity: 0, pointerEvents: "none" as const }
              : anyExpanded
              ? { ...baseStyle, opacity: Math.min(baseStyle.opacity, 0.12), pointerEvents: "none" as const }
              : { ...baseStyle, pointerEvents: "auto" as const };

            const handleClick = () => {
              if (didSwipe.current) return;
              if      (isActive)    onActiveCardExpand();
              else if (rel ===  1)  onNext();
              else if (rel === -1)  onPrev();
            };

            return (
              <motion.div
                key={q.id || index}
                ref={el => { cardElsRef.current[index] = el; }}
                className="absolute cursor-pointer"
                style={style}
                animate={style}
                // Round 22 glass chrome: the expanded overlay's surface is now
                // translucent, so this compact copy must vanish FAST on expand
                // or it ghosts through the pane as a double image. Restore
                // (collapse) keeps the slow fade — the overlay covers it.
                transition={{
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1],
                  opacity: isExpandedCard
                    ? { duration: 0.12 }
                    : { duration: 0.6, ease: [0.32, 0.72, 0, 1] },
                }}
                onClick={handleClick}
              >
                <motion.div
                  className="relative overflow-hidden rounded-3xl"
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background:     "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                    backdropFilter: "blur(20px)",
                    border:         "1px solid rgba(255,255,255,0.5)",
                    boxShadow: isActive
                      ? "0 0 20px rgba(59,130,246,0.2), 0 0 20px rgba(59,130,246,0.15), 0 8px 32px rgba(59,130,246,0.08)"
                      : "0 8px 32px rgba(59,130,246,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  animate={isActive ? {
                    boxShadow: [
                      "0 0 20px rgba(59,130,246,0.2), 0 0 20px rgba(59,130,246,0.15), 0 8px 32px rgba(59,130,246,0.08)",
                      "0 0 25px rgba(59,130,246,0.4), 0 0 25px rgba(59,130,246,0.3), 0 8px 32px rgba(59,130,246,0.1)",
                      "0 0 20px rgba(59,130,246,0.2), 0 0 20px rgba(59,130,246,0.15), 0 8px 32px rgba(59,130,246,0.08)",
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
                      <p className="text-base flex-1" style={{ color: "rgba(15,23,42,0.9)", fontSize: "14px", fontWeight: "bold" }}>
                        {q.text}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            className="rounded-full p-2"
                            style={{ background: "rgba(59,130,246,0.1)" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => {
                              e.stopPropagation();
                              if (!didSwipe.current) onInfoClick();
                            }}
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

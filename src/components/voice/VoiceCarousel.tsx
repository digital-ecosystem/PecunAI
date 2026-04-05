"use client";

import { useRef, useState } from "react";
import { Info, Pencil } from "lucide-react";

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
  questions: CarouselQuestion[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onActiveCardClick?: () => void;
  onInfoClick?: () => void;
}

const CARD_W    = 260;
const CARD_STEP = 220;
const DRAG_MIN  = 35;
const SLOTS     = [-2, -1, 0, 1, 2];

export default function VoiceCarousel({ questions, currentIndex, onNext, onPrev, onActiveCardClick, onInfoClick }: VoiceCarouselProps) {
  const n = questions.length;
  const wrap = (i: number) => ((i % n) + n) % n;

  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragDeltaX = useRef(0);

  const startDrag = (x: number) => {
    isDragging.current = true;
    dragStartX.current = x;
    dragDeltaX.current = 0;
  };
  const moveDrag = (x: number) => {
    if (!isDragging.current) return;
    dragDeltaX.current = x - dragStartX.current;
    setDragOffset(dragDeltaX.current);
  };
  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if      (dragDeltaX.current < -DRAG_MIN) onNext();
    else if (dragDeltaX.current >  DRAG_MIN) onPrev();
    setDragOffset(0);
  };

  return (
    <div
      className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ height: 170 }}
      onMouseDown={e => startDrag(e.clientX)}
      onMouseMove={e => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX)}
      onTouchMove={e => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      {SLOTS.map(offset => {
        const q        = questions[wrap(currentIndex + offset)];
        const isActive = offset === 0;
        const absOff   = Math.abs(offset);
        const tx       = offset * CARD_STEP + dragOffset;
        const tyOffset = isActive ? -16 : 0;

        return (
          <div
            key={offset}
            style={{
              position:  "absolute",
              width:      CARD_W,
              top:        "60%",
              left:      `calc(50% - ${CARD_W / 2}px)`,
              transform: `translateX(${tx}px) translateY(calc(-50% + ${tyOffset}px))`,
              zIndex:    10 - absOff,
              opacity:   isActive ? 1 : absOff === 1 ? 0.72 : 0.38,
              transition: isDragging.current
                ? "transform 0.05s linear, opacity 0.1s"
                : "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease",
            }}
            onClick={() => {
              if (isActive && Math.abs(dragDeltaX.current) < 5) onActiveCardClick?.();
            }}
          >
            {isActive ? (
              /* ── Active card ── */
              <div style={{
                background:   "white",
                borderRadius: 20,
                padding:      "20px 18px 20px",
                boxShadow:    "0 8px 20px rgba(59,130,246,0.3), 0 2px 8px rgba(59,130,246,0.3)",
                border:       "1.5px solid rgba(110,150,235,0.18)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#4f6ac0", marginBottom: 7, letterSpacing: "0.04em" }}>
                  {q.category}
                </p>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <p style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a2a50", lineHeight: 1.45, margin: 0 }}>
                    {q.text}
                  </p>
                  <div style={{ display: "flex", flexDirection: "row", gap: 8, flexShrink: 0, paddingTop: 20 }}>
                    <button style={{ color: "#c3d3ef" }} onClick={e => { e.stopPropagation(); onInfoClick?.(); }}><Info size={17} strokeWidth={2} /></button>
                    <button style={{ color: "#c3d3ef" }}><Pencil size={17} strokeWidth={2} /></button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Side cards ── */
              <div style={{
                background:   "white",
                borderRadius: 18,
                border:       "1px solid rgba(180,205,245,0.35)",
                padding:      "14px 16px",
                minHeight:    110,
                overflow:     "hidden",
                boxShadow:    "0 2px 12px rgba(60,100,210,0.07)",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#4f6ac0", marginBottom: 5, letterSpacing: "0.04em" }}>
                  {q.category}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a50", lineHeight: 1.4 }}>
                  {q.text}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import VoiceSphere, { VoiceState, VOICE_COLORS } from "@/components/voice/VoiceSphere";

const QUESTIONS = [
  { id: 1, category: "Anlagedauer",    text: "Für welchen Zeitraum möchten Sie veranlagen?" },
  { id: 2, category: "Nachhaltigkeit", text: "Wünschen Sie Informationen zu nachhaltigen Veranlagungen?" },
  { id: 3, category: "Anlageziel",     text: "Was möchten Sie mit dieser Veranlagung erreichen?" },
  { id: 4, category: "Risikoprofil",   text: "Wie würden Sie Ihre Risikobereitschaft einschätzen?" },
  { id: 5, category: "Erfahrung",      text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung gesammelt?" },
  { id: 6, category: "Einkommen",      text: "Wie hoch ist Ihr monatliches Nettoeinkommen?" },
];

const N = QUESTIONS.length;
const STATUS_LABEL: Record<VoiceState, string> = {
  idle:      "Bereit...",
  speaking:  "PecunAI spricht",
  listening: "Listening...",
};

// card geometry
const CARD_W    = 260;
const CARD_STEP = 170; // gap between card centres
const DRAG_MIN  = 35;

// wrap index to always stay in bounds
const wrap = (i: number) => ((i % N) + N) % N;

export default function SphereTestPage() {
  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const [currentQ,   setCurrentQ]   = useState(2);
  const [isMuted,    setIsMuted]     = useState(false);
  const [dragOffset, setDragOffset]  = useState(0);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragDeltaX  = useRef(0);

  const color = VOICE_COLORS[isMuted ? "idle" : voiceState];

  // ── infinite navigation ───────────────────────────────────────
  const goNext = () => setCurrentQ(q => q + 1);   // no clamping → infinite
  const goPrev = () => setCurrentQ(q => q - 1);

  // ── drag handlers ─────────────────────────────────────────────
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
    if      (dragDeltaX.current < -DRAG_MIN) goNext();
    else if (dragDeltaX.current >  DRAG_MIN) goPrev();
    setDragOffset(0);
  };

  // ── render slots: -2 -1 0 +1 +2 ──────────────────────────────
  const slots = [-2, -1, 0, 1, 2];

  return (
    <div
      className="h-screen flex flex-col overflow-hidden select-none"
      style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <Btn>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f6ac0" strokeWidth="2.2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </Btn>
        <span className="text-lg font-bold tracking-tight" style={{ color: "#3a5bd9" }}>Vox.2</span>
        <Btn>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f6ac0" strokeWidth="2.2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </Btn>
      </header>

      {/* ── Sphere hero ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0">
        <VoiceSphere voiceState={isMuted ? "idle" : voiceState} size={420} />
        <p className="mt-4 text-sm font-semibold tracking-wide transition-colors duration-500" style={{ color }}>
          {isMuted ? "Stumm – tippen Sie Ihre Antwort" : STATUS_LABEL[voiceState]}
        </p>
      </div>

      {/* ── Bottom panel ────────────────────────────────────────── */}
      <div
        className="flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(240,247,255,0.6) 20%, rgba(235,244,255,0.92) 100%)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* ── Carousel ──────────────────────────────────────────── */}
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
          {slots.map(offset => {
            const qIndex  = wrap(currentQ + offset);
            const q       = QUESTIONS[qIndex];
            const isActive = offset === 0;
            const absOff  = Math.abs(offset);

            const tx = offset * CARD_STEP + dragOffset;
            const tyOffset = isActive ? -16 : 0;

            return (
              <div
                key={offset}
                style={{
                  position:  "absolute",
                  width:      CARD_W,
                  top:        "50%",
                  left:      `calc(50% - ${CARD_W / 2}px)`,
                  transform: `translateX(${tx}px) translateY(calc(-50% + ${tyOffset}px))`,
                  zIndex:    10 - absOff,
                  opacity:   isActive ? 1 : absOff === 1 ? 0.72 : 0.38,
                  transition: isDragging.current
                    ? "transform 0.05s linear, opacity 0.1s"
                    : "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease",
                }}
              >
                {isActive ? (
                  /* ── Active card ── */
                  <div style={{
                    background:   "white",
                    borderRadius: 20,
                    padding:      "16px 18px 14px",
                    boxShadow:    "0 8px 32px rgba(60,100,210,0.13), 0 2px 8px rgba(0,0,0,0.05)",
                    border:       "1.5px solid rgba(110,150,235,0.18)",
                    minHeight:    130,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#4f6ac0", marginBottom: 7, letterSpacing: "0.04em" }}>
                        {q.category}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2a50", lineHeight: 1.45 }}>
                        {q.text}
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end mt-3">
                      <button style={{ color: "#c3d3ef" }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      </button>
                      <button style={{ color: "#c3d3ef" }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Side cards: clean white, no blur ── */
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

        {/* ── Bottom Nav ────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-5 py-4">
          {/* Mic */}
          <Btn active={isMuted} onClick={() => setIsMuted(m => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isMuted ? "#ef4444" : "#8ba3d4"} strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              {isMuted && <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444"/>}
            </svg>
          </Btn>

          {/* Back / Forward pill */}
          <div className="flex items-center gap-2 px-5 py-3 rounded-full"
            style={{ background: "rgba(210,224,248,0.45)", border: "1.5px solid rgba(190,212,245,0.6)", boxShadow: "0 2px 8px rgba(80,120,210,0.10)" }}>
            <button onClick={goPrev} className="px-1 transition-opacity" style={{ color: "#6b8de0" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{ width: 1, height: 14, background: "#dde6f5" }} />
            <button onClick={goNext} className="px-1 transition-opacity" style={{ color: "#6b8de0" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Chat */}
          <Btn>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8ba3d4" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </Btn>
        </div>
      </div>

    </div>
  );
}

// ── Reusable circle button ────────────────────────────────────────
function Btn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={{
        background: active ? "#fee2e2" : "rgba(210,224,248,0.45)",
        border: `1.5px solid ${active ? "#fca5a5" : "rgba(190,212,245,0.6)"}`,
        boxShadow: "0 2px 8px rgba(80,120,210,0.10)",
      }}>
      {children}
    </button>
  );
}

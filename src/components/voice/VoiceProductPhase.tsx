"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Menu, User, Mic } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatedFrame } from "./AnimatedFrame";
import FullscreenPDFViewer from "./FullscreenPDFViewer";
import { SphereToFrameTransition } from "./SphereToFrameTransition";
import type { FrameRect } from "./frameMath";
import { ProductData, SessionState } from "@/hooks/useVoiceSession";

const PDFViewerClient = dynamic(() => import("./PDFViewerClient"), {
  ssr:     false,
  loading: () => <div className="w-full h-full animate-pulse" style={{ background: "rgba(59,130,246,0.06)", borderRadius: 8 }} />,
});

const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "Digital Onboarding Guide begrüßt Sie...",
  speaking:    "Digital Onboarding Guide spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

function getPdfSize(footerHeight = 0) {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight - footerHeight : 800;
  if (vw >= 1024) {
    const maxH = Math.round(vh * 0.60);
    const w    = Math.min(Math.round(maxH / 1.414), 500);
    return { width: w, height: Math.round(w * 1.414) };
  } else if (vw >= 640) {
    const maxH = Math.round(vh * 0.65);
    const w    = Math.min(Math.round(maxH / 1.414), 420);
    return { width: w, height: Math.round(w * 1.414) };
  } else {
    const w = Math.min(Math.round(vw * 0.72), 300);
    return { width: w, height: Math.round(w * 1.414) };
  }
}

interface VoiceProductPhaseProps {
  product:          ProductData;
  isSpeaking:       boolean;
  isListening:      boolean;
  isMuted:          boolean;
  sessionState:     SessionState;
  onMuteToggle:  () => void;
  onPTTStart:    () => void;
  onPTTRelease:  () => void;
  onConfirm:     () => void;
  onRevisit:     () => void;
  /** Phase 1's orb centre at handoff time. When set at mount, the entry plays
   *  the orb → document-frame consume morph (same as Phase 0's terms1 entry)
   *  instead of the content just fading in. Null on direct resume. */
  entryOrbOrigin?:  { x: number; y: number } | null;
  /** BACK from Phase 3: delays the orb→frame morph (ms) so the shell's grow-in sphere phantom
   *  (the AI "stepping back in" after the silent form) finishes first — mirror of P3→P4. */
  entryDelayMs?:    number;
  /** Continuously reports the PDF frame's viewport rect — the shell keeps the
   *  latest value so a revisit back to Phase 1 can collapse this frame into
   *  the orb (the same initialFrameRect handoff terms2 → Phase 1 uses). */
  onFrameRect?:     (rect: FrameRect) => void;
  /** Actual rendered height of the persistent disclaimer footer (page.tsx, measured live) —
   *  subtracted from window.innerHeight-based sizing here so the PDF preview and layout
   *  respect the space the footer actually occupies. Defaults to 0. See
   *  private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md. */
  footerHeight?:    number;
}

export default function VoiceProductPhase({
  product,
  isSpeaking,
  isListening,
  isMuted,
  sessionState,
  onMuteToggle,
  onPTTStart,
  onPTTRelease,
  onConfirm,
  onRevisit,
  entryOrbOrigin,
  entryDelayMs,
  onFrameRect,
  footerHeight = 0,
}: VoiceProductPhaseProps) {
  const reduceMotion = !!useReducedMotion();
  const [pdfSize,       setPdfSize]       = useState<{ width: number; height: number } | null>(null);
  const [pageNumber,    setPageNumber]    = useState(1);
  const [numPages,      setNumPages]      = useState(0);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [isPTTActive,   setIsPTTActive]   = useState(false);

  // ── Entry morph (orb → document frame), mirroring VoiceTermsPhase's terms1
  // entry: the real AnimatedFrame + content stay invisible while the one-shot
  // transition canvas flies the orb's nodes onto the PDF's frame, then the
  // content fades in at onMostlyDone. Skipped entirely (revealContent starts
  // true) when there's no orb origin — e.g. resuming straight into Phase 2.
  const [entryOrigin]   = useState(entryOrbOrigin ?? null); // snapshot at mount
  const [showTransition, setShowTransition] = useState(!!entryOrbOrigin && !reduceMotion);
  const [revealContent,  setRevealContent]  = useState(reduceMotion || !entryOrbOrigin);
  const [entryStarted,   setEntryStarted]   = useState(false); // gates the morph until entryDelayMs elapses
  const [entryRect,      setEntryRect]      = useState<FrameRect | null>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null);

  // Delay the morph start so the shell's grow-in sphere phantom completes first (P3→P2 back).
  // entryDelayMs is 0/undefined on the P1→P2 forward entry, so the morph starts immediately there.
  useEffect(() => {
    if (!showTransition) return;
    const t = setTimeout(() => setEntryStarted(true), entryDelayMs ?? 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Measure the real frame box for the morph target (retries while layout settles).
  useEffect(() => {
    if (!showTransition || !pdfSize) return;
    let raf = 0;
    let attempts = 0;
    const measure = () => {
      const el = contentBoxRef.current;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) {
          setEntryRect({ x: b.left, y: b.top, w: b.width, h: b.height });
          return;
        }
      }
      attempts += 1;
      if (attempts < 30) raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [showTransition, pdfSize]);

  // Safety net: never leave the screen stuck if the morph can't run.
  useEffect(() => {
    if (!showTransition) return;
    const t = setTimeout(() => {
      setRevealContent(true);
      setShowTransition(false);
    }, 1800 + (entryDelayMs ?? 0));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTransition]);

  // Report the frame's live rect up for the revisit (Phase 2 → 1) collapse.
  // Per-frame poll writing into a shell ref — no re-renders, and it tracks
  // scrolling of the centre column so the collapse always starts from where
  // the frame visually is.
  useEffect(() => {
    if (!onFrameRect) return;
    let raf = 0;
    let alive = true;
    const tick = () => {
      const el = contentBoxRef.current;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0) onFrameRect({ x: b.left, y: b.top, w: b.width, h: b.height });
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [onFrameRect]);

  const handlePdfLoad = useCallback((n: number) => setNumPages(n), []);

  // Use window.innerWidth for the narrow check — pdfSize.width is height-driven on desktop
  // so it can't reliably distinguish mobile from desktop. Re-evaluated on every render;
  // pdfSize state (which updates on resize) triggers re-renders so this stays in sync.
  const isNarrow = typeof window === 'undefined' || window.innerWidth < 768;

  useEffect(() => {
    setPdfSize(getPdfSize(footerHeight));
    const onResize = () => setPdfSize(getPdfSize(footerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [footerHeight]);

  const pdfUrl = `/api/products/file/${product.fileName.replace(/^\/products\//, "")}`;
  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  return (
    <div
      className="h-full flex flex-col relative overflow-x-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{
              width:          44,
              height:         44,
              background:     "rgba(255,255,255,0.6)",
              backdropFilter: "blur(10px)",
              border:         "1px solid rgba(255,255,255,0.5)",
              boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>

          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background:           "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{
              width:          44,
              height:         44,
              background:     "rgba(255,255,255,0.6)",
              backdropFilter: "blur(10px)",
              border:         "1px solid rgba(255,255,255,0.5)",
              boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <User size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable center ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto pb-24 pt-4 md:pt-20 gap-4">

        {/* Entry morph — the Phase 1 orb's nodes fly onto the PDF's frame and
            the dense web materializes around it (same consume morph as Phase
            0's terms1 entry), while the real frame below stays hidden. */}
        {showTransition && entryOrigin && entryRect && entryStarted && (
          <SphereToFrameTransition
            sphereCenter={entryOrigin}
            sphereRadius={380 * 0.3}
            contentRect={entryRect}
            onMostlyDone={() => setRevealContent(true)}
            onComplete={() => setShowTransition(false)}
          />
        )}

        {/* AnimatedFrame — w-full + flex justify-center ensures true centering */}
        {pdfSize && (
          <div className="w-full flex justify-center">
          <motion.div
            ref={contentBoxRef}
            className="relative cursor-pointer"
            // On the morph path the box must stay at scale 1 even while hidden:
            // its measured rect is the morph's landing target, and a transform
            // would shrink the measurement (getBoundingClientRect includes it).
            initial={{ opacity: 0, scale: entryOrigin ? 1 : 0.96 }}
            animate={{ opacity: revealContent ? 1 : 0, scale: revealContent || entryOrigin ? 1 : 0.96 }}
            transition={{ duration: 0.5, delay: revealContent && !entryOrigin ? 0.15 : 0 }}
            onClick={() => setPdfFullscreen(true)}
          >
            <AnimatedFrame
              isSpeaking={isSpeaking}
              isListening={isPTTActive}
              contentWidth={pdfSize.width}
              contentHeight={pdfSize.height}
            >
              <PDFViewerClient
                fileUrl={pdfUrl}
                onLoadSuccess={handlePdfLoad}
                currentPage={pageNumber}
              />
            </AnimatedFrame>
          </motion.div>
          </div>
        )}

        {/* PDF page navigation */}
        {numPages > 1 && (
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59,130,246,0.15)",
              boxShadow: "0 2px 8px rgba(59,130,246,0.08)",
              marginTop: 10,
            }}
          >
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="text-sm font-medium transition-opacity disabled:opacity-30"
              style={{ color: "rgba(59,130,246,0.8)" }}
            >
              ←
            </button>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="text-sm font-medium transition-opacity disabled:opacity-30"
              style={{ color: "rgba(59,130,246,0.8)" }}
            >
              →
            </button>
          </div>
        )}

        {/* ── Action buttons — stacked centered, like Phase 0 confirm button ── */}
        {pdfSize && (
          <motion.div
            animate={{ opacity: revealContent ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              display:        'flex',
              flexDirection:  isNarrow ? 'column' : 'row',
              alignItems:     'stretch',
              gap:            14,
              width:          pdfSize.width,
              paddingLeft:    isNarrow ? 16 : 0,
              paddingRight:   isNarrow ? 16 : 0,
              boxSizing:      'border-box',
              marginTop:      10,
              marginBottom:   32,
              pointerEvents:  revealContent ? 'auto' : 'none',
            }}
          >
            {/* Bestätigen — filled primary */}
            <motion.button
              className="text-sm font-semibold rounded-2xl text-white"
              style={{
                flex:           1,
                paddingTop:     12,
                paddingBottom:  12,
                paddingLeft:    16,
                paddingRight:   16,
                background:     "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
                boxShadow:      "0 4px 16px rgba(59,130,246,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
            >
              Bestätigen
            </motion.button>

            {/* Fragen ändern — outlined secondary */}
            <motion.button
              className="text-sm font-semibold rounded-2xl"
              style={{
                flex:           1,
                paddingTop:     12,
                paddingBottom:  12,
                paddingLeft:    16,
                paddingRight:   16,
                background:     "rgba(255,255,255,0.85)",
                backdropFilter: "blur(10px)",
                border:         "1.5px solid rgba(59,130,246,0.5)",
                color:          "rgba(37,99,235,0.9)",
                boxShadow:      "0 2px 8px rgba(59,130,246,0.06)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={onRevisit}
            >
              Fragen ändern
            </motion.button>
          </motion.div>
        )}

      </div>

      {/* ── PTT button — fixed bottom-right ────────────────────── */}
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
          onMouseDown={() => { setIsPTTActive(true); onPTTStart(); }}
          onMouseUp={() => { setIsPTTActive(false); onPTTRelease(); }}
          onMouseLeave={isPTTActive ? () => { setIsPTTActive(false); onPTTRelease(); } : undefined}
          onTouchStart={() => { setIsPTTActive(true); onPTTStart(); }}
          onTouchEnd={() => { setIsPTTActive(false); onPTTRelease(); }}
          onTouchCancel={() => { setIsPTTActive(false); onPTTRelease(); }}
        >
          <Mic className="text-white" size={26} />
        </motion.button>
      </div>

      {/* ── Full-screen PDF viewer — shared with Phase 5 ─────────── */}
      <AnimatePresence>
        {pdfFullscreen && (
          <FullscreenPDFViewer
            title="Produktdokument"
            fileUrl={pdfUrl}
            pageNumber={pageNumber}
            numPages={numPages}
            onPageChange={setPageNumber}
            onLoadSuccess={handlePdfLoad}
            onClose={() => setPdfFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

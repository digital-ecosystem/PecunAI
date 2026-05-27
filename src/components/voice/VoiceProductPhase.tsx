"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, User, Mic, MicOff, X, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatedFrame } from "./AnimatedFrame";
import { ProductData, SessionState } from "@/hooks/useVoiceSession";

const PDFViewerClient = dynamic(() => import("./PDFViewerClient"), {
  ssr:     false,
  loading: () => <div className="w-full h-full animate-pulse" style={{ background: "rgba(59,130,246,0.06)", borderRadius: 8 }} />,
});

const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "PecunAI begrüßt Sie...",
  speaking:    "PecunAI spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

function getPdfSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
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
  analyserNode?:    AnalyserNode | null;
  micAnalyserNode?: AnalyserNode | null;
  onMuteToggle: () => void;
  onChatClick:  () => void;
  onConfirm:    () => void;
  onRevisit:    () => void;
}

export default function VoiceProductPhase({
  product,
  isSpeaking,
  isListening,
  isMuted,
  sessionState,
  analyserNode,
  micAnalyserNode,
  onMuteToggle,
  onConfirm,
  onRevisit,
}: VoiceProductPhaseProps) {
  const [pdfSize,       setPdfSize]       = useState<{ width: number; height: number } | null>(null);
  const [pageNumber,    setPageNumber]    = useState(1);
  const [numPages,      setNumPages]      = useState(0);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  const handlePdfLoad = useCallback((n: number) => setNumPages(n), []);

  useEffect(() => {
    setPdfSize(getPdfSize());
    const onResize = () => setPdfSize(getPdfSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pdfUrl = `/api/products/file/${product.fileName.replace(/^\/products\//, "")}`;
  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden"
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

        {/* AnimatedFrame — w-full + flex justify-center ensures true centering */}
        {pdfSize && (
          <div className="w-full flex justify-center">
          <motion.div
            className="relative cursor-pointer"
            style={{ marginBottom: 56 }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onClick={() => setPdfFullscreen(true)}
          >
            <AnimatedFrame
              isSpeaking={isSpeaking}
              isListening={isListening}
              analyserNode={analyserNode}
              micAnalyserNode={micAnalyserNode}
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

        {/* Status text + mute chip */}
        <div className="flex flex-col items-center gap-3">
          <motion.p
            className="text-sm font-medium"
            style={{ color: "rgba(59,130,246,0.7)" }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {statusLabel}
          </motion.p>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{
              width:          36,
              height:         36,
              background:     isMuted
                ? "rgba(254,226,226,0.85)"
                : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(10px)",
              border: isMuted
                ? "1px solid rgba(239,68,68,0.35)"
                : "1px solid rgba(59,130,246,0.2)",
              boxShadow:      "0 2px 10px rgba(0,0,0,0.08)",
            }}
            whileTap={{ scale: 0.91 }}
            onClick={onMuteToggle}
          >
            {isMuted
              ? <MicOff size={16} style={{ color: "rgba(239,68,68,0.85)" }} />
              : <Mic    size={16} style={{ color: "rgba(59,130,246,0.85)" }} />
            }
          </motion.button>
        </div>
      </div>

      {/* ── Bottom bar — two buttons only ───────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center px-5 py-4 gap-3"
        style={{
          background:     "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)",
          backdropFilter: "blur(20px)",
          borderTop:      "1px solid rgba(255,255,255,0.5)",
          boxShadow:      "0 -4px 24px rgba(59,130,246,0.08)",
        }}
      >
        {/* Fragen ändern — outlined secondary */}
        <motion.button
          className="flex-1 text-sm font-semibold rounded-2xl"
          style={{
            height:         52,
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

        {/* Bestätigen — filled primary */}
        <motion.button
          className="flex-1 text-sm font-semibold rounded-2xl text-white"
          style={{
            height:    52,
            background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            boxShadow:  "0 4px 16px rgba(59,130,246,0.35)",
          }}
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
        >
          Bestätigen
        </motion.button>
      </div>

      {/* ── Full-screen PDF modal ────────────────────────────────── */}
      <AnimatePresence>
        {pdfFullscreen && (
          /* Backdrop — click outside the dialog to close on desktop */
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(5,10,20,0.88)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPdfFullscreen(false)}
          >
            {/* Dialog — full-screen on mobile, centered card on desktop */}
            <motion.div
              className="flex flex-col w-full h-full md:h-[88vh] md:max-w-2xl md:rounded-2xl overflow-hidden"
              style={{
                background: "rgba(8,12,24,0.97)",
                border:     "1px solid rgba(255,255,255,0.09)",
                boxShadow:  "0 24px 80px rgba(0,0,0,0.6)",
              }}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.96,    opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Produktdokument
                </span>
                <motion.button
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width:      36,
                    height:     36,
                    background: "rgba(255,255,255,0.08)",
                    border:     "1px solid rgba(255,255,255,0.13)",
                  }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPdfFullscreen(false)}
                >
                  <X size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
                </motion.button>
              </div>

              {/* PDF */}
              <div className="flex-1 overflow-hidden">
                <PDFViewerClient
                  fileUrl={pdfUrl}
                  currentPage={pageNumber}
                  onLoadSuccess={handlePdfLoad}
                  allowScroll
                />
              </div>

              {/* Page navigation */}
              <div
                className="flex items-center justify-center gap-6 py-4 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <motion.button
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width:      40,
                    height:     40,
                    background: pageNumber <= 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
                    border:     "1px solid rgba(255,255,255,0.1)",
                    opacity:    pageNumber <= 1 ? 0.35 : 1,
                  }}
                  whileTap={pageNumber > 1 ? { scale: 0.92 } : {}}
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
                </motion.button>

                <span className="text-sm font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.6)", minWidth: 60, textAlign: "center" }}>
                  {pageNumber} / {numPages || "—"}
                </span>

                <motion.button
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width:      40,
                    height:     40,
                    background: pageNumber >= numPages ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
                    border:     "1px solid rgba(255,255,255,0.1)",
                    opacity:    pageNumber >= numPages ? 0.35 : 1,
                  }}
                  whileTap={pageNumber < numPages ? { scale: 0.92 } : {}}
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

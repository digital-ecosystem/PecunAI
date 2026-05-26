"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Menu, User, MessageCircle, Mic, MicOff } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatedFrame } from "./AnimatedFrame";
import { ProductData, SessionState } from "@/hooks/useVoiceSession";

const PDFViewerClient = dynamic(() => import("./PDFViewerClient"), {
  ssr:     false,
  loading: () => <div className="w-full h-full animate-pulse" style={{ background: "rgba(59,130,246,0.06)", borderRadius: 8 }} />,
});

// ── Status labels (same as Phase 1 shell) ────────────────────────

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

// ── Responsive PDF sizing ─────────────────────────────────────────

function getPdfSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  if (vw >= 1024) {
    const maxH = Math.round(vh * 0.78);
    const w    = Math.min(Math.round(maxH / 1.414), 580);
    return { width: w, height: Math.round(w * 1.414) };
  } else if (vw >= 640) {
    return { width: 440, height: 622 };
  } else {
    const w = Math.min(Math.round(vw * 0.84), 340);
    return { width: w, height: Math.round(w * 1.414) };
  }
}

// ── Props ─────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────

export default function VoiceProductPhase({
  product,
  isSpeaking,
  isListening,
  isMuted,
  sessionState,
  analyserNode,
  micAnalyserNode,
  onMuteToggle,
  onChatClick,
  onConfirm,
  onRevisit,
}: VoiceProductPhaseProps) {
  const [pdfSize,     setPdfSize]     = useState(getPdfSize);
  const [pageNumber,  setPageNumber]  = useState(1);
  const [numPages,    setNumPages]    = useState(0);

  // Stable setter — only stores numPages once (first load); same PDF on page change, always same value
  const handlePdfLoad = useCallback((n: number) => setNumPages(n), []);

  useEffect(() => {
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
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-2 pb-20 pt-8
       gap-4">

        {/* AnimatedFrame + PDF */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
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

        {/* Status text */}
        <motion.p
          className="text-sm font-medium"
          style={{ color: "rgba(59,130,246,0.7)" }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {statusLabel}
        </motion.p>
      </div>

      {/* ── Control strip (mute + revisit + confirm + chat) ────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-4 gap-3"
        style={{
          background:     "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)",
          backdropFilter: "blur(20px)",
          borderTop:      "1px solid rgba(255,255,255,0.5)",
          boxShadow:      "0 -4px 24px rgba(59,130,246,0.08)",
        }}
      >
        {/* Mute toggle */}
        <motion.button
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width:      48,
            height:     48,
            background: isMuted
              ? "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border: isMuted
              ? "1px solid rgba(239,68,68,0.2)"
              : "1px solid rgba(59,130,246,0.2)",
          }}
          whileTap={{ scale: 0.93 }}
          onClick={onMuteToggle}
        >
          {isMuted
            ? <MicOff size={22} style={{ color: "rgba(239,68,68,0.8)" }} />
            : <Mic    size={22} style={{ color: "rgba(59,130,246,0.8)" }} />
          }
        </motion.button>

        {/* Revisit button */}
        <motion.button
          className="flex-1 py-3 rounded-2xl text-sm font-semibold"
          style={{
            background:     "rgba(255,255,255,0.7)",
            backdropFilter: "blur(10px)",
            border:         "1px solid rgba(59,130,246,0.25)",
            color:          "rgba(59,130,246,0.9)",
            boxShadow:      "0 2px 8px rgba(59,130,246,0.06)",
          }}
          whileTap={{ scale: 0.97 }}
          onClick={onRevisit}
        >
          Revisit
        </motion.button>

        {/* Confirm button */}
        <motion.button
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            boxShadow:  "0 4px 16px rgba(59,130,246,0.35)",
          }}
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
        >
          Confirm
        </motion.button>

        {/* Chat button */}
        <motion.button
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width:      48,
            height:     48,
            background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
            border:     "1px solid rgba(59,130,246,0.2)",
          }}
          whileTap={{ scale: 0.93 }}
          onClick={onChatClick}
        >
          <MessageCircle size={22} style={{ color: "rgba(59,130,246,0.8)" }} />
        </motion.button>
      </div>
    </div>
  );
}

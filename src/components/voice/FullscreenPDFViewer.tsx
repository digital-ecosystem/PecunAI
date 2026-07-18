"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
import dynamic from "next/dynamic";
import type { PdfZoomTarget } from "./PDFViewerClient";

const PDFViewerClient = dynamic(() => import("./PDFViewerClient"), {
  ssr:     false,
  loading: () => <div className="w-full h-full animate-pulse" style={{ background: "rgba(59,130,246,0.06)", borderRadius: 8 }} />,
});

const ZOOM_FACTOR = 1.25;
const ZOOM_MIN    = 0.5;
const ZOOM_MAX    = 4;

interface FullscreenPDFViewerProps {
  title:         string;
  fileUrl:       string;
  pageNumber:    number; // 1-based, controlled by the parent
  numPages:      number;
  onPageChange:  (page: number) => void;
  onLoadSuccess: (numPages: number) => void;
  onClose:       () => void;
  /** Optional download action — shows a download icon in the header. */
  onDownload?:   () => void;
}

/** The dark full-screen PDF dialog — extracted from VoiceProductPhase so
 *  Phase 2 (product document) and Phase 5 (contract documents) share one
 *  viewer. Full-screen on mobile, centered card on desktop; scrollable pages,
 *  page arrows, and zoom in / fit-width / zoom out.
 *  Mount/unmount inside the parent's <AnimatePresence> — exit animations are
 *  defined here. */
export default function FullscreenPDFViewer({
  title,
  fileUrl,
  pageNumber,
  numPages,
  onPageChange,
  onLoadSuccess,
  onClose,
  onDownload,
}: FullscreenPDFViewerProps) {
  const zoomRef  = useRef<((target: PdfZoomTarget) => void) | null>(null);
  const scaleRef = useRef(1); // live numeric scale, fed by onScaleChange

  const zoomBy = (factor: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scaleRef.current * factor));
    zoomRef.current?.(next);
  };

  const footerButtonStyle = (disabled: boolean) => ({
    width:      40,
    height:     40,
    background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
    border:     "1px solid rgba(255,255,255,0.1)",
    opacity:    disabled ? 0.35 : 1,
  });

  return (
    /* Backdrop — click outside the dialog to close on desktop */
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(5,10,20,0.88)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
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
          className="flex items-center justify-between gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
            {title}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onDownload && (
              <motion.button
                className="flex items-center justify-center rounded-full"
                style={{
                  width:      36,
                  height:     36,
                  background: "rgba(255,255,255,0.08)",
                  border:     "1px solid rgba(255,255,255,0.13)",
                }}
                whileTap={{ scale: 0.92 }}
                onClick={onDownload}
                aria-label="PDF herunterladen"
              >
                <Download size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
              </motion.button>
            )}
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width:      36,
                height:     36,
                background: "rgba(255,255,255,0.08)",
                border:     "1px solid rgba(255,255,255,0.13)",
              }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              aria-label="Schließen"
            >
              <X size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
            </motion.button>
          </div>
        </div>

        {/* PDF */}
        <div className="flex-1 overflow-hidden">
          <PDFViewerClient
            fileUrl={fileUrl}
            currentPage={pageNumber}
            onLoadSuccess={onLoadSuccess}
            allowScroll
            onPageChange={onPageChange}
            zoomRef={zoomRef}
            onScaleChange={s => { scaleRef.current = s; }}
          />
        </div>

        {/* Footer — page navigation + zoom cluster */}
        <div
          className="flex items-center justify-center gap-4 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={footerButtonStyle(pageNumber <= 1)}
            whileTap={pageNumber > 1 ? { scale: 0.92 } : {}}
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            aria-label="Vorherige Seite"
          >
            <ChevronLeft size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={footerButtonStyle(false)}
            whileTap={{ scale: 0.92 }}
            onClick={() => zoomBy(1 / ZOOM_FACTOR)}
            aria-label="Verkleinern"
          >
            <ZoomOut size={17} style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={footerButtonStyle(false)}
            whileTap={{ scale: 0.92 }}
            onClick={() => zoomRef.current?.("PageWidth")}
            aria-label="An Seitenbreite anpassen"
          >
            <Maximize2 size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={footerButtonStyle(false)}
            whileTap={{ scale: 0.92 }}
            onClick={() => zoomBy(ZOOM_FACTOR)}
            aria-label="Vergrößern"
          >
            <ZoomIn size={17} style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={footerButtonStyle(pageNumber >= numPages)}
            whileTap={pageNumber < numPages ? { scale: 0.92 } : {}}
            onClick={() => onPageChange(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            aria-label="Nächste Seite"
          >
            <ChevronRight size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { Worker, Viewer, SpecialZoomLevel, ScrollMode } from "@react-pdf-viewer/core";
import type { Plugin, PluginFunctions } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { CONFIG } from "@/config/constants";

interface PDFViewerClientProps {
  fileUrl:       string;
  currentPage:   number; // 1-based
  onLoadSuccess: (numPages: number) => void;
  allowScroll?:  boolean;
}

// Hide scrollbars visually without blocking programmatic scroll (needed for jumpToPage)
const HIDE_SCROLLBAR_CSS = `
  .pdf-ns .rpv-core__inner-pages,
  .pdf-ns .rpv-core__inner-page-container--single {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  .pdf-ns .rpv-core__inner-pages::-webkit-scrollbar,
  .pdf-ns .rpv-core__inner-page-container--single::-webkit-scrollbar {
    display: none !important;
  }
`;

export default function PDFViewerClient({ fileUrl, currentPage, onLoadSuccess, allowScroll }: PDFViewerClientProps) {
  const jumpRef   = useRef<((page: number) => Promise<void>) | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const prevPage  = useRef(currentPage);

  // Capture jumpToPage from plugin system — called once when Viewer installs the plugin
  const navPlugin = useRef<Plugin>({
    install: (fns: PluginFunctions) => { jumpRef.current = fns.jumpToPage; },
  }).current;

  // Navigate on page change — skip initial mount (initialPage handles that)
  useEffect(() => {
    if (prevPage.current === currentPage) return;
    prevPage.current = currentPage;
    jumpRef.current?.(currentPage - 1);
  }, [currentPage]);

  // Block user scroll in compact mode — parent controls pages via buttons.
  // Skipped in full-screen mode (allowScroll) so the user can read the full page.
  useEffect(() => {
    if (allowScroll) return;
    const el = wrapRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("wheel",     block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    return () => {
      el.removeEventListener("wheel",     block);
      el.removeEventListener("touchmove", block);
    };
  }, [allowScroll]);

  return (
    <div ref={wrapRef} className="pdf-ns" style={{ overflow: "hidden", width: "100%", height: "100%" }}>
      <style>{HIDE_SCROLLBAR_CSS}</style>
      <Worker workerUrl={CONFIG.EXTERNAL.PDF_WORKER_URL}>
        <Viewer
          fileUrl={fileUrl}
          defaultScale={SpecialZoomLevel.PageWidth}
          scrollMode={ScrollMode.Page}
          plugins={[navPlugin]}
          initialPage={currentPage - 1}
          onDocumentLoad={(e) => onLoadSuccess(e.doc.numPages)}
        />
      </Worker>
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { Worker, Viewer, SpecialZoomLevel, ScrollMode } from "@react-pdf-viewer/core";
import type { Plugin, PluginFunctions, ViewerState } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { CONFIG } from "@/config/constants";

/** Zoom target: absolute scale, or "PageWidth" to re-fit. Kept as a plain
 *  string so callers never import the core package's enum — all
 *  @react-pdf-viewer imports stay contained in this file. */
export type PdfZoomTarget = number | "PageWidth";

interface PDFViewerClientProps {
  fileUrl:       string;
  currentPage:   number; // 1-based
  onLoadSuccess: (numPages: number) => void;
  allowScroll?:  boolean;
  /** Reports 1-based page as the user scrolls — lets the parent keep its
   *  controlled `currentPage` in sync instead of going stale. */
  onPageChange?:  (page: number) => void;
  /** Captures the viewer's zoom function so the parent can drive zoom buttons. */
  zoomRef?:       React.MutableRefObject<((target: PdfZoomTarget) => void) | null>;
  /** Reports the live numeric scale (including the resolved initial PageWidth). */
  onScaleChange?: (scale: number) => void;
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

export default function PDFViewerClient({
  fileUrl,
  currentPage,
  onLoadSuccess,
  allowScroll,
  onPageChange,
  zoomRef,
  onScaleChange,
}: PDFViewerClientProps) {
  const jumpRef   = useRef<((page: number) => Promise<void>) | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const prevPage  = useRef(currentPage);

  // The plugin object is created once, but the callbacks it needs live in
  // props that change across renders — read them through refs.
  const onPageChangeRef  = useRef(onPageChange);
  const onScaleChangeRef = useRef(onScaleChange);
  onPageChangeRef.current  = onPageChange;
  onScaleChangeRef.current = onScaleChange;

  // Capture jumpToPage/zoom from the plugin system — called once when Viewer
  // installs the plugin. onViewerStateChange tracks scale and page as the
  // user scrolls/zooms.
  const navPlugin = useRef<Plugin>({
    install: (fns: PluginFunctions) => {
      jumpRef.current = fns.jumpToPage;
      if (zoomRef) {
        zoomRef.current = (target: PdfZoomTarget) =>
          fns.zoom(target === "PageWidth" ? SpecialZoomLevel.PageWidth : target);
      }
    },
    onViewerStateChange: (state: ViewerState) => {
      onScaleChangeRef.current?.(state.scale);
      const page = state.pageIndex + 1;
      if (page !== prevPage.current) {
        // Update prevPage before reporting up — when the parent echoes the
        // new page back through `currentPage`, the effect below must not
        // re-jump (it would snap the scroll position mid-read).
        prevPage.current = page;
        onPageChangeRef.current?.(page);
      }
      return state;
    },
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

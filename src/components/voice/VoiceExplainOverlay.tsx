"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, TrendingUp, DollarSign, PieChart, Mic } from "lucide-react";
import VoiceSphere from "./VoiceSphere";

interface VoiceExplainOverlayProps {
  footnote: {
    title:     string;
    keyPoints: string[];
    /** Long-form text (Q12/13/14 asset knowledge) shown in place of the bullets — sections
     *  separated by a blank line, each opening with a "Heading: " prefix. */
    bodyText?: string;
  };
  questionCategory: string;
  questionText:     string;
  analyserNode:     AnalyserNode | null;
  isAISpeaking:     boolean;
  triggerClose?:    boolean;
  /** Fired synchronously the moment the back button is tapped — the shell
   *  passes stopAudio so a mid-explanation exit cuts the AI off immediately
   *  (client request: the back button works at ANY time; the flow then
   *  continues via onClose's normal resume/re-ask path). */
  onCloseStart?:    () => void;
  onClose:          () => void;
  onFollowUp:       () => void;
  /** Read-and-confirm mode (Q12/13/14 asset knowledge): the AI only introduces the text, the
   *  customer reads it and closes the overlay themselves via the action bar. Without this the
   *  overlay auto-closes when the AI stops speaking and shows no bar at all.
   *  See private-documents/after-demo/ASSET_EXPLAIN_READ_AND_CONFIRM_PLAN.md. */
  showConfirm?:     boolean;
  /** Hold-to-ask, only rendered in confirm mode — the ControlBar's own PTT button is
   *  unreachable under this full-screen overlay. */
  onPTTStart?:      () => void;
  onPTTRelease?:    () => void;
  isPTTActive?:     boolean;
}

const BAR_COUNT = 40;
const BASE_H    = 4;
const MAX_H     = 80;

const AI_BAR_BG     = "linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(147,197,253,0.6) 100%)";
const AI_BAR_SHADOW = "0 0 8px rgba(59,130,246,0.4)";

const IDLE_BAR_STYLE = {
  width:      2.5,
  background: AI_BAR_BG,
  boxShadow:  AI_BAR_SHADOW,
} as const;

function WaveformBars({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);
  // Kept within [20, MAX_H] — the same range real audio data produces — so no bar ever exceeds
  // the container's fixed height (avoids a mobile-Safari layout shift, see
  // private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md).
  const idleBars = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => [
      Math.random() * (MAX_H - 20) + 20,
      Math.random() * (MAX_H - 20) + 20,
    ]),
    [],
  );

  useEffect(() => {
    if (!analyserNode || !containerRef.current) return;
    const aiData = new Uint8Array(analyserNode.frequencyBinCount);
    const barEls = Array.from(containerRef.current.children) as HTMLElement[];
    const step   = analyserNode.frequencyBinCount / BAR_COUNT;

    const tick = () => {
      analyserNode.getByteFrequencyData(aiData);
      barEls.forEach((el, i) => {
        const bin = aiData[Math.floor(i * step)] ?? 0;
        el.style.height = `${BASE_H + (bin / 255) * (MAX_H - BASE_H)}px`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyserNode]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center gap-1 h-24 px-8 flex-shrink-0 overflow-hidden"
    >
      {analyserNode
        ? idleBars.map((_, i) => (
            <div key={i} className="rounded-full" style={{ ...IDLE_BAR_STYLE, height: BASE_H }} />
          ))
        : idleBars.map(([h1, h2], i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={IDLE_BAR_STYLE}
              animate={{ height: [BASE_H, h1, h2, BASE_H] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
            />
          ))
      }
    </div>
  );
}

/** Renders the client's long-form asset-knowledge text (Q12/13/14): blocks separated by a blank
 *  line, each opening with a "Heading: " prefix that becomes a bold section heading. A block
 *  without a plausible prefix falls back to a plain paragraph. See
 *  private-documents/after-demo/ASSET_EXPLAIN_FULL_TEXT_PLAN.md. */
function BodySections({ text }: { text: string }) {
  const sections = useMemo(
    () => text.split(/\n\s*\n/).map(block => {
      const raw = block.trim();
      const sep = raw.indexOf(": ");
      return sep > 0 && sep <= 70
        ? { heading: raw.slice(0, sep), body: raw.slice(sep + 2) }
        : { heading: null,              body: raw };
    }),
    [text],
  );

  return (
    <div className="space-y-4">
      {sections.map(({ heading, body }, i) => (
        <div key={i}>
          {heading && (
            <h4 className="text-sm font-semibold mb-1" style={{ color: "rgba(15,23,42,0.85)" }}>
              {heading}
            </h4>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "rgba(71,85,105,0.85)" }}>
            {body}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function VoiceExplainOverlay({
  footnote,
  questionCategory,
  questionText,
  analyserNode,
  triggerClose,
  onCloseStart,
  onClose,
  onFollowUp,
  showConfirm,
  onPTTStart,
  onPTTRelease,
  isPTTActive,
}: VoiceExplainOverlayProps) {
  const [showTransition, setShowTransition] = useState(true);
  const [closing,        setClosing]        = useState(false);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowTransition(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Exit choreography duration — the entry transition played in reverse
  // (phantom orb travels from the top back to centre while growing, phantom
  // question card slides back up from below), content fading out fast at the
  // start and the root fading at the very end. onClose (flow resume) fires
  // once the phantoms have landed.
  const EXIT_MS = 1150;

  // Voice-triggered close: start the exit animation without any guard
  useEffect(() => {
    if (!triggerClose || closing) return;
    setClosing(true);
    closingTimerRef.current = setTimeout(onClose, EXIT_MS);
  }, [triggerClose, closing, onClose]);

  // Cleanup closing timer on unmount
  useEffect(() => () => {
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
  }, []);

  // Always allowed — even mid-explanation (client request). onCloseStart cuts
  // the AI's audio at click time; onClose (after the exit choreography) then
  // resumes the flow exactly like the natural end-of-speech close: the
  // knowledge-blocker re-asks its question, the info-icon path continues.
  const handleClose = useCallback(() => {
    if (closing) return;
    onCloseStart?.();
    setClosing(true);
    closingTimerRef.current = setTimeout(onClose, EXIT_MS);
  }, [closing, onCloseStart, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 30%, rgba(249,250,251,1) 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      // On close, the root (background) holds while the exit phantoms play,
      // fading only at the very end so the handoff to the real screen
      // underneath (same gradient, real orb where the phantom lands) is soft.
      transition={closing ? { duration: 0.3, delay: 0.85 } : { duration: 0.2 }}
    >
      {/* Ambient background waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-full h-96"
          style={{
            top: 0,
            background:
              "radial-gradient(ellipse at top, rgba(59,130,246,0.12) 0%, transparent 60%)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-full h-96"
          style={{
            top: 100,
            background:
              "radial-gradient(ellipse at top, rgba(147,197,253,0.08) 0%, transparent 50%)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      {/* ── Entry transition ───────────────────────────────────────── */}
      {/* Phantom orb shrinks up + fades; phantom question card slides down + fades */}
      <AnimatePresence>
        {showTransition && (
          <>
            {/* Orb: starts centred, shrinks toward top and fades */}
            <motion.div
              key="transition-orb"
              className="fixed z-[60] flex items-center justify-center pointer-events-none"
              initial={{ top: "50%", left: "50%", x: "-50%", y: "-50%" }}
              animate={{
                top: "80px",
                scale: [1, 0.4],
                opacity: [1, 0.8, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <VoiceSphere isActive isSpeaking size={280} analyserNode={null} />
            </motion.div>

            {/* Question card: slides down and fades */}
            <motion.div
              key="transition-card"
              className="fixed z-[60] px-6 pointer-events-none"
              style={{
                width: "100%",
                maxWidth: "400px",
                left: "50%",
                x: "-50%",
              }}
              initial={{ bottom: "120px" }}
              animate={{ bottom: "-100px", opacity: [1, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                className="relative overflow-hidden rounded-3xl px-6 py-5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow:
                    "0 0 40px rgba(59,130,246,0.6), 0 8px 32px rgba(59,130,246,0.15)",
                }}
              >
                {questionCategory && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "rgba(59,130,246,0.8)" }}
                  >
                    {questionCategory}
                  </div>
                )}
                <p
                  className="text-base font-medium"
                  style={{ color: "rgba(15,23,42,0.9)" }}
                >
                  {questionText}
                </p>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)",
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Exit transition — the entry played in reverse ───────────── */}
      {/* Phantom orb travels from the top back to centre while growing;
          phantom question card slides back up from below. Both land where the
          real screen underneath will show them (canvas orb at centre, the
          question near the bottom) just as the root fades. */}
      {closing && (
        <>
          <motion.div
            key="exit-orb"
            className="fixed z-[60] flex items-center justify-center pointer-events-none"
            initial={{ top: "80px", left: "50%", x: "-50%", y: "-50%", scale: 0.4, opacity: 0 }}
            animate={{ top: "50%", scale: 1, opacity: [0, 0.85, 1] }}
            transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          >
            <VoiceSphere isActive isSpeaking size={280} analyserNode={null} />
          </motion.div>

          <motion.div
            key="exit-card"
            className="fixed z-[60] px-6 pointer-events-none"
            style={{
              width: "100%",
              maxWidth: "400px",
              left: "50%",
              x: "-50%",
            }}
            initial={{ bottom: "-100px", opacity: 0 }}
            animate={{ bottom: "120px", opacity: [0, 0.6, 1] }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="relative overflow-hidden rounded-3xl px-6 py-5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.5)",
                boxShadow:
                  "0 0 40px rgba(59,130,246,0.6), 0 8px 32px rgba(59,130,246,0.15)",
              }}
            >
              {questionCategory && (
                <div
                  className="text-xs font-medium mb-2"
                  style={{ color: "rgba(59,130,246,0.8)" }}
                >
                  {questionCategory}
                </div>
              )}
              <p
                className="text-base font-medium"
                style={{ color: "rgba(15,23,42,0.9)" }}
              >
                {questionText}
              </p>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)",
                }}
              />
            </div>
          </motion.div>
        </>
      )}

      {/* ── Header — back button ───────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full px-6 py-5 flex-shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing || showTransition ? 0 : 1 }}
        transition={closing ? { duration: 0.2 } : { duration: 0.4, delay: showTransition ? 0 : 0.3 }}
      >
        <motion.button
          className="flex items-center justify-center rounded-full"
          style={{
            width:          44,
            height:         44,
            background:     "rgba(255,255,255,0.7)",
            backdropFilter: "blur(10px)",
            border:         "1px solid rgba(255,255,255,0.6)",
            boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          aria-disabled={closing}
        >
          <ArrowLeft size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
        </motion.button>
      </motion.div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col px-6 pb-8 overflow-y-auto min-h-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: closing || showTransition ? 0 : 1,
          y:       closing ? 12 : showTransition ? 20 : 0,
        }}
        transition={closing ? { duration: 0.25 } : { duration: 0.6, delay: showTransition ? 0 : 0.5 }}
      >
        {/* Waveform — visualizes the AI's spoken explanation */}
        <WaveformBars analyserNode={analyserNode} />
        <p
          className="text-center text-sm font-medium pt-3 mb-8"
          style={{ color: "rgba(59,130,246,0.7)" }}
        >
          AI erklärt...
        </p>

        {/* Explanation panel */}
        <div className="mb-6">
          <div
            className="w-full rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.6)",
              boxShadow:
                "0 20px 60px rgba(59,130,246,0.2), 0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {/* Accent bar */}
            <div
              className="w-full h-1"
              style={{
                background:
                  "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)",
              }}
            />

            <div className="p-6">
              {/* Icon row */}
              <div className="flex items-center gap-4 mb-4">
                {[
                  { Icon: TrendingUp, color: "rgba(34,197,94,0.8)"  },
                  { Icon: DollarSign, color: "rgba(59,130,246,0.8)"  },
                  { Icon: PieChart,   color: "rgba(168,85,247,0.8)"  },
                ].map(({ Icon, color }, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-center rounded-2xl"
                    style={{
                      width:      48,
                      height:     48,
                      background: `${color}15`,
                      border:     `1px solid ${color}25`,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Icon size={24} style={{ color }} />
                  </motion.div>
                ))}
              </div>

              {/* Title */}
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "rgba(15,23,42,0.95)" }}
              >
                {footnote.title}
              </h3>

              {/* Key points — bullet highlights only, full explanation is spoken verbally */}
              {footnote.keyPoints.length > 0 && (
                <ul className="space-y-2">
                  {footnote.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(71,85,105,0.8)" }}>
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(59,130,246,0.6)" }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              )}

              {/* Full text — Q12/13/14 asset knowledge. The client requires their complete
                  regulatory text on screen, not a summary of it, so it replaces the bullets
                  rather than sitting alongside them. */}
              {footnote.bodyText && (
                <div className={footnote.keyPoints.length > 0 ? "mt-4" : undefined}>
                  <BodySections text={footnote.bodyText} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* "Ihre Frage" question card */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "rgba(100,116,139,0.6)" }}
          >
            Ihre Frage
          </p>
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.5)",
              boxShadow:
                "0 8px 32px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {questionCategory && (
              <div
                className="text-xs font-medium mb-2"
                style={{ color: "rgba(59,130,246,0.8)" }}
              >
                {questionCategory}
              </div>
            )}
            <p
              className="text-base font-medium"
              style={{ color: "rgba(15,23,42,0.9)" }}
            >
              {questionText}
            </p>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)",
              }}
            />
          </div>
        </div>

      </motion.div>

      {/* ── Action bar — read-and-confirm mode only ─────────────────── */}
      {/* Hold the mic to ask about the text; tap Verstanden to go back to the question. The
          confirm button reuses handleClose, so it cuts off any AI speech and runs the exact
          same exit choreography and re-ask path as the header's back arrow. */}
      {showConfirm && (
        <motion.div
          className="relative z-10 w-full px-6 pt-4 pb-6 flex-shrink-0"
          style={{
            background:     "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.97) 45%)",
            backdropFilter: "blur(20px)",
            borderTop:      "1px solid rgba(255,255,255,0.6)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing || showTransition ? 0 : 1 }}
          transition={closing ? { duration: 0.2 } : { duration: 0.5, delay: showTransition ? 0 : 0.6 }}
        >
          <div className="flex items-center gap-3 max-w-sm mx-auto">
            {onPTTStart && (
              <motion.button
                className="flex items-center justify-center rounded-full flex-shrink-0 ptt-button"
                style={{
                  width:      56,
                  height:     56,
                  background: isPTTActive
                    ? "linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(29,78,216,0.15) 100%)"
                    : "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.1) 100%)",
                  border: isPTTActive
                    ? "1px solid rgba(29,78,216,0.3)"
                    : "1px solid rgba(59,130,246,0.2)",
                }}
                animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
                transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
                onMouseDown={onPTTStart}
                onMouseUp={onPTTRelease}
                onMouseLeave={isPTTActive ? onPTTRelease : undefined}
                onTouchStart={onPTTStart}
                onTouchEnd={onPTTRelease}
                onTouchCancel={onPTTRelease}
              >
                <Mic size={24} style={{ color: isPTTActive ? "rgba(29,78,216,0.9)" : "rgba(59,130,246,0.8)" }} />
              </motion.button>
            )}

            <motion.button
              className="flex-1 flex items-center justify-center rounded-2xl py-3.5 px-4"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)",
                boxShadow:  "0 4px 16px rgba(59,130,246,0.3)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClose}
              aria-disabled={closing}
            >
              <span className="text-sm font-medium text-white">Verstanden – zurück zur Frage</span>
            </motion.button>
          </div>

          {onPTTStart && (
            <p
              className="text-center text-xs mt-3"
              style={{ color: "rgba(100,116,139,0.7)" }}
            >
              {isPTTActive
                ? "Ich höre zu – loslassen zum Absenden"
                : "Mikrofon gedrückt halten, um eine Frage zum Text zu stellen"}
            </p>
          )}
        </motion.div>
      )}

      {/* Bottom gradient fade — omitted in confirm mode, where the action bar's own
          background provides the visual stop for the scrolling text. */}
      {!showConfirm && (
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(249,250,251,1) 0%, transparent 100%)",
          }}
        />
      )}
    </motion.div>
  );
}

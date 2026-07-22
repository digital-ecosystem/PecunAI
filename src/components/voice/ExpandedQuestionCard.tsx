"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X, ArrowRight, Info, Edit3 } from "lucide-react";
import type { FrameRect } from "./frameMath";
import type { ModalQuestion, QuestionOption } from "./VoiceQuestionModal";

/**
 * The resting, interactive answer card for Phase 1 — floating centered in
 * the band between the header and the ControlBar (which stays visible and
 * usable while the card is open). The neural frame around it is drawn by the
 * persistent PhaseOneNeuralModel canvas underneath, not by this component —
 * this is just the white card content, faded in/out with modalOpen. See
 * VoiceSessionShell.tsx for the choreography and
 * private-documents/after-demo/PHASE_1_QUESTION_CARD_MORPH_PLAN.md for why
 * this doesn't wrap AnimatedFrame the way it originally did (Round 3).
 *
 * Answer-rendering logic (choice list, number/text input, highlight_answer
 * amber pre-selection, min/max validation, Fast Mode context banner) is
 * ported from the now-deprecated VoiceQuestionModal.tsx — same behavior,
 * different host.
 */

interface ExpandedQuestionCardProps {
  rect: FrameRect;
  /** Compact carousel-card rect to grow FROM (Round 21). When set, the card
   *  animates its geometry startRect → rect ("same card grows"); when absent
   *  it falls back to the old fade-in at the fixed rect. */
  startRect?: FrameRect;
  question: ModalQuestion;
  onClose: () => void;
  onNext: (value: string) => void;
  preSelectedValue?: string;
  contextMessage?: string;
}

// The band the CENTERED card floats in: below the header zone, above the
// ControlBar. Since Round 22 this geometry only serves the sustainability
// disclosure (via computeExpandedRect) and the no-startRect fallback —
// question cards now expand in place at the compact card's spot instead
// (computeInPlaceRect below). The options area inside is plain
// flex-1/overflow-y-auto, so longer lists scroll internally at any height.
const TOP_MARGIN    = 72;  // header zone
const BAR_CLEARANCE = 124; // ControlBar ≈88px + gap so even the frame's spikes clear it
const BAND_PAD      = 12;
// Round 21 (boss: "not that much heighty"): a fixed medium band instead of
// filling the whole available height. Long option lists still scroll inside
// the plain flex-1/overflow-y-auto answer area; short ones just have air.
const CARD_MAX_H    = 470;

export function computeExpandedCardSize(vw: number, vh: number) {
  const width = vw >= 1024 ? 480 : vw >= 640 ? 440 : Math.min(Math.round(vw * 0.9), 380);
  const available = vh - TOP_MARGIN - BAR_CLEARANCE - BAND_PAD * 2;
  const height = Math.max(320, Math.min(CARD_MAX_H, available));
  return { width, height };
}

export function computeExpandedRect(vw: number, vh: number): FrameRect {
  const { width, height } = computeExpandedCardSize(vw, vh);
  const y = Math.max(
    8,
    TOP_MARGIN + BAND_PAD + (vh - TOP_MARGIN - BAR_CLEARANCE - BAND_PAD * 2 - height) / 2
  );
  return { x: (vw - width) / 2, y, w: width, h: height };
}

// Round 22 "expand in place": the question card no longer flies to the centered
// band above — it keeps the compact card's x/width, anchors its bottom edge at
// the compact card's bottom, and grows UPWARD by a content-estimated height
// (the vox2_ai_morph_handoff reference's HDR + options*OPT + BTN formula). The
// header base is startRect.h — the compact card's REAL rendered height for the
// same category + question at the same width — so only the answer rows are
// estimated. Errors degrade gracefully: the answer area is flex-1 /
// overflow-y-auto, so too-short scrolls and too-tall just leaves air.
// (computeExpandedRect above still serves the sustainability disclosure, which
// has no carousel card and keeps growing from the orb.)
export function computeInPlaceRect(
  startRect: FrameRect,
  question: ModalQuestion,
  opts?: { hasContext?: boolean; hasProposed?: boolean }
): FrameRect {
  const isChoice = !question.questionType || question.questionType === "choice";
  let h = startRect.h + 30; // header base + progress row
  if (opts?.hasContext)  h += 56; // Fast Mode / re-ask banner
  if (opts?.hasProposed) h += 26; // amber "ist das korrekt?" hint line
  if (isChoice) {
    for (const o of question.options) {
      const lines = Math.max(1, Math.ceil(o.label.length / 28));
      h += 28 + lines * 20;
    }
    h += Math.max(0, question.options.length - 1) * 10 + 14;
  } else {
    // Number/text: hero input, helper hints, Weiter directly below — plus a
    // breathing-room allowance (user feedback 2026-07-22: pure content-hug
    // felt too short). The input group is vertically CENTERED in the answer
    // area (my-auto), so this air splits evenly above/below the group instead
    // of pooling as one dead gap like the original bottom-pinned layout.
    h += 66; // hero input
    if (question.minValue !== undefined) h += 20;
    if (question.maxValue !== undefined) h += 20;
    h += 62; // Weiter in-flow (mt-4 + smaller button)
    h += 76; // breathing room
  }
  h += 18;
  // Settle vertically centered in the band between the top header zone and
  // the compact card's bottom edge (user feedback 2026-07-22: bottom-anchored
  // sat "too much in the bottom") — the card still grows FROM the compact
  // card, but drifts up to read as the middle of the screen, while its lower
  // bound keeps it clear of the ControlBar below the carousel.
  const bottom = startRect.y + startRect.h;
  const bandH  = bottom - TOP_MARGIN;
  h = Math.max(startRect.h + 60, Math.min(h, bandH - 20));
  const y = TOP_MARGIN + Math.max(10, (bandH - h) / 2);
  return { x: startRect.x, y, w: startRect.w, h };
}

// Card surface states (Round 22 "consumed by the orb", boss feedback): frame 1
// = the compact card's surface; mid-grow dips extra transparent so the node
// swarm behind shows through; settled = readable glass, not a white sheet.
// All three share one gradient structure so Motion can interpolate them.
const COMPACT_BG = "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)";
const CONSUME_BG = "linear-gradient(135deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.32) 100%)";
const GLASS_BG   = "linear-gradient(135deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.54) 100%)";
const COMPACT_SHADOW = "0 8px 32px rgba(59,130,246,0.10), 0 2px 8px rgba(59,130,246,0.04)";
const GLASS_SHADOW   = "0 0 42px rgba(59,130,246,0.16), 0 10px 34px rgba(59,130,246,0.10)";

function formatValue(value: number, placeholder?: string): string {
  if (placeholder?.toLowerCase().includes("euro")) return `€ ${value.toLocaleString("de-AT")}`;
  return value.toLocaleString("de-AT");
}

export function ExpandedQuestionCard({
  rect,
  startRect,
  question,
  onClose,
  onNext,
  preSelectedValue,
  contextMessage,
}: ExpandedQuestionCardProps) {
  const isChoice = !question.questionType || question.questionType === "choice";
  const isNumber = question.questionType === "number";
  const isText   = question.questionType === "text";
  // Euro amounts get a € adornment on the hero input (same placeholder
  // heuristic formatValue already uses for hint formatting).
  const isEuro   = isNumber && !!question.inputPlaceholder?.toLowerCase().includes("euro");

  const [selected,   setSelected]   = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [aiProposed, setAiProposed] = useState(!!preSelectedValue);
  // Guards against a fast double-tap firing onNext twice (choice questions now submit on the
  // option tap itself, with no confirm button between tap and submit). Resets per question —
  // the card is remounted via key={question.id} each time.
  const submittedRef = useRef(false);

  // When AI proposes a value via highlight_answer, apply it based on question type.
  // Ported verbatim from VoiceQuestionModal.tsx.
  useEffect(() => {
    if (preSelectedValue === undefined) return;

    if (isChoice) {
      const lower = preSelectedValue.toLowerCase();
      const match = question.options.find(
        o => o.value?.toLowerCase() === lower || o.label.toLowerCase() === lower
      );
      if (match) {
        setSelected(match.id);
        setAiProposed(true);
      }
    } else {
      setInputValue(preSelectedValue);
      setAiProposed(true);
    }
  }, [preSelectedValue, question.options, isChoice]);

  const numVal   = isNumber ? parseInt(inputValue, 10) : NaN;
  const belowMin = isNumber && question.minValue !== undefined && !isNaN(numVal) &&
    (question.questionOrder === 19 ? (numVal !== 0 && numVal < question.minValue) : numVal < question.minValue);
  const aboveMax = isNumber && question.maxValue !== undefined && !isNaN(numVal) && numVal > question.maxValue;
  const hasError = belowMin || aboveMax;

  const canSubmit = isChoice
    ? !!selected
    : isNumber
    ? inputValue !== "" && !isNaN(numVal) && numVal >= 0 && !hasError
    : inputValue.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit || submittedRef.current) return;
    submittedRef.current = true;
    if (isChoice) {
      const selectedOpt = question.options.find(o => o.id === selected);
      onNext(selectedOpt?.value ?? selected!);
    } else {
      onNext(inputValue);
    }
  };

  // Choice questions submit the moment an option is tapped — no separate confirm button
  // (boss request 2026-07-20). Number/text still need the button so the customer can finish
  // typing first. This also serves as the confirm gesture for an AI-proposed (amber) value:
  // tapping the option — the same one or a different one — commits it.
  const handleChoiceTap = (opt: QuestionOption) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSelected(opt.id);
    setAiProposed(false);
    onNext(opt.value ?? opt.id);
  };

  // Round 22 "expand in place": with a startRect the card IS the compact card —
  // same spot/width, header pixels identical from frame 1 — growing upward to
  // the content-sized rect while the canvas frame wraps it. Zone A (category +
  // question, mirroring the compact card's exact markup) is visible from t=0
  // and survives the exit shrink; Zone B (progress, banner, answers, button)
  // staggers in DURING the grow (reference behavior) and fades out first on
  // close, so both directions read as the same card resizing.
  // No startRect → plain fade at the fixed rect (fallback / harness edge).
  const grow      = !!startRect;
  const GROW_S    = 0.6;
  const SHRINK_S  = 0.45;
  const GROW_EASE = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      className="fixed z-[56]"
      initial={grow
        ? { left: startRect!.x, top: startRect!.y, width: startRect!.w, height: startRect!.h, opacity: 1 }
        : { left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity: 0, scale: 0.98 }}
      animate={grow
        ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity: 1,
            transition: { duration: GROW_S, ease: GROW_EASE } }
        : { left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity: 1, scale: 1,
            transition: { duration: 0.3, delay: 0.15 } }}
      // Exit (grow mode): Zone B fades out fast, then the card visibly shrinks
      // back INTO the compact carousel card (header intact) while the canvas
      // frame collapses to the orb behind it; the outer opacity drops only at
      // the very end to mask the swap back to the real compact card beneath.
      exit={grow
        ? { left: startRect!.x, top: startRect!.y, width: startRect!.w, height: startRect!.h, opacity: 0,
            transition: { duration: SHRINK_S, ease: GROW_EASE, opacity: { delay: SHRINK_S - 0.12, duration: 0.12 } } }
        : { opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
    >
      {/* Chrome — NOT a white modal sheet (boss feedback 2026-07-22): a
          translucent glass pane. During the grow the surface dips extra
          transparent so the orb's node swarm (canvas, right behind the card)
          shows THROUGH it — the orb visibly consumes the card — then settles
          at readable glass with the frame's aura still bleeding through.
          Frame 1 matches the compact card's surface; the exit animates back. */}
      <motion.div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          backdropFilter: "blur(20px)",
          border:         "1px solid rgba(255,255,255,0.55)",
          borderRadius:   24,
        }}
        initial={grow
          ? { background: COMPACT_BG, boxShadow: COMPACT_SHADOW }
          : { background: GLASS_BG,   boxShadow: GLASS_SHADOW }}
        animate={grow
          ? { background: [COMPACT_BG, CONSUME_BG, GLASS_BG], boxShadow: GLASS_SHADOW,
              transition: {
                background: { duration: GROW_S * 1.6, times: [0, 0.45, 1], ease: "easeOut" },
                boxShadow:  { duration: GROW_S },
              } }
          : { background: GLASS_BG, boxShadow: GLASS_SHADOW }}
        exit={grow
          ? { background: COMPACT_BG, boxShadow: COMPACT_SHADOW, transition: { duration: SHRINK_S } }
          : undefined}
      >
        {/* Zone A — mirrors the compact carousel card (category + question). */}
        <div className="relative flex-shrink-0 px-6 pt-5">
          <motion.button
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 12, right: 12, width: 28, height: 28, background: "rgba(241,245,249,1)", border: "1px solid rgba(226,232,240,0.8)" }}
            initial={{ opacity: grow ? 0 : 1 }}
            animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
          >
            <X size={15} style={{ color: "rgba(100,116,139,0.8)" }} />
          </motion.button>

          <div className="text-xs font-medium mb-2" style={{ color: "rgba(59,130,246,0.8)" }}>
            {question.category ?? `Frage ${question.number}`}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="flex-1" style={{ color: "rgba(15,23,42,0.9)", fontSize: "14px", fontWeight: "bold" }}>
              {question.text}
            </p>
            {grow && (
              /* The compact card's info/edit icons, ghosted: fade out during
                 the grow, back in during the shrink — clean landings both ways.
                 They keep occupying layout so the question wraps identically. */
              <motion.div
                className="flex items-center gap-2 flex-shrink-0"
                style={{ pointerEvents: "none" }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0, transition: { duration: 0.25 } }}
                exit={{ opacity: 1, transition: { duration: 0.3 } }}
                aria-hidden
              >
                <div className="rounded-full p-2" style={{ background: "rgba(59,130,246,0.1)" }}>
                  <Info size={18} style={{ color: "rgba(59,130,246,0.8)" }} />
                </div>
                <Edit3 size={20} style={{ color: "rgba(59,130,246,0.6)" }} />
              </motion.div>
            )}
          </div>

          {/* Zone B (header part) — slim progress + context banner. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: grow ? 0.12 : 0.15, duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(59,130,246,0.1)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(question.number / question.total) * 100}%` }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                />
              </div>
              <div className="text-xs font-medium flex-shrink-0" style={{ color: "rgba(59,130,246,0.7)" }}>
                {question.number} / {question.total}
              </div>
            </div>

            {contextMessage && (
              <div
                className="mt-3 rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "rgba(30,64,175,0.9)" }}
              >
                {contextMessage}
              </div>
            )}
          </motion.div>
        </div>

        {/* Zone B (body) — answer area + Weiter. Plain flex-1, no separate
            max-height guess: it gets whatever's left after the header's real
            rendered height and scrolls internally only if the list doesn't fit. */}
        <motion.div
          className="flex-1 min-h-0 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: grow ? 0.08 : 0.15, duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <div className="flex-1 px-6 pt-3 overflow-y-auto flex flex-col">
            {isChoice && (
              <div className="space-y-2.5 pb-2">
                {aiProposed && selected && (
                  <p className="text-xs font-medium text-center pb-1" style={{ color: "rgba(217,119,6,0.8)" }}>
                    Ich habe diese Antwort gehört – ist das korrekt?
                  </p>
                )}
                {question.options.map((opt, optIdx) => {
                  const isSelected = selected === opt.id;
                  const isAmber = isSelected && aiProposed;
                  const isBlue  = isSelected && !aiProposed;
                  return (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: (grow ? 0.1 : 0.2) + optIdx * 0.05, duration: 0.25 } }}
                      className="w-full text-left rounded-2xl transition-all"
                      style={{
                        background: isAmber ? "rgba(254,243,199,0.8)" : isBlue ? "rgba(219,234,254,0.7)" : "rgba(255,255,255,0.7)",
                        border: isAmber
                          ? "2px solid rgba(217,119,6,0.7)"
                          : isBlue
                          ? "2px solid rgba(59,130,246,1)"
                          : "1px solid rgba(226,232,240,0.8)",
                        boxShadow: isAmber
                          ? "0 4px 16px rgba(217,119,6,0.15)"
                          : isBlue
                          ? "0 4px 16px rgba(59,130,246,0.15)"
                          : "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChoiceTap(opt)}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div
                          className="flex-shrink-0 rounded-full flex items-center justify-center"
                          style={{
                            width: 20, height: 20,
                            border: isAmber ? "2px solid rgba(217,119,6,0.7)" : isBlue ? "2px solid rgba(59,130,246,1)" : "2px solid rgba(148,163,184,0.5)",
                          }}
                        >
                          {isSelected && (
                            <motion.div
                              className="rounded-full"
                              style={{ width: 10, height: 10, background: isAmber ? "rgba(217,119,6,0.8)" : "rgba(59,130,246,1)" }}
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.18 }}
                            />
                          )}
                        </div>
                        <span className="text-sm" style={{ color: "rgba(15,23,42,0.85)" }}>{opt.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {(isNumber || isText) && (
              /* my-auto: centers the input group in the answer area's surplus
                 height; collapses to normal flow if content ever overflows. */
              <div className="space-y-3 pb-2 my-auto w-full">
                {aiProposed && inputValue !== "" && (
                  <p className="text-xs font-medium text-center pb-1" style={{ color: "rgba(217,119,6,0.8)" }}>
                    Ich habe diese Antwort gehört – ist das korrekt?
                  </p>
                )}
                {/* Hero input — the card's single answer element is the focal
                    point, not a bare form field (user decision 2026-07-22):
                    taller, centered, value in large type, € adornment for
                    euro amounts. Amber/error states live on this wrapper. */}
                <div
                  className="flex items-center rounded-2xl"
                  style={{
                    background: aiProposed && inputValue !== "" ? "rgba(254,243,199,0.6)" : "rgba(255,255,255,0.8)",
                    border: hasError
                      ? "2px solid rgba(239,68,68,1)"
                      : aiProposed && inputValue !== ""
                      ? "2px solid rgba(217,119,6,0.7)"
                      : "1px solid rgba(226,232,240,0.9)",
                    boxShadow: "0 2px 10px rgba(59,130,246,0.06)",
                  }}
                >
                  {isEuro && (
                    <span className="pl-4 text-lg font-semibold flex-shrink-0" style={{ color: "rgba(59,130,246,0.75)" }}>
                      €
                    </span>
                  )}
                  <input
                    type={isNumber ? "number" : "text"}
                    // The € prefix already says "Euro", so euro inputs get a short
                    // placeholder that fits the 300px card (the DB's full
                    // "Bitte Betrag in Euro eingeben..." would truncate).
                    placeholder={isEuro
                      ? "Betrag eingeben..."
                      : question.inputPlaceholder ?? (isNumber ? "Zahl eingeben..." : "Antwort eingeben...")}
                    value={inputValue}
                    min={isNumber ? 0 : undefined}
                    onChange={e => {
                      setAiProposed(false);
                      if (isNumber && parseInt(e.target.value, 10) < 0) return;
                      setInputValue(e.target.value);
                    }}
                    onWheel={e => isNumber && e.currentTarget.blur()}
                    // Placeholder at base size; typed value in large semibold.
                    className={`hero-number-input w-full px-4 py-3.5 rounded-2xl text-center ${inputValue ? "text-lg font-semibold" : "text-base"}`}
                    style={{
                      background: "transparent",
                      border:     "none",
                      color:      "rgba(15,23,42,0.9)",
                      outline:    "none",
                    }}
                  />
                  {isEuro && (
                    /* invisible balance twin so the centered value stays optically centered */
                    <span className="pr-4 text-lg font-semibold flex-shrink-0 opacity-0" aria-hidden>
                      €
                    </span>
                  )}
                </div>
                {(question.minValue !== undefined || question.maxValue !== undefined) && (
                  <div className="px-1 space-y-0.5" style={{ marginTop: 6 }}>
                    {question.minValue !== undefined && (
                      <p className="text-xs" style={{ color: "rgba(100,116,139,0.65)" }}>
                        {question.questionOrder === 19
                          ? `Entweder 0 (kein Sparplan) oder mind. ${formatValue(question.minValue, question.inputPlaceholder)}`
                          : `Mindestwert: ${formatValue(question.minValue, question.inputPlaceholder)}`}
                      </p>
                    )}
                    {question.maxValue !== undefined && (
                      <p className="text-xs" style={{ color: "rgba(100,116,139,0.65)" }}>
                        Höchstwert: {formatValue(question.maxValue, question.inputPlaceholder)}
                      </p>
                    )}
                  </div>
                )}
                {hasError && (
                  <p className="text-sm" style={{ color: "rgba(239,68,68,1)" }}>
                    {belowMin
                      ? question.questionOrder === 19
                        ? `Bitte 0 (kein Sparplan) oder mindestens €${question.minValue?.toLocaleString("de-AT")} eingeben`
                        : `Mindestwert ist ${question.minValue?.toLocaleString("de-AT")}`
                      : `Höchstwert ist ${question.maxValue?.toLocaleString("de-AT")}`}
                  </p>
                )}
                {/* Weiter flows directly under the input — not pinned to the
                    card bottom, so a tight card has no stretched dead space.
                    Choice questions still submit on the option tap itself
                    (boss request 2026-07-20) and render no button. */}
                <motion.button
                  className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{
                    marginTop: 16,
                    background: canSubmit ? "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)" : "rgba(148,163,184,0.3)",
                    color: canSubmit ? "white" : "rgba(100,116,139,0.5)",
                    boxShadow: canSubmit ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                  }}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  Weiter
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default ExpandedQuestionCard;

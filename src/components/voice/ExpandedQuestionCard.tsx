"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X, ArrowRight } from "lucide-react";
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
  question: ModalQuestion;
  onClose: () => void;
  onNext: (value: string) => void;
  preSelectedValue?: string;
  contextMessage?: string;
}

// The band the expanded card floats in: below the header zone, above the
// ControlBar, with visible air on both sides — the bar must stay fully
// visible and tappable while a card is open (boss feedback 2026-07-17; the
// previous vh*0.88 sizing covered it). The options area inside is plain
// flex-1/overflow-y-auto, so longer lists scroll internally at any height.
const TOP_MARGIN    = 72;  // header zone
const BAR_CLEARANCE = 124; // ControlBar ≈88px + gap so even the frame's spikes clear it
const BAND_PAD      = 12;

export function computeExpandedCardSize(vw: number, vh: number) {
  const width = vw >= 1024 ? 480 : vw >= 640 ? 440 : Math.min(Math.round(vw * 0.9), 380);
  const height = Math.max(320, vh - TOP_MARGIN - BAR_CLEARANCE - BAND_PAD * 2);
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

function formatValue(value: number, placeholder?: string): string {
  if (placeholder?.toLowerCase().includes("euro")) return `€ ${value.toLocaleString("de-AT")}`;
  return value.toLocaleString("de-AT");
}

export function ExpandedQuestionCard({
  rect,
  question,
  onClose,
  onNext,
  preSelectedValue,
  contextMessage,
}: ExpandedQuestionCardProps) {
  const isChoice = !question.questionType || question.questionType === "choice";
  const isNumber = question.questionType === "number";
  const isText   = question.questionType === "text";

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

  return (
    <motion.div
      className="fixed z-[56]"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      initial={{ opacity: 0, scale: 0.98 }}
      // Enter waits for the neural frame to mostly arrive; exit is fast and
      // immediate so the collapse morph plays out visibly BEHIND the card
      // rather than underneath a lingering white sheet (mirrors the Pecunai
      // 2.0 reference, where expanded content vanishes first and only then
      // the frame contracts back into the orb).
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.15 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
    >
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: Math.round(rect.w * 0.05),
          boxShadow: "0 20px 60px rgba(59,130,246,0.18), 0 4px 16px rgba(15,23,42,0.08)",
        }}
      >
        {/* Header */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium" style={{ color: "rgba(59,130,246,0.7)" }}>
                {question.number} / {question.total}
              </div>
              <motion.button
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: "rgba(241,245,249,1)", border: "1px solid rgba(226,232,240,0.8)" }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
              >
                <X size={16} style={{ color: "rgba(100,116,139,0.8)" }} />
              </motion.button>
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(59,130,246,0.1)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(question.number / question.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {contextMessage && (
              <div
                className="mb-3 rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "rgba(30,64,175,0.9)" }}
              >
                {contextMessage}
              </div>
            )}

            <h1 className="text-lg font-semibold" style={{ color: "rgba(15,23,42,0.9)" }}>
              {question.number}. {question.text}
            </h1>
          </div>

          {/* Answer area — plain flex-1, no separate max-height guess: it naturally gets
              whatever's left after the header/button's real rendered heights, and scrolls
              internally only if the options list doesn't fit in that space. */}
          <div className="flex-1 px-5 overflow-y-auto">
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
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.2 + optIdx * 0.05, duration: 0.25 } }}
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
              <div className="space-y-3 pb-2">
                {aiProposed && inputValue !== "" && (
                  <p className="text-xs font-medium text-center pb-1" style={{ color: "rgba(217,119,6,0.8)" }}>
                    Ich habe diese Antwort gehört – ist das korrekt?
                  </p>
                )}
                <input
                  type={isNumber ? "number" : "text"}
                  placeholder={question.inputPlaceholder ?? (isNumber ? "Zahl eingeben..." : "Antwort eingeben...")}
                  value={inputValue}
                  min={isNumber ? 0 : undefined}
                  onChange={e => {
                    setAiProposed(false);
                    if (isNumber && parseInt(e.target.value, 10) < 0) return;
                    setInputValue(e.target.value);
                  }}
                  onWheel={e => isNumber && e.currentTarget.blur()}
                  className="w-full px-4 py-3 rounded-2xl text-base"
                  style={{
                    background: aiProposed && inputValue !== "" ? "rgba(254,243,199,0.6)" : "rgba(255,255,255,0.7)",
                    border: hasError
                      ? "2px solid rgba(239,68,68,1)"
                      : aiProposed && inputValue !== ""
                      ? "2px solid rgba(217,119,6,0.7)"
                      : "1px solid rgba(226,232,240,0.8)",
                    color: "rgba(15,23,42,0.9)",
                    outline: "none",
                  }}
                />
                {question.minValue !== undefined && (
                  <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                    {question.questionOrder === 19
                      ? `Entweder 0 (kein Sparplan) oder mind. ${formatValue(question.minValue, question.inputPlaceholder)}`
                      : `Mindestwert: ${formatValue(question.minValue, question.inputPlaceholder)}`}
                  </p>
                )}
                {question.maxValue !== undefined && (
                  <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                    Höchstwert: {formatValue(question.maxValue, question.inputPlaceholder)}
                  </p>
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
              </div>
            )}
          </div>

          {/* Weiter button — number/text only. Choice questions submit on the option tap
              itself (boss request 2026-07-20), so no confirm button is rendered for them. */}
          {(isNumber || isText) && (
            <div className="flex-shrink-0 px-5 pb-4 pt-2">
              <motion.button
                className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  background: canSubmit ? "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)" : "rgba(148,163,184,0.3)",
                  color: canSubmit ? "white" : "rgba(100,116,139,0.5)",
                  boxShadow: canSubmit ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                }}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Weiter
                <ArrowRight size={18} />
              </motion.button>
            </div>
          )}
      </div>
    </motion.div>
  );
}

export default ExpandedQuestionCard;

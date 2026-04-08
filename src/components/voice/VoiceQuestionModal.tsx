"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface ModalQuestion {
  number:           number;
  total:            number;
  text:             string;
  options:          QuestionOption[];
  questionType?:    string;
  minValue?:        number;
  maxValue?:        number;
  inputPlaceholder?: string;
}

interface VoiceQuestionModalProps {
  question: ModalQuestion;
  onClose:  () => void;
  onNext:   (value: string) => void;
}

function formatValue(value: number, placeholder?: string): string {
  if (placeholder?.toLowerCase().includes("euro")) return `€ ${value.toLocaleString("de-AT")}`;
  return value.toLocaleString("de-AT");
}

export default function VoiceQuestionModal({ question, onClose, onNext }: VoiceQuestionModalProps) {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const isChoice = !question.questionType || question.questionType === "choice";
  const isNumber = question.questionType === "number";
  const isText   = question.questionType === "text";

  const numVal   = isNumber ? parseInt(inputValue, 10) : NaN;
  const belowMin = isNumber && question.minValue !== undefined && !isNaN(numVal) && numVal < question.minValue;
  const aboveMax = isNumber && question.maxValue !== undefined && !isNaN(numVal) && numVal > question.maxValue;
  const hasError = belowMin || aboveMax;

  const canSubmit = isChoice
    ? !!selected
    : isNumber
    ? inputValue !== "" && !isNaN(numVal) && numVal >= 0 && !hasError
    : inputValue.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onNext(isChoice ? selected! : inputValue);
  };

  const progress = question.number / question.total;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 30%, rgba(249,250,251,1) 100%)",
        }}
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Background ambient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-full h-96"
            style={{ top: 0, background: "radial-gradient(ellipse at top, rgba(59,130,246,0.12) 0%, transparent 60%)" }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Header */}
        <div className="relative z-10 w-full px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44, height: 44,
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
            >
              <ArrowLeft size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>

            <div className="text-sm font-medium" style={{ color: "rgba(59,130,246,0.7)" }}>
              {question.number} / {question.total}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(59,130,246,0.1)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(147,197,253,1) 100%)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question + answers */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pb-4 overflow-y-auto">
          <h1 className="text-xl font-semibold mb-6" style={{ color: "rgba(15,23,42,0.9)" }}>
            {question.number}. {question.text}
          </h1>

          {/* Choice options */}
          {isChoice && (
            <div className="space-y-3">
              {question.options.map(opt => (
                <motion.button
                  key={opt.id}
                  className="w-full text-left rounded-2xl transition-all"
                  style={{
                    background: selected === opt.id ? "rgba(219,234,254,0.7)" : "rgba(255,255,255,0.7)",
                    border: selected === opt.id
                      ? "2px solid rgba(59,130,246,1)"
                      : "1px solid rgba(226,232,240,0.8)",
                    backdropFilter: "blur(10px)",
                    boxShadow: selected === opt.id
                      ? "0 4px 16px rgba(59,130,246,0.15)"
                      : "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(opt.id)}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div
                      className="flex-shrink-0 rounded-full flex items-center justify-center"
                      style={{
                        width: 24, height: 24,
                        border: selected === opt.id
                          ? "2px solid rgba(59,130,246,1)"
                          : "2px solid rgba(148,163,184,0.5)",
                      }}
                    >
                      {selected === opt.id && (
                        <motion.div
                          className="rounded-full"
                          style={{ width: 12, height: 12, background: "rgba(59,130,246,1)" }}
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                    <span style={{ color: "rgba(15,23,42,0.85)" }}>{opt.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Number / text input */}
          {(isNumber || isText) && (
            <div className="space-y-3">
              <input
                type={isNumber ? "number" : "text"}
                placeholder={question.inputPlaceholder ?? (isNumber ? "Zahl eingeben..." : "Antwort eingeben...")}
                value={inputValue}
                min={isNumber ? 0 : undefined}
                onChange={e => {
                  if (isNumber && parseInt(e.target.value, 10) < 0) return;
                  setInputValue(e.target.value);
                }}
                onWheel={e => isNumber && e.currentTarget.blur()}
                className="w-full px-5 py-4 rounded-2xl text-base"
                style={{
                  background:     "rgba(255,255,255,0.7)",
                  border:         hasError ? "2px solid rgba(239,68,68,1)" : "1px solid rgba(226,232,240,0.8)",
                  backdropFilter: "blur(10px)",
                  boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
                  color:          "rgba(15,23,42,0.9)",
                  outline:        "none",
                }}
              />
              {question.minValue !== undefined && (
                <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                  Mindestwert: {formatValue(question.minValue, question.inputPlaceholder)}
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
                    ? `Mindestwert ist ${question.minValue?.toLocaleString("de-AT")}`
                    : `Höchstwert ist ${question.maxValue?.toLocaleString("de-AT")}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Weiter button */}
        <div className="relative z-10 px-6 pb-8">
          <motion.button
            className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
            style={{
              background: canSubmit
                ? "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)"
                : "rgba(148,163,184,0.3)",
              color:      canSubmit ? "white" : "rgba(100,116,139,0.5)",
              boxShadow:  canSubmit ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
            }}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Weiter
            <ArrowRight size={20} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

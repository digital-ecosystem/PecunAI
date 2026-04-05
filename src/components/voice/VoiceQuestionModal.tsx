"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface ModalQuestion {
  number: number;
  total: number;
  text: string;
  options: QuestionOption[];
  questionType?: string;
  minValue?: number;
  maxValue?: number;
  inputPlaceholder?: string;
}

interface VoiceQuestionModalProps {
  question: ModalQuestion;
  onClose: () => void;
  onNext: (selectedOption: string) => void;
}

function formatValue(value: number, placeholder?: string): string {
  if (placeholder?.toLowerCase().includes("euro")) {
    return `€ ${value.toLocaleString("de-AT")}`;
  }
  return value.toLocaleString("de-AT");
}

export default function VoiceQuestionModal({ question, onClose, onNext }: VoiceQuestionModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const progress = question.number / question.total;

  const isChoice = !question.questionType || question.questionType === "choice";
  const isNumber = question.questionType === "number";
  const isText   = question.questionType === "text";

  const numVal = isNumber ? parseInt(inputValue, 10) : NaN;
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

  return (
    <div
      style={{
        position:   "fixed",
        inset:       0,
        background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)",
        zIndex:      50,
        display:    "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "16px 20px 0",
      }}>
        <button
          onClick={onClose}
          style={{
            width:        40,
            height:       40,
            borderRadius: "50%",
            background:   "white",
            border:       "1px solid rgba(180,205,245,0.5)",
            boxShadow:    "0 2px 8px rgba(80,120,210,0.10)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            cursor:       "pointer",
          }}
        >
          <ArrowLeft size={16} color="#4f6ac0" strokeWidth={2.5} />
        </button>

        <span style={{ fontSize: 14, fontWeight: 600, color: "#4f6ac0" }}>
          {question.number} / {question.total}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 3, background: "#e0eaff", margin: "14px 0 0" }}>
        <div style={{
          height:     "100%",
          width:      `${progress * 100}%`,
          background: "linear-gradient(90deg, #4f46e5, #3b82f6)",
          borderRadius: "0 2px 2px 0",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* ── Question text ── */}
      <div style={{ padding: "28px 24px 20px" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a2a50", lineHeight: 1.4, margin: 0 }}>
          {question.number}. {question.text}
        </p>
      </div>

      {/* ── Answer area ── */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {isChoice && question.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:           14,
              padding:      "16px 18px",
              background:    selected === opt.id ? "#f0f4ff" : "white",
              border:        selected === opt.id ? "1.5px solid #4f46e5" : "1px solid rgba(180,205,245,0.55)",
              borderRadius:  12,
              cursor:        "pointer",
              textAlign:     "left",
              boxShadow:     "0 1px 4px rgba(60,100,210,0.06)",
              transition:    "border 0.15s, background 0.15s",
              width:         "100%",
            }}
          >
            <div style={{
              width:          20,
              height:         20,
              borderRadius:   "50%",
              border:         selected === opt.id ? "2px solid #4f46e5" : "1.5px solid #c8d8ef",
              background:     selected === opt.id ? "#4f46e5" : "white",
              flexShrink:     0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              transition:     "border 0.15s, background 0.15s",
            }}>
              {selected === opt.id && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "white" }} />
              )}
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#1a2a50" }}>{opt.label}</span>
          </button>
        ))}

        {(isNumber || isText) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type={isNumber ? "number" : "text"}
              value={inputValue}
              min={isNumber ? 0 : undefined}
              placeholder={question.inputPlaceholder ?? (isNumber ? "Zahl eingeben..." : "Antwort eingeben...")}
              onChange={e => {
                if (isNumber && parseInt(e.target.value, 10) < 0) return;
                setInputValue(e.target.value);
              }}
              onWheel={e => isNumber && e.currentTarget.blur()}
              style={{
                width:        "100%",
                padding:      "16px 18px",
                fontSize:      16,
                borderRadius:  12,
                border:        hasError ? "1.5px solid #ef4444" : "1px solid rgba(180,205,245,0.55)",
                background:    "white",
                boxShadow:     "0 1px 4px rgba(60,100,210,0.06)",
                outline:       "none",
                boxSizing:     "border-box",
              }}
            />
            {question.minValue !== undefined && (
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                Mindestwert: {formatValue(question.minValue, question.inputPlaceholder)}
              </p>
            )}
            {question.maxValue !== undefined && (
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                Höchstwert: {formatValue(question.maxValue, question.inputPlaceholder)}
              </p>
            )}
            {hasError && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                {belowMin
                  ? `Mindestwert ist ${question.minValue?.toLocaleString("de-AT")}`
                  : `Höchstwert ist ${question.maxValue?.toLocaleString("de-AT")}`}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Weiter button ── */}
      <div style={{ padding: "0 16px 28px" }}>
        <button
          onClick={handleSubmit}
          style={{
            width:          "100%",
            height:          56,
            borderRadius:    14,
            background:      canSubmit ? "#4f46e5" : "rgba(200,212,230,0.55)",
            color:           canSubmit ? "white" : "#a0b0c8",
            fontSize:        16,
            fontWeight:      600,
            border:          "none",
            cursor:          canSubmit ? "pointer" : "default",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            gap:              8,
            transition:      "background 0.2s, color 0.2s",
          }}
        >
          Weiter
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

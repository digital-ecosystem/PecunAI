"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send } from "lucide-react";
import { ChatMessage } from "@/hooks/useVoiceSession";
import { CarouselQuestion } from "./VoiceCarousel";

interface VoiceChatModalProps {
  isOpen:           boolean;
  onClose:          () => void;
  messages:         ChatMessage[];
  currentQuestion:  CarouselQuestion | null;
  onAnswerFromChat: (question: CarouselQuestion, value: string) => Promise<void>;
}

export default function VoiceChatModal({
  isOpen,
  onClose,
  messages,
  currentQuestion,
  onAnswerFromChat,
}: VoiceChatModalProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Determine if the current question still needs an answer in chat
  const lastMsg              = messages[messages.length - 1];
  const currentQIsAnswered   = lastMsg?.sender === "user" && lastMsg.questionId === currentQuestion?.id;
  const showAnswerArea       = !!currentQuestion && !currentQIsAnswered;
  const isChoiceQuestion     = showAnswerArea && (currentQuestion.options?.length ?? 0) > 0;
  const isOpenQuestion       = showAnswerArea && !isChoiceQuestion;

  const handleSendText = async () => {
    if (!inputValue.trim() || !currentQuestion) return;
    const val = inputValue.trim();
    setInputValue("");
    await onAnswerFromChat(currentQuestion, val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              height: "70vh",
              maxHeight: "600px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)",
              backdropFilter: "blur(20px)",
              borderTopLeftRadius: "32px",
              borderTopRightRadius: "32px",
              boxShadow: "0 -8px 32px rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderBottom: "none",
            }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(59,130,246,0.1)" }}
            >
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "rgba(30,58,138,0.9)" }}>
                  Chat mit PecunAI
                </h2>
                <p className="text-sm mt-1" style={{ color: "rgba(59,130,246,0.6)" }}>
                  Online und bereit zu helfen
                </p>
              </div>
              <motion.button
                className="flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                <X size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {messages.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: "rgba(59,130,246,0.4)" }}>
                  Das Gespräch erscheint hier, sobald es beginnt.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div
                        className="max-w-[80%] px-5 py-3 rounded-3xl"
                        style={{
                          background: msg.sender === "user"
                            ? "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)"
                            : "rgba(255,255,255,0.9)",
                          color:     msg.sender === "user" ? "white" : "rgba(30,58,138,0.9)",
                          border:    msg.sender === "ai" ? "1px solid rgba(59,130,246,0.15)" : "none",
                          boxShadow: msg.sender === "user" ? "0 4px 12px rgba(59,130,246,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className="text-xs mt-1" style={{ color: msg.sender === "user" ? "rgba(255,255,255,0.7)" : "rgba(59,130,246,0.5)" }}>
                          {msg.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Answer area */}
            <div
              className="flex-shrink-0 px-6 pb-5 pt-3"
              style={{ borderTop: "1px solid rgba(59,130,246,0.1)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)" }}
            >
              {/* Choice chips */}
              {isChoiceQuestion && (
                <div className="flex flex-wrap gap-2 pb-3">
                  {currentQuestion.options!.map(opt => (
                    <motion.button
                      key={opt.value ?? opt.label}
                      className="px-4 py-2 rounded-full text-sm font-medium"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        border:     "1px solid rgba(59,130,246,0.3)",
                        color:      "rgba(37,99,235,0.9)",
                        boxShadow:  "0 2px 6px rgba(59,130,246,0.1)",
                      }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onAnswerFromChat(currentQuestion, opt.value ?? opt.label)}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Text / number input */}
              {isOpenQuestion && (
                <div
                  className="flex items-center gap-3 px-5 py-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 2px 8px rgba(59,130,246,0.1)" }}
                >
                  <input
                    ref={inputRef}
                    type={currentQuestion.questionType === "number" ? "number" : "text"}
                    placeholder="Antwort eingeben..."
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "rgba(30,58,138,0.9)" }}
                  />
                  <motion.button
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 36, height: 36,
                      background: inputValue.trim()
                        ? "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.9) 100%)"
                        : "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.2)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendText}
                    disabled={!inputValue.trim()}
                  >
                    <Send size={16} style={{ color: inputValue.trim() ? "white" : "rgba(59,130,246,0.4)" }} />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

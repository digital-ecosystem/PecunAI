"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

interface Message {
  id:   string;
  role: "ai" | "user";
  text: string;
  time: string;
}

interface VoiceChatModalProps {
  onClose: () => void;
}

const now = () =>
  new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });

const INITIAL_MESSAGES: Message[] = [
  {
    id:   "1",
    role: "ai",
    text: "Hallo! Ich bin Pecunai, Ihr persönlicher Finanzassistent. Wie kann ich Ihnen heute helfen?",
    time: now(),
  },
];

export default function VoiceChatModal({ onClose }: VoiceChatModalProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input,    setInput]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text, time: now() };
    setMessages(m => [...m, userMsg]);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    /* ── Backdrop ───────────────────────────────────────────────── */
    <div
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:       0,
        background: "rgba(30,50,100,0.35)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        zIndex:      60,
        display:    "flex",
        alignItems: "flex-end",
      }}
    >
      {/* ── Sheet ───────────────────────────────────────────────── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:         "100%",
          height:        "68vh",
          background:    "white",
          borderRadius:  "22px 22px 0 0",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     "0 -8px 40px rgba(40,80,180,0.15)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{
          padding:        "18px 20px 14px",
          borderBottom:   "1px solid rgba(200,215,240,0.5)",
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "space-between",
          flexShrink:      0,
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1a2a50", marginBottom: 3 }}>
              Chat mit Pecunai
            </p>
            <p style={{ fontSize: 12, color: "#3b82f6" }}>
              Online und bereit zu helfen
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width:          32,
              height:         32,
              borderRadius:  "50%",
              border:        "1.5px solid rgba(180,205,245,0.6)",
              background:    "white",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              cursor:        "pointer",
              flexShrink:     0,
            }}
          >
            <X size={14} color="#94a3b8" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────────── */}
        <div style={{
          flex:      1,
          overflowY: "auto",
          padding:   "20px 16px",
          display:   "flex",
          flexDirection: "column",
          gap:        20,
        }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display:   "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth:      "60%",
                background:    msg.role === "ai" ? "white" : "#3b82f6",
                border:        msg.role === "ai" ? "1px solid rgba(180,205,245,0.5)" : "none",
                borderRadius:   msg.role === "ai"
                  ? "18px 18px 18px 4px"
                  : "18px 18px 4px 18px",
                padding:       "12px 16px 8px",
                boxShadow:     msg.role === "ai"
                  ? "0 2px 8px rgba(60,100,210,0.07)"
                  : "0 2px 12px rgba(59,130,246,0.35)",
              }}>
                <p style={{
                  fontSize:   14,
                  fontWeight: 500,
                  color:      msg.role === "ai" ? "#1a2a50" : "white",
                  lineHeight: 1.5,
                  margin:      0,
                }}>
                  {msg.text}
                </p>
                <p style={{
                  fontSize:   11,
                  color:      msg.role === "ai" ? "#93c5fd" : "rgba(255,255,255,0.65)",
                  marginTop:   5,
                  textAlign:  "right",
                }}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────── */}
        <div style={{
          padding:     "12px 16px",
          borderTop:   "1px solid rgba(200,215,240,0.5)",
          flexShrink:   0,
          display:     "flex",
          alignItems:  "center",
          gap:          10,
          background:  "white",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nachricht eingeben..."
            style={{
              flex:          1,
              height:         44,
              borderRadius:   22,
              border:        "1.5px solid rgba(180,205,245,0.55)",
              background:    "rgba(240,246,255,0.6)",
              padding:       "0 16px",
              fontSize:       14,
              color:         "#1a2a50",
              outline:       "none",
            }}
          />
          <button
            onClick={send}
            style={{
              width:          40,
              height:         40,
              borderRadius:  "50%",
              background:    input.trim() ? "#3b82f6" : "rgba(200,215,240,0.5)",
              border:        "none",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              cursor:        input.trim() ? "pointer" : "default",
              flexShrink:     0,
              transition:    "background 0.2s",
            }}
          >
            <Send size={16} color={input.trim() ? "white" : "#94a3b8"} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

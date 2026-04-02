"use client";

import { TrendingUp, DollarSign, PieChart, ArrowLeft } from "lucide-react";
import VoiceWaveform from "./VoiceWaveform";

export interface ExplainStat {
  label: string;
  value: number;   // 0–100
  color: string;
}

export interface ExplainFootnote {
  title: string;
  body: string;
  stats: ExplainStat[];
}

interface VoiceExplainOverlayProps {
  footnote: ExplainFootnote;
  questionCategory: string;
  questionText: string;
  analyserNode?: AnalyserNode | null;
  onClose: () => void;
  onFollowUp?: () => void;
}

export default function VoiceExplainOverlay({
  footnote,
  questionCategory,
  questionText,
  analyserNode,
  onClose,
  onFollowUp,
}: VoiceExplainOverlayProps) {
  return (
    <div
      onClick={onFollowUp}
      style={{
        position:      "fixed",
        inset:          0,
        background:    "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)",
        zIndex:         50,
        display:       "flex",
        flexDirection: "column",
        cursor:        "default",
      }}
    >
      {/* ── Back button ─────────────────────────────────────────── */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position:      "absolute",
          top:            20,
          left:           20,
          width:          40,
          height:         40,
          borderRadius:  "50%",
          background:    "white",
          border:        "1px solid rgba(180,205,245,0.5)",
          boxShadow:     "0 2px 8px rgba(80,120,210,0.10)",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          cursor:        "pointer",
          zIndex:         10,
        }}
      >
        <ArrowLeft size={16} color="#4f6ac0" strokeWidth={2.5} />
      </button>

      {/* ── Waveform section ────────────────────────────────────── */}
      <div style={{
        flex:           1,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:       0,
        padding:        "60px 0 24px",
      }}>
        <div style={{ width: "min(520px, 80%)" }}>
          <VoiceWaveform
            analyserNode={analyserNode}
            isActive={true}
            color="#3b82f6"
            height={130}
            barCount={64}
          />
        </div>
        <p style={{
          marginTop:     12,
          fontSize:      14,
          fontWeight:    600,
          color:         "#3b82f6",
          letterSpacing: "0.01em",
        }}>
          AI erklärt...
        </p>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{
        height:     2,
        background: "linear-gradient(90deg, transparent 0%, #3b82f6 20%, #4f46e5 50%, #3b82f6 80%, transparent 100%)",
        flexShrink:  0,
      }} />

      {/* ── Content section ─────────────────────────────────────── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          overflowY:  "auto",
          padding:    "20px 16px 80px",
          flexShrink:  0,
          maxHeight:  "60vh",
        }}
      >
        {/* ── Info card ─────────────────────────────────────────── */}
        <div style={{
          background:    "white",
          borderRadius:   16,
          padding:       "20px 20px 22px",
          boxShadow:     "0 4px 20px rgba(60,100,210,0.10), 0 1px 4px rgba(0,0,0,0.04)",
          marginBottom:   20,
        }}>
          {/* Icons row */}
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <TrendingUp size={22} color="#22c55e" strokeWidth={2} />
            <DollarSign size={22} color="#3b82f6" strokeWidth={2} />
            <PieChart   size={22} color="#a855f7" strokeWidth={2} />
          </div>

          {/* Title */}
          <p style={{ fontSize: 17, fontWeight: 700, color: "#1a2a50", marginBottom: 10 }}>
            {footnote.title}
          </p>

          {/* Body */}
          <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, marginBottom: 18 }}>
            {footnote.body}
          </p>

          {/* Stats bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {footnote.stats.map(stat => (
              <div key={stat.label}>
                <div style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  marginBottom:    5,
                }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{stat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>
                    {stat.value}%
                  </span>
                </div>
                <div style={{
                  height:       6,
                  background:   "rgba(200,215,240,0.4)",
                  borderRadius:  3,
                  overflow:     "hidden",
                }}>
                  <div style={{
                    height:       "100%",
                    width:        `${stat.value}%`,
                    background:    stat.color,
                    borderRadius:  3,
                    transition:   "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── IHRE FRAGE ────────────────────────────────────────── */}
        <div style={{ padding: "0 4px" }}>
          <p style={{
            fontSize:      10,
            fontWeight:    700,
            color:         "#94a3b8",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom:   10,
          }}>
            Ihre Frage
          </p>
          <div style={{
            background:    "white",
            borderRadius:   12,
            padding:       "14px 16px",
            boxShadow:     "0 2px 8px rgba(60,100,210,0.07)",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#4f6ac0", marginBottom: 5, letterSpacing: "0.04em" }}>
              {questionCategory}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2a50", lineHeight: 1.4 }}>
              {questionText}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer hint ─────────────────────────────────────────── */}
      <div style={{
        position:      "absolute",
        bottom:         20,
        left:            0,
        right:           0,
        textAlign:     "center",
        pointerEvents: "none",
      }}>
        <p style={{ fontSize: 12, color: "#94a3b8" }}>
          Tippen Sie irgendwo, um eine Nachfrage zu stellen
        </p>
      </div>
    </div>
  );
}

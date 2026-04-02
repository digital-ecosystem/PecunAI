"use client";

import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  /** Pass a live AnalyserNode to visualise real audio. Omit for simulated animation. */
  analyserNode?: AnalyserNode | null;
  /** When true the bars animate actively; when false they collapse to a subtle idle pulse. */
  isActive?: boolean;
  color?: string;
  height?: number;
  barCount?: number;
}

export default function VoiceWaveform({
  analyserNode,
  isActive = true,
  color = "#3b82f6",
  height = 120,
  barCount = 64,
}: VoiceWaveformProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const phaseRef     = useRef(0);
  const isActiveRef  = useRef(isActive);
  const analyserRef  = useRef(analyserNode);

  // Keep refs in sync with props without restarting the animation loop
  useEffect(() => { isActiveRef.current  = isActive;    }, [isActive]);
  useEffect(() => { analyserRef.current  = analyserNode ?? null; }, [analyserNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to its CSS pixel size (handles retina via devicePixelRatio)
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W  = canvas.width  / (window.devicePixelRatio || 1);
      const H  = canvas.height / (window.devicePixelRatio || 1);
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // ── Get amplitude data ─────────────────────────────────────
      let amplitudes: number[];

      if (analyserRef.current) {
        // Real audio path
        const fft  = analyserRef.current;
        const buf  = new Uint8Array(fft.frequencyBinCount);
        fft.getByteFrequencyData(buf);

        amplitudes = Array.from({ length: barCount }, (_, i) => {
          // Map bar index to frequency bin (focus on voice range ~80–3000 Hz)
          const t     = i / barCount;
          const index = Math.floor(t * t * buf.length * 0.6); // quadratic: more resolution at low freqs
          return buf[index] / 255;
        });
      } else if (isActiveRef.current) {
        // Simulated active speech
        phaseRef.current += 0.07;
        const t = phaseRef.current;
        amplitudes = Array.from({ length: barCount }, (_, i) => {
          const x = i / (barCount - 1);
          const envelope = Math.sin(x * Math.PI); // bell curve falloff at edges
          const wave =
            Math.abs(Math.sin(x * 9  + t * 1.8)) * 0.35 +
            Math.abs(Math.sin(x * 17 + t * 2.5)) * 0.25 +
            Math.abs(Math.sin(x * 5  + t * 1.1)) * 0.25 +
            Math.abs(Math.sin(x * 28 + t * 3.7)) * 0.15;
          return wave * envelope;
        });
      } else {
        // Idle pulse
        phaseRef.current += 0.025;
        const t = phaseRef.current;
        amplitudes = Array.from({ length: barCount }, (_, i) => {
          const x = i / (barCount - 1);
          const envelope = Math.sin(x * Math.PI);
          return (0.04 + Math.sin(t) * 0.02) * envelope;
        });
      }

      // ── Draw bars ──────────────────────────────────────────────
      const barW = Math.max(2, (W / barCount) * 0.55);
      const step = W / barCount;

      for (let i = 0; i < barCount; i++) {
        const amp    = amplitudes[i];
        const barH   = Math.max(2, amp * cy * 0.88);
        const x      = i * step + step / 2 - barW / 2;
        const alpha  = 0.45 + amp * 0.55;

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = color;

        // Top half
        roundRect(ctx, x, cy - barH, barW, barH);
        ctx.fill();

        // Bottom half (mirror)
        roundRect(ctx, x, cy, barW, barH);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [barCount]); // only restart loop if barCount changes

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

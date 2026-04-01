"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
type VoiceState = "idle" | "speaking" | "listening";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

// ─── Constants ───────────────────────────────────────────────────
const NODE_COUNT = 60;
const SPHERE_RADIUS = 1;
const CONNECTION_THRESHOLD = 0.85; // max distance between nodes to draw a line
const PERSPECTIVE = 2.8;

const COLORS: Record<VoiceState, string> = {
  idle: "#93c5fd",       // blue-300 — calm, muted
  speaking: "#4f46e5",   // indigo-600 — active AI
  listening: "#16a34a",  // green-600 — user input
};

const ROTATION_SPEED: Record<VoiceState, number> = {
  idle: 0.002,
  speaking: 0.006,
  listening: 0.004,
};

const GLOW_SIZE: Record<VoiceState, number> = {
  idle: 6,
  speaking: 18,
  listening: 12,
};

// ─── Fibonacci Sphere ────────────────────────────────────────────
// Evenly distributes N points across a sphere surface
function generateFibonacciSphere(n: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n);
    const phi = (2 * Math.PI * i) / goldenRatio;

    points.push({
      x: Math.sin(theta) * Math.cos(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(theta),
    });
  }

  return points;
}

// ─── Pre-compute connections ─────────────────────────────────────
// Find all pairs of nodes close enough to be connected
function computeConnections(points: Point3D[]): [number, number][] {
  const connections: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dz = points[i].z - points[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < CONNECTION_THRESHOLD) {
        connections.push([i, j]);
      }
    }
  }

  return connections;
}

// ─── Rotate a point ──────────────────────────────────────────────
function rotatePoint(p: Point3D, angleX: number, angleY: number): Point3D {
  // Rotate around Y axis
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  // Rotate around X axis
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

// ─── Project 3D → 2D ─────────────────────────────────────────────
function project(p: Point3D, scale: number, cx: number, cy: number): { x: number; y: number; opacity: number } {
  const z = p.z + PERSPECTIVE;
  const factor = PERSPECTIVE / z;

  return {
    x: cx + p.x * factor * scale,
    y: cy + p.y * factor * scale,
    opacity: 0.3 + ((p.z + SPHERE_RADIUS) / (2 * SPHERE_RADIUS)) * 0.7, // depth fade
  };
}

// ─── Main Component ───────────────────────────────────────────────
export default function SphereTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef({ x: 0.3, y: 0 });
  const stateRef = useRef<VoiceState>("idle");
  const pulseRef = useRef(0);

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  // Keep stateRef in sync with React state
  useEffect(() => {
    stateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate sphere geometry once
    const basePoints = generateFibonacciSphere(NODE_COUNT);
    const connections = computeConnections(basePoints);

    function draw() {
      if (!canvas || !ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.34;

      const state = stateRef.current;
      const color = COLORS[state];
      const speed = ROTATION_SPEED[state];
      const glowSize = GLOW_SIZE[state];

      // Advance rotation
      angleRef.current.y += speed;
      angleRef.current.x += speed * 0.4;

      // Pulse (breathing effect)
      pulseRef.current += state === "speaking" ? 0.06 : 0.02;
      const pulse = 1 + Math.sin(pulseRef.current) * (state === "speaking" ? 0.04 : 0.01);

      // Rotate all points
      const rotated = basePoints.map((p) =>
        rotatePoint(
          { x: p.x * pulse, y: p.y * pulse, z: p.z * pulse },
          angleRef.current.x,
          angleRef.current.y
        )
      );

      // Project all points to 2D
      const projected = rotated.map((p) => project(p, scale, cx, cy));

      // Clear
      ctx.clearRect(0, 0, W, H);

      // ── Background radial halo ───────────────────────────────────
      const haloRadius = scale * 1.05;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius);
      halo.addColorStop(0, color + "22");
      halo.addColorStop(0.5, color + "11");
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw connections ─────────────────────────────────────────
      for (const [i, j] of connections) {
        const a = projected[i];
        const b = projected[j];
        const avgOpacity = (a.opacity + b.opacity) / 2;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = avgOpacity * 0.3;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // ── Draw nodes — 3 layered passes for bloom glow ─────────────
      // Pass 1: large soft outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = glowSize * 2.5;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 + p.opacity * 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.opacity * 0.25;
        ctx.fill();
      }

      // Pass 2: medium glow
      ctx.shadowBlur = glowSize * 1.2;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 + p.opacity * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.opacity * 0.55;
        ctx.fill();
      }

      // Pass 3: sharp bright core
      ctx.shadowBlur = glowSize * 0.5;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + p.opacity * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = p.opacity * 0.85;
        ctx.fill();
      }

      // Reset
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const size = Math.min(window.innerWidth * 0.7, 500);
      canvas.width = size;
      canvas.height = size;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const statusLabel: Record<VoiceState, string> = {
    idle: "Bereit...",
    speaking: "PecunAI spricht",
    listening: "Listening...",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)" }}>

      {/* Title */}
      <h1 className="text-2xl font-bold text-indigo-600 tracking-wide">Vox.2 — Sphere Test</h1>

      {/* Sphere canvas */}
      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          style={{ borderRadius: "50%" }}
        />

        {/* Status label */}
        <p className="text-sm font-medium tracking-wide"
          style={{ color: COLORS[voiceState] }}>
          {statusLabel[voiceState]}
        </p>
      </div>

      {/* State controls */}
      <div className="flex gap-3">
        {(["idle", "speaking", "listening"] as VoiceState[]).map((state) => (
          <button
            key={state}
            onClick={() => setVoiceState(state)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: voiceState === state ? COLORS[state] : "#e0e7ff",
              color: voiceState === state ? "#fff" : "#4f46e5",
              boxShadow: voiceState === state ? `0 4px 14px ${COLORS[state]}66` : "none",
            }}
          >
            {state}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">Click the buttons to test voice states</p>
    </div>
  );
}

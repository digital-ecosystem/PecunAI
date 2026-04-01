"use client";

import { useEffect, useRef } from "react";

export type VoiceState = "idle" | "speaking" | "listening";

interface Point3D { x: number; y: number; z: number; }

const NODE_COUNT = 60;
const CONNECTION_THRESHOLD = 0.85;
const PERSPECTIVE = 2.8;

export const VOICE_COLORS: Record<VoiceState, string> = {
  idle: "#93c5fd",
  speaking: "#4f46e5",
  listening: "#16a34a",
};

const ROTATION_SPEED: Record<VoiceState, number> = {
  idle: 0.002,
  speaking: 0.006,
  listening: 0.004,
};


function generateFibonacciSphere(n: number): Point3D[] {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n);
    const phi = (2 * Math.PI * i) / goldenRatio;
    return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) };
  });
}

function computeConnections(points: Point3D[]): [number, number][] {
  const connections: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dz = points[i].z - points[j].z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < CONNECTION_THRESHOLD) connections.push([i, j]);
    }
  }
  return connections;
}

function rotatePoint(p: Point3D, ax: number, ay: number): Point3D {
  const cosY = Math.cos(ay), sinY = Math.sin(ay);
  const x1 = p.x * cosY - p.z * sinY, z1 = p.x * sinY + p.z * cosY;
  const cosX = Math.cos(ax), sinX = Math.sin(ax);
  return { x: x1, y: p.y * cosX - z1 * sinX, z: p.y * sinX + z1 * cosX };
}

function project(p: Point3D, scale: number, cx: number, cy: number) {
  const f = PERSPECTIVE / (p.z + PERSPECTIVE);
  return { x: cx + p.x * f * scale, y: cy + p.y * f * scale, opacity: 0.3 + ((p.z + 1) / 2) * 0.7 };
}

interface VoiceSphereProps {
  voiceState: VoiceState;
  size?: number;
}

export default function VoiceSphere({ voiceState, size = 300 }: VoiceSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef({ x: 0.3, y: 0 });
  const pulseRef = useRef(0);
  const stateRef = useRef<VoiceState>(voiceState);

  useEffect(() => { stateRef.current = voiceState; }, [voiceState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const basePoints = generateFibonacciSphere(NODE_COUNT);
    const connections = computeConnections(basePoints);

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
      const scale = Math.min(W, H) * 0.34;
      const state = stateRef.current;
      const color = VOICE_COLORS[state];

      angleRef.current.y += ROTATION_SPEED[state];
      angleRef.current.x += ROTATION_SPEED[state] * 0.4;
      pulseRef.current += state === "speaking" ? 0.06 : 0.02;
      const pulse = 1 + Math.sin(pulseRef.current) * (state === "speaking" ? 0.04 : 0.01);

      const rotated = basePoints.map(p => rotatePoint(
        { x: p.x * pulse, y: p.y * pulse, z: p.z * pulse },
        angleRef.current.x, angleRef.current.y
      ));
      const projected = rotated.map(p => project(p, scale, cx, cy));

      ctx.clearRect(0, 0, W, H);

      // Connections
      for (const [i, j] of connections) {
        const a = projected[i], b = projected[j];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = ((a.opacity + b.opacity) / 2) * 0.55;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // Nodes — solid filled dots, depth-scaled
      ctx.shadowBlur = 0;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8 + p.opacity * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35 + p.opacity * 0.65;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
    />
  );
}

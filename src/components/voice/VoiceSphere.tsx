"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface VoiceSphereProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
  analyserNode?: AnalyserNode | null;
  micAnalyserNode?: AnalyserNode | null;
}

// RGB colour sets: [primary, secondary]
const COLORS = {
  speaking:  { r: 59,  g: 130, b: 246, r2: 147, g2: 197, b2: 253 }, // blue
  listening: { r: 22,  g: 163, b: 74,  r2: 134, g2: 239, b2: 172 }, // green
  idle:      { r: 59,  g: 130, b: 246, r2: 147, g2: 197, b2: 253 }, // blue (default)
};

export default function VoiceSphere({
  isActive = false,
  isSpeaking = false,
  isListening = false,
  size = 240,
  analyserNode,
  micAnalyserNode,
}: VoiceSphereProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const animationRef   = useRef<number>(0);
  const dataArrayRef   = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined);

  // Keep props accessible inside animation loop without restarting it
  const isActiveRef    = useRef(isActive);
  const isSpeakingRef  = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const analyserRef    = useRef(analyserNode);
  const micAnalyserRef = useRef(micAnalyserNode);
  const colorRef       = useRef(COLORS.idle);

  useEffect(() => { isActiveRef.current    = isActive;                           }, [isActive]);
  useEffect(() => { isSpeakingRef.current  = isSpeaking;                         }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening;                         }, [isListening]);
  useEffect(() => { analyserRef.current    = analyserNode    ?? null;             }, [analyserNode]);
  useEffect(() => { micAnalyserRef.current = micAnalyserNode ?? null;             }, [micAnalyserNode]);
  useEffect(() => {
    colorRef.current = isListening ? COLORS.listening : COLORS.speaking;
  }, [isListening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.3;
    const nodeCount  = 80;

    const nodes: Array<{
      x: number; y: number; z: number;
      baseX: number; baseY: number; baseZ: number;
      energy: number;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      const phi   = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const x     = Math.cos(theta) * Math.sin(phi) * baseRadius;
      const y     = Math.sin(theta) * Math.sin(phi) * baseRadius;
      const z     = Math.cos(phi) * baseRadius;
      nodes.push({ x, y, z, baseX: x, baseY: y, baseZ: z, energy: 0 });
    }

    const connections: Array<[number, number]> = [];
    const maxDist = baseRadius * 0.8;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].baseX - nodes[j].baseX;
        const dy = nodes[i].baseY - nodes[j].baseY;
        const dz = nodes[i].baseZ - nodes[j].baseZ;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxDist) connections.push([i, j]);
      }
    }

    let time     = 0;
    let rotY     = 0;

    const project = (x: number, y: number, z: number) => {
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x1   = x * cosY - z * sinY;
      const z1   = x * sinY + z * cosY;
      const s    = 300 / (300 + z1);
      return { x: cx + x1 * s, y: cy + y * s, z: z1, scale: s };
    };

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      time += 0.016;
      rotY += 0.003;

      const speaking  = isSpeakingRef.current;
      const listening = isListeningRef.current;
      const active    = isActiveRef.current;
      const { r: cr, g: cg, b: cb, r2: cr2, g2: cg2, b2: cb2 } = colorRef.current;

      // Use mic analyser when listening, AI analyser when speaking
      const analyser = listening
        ? (micAnalyserRef.current ?? analyserRef.current)
        : analyserRef.current;

      let audioData: number[]  = [];
      let audioAvg             = 0;

      if ((speaking || listening) && analyser) {
        if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataArrayRef.current);
        audioData = Array.from(dataArrayRef.current);
        audioAvg  = audioData.reduce((sum, val) => sum + val, 0) / audioData.length / 255;
      }

      nodes.forEach((node, i) => {
        if ((speaking || listening) && audioData.length > 0) {
          const idx       = Math.floor((i / nodeCount) * audioData.length);
          const freq      = audioData[idx] / 255;
          const deform    = 1 + freq * 0.4;
          node.x = node.baseX * deform;
          node.y = node.baseY * deform;
          node.z = node.baseZ * deform;
          node.energy = freq * 0.7 + audioAvg * 0.3;
        } else if (speaking || listening) {
          // Simulated while waiting for real audio data
          const freq   = Math.sin(time * 8 + i * 0.3) * 0.5 + 0.5;
          const bass   = Math.sin(time * 3) * 0.5 + 0.5;
          const treble = Math.sin(time * 12 + i * 0.5) * 0.5 + 0.5;
          const mixed  = freq * 0.5 + bass * 0.3 + treble * 0.2;
          const deform = 1 + mixed * 0.35;
          node.x = node.baseX * deform;
          node.y = node.baseY * deform;
          node.z = node.baseZ * deform;
          node.energy = mixed * 0.8;
        } else if (active) {
          const pulse = 1 + Math.sin(time * 2) * 0.03;
          node.x = node.baseX * pulse;
          node.y = node.baseY * pulse;
          node.z = node.baseZ * pulse;
          node.energy = (Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5) * 0.3;
        } else {
          node.x = node.baseX;
          node.y = node.baseY;
          node.z = node.baseZ;
          node.energy = 0.1;
        }
      });

      const projected = nodes.map(n => ({ ...project(n.x, n.y, n.z), energy: n.energy }));
      const sorted    = projected.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);

      // Draw connections
      connections.forEach(([i, j]) => {
        const a = projected[i], b = projected[j];
        if (a.z > -200 && b.z > -200) {
          const avg  = (nodes[i].energy + nodes[j].energy) / 2;
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.1 + avg * 0.4})`;
          ctx.lineWidth   = 0.5 + avg * 1.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      sorted.forEach(({ x, y, z, scale, energy }) => {
        if (z > -200) {
          const ns      = (2 + energy * 3) * scale;
          const opacity = 0.3 + energy * 0.7;

          const grad = ctx.createRadialGradient(x, y, 0, x, y, ns * 2);
          grad.addColorStop(0,   `rgba(${cr}, ${cg}, ${cb}, ${opacity})`);
          grad.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${opacity * 0.3})`);
          grad.addColorStop(1,   `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, ns * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${cr2}, ${cg2}, ${cb2}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(x, y, ns, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [size]);

  const isAnimating = isSpeaking || isListening;
  const glowR = isListening ? 22  : 59;
  const glowG = isListening ? 163 : 130;
  const glowB = isListening ? 74  : 246;
  const glowR2 = isListening ? 134 : 147;
  const glowG2 = isListening ? 239 : 197;
  const glowB2 = isListening ? 172 : 253;

  const glowAnim = isAnimating
    ? { scale: [1, 1.4, 1],  opacity: [0.6, 1, 0.6] }
    : isActive
    ? { scale: [1, 1.2, 1],  opacity: [0.4, 0.7, 0.4] }
    : { scale: [1, 1, 1],    opacity: [0.3, 0.3, 0.3] };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${glowR}, ${glowG}, ${glowB}, 0.2) 0%, rgba(${glowR}, ${glowG}, ${glowB}, 0) 70%)`,
          filter: "blur(40px)",
        }}
        animate={glowAnim}
        transition={{ duration: isAnimating ? 0.3 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${glowR2}, ${glowG2}, ${glowB2}, 0.25) 0%, rgba(${glowR2}, ${glowG2}, ${glowB2}, 0) 60%)`,
          filter: "blur(25px)",
        }}
        animate={
          isAnimating ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } :
          isActive    ? { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] } :
                        { scale: [1, 1, 1], opacity: [0.2, 0.2, 0.2] }
        }
        transition={{ duration: isAnimating ? 0.8 : 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
      />

      

      <canvas ref={canvasRef} style={{ width: size, height: size }} className="relative z-10" />
    </div>
  );
}

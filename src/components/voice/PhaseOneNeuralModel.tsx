"use client";

import { useEffect, useRef } from "react";
import { SPHERE_NODE_COUNT, generateSphereNodes, projectSpherePoint } from "./sphereMath";
import { frameOutlineTargets, getFrameColors, type FrameRect } from "./frameMath";

/**
 * Persistent Phase 1 orb ⇄ cardFrame canvas — mounted once for the whole of
 * Phase 1 and never unmounted. It just retargets its shape/rect whenever
 * `shape`/`frameRect` change, easing from wherever it currently is toward the
 * new target. This mirrors how Pecunai 2.0's AISpeechModel actually works
 * (one persistent model, smoothly retargeted) rather than the one-shot
 * mount/unmount transition used for Phase 0 (SphereToFrameTransition), which
 * is fine for something that only ever plays once per session but proved
 * fragile for a feature that repeats many times in both directions — see
 * "Round 3" in private-documents/after-demo/PHASE_1_QUESTION_CARD_MORPH_PLAN.md
 * for the bugs that came from trying to stretch the one-shot design to do
 * this instead of building the reference's actual architecture.
 */

export type PhaseOneShape = "orb" | "cardFrame";

interface PhaseOneNeuralModelProps {
  shape: PhaseOneShape;
  /** Required when shape is "cardFrame". */
  frameRect: FrameRect | null;
  sphereCenter: { x: number; y: number };
  sphereRadius: number;
  isSpeaking: boolean;
  isListening: boolean;
  containerWidth: number;
  containerHeight: number;
}

const N = SPHERE_NODE_COUNT;
const MORPH_MS = 1150;
const WAVE_PAD = 82; // matches AnimatedFrame's own padding, for consistent spike reach

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeMorph(t: number) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3.2);
}

function defaultFrameRect(cw: number, ch: number): FrameRect {
  const w = Math.min(340, cw * 0.86);
  const h = Math.min(420, ch * 0.5);
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

type Point = { x: number; y: number };

export function PhaseOneNeuralModel({
  shape,
  frameRect,
  sphereCenter,
  sphereRadius,
  isSpeaking,
  isListening,
  containerWidth: cw,
  containerHeight: ch,
}: PhaseOneNeuralModelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shapeRef = useRef(shape);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);

  useEffect(() => { shapeRef.current = shape; }, [shape]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const basePositionsRef = useRef(generateSphereNodes(N, sphereRadius));
  const posRef = useRef<Point[]>([]);
  const fromRef = useRef<Point[]>([]);
  const toRef = useRef<Point[]>([]);
  const morphStartRef = useRef(0);
  const rotYRef = useRef(0.4);
  const rafRef = useRef(0);

  const orbTargetsNow = (): Point[] =>
    basePositionsRef.current.map(p => {
      const proj = projectSpherePoint(p.x, p.y, p.z, sphereCenter.x, sphereCenter.y, rotYRef.current);
      return { x: proj.x, y: proj.y };
    });

  const targetsFor = (s: PhaseOneShape, rect: FrameRect | null): Point[] =>
    s === "cardFrame" ? frameOutlineTargets(N, rect ?? defaultFrameRect(cw, ch), WAVE_PAD) : orbTargetsNow();

  // Initialize on mount — start already "settled" at the initial shape, no
  // morph plays on first paint.
  useEffect(() => {
    const initial = targetsFor(shape, frameRect);
    posRef.current = initial.map(p => ({ ...p }));
    fromRef.current = initial.map(p => ({ ...p }));
    toRef.current = initial.map(p => ({ ...p }));
    morphStartRef.current = performance.now() - MORPH_MS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retarget whenever the shape or frame rect changes — snapshot wherever the
  // nodes actually are right now as the new `from`, so this is smooth even if
  // it fires again before a previous morph finished. Never resets or cuts.
  useEffect(() => {
    if (posRef.current.length === 0) return; // mount effect above handles the first paint
    fromRef.current = posRef.current.map(p => ({ ...p }));
    toRef.current = targetsFor(shape, frameRect);
    morphStartRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, frameRect?.x, frameRect?.y, frameRect?.w, frameRect?.h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    let lastTs = 0;

    const loop = (ts: number) => {
      const dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
      lastTs = ts;

      if (posRef.current.length === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const currentShape = shapeRef.current;
      const isFrame = currentShape === "cardFrame";
      const listening = isListeningRef.current;
      const speaking = isSpeakingRef.current;

      // Keep rotating gently even while framed, so re-morphing back to an orb
      // never has to "wake up" a frozen rotation.
      rotYRef.current += dt * (isFrame ? 0.15 : 0.35);

      const t = clamp((ts - morphStartRef.current) / MORPH_MS, 0, 1);
      const morphT = easeMorph(t);

      // The frame target is a static rect between retarget events; the orb
      // target is recomputed every frame so it's always visibly alive/rotating,
      // never a frozen snapshot.
      const liveTo = isFrame ? toRef.current : orbTargetsNow();

      const colors = getFrameColors(listening);
      const activity = speaking ? 0.62 : listening ? 0.48 : 0.38;

      const pos = posRef.current;
      const from = fromRef.current;

      for (let i = 0; i < N; i++) {
        const bx = lerp(from[i].x, liveTo[i].x, morphT);
        const by = lerp(from[i].y, liveTo[i].y, morphT);

        const jitter = (isFrame ? 3 : 2) * (0.4 + activity * 0.9);
        pos[i] = {
          x: bx + Math.sin(ts * 0.002 + i * 0.6) * jitter,
          y: by + Math.cos(ts * 0.0023 + i * 0.5) * jitter,
        };
      }

      ctx.clearRect(0, 0, cw, ch);

      const connectionDist = isFrame ? (cw < 400 ? 70 : 80) : sphereRadius * 0.8;

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const alpha = 0.1 + activity * 0.18;
            ctx.strokeStyle = `rgba(${colors.lineColor}, ${alpha})`;
            ctx.lineWidth = 0.6 + activity * 0.6;
            ctx.beginPath();
            ctx.moveTo(pos[i].x, pos[i].y);
            ctx.lineTo(pos[j].x, pos[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of pos) {
        const nodeSize = 2 + activity * 1.6;
        const alpha = 0.45 + activity * 0.3;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, nodeSize * 2.2);
        gradient.addColorStop(0, `rgba(${colors.nodeLight}, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(${colors.nodeMid}, ${alpha * 0.5})`);
        gradient.addColorStop(0.7, `rgba(${colors.nodeDark}, ${alpha * 0.2})`);
        gradient.addColorStop(1, `rgba(${colors.nodeDarkest}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${colors.nodeCore}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cw, ch, sphereCenter.x, sphereCenter.y, sphereRadius]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" aria-hidden="true" />;
}

export default PhaseOneNeuralModel;

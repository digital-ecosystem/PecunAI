"use client";

import { useEffect, useRef } from "react";
import { SPHERE_NODE_COUNT, generateSphereNodes, projectSpherePoint } from "./sphereMath";
import { frameOutlineTargets, generateFrameSpikeNodes, getFrameColors, type FrameRect } from "./frameMath";

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
  /** AI output audio — drives the orb's FFT node deformation while speaking,
   *  exactly like VoiceSphere. Pass null while muted. */
  analyserNode?: AnalyserNode | null;
  /** Mic audio — used instead of analyserNode while listening (PTT). */
  micAnalyserNode?: AnalyserNode | null;
  /** Phase 0 → 1 handoff: when set at mount, the nodes start on this rect's
   *  frame outline (dense web at full strength) and collapse into the orb —
   *  the reverse of the intro's orb → document morph — instead of starting
   *  already settled. Read once at mount. */
  initialFrameRect?: FrameRect | null;
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

function smoothstep(edge0: number, edge1: number, x: number) {
  const s = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return s * s * (3 - 2 * s);
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
  analyserNode,
  micAnalyserNode,
  initialFrameRect,
  containerWidth: cw,
  containerHeight: ch,
}: PhaseOneNeuralModelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shapeRef = useRef(shape);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const analyserRef = useRef<AnalyserNode | null>(analyserNode ?? null);
  const micAnalyserRef = useRef<AnalyserNode | null>(micAnalyserNode ?? null);

  useEffect(() => { shapeRef.current = shape; }, [shape]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { analyserRef.current = analyserNode ?? null; }, [analyserNode]);
  useEffect(() => { micAnalyserRef.current = micAnalyserNode ?? null; }, [micAnalyserNode]);

  // sphereCenter can update per frame while the phase-1 layout slides in
  // (the shell live-tracks the wrapper's rect), so the draw loop reads it
  // through a ref — re-running the canvas-init effect on every centre change
  // would resize (and thereby clear) the canvas mid-animation.
  const sphereCenterRef = useRef(sphereCenter);
  useEffect(() => { sphereCenterRef.current = sphereCenter; }, [sphereCenter.x, sphereCenter.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio-reactive per-node state, mirroring VoiceSphere: `deforms` scales
  // each node's 3D base position radially by its FFT bin; `energies` drives
  // per-node line/node brightness so loud frequencies visibly spike.
  const audioDataRef = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined);
  const deformsRef = useRef(new Float32Array(N).fill(1));
  const energiesRef = useRef(new Float32Array(N));

  const basePositionsRef = useRef(generateSphereNodes(N, sphereRadius));
  const posRef = useRef<Point[]>([]);
  const fromRef = useRef<Point[]>([]);
  const toRef = useRef<Point[]>([]);
  const morphStartRef = useRef(0);
  const rotYRef = useRef(0.4);
  const rafRef = useRef(0);

  // The 80 morph nodes only sketch the frame's outline — far too sparse to
  // read as the dense woven web AnimatedFrame renders around Phase 0's
  // document. So the settled cardFrame state crossfades into the real
  // spike-cluster rendering (same generateFrameSpikeNodes math), exactly like
  // Phase 0 hands off from its morph to the resting AnimatedFrame.
  // mix: continuous 0 (orb) → 1 (cardFrame), advancing in lockstep with the
  // node flight so mid-morph reversals stay seamless.
  const mixRef = useRef(0);
  const mixFromRef = useRef(0);
  const mixToRef = useRef(0);
  // Last known card rect — the dense frame still needs it while dissolving
  // during a collapse, after the frameRect prop has already gone null.
  const lastFrameRectRef = useRef<FrameRect | null>(null);
  const denseTimeRef = useRef(0);

  const orbTargetsNow = (deforms?: Float32Array): Point[] =>
    basePositionsRef.current.map((p, i) => {
      const d = deforms ? deforms[i] : 1;
      const proj = projectSpherePoint(
        p.x * d, p.y * d, p.z * d,
        sphereCenterRef.current.x, sphereCenterRef.current.y,
        rotYRef.current
      );
      return { x: proj.x, y: proj.y };
    });

  const targetsFor = (s: PhaseOneShape, rect: FrameRect | null): Point[] =>
    s === "cardFrame" ? frameOutlineTargets(N, rect ?? defaultFrameRect(cw, ch), WAVE_PAD) : orbTargetsNow();

  // Initialize on mount — normally start already "settled" at the initial
  // shape (no morph on first paint). With initialFrameRect (Phase 0 → 1
  // handoff), start instead on that document's frame outline with the dense
  // web at full strength and play a collapse into the current shape — the
  // terms frame visibly becomes the Phase 1 orb.
  useEffect(() => {
    if (initialFrameRect) {
      const from = frameOutlineTargets(N, initialFrameRect, WAVE_PAD);
      posRef.current = from.map(p => ({ ...p }));
      fromRef.current = from.map(p => ({ ...p }));
      toRef.current = targetsFor(shape, frameRect);
      morphStartRef.current = performance.now();
      mixRef.current = 1;
      mixFromRef.current = 1;
      mixToRef.current = shape === "cardFrame" ? 1 : 0;
      lastFrameRectRef.current = initialFrameRect;
      return;
    }
    const initial = targetsFor(shape, frameRect);
    posRef.current = initial.map(p => ({ ...p }));
    fromRef.current = initial.map(p => ({ ...p }));
    toRef.current = initial.map(p => ({ ...p }));
    morphStartRef.current = performance.now() - MORPH_MS;
    const initialMix = shape === "cardFrame" ? 1 : 0;
    mixRef.current = initialMix;
    mixFromRef.current = initialMix;
    mixToRef.current = initialMix;
    if (frameRect) lastFrameRectRef.current = frameRect;
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
    mixFromRef.current = mixRef.current;
    mixToRef.current = shape === "cardFrame" ? 1 : 0;
    if (frameRect) lastFrameRectRef.current = frameRect;
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

      // Crossfade weights: the 80-node skeleton carries the flight; the dense
      // spike-cluster web takes over only as the shape settles into the frame
      // (mix 0.7 → 1), and dissolves first on the way back out.
      const mix = lerp(mixFromRef.current, mixToRef.current, morphT);
      mixRef.current = mix;
      const frameAlpha = smoothstep(0.7, 1, mix);
      const skeletonAlpha = 1 - frameAlpha;

      // Audio-reactive deform/energy — VoiceSphere's exact analyser handling,
      // so the orb spikes to the AI's real voice (or the mic during PTT), and
      // falls back to the same simulated waveform when no analyser is wired.
      const analyser = listening
        ? (micAnalyserRef.current ?? analyserRef.current)
        : analyserRef.current;
      const deforms = deformsRef.current;
      const energies = energiesRef.current;
      const time = ts * 0.001;

      let audioData: Uint8Array | null = null;
      let audioAvg = 0;
      if ((speaking || listening) && analyser) {
        if (!audioDataRef.current || audioDataRef.current.length !== analyser.frequencyBinCount) {
          audioDataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(audioDataRef.current);
        audioData = audioDataRef.current;
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i];
        audioAvg = sum / audioData.length / 255;
      }

      let energySum = 0;
      for (let i = 0; i < N; i++) {
        if (audioData) {
          const freq = audioData[Math.floor((i / N) * audioData.length)] / 255;
          deforms[i] = 1 + freq * 0.4;
          energies[i] = freq * 0.7 + audioAvg * 0.3;
        } else if (speaking || listening) {
          const freq   = Math.sin(time * 8 + i * 0.3) * 0.5 + 0.5;
          const bass   = Math.sin(time * 3) * 0.5 + 0.5;
          const treble = Math.sin(time * 12 + i * 0.5) * 0.5 + 0.5;
          const mixed  = freq * 0.5 + bass * 0.3 + treble * 0.2;
          deforms[i] = 1 + mixed * 0.35;
          energies[i] = mixed * 0.8;
        } else {
          deforms[i] = 1 + Math.sin(time * 2) * 0.03;
          energies[i] = (Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5) * 0.3;
        }
        energySum += energies[i];
      }
      const avgEnergy = energySum / N;

      // The frame target is a static rect between retarget events; the orb
      // target is recomputed every frame so it's always visibly alive/rotating,
      // never a frozen snapshot.
      const liveTo = isFrame ? toRef.current : orbTargetsNow(deforms);

      const colors = getFrameColors(listening);
      const activity = speaking ? 0.62 : listening ? 0.48 : 0.38;

      denseTimeRef.current += dt * (speaking ? 1.5 : listening ? 0.6 : 0.52);

      const pos = posRef.current;
      const from = fromRef.current;

      // Positions always advance (even while the skeleton is invisible at the
      // settled frame state) so a collapse retarget snapshots real outline
      // coordinates, not stale mid-flight ones.
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

      if (skeletonAlpha > 0.02) {
        // Breathing glow behind the orb (VoiceSphere renders this as blurred
        // divs) — swells with the voice, dies off as the shape leaves the orb.
        const orbGlowAlpha = (0.1 + avgEnergy * 0.22) * skeletonAlpha * (1 - mix);
        if (orbGlowAlpha > 0.01) {
          const { x: gcx, y: gcy } = sphereCenterRef.current;
          const gr = sphereRadius * (2.0 + avgEnergy * 0.9);
          const glow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gr);
          glow.addColorStop(0, `rgba(${colors.lineColor}, ${orbGlowAlpha})`);
          glow.addColorStop(0.6, `rgba(${colors.lineColor}, ${orbGlowAlpha * 0.4})`);
          glow.addColorStop(1, `rgba(${colors.lineColor}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
          ctx.fill();
        }

        const connectionDist = isFrame ? (cw < 400 ? 70 : 80) : sphereRadius * 0.8;

        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const dx = pos[i].x - pos[j].x;
            const dy = pos[i].y - pos[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDist) {
              const avg = (energies[i] + energies[j]) / 2;
              const alpha = (0.1 + avg * 0.4) * skeletonAlpha;
              ctx.strokeStyle = `rgba(${colors.lineColor}, ${alpha})`;
              ctx.lineWidth = 0.5 + avg * 1.5;
              ctx.beginPath();
              ctx.moveTo(pos[i].x, pos[i].y);
              ctx.lineTo(pos[j].x, pos[j].y);
              ctx.stroke();
            }
          }
        }

        for (let i = 0; i < N; i++) {
          const p = pos[i];
          const energy = energies[i];
          const nodeSize = 2 + energy * 3;
          const alpha = (0.3 + energy * 0.7) * skeletonAlpha;

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
      }

      // Dense resting frame — the exact spike-cluster rendering AnimatedFrame
      // uses around Phase 0/2 documents (same math, same connection rules,
      // same palette), offset from its pad-local coordinates to the card's
      // viewport rect.
      if (frameAlpha > 0.02 && lastFrameRectRef.current) {
        const rect = lastFrameRectRef.current;
        const denseNodes = generateFrameSpikeNodes({
          contentWidth: rect.w,
          contentHeight: rect.h,
          time: denseTimeRef.current,
          isSpeaking: speaking,
          isListening: listening,
          wavePad: WAVE_PAD,
        });
        const offX = rect.x - WAVE_PAD;
        const offY = rect.y - WAVE_PAD;

        // Soft pulsing aura matching AnimatedFrame's blurred glow layers —
        // the white card covers the centre, so this reads as an edge halo.
        const glowPulse = 0.42 + 0.14 * Math.sin(denseTimeRef.current * 1.7);
        ctx.save();
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.scale(rect.w / 2 + WAVE_PAD * 1.6, rect.h / 2 + WAVE_PAD * 1.6);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, `rgba(${colors.lineColor}, ${0.13 * glowPulse * frameAlpha})`);
        glow.addColorStop(0.62, `rgba(${colors.lineColor}, ${0.1 * glowPulse * frameAlpha})`);
        glow.addColorStop(1, `rgba(${colors.lineColor}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const maxNearbyNodes = rect.w < 400 ? 15 : 20;
        const maxConnectionDist = rect.w < 400 ? 70 : 80;
        const lineWidthMultiplier = rect.w < 400 ? 0.36 : 0.42;
        const nodeSizeMultiplier = rect.w < 400 ? 0.85 : 1;

        for (let i = 0; i < denseNodes.length; i++) {
          for (let j = i + 1; j < Math.min(i + maxNearbyNodes, denseNodes.length); j++) {
            const dx = denseNodes[i].x - denseNodes[j].x;
            const dy = denseNodes[i].y - denseNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxConnectionDist) {
              const avgEnergy = (denseNodes[i].energy + denseNodes[j].energy) / 2;
              const sameSpikeBonus = denseNodes[i].spikeIndex === denseNodes[j].spikeIndex ? 0.2 : 0;
              const alpha = (0.12 + avgEnergy * 0.2 + sameSpikeBonus) * frameAlpha;

              ctx.strokeStyle = `rgba(${colors.lineColor}, ${alpha})`;
              ctx.lineWidth = (0.8 + avgEnergy * 0.8) * lineWidthMultiplier;
              ctx.beginPath();
              ctx.moveTo(offX + denseNodes[i].x, offY + denseNodes[i].y);
              ctx.lineTo(offX + denseNodes[j].x, offY + denseNodes[j].y);
              ctx.stroke();
            }
          }
        }

        for (const node of denseNodes) {
          const x = offX + node.x;
          const y = offY + node.y;
          const nodeSize = (2 + node.energy * 1.5) * nodeSizeMultiplier;
          const alpha = (0.5 + node.energy * 0.3) * frameAlpha;

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize * 2);
          gradient.addColorStop(0, `rgba(${colors.nodeLight}, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(${colors.nodeMid}, ${alpha * 0.5})`);
          gradient.addColorStop(0.7, `rgba(${colors.nodeDark}, ${alpha * 0.2})`);
          gradient.addColorStop(1, `rgba(${colors.nodeDarkest}, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${colors.nodeCore}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // sphereCenter is deliberately absent: it's read via sphereCenterRef so
    // per-frame centre updates during the phase slide don't reset the canvas.
  }, [cw, ch, sphereRadius]);

  // z-[35]: above the phase-1 page content (which has no root-level z), but
  // below every overlay — chat backdrop (z-40), tap-to-start / sustainability
  // terms / explain overlay / chat sheet (all z-50) and the expanded answer
  // card (z-[56]). At the original z-[55] the sphere drew on top of all of
  // them; this was masked until Round 7 because orbOrigin used to stay null
  // (blank-sphere bug) whenever those overlays were up.
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[35]" aria-hidden="true" />;
}

export default PhaseOneNeuralModel;

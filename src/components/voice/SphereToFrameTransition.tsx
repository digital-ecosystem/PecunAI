"use client";

import { useEffect, useRef } from "react";
import { SPHERE_NODE_COUNT, generateSphereNodes, projectSpherePoint } from "./sphereMath";
import { frameOutlineTargets, generateFrameSpikeNodes, getFrameColors, type FrameRect } from "./frameMath";

/**
 * One-shot canvas transition: morphs a shared set of nodes between a live,
 * rotating sphere formation (matching VoiceSphere's own node layout and
 * projection) and a frame-perimeter formation (matching AnimatedFrame's
 * colour palette and organic spike style) wrapped around a document or
 * card rect.
 *
 * This does NOT replace VoiceSphere or AnimatedFrame — it is mounted only
 * for the handoff window between them, then unmounts. Steady-state
 * rendering of both components is untouched.
 *
 * Originally built for Phase 0's one-way, static-target entry transition
 * (orb → a document rect that never moves). Generalized for Phase 1's
 * question-card expand/collapse, which needs both directions (`direction`)
 * and a frame rect that itself slides/grows or shrinks during the morph
 * (`contentRectStart`) — Phase 0's call site is unaffected by either addition.
 */

interface SphereToFrameTransitionProps {
  /** "toFrame" (default): orb becomes the frame — Phase 0 entry, Phase 1 expand.
   *  "toOrb": frame becomes the orb again — Phase 1 collapse. */
  direction?: "toFrame" | "toOrb";
  /** Viewport-space centre of the sphere endpoint. */
  sphereCenter: { x: number; y: number };
  /** Matches VoiceSphere's baseRadius (size * 0.3) for the sphere it's replacing/becoming. */
  sphereRadius: number;
  /** The frame-side rect at the END of this transition's real time (t=1). */
  contentRect: FrameRect;
  /** The frame-side rect at the START of this transition's real time (t=0). Omit to keep the
   *  frame rect static at `contentRect` throughout — Phase 0's original one-shot behavior, where
   *  the target document never moves. Phase 1 passes both ends so the frame can grow/slide (expand)
   *  or shrink (collapse) in lockstep with the node morph itself. */
  contentRectStart?: FrameRect;
  /** Matches AnimatedFrame's WAVE_PAD, so spike reach lines up visually. */
  wavePad?: number;
  durationMs?: number;
  /** Fired once at ~80% progress — parent should start revealing the real target component. */
  onMostlyDone?: () => void;
  /** Fired once the morph fully completes — parent should unmount this component. */
  onComplete?: () => void;
}

const N = SPHERE_NODE_COUNT;
const MOSTLY_DONE_AT = 0.8;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpRect(a: FrameRect, b: FrameRect, t: number): FrameRect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const s = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return s * s * (3 - 2 * s);
}

// Same cubic ease-out used by the Pecunai 2.0 AISpeechModel reference — this
// is the specific curve that reads as "smooth" for this kind of shape morph.
function easeMorph(t: number) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3.2);
}

export function SphereToFrameTransition({
  direction = "toFrame",
  sphereCenter,
  sphereRadius,
  contentRect,
  contentRectStart,
  wavePad = 82,
  durationMs = 1200,
  onMostlyDone,
  onComplete,
}: SphereToFrameTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const mostlyDoneFiredRef = useRef(false);
  const completeFiredRef = useRef(false);

  // Keep the latest callbacks available without restarting the RAF loop.
  const onMostlyDoneRef = useRef(onMostlyDone);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onMostlyDoneRef.current = onMostlyDone; }, [onMostlyDone]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    // Sphere geometry is fixed base positions, generated once — only their
    // projection (rotation) changes per frame. Frame geometry is recomputed
    // every frame from the current interpolated rect, since (unlike Phase 0)
    // that rect can itself be sliding/growing/shrinking during the morph.
    const basePositions = generateSphereNodes(N, sphereRadius);
    const colors = getFrameColors(false);

    const rectFrom = contentRectStart ?? contentRect;
    const rectTo = contentRect;

    const sphereConnDist = sphereRadius * 0.8; // matches VoiceSphere's own maxDist
    const frameConnDistAt = (rect: FrameRect) => (rect.w < 400 ? 70 : 80); // matches AnimatedFrame's own maxConnectionDist

    let rotY = 0.4; // arbitrary pleasant starting tilt
    let lastTs = 0;
    const start = performance.now();

    const loop = (ts: number) => {
      const dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
      lastTs = ts;

      const elapsed = ts - start;
      const t = clamp(elapsed / durationMs, 0, 1);
      const rectT = easeMorph(t); // always chronological: rectFrom → rectTo over real time

      // shapeT: 0 = fully sphere, 1 = fully frame — regardless of direction, everything
      // downstream is written purely in terms of "how frame-like is the shape right now."
      const shapeT = direction === "toOrb" ? 1 - easeMorph(t) : easeMorph(t);

      // Rotation slows as the shape commits to the sphere-or-frame endpoint it's
      // heading toward — never fully stops until the morph is done, so neither
      // half ever looks frozen.
      rotY += dt * (0.9 - shapeT * 0.6);

      // The transition dissolves during its final stretch, overlapping with the
      // real target component fading in underneath (driven by onMostlyDone).
      const fadeOut = t > MOSTLY_DONE_AT ? 1 - (t - MOSTLY_DONE_AT) / (1 - MOSTLY_DONE_AT) : 1;

      const frameRectNow = lerpRect(rectFrom, rectTo, rectT);
      const frameTargetsNow = frameOutlineTargets(N, frameRectNow, wavePad);

      const connectionDist = lerp(sphereConnDist, frameConnDistAt(frameRectNow), shapeT);

      // The 80 flying nodes only sketch the frame's outline; the "consume"
      // feel comes from the dense spike-cluster web materializing around the
      // rect as the nodes land — the exact crossfade PhaseOneNeuralModel uses
      // for Phase 1's cards (same math, same 0.7→1 window), so both phases'
      // morphs read identically. The final handoff to the real AnimatedFrame
      // then crossfades between two matching dense webs.
      const denseAlphaRaw = smoothstep(0.7, 1, shapeT);
      const denseAlpha = denseAlphaRaw * fadeOut;
      const skeletonFade = (1 - denseAlphaRaw) * fadeOut;

      ctx.clearRect(0, 0, vw, vh);

      const points: Array<{ x: number; y: number; energy: number }> = new Array(N);

      for (let i = 0; i < N; i++) {
        const base = basePositions[i];
        const sp = projectSpherePoint(base.x, base.y, base.z, sphereCenter.x, sphereCenter.y, rotY);

        const target = frameTargetsNow[i];
        const wiggle = shapeT * 3;
        const tx = target.x + Math.sin(elapsed * 0.002 + i * 0.6) * wiggle;
        const ty = target.y + Math.cos(elapsed * 0.0023 + i * 0.5) * wiggle;

        const x = lerp(sp.x, tx, shapeT);
        const y = lerp(sp.y, ty, shapeT);

        const energy = 0.35 + 0.25 * Math.sin(elapsed * 0.003 + i * 0.4);

        points[i] = { x, y, energy };
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const avgEnergy = (points[i].energy + points[j].energy) / 2;
            const alpha = (0.1 + avgEnergy * 0.22) * skeletonFade;

            ctx.strokeStyle = `rgba(${colors.lineColor}, ${alpha})`;
            ctx.lineWidth = 0.6 + avgEnergy * 0.8;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        const nodeSize = 2 + p.energy * 2.2;
        const alpha = (0.45 + p.energy * 0.35) * skeletonFade;

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

      // Dense resting frame materializing — ported verbatim from
      // PhaseOneNeuralModel's cardFrame crossfade (the exact spike-cluster
      // rendering AnimatedFrame itself uses at steady state).
      if (denseAlpha > 0.02) {
        const denseTime = elapsed * 0.00052; // AnimatedFrame's idle time speed (0.52/s)
        const denseNodes = generateFrameSpikeNodes({
          contentWidth: frameRectNow.w,
          contentHeight: frameRectNow.h,
          time: denseTime,
          isSpeaking: false,
          isListening: false,
          wavePad,
        });
        const offX = frameRectNow.x - wavePad;
        const offY = frameRectNow.y - wavePad;

        // Soft pulsing aura matching AnimatedFrame's blurred glow layers.
        const glowPulse = 0.42 + 0.14 * Math.sin(denseTime * 1.7);
        ctx.save();
        ctx.translate(frameRectNow.x + frameRectNow.w / 2, frameRectNow.y + frameRectNow.h / 2);
        ctx.scale(frameRectNow.w / 2 + wavePad * 1.6, frameRectNow.h / 2 + wavePad * 1.6);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, `rgba(${colors.lineColor}, ${0.13 * glowPulse * denseAlpha})`);
        glow.addColorStop(0.62, `rgba(${colors.lineColor}, ${0.1 * glowPulse * denseAlpha})`);
        glow.addColorStop(1, `rgba(${colors.lineColor}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const maxNearbyNodes = frameRectNow.w < 400 ? 15 : 20;
        const maxConnectionDist = frameRectNow.w < 400 ? 70 : 80;
        const lineWidthMultiplier = frameRectNow.w < 400 ? 0.36 : 0.42;
        const nodeSizeMultiplier = frameRectNow.w < 400 ? 0.85 : 1;

        for (let i = 0; i < denseNodes.length; i++) {
          for (let j = i + 1; j < Math.min(i + maxNearbyNodes, denseNodes.length); j++) {
            const dx = denseNodes[i].x - denseNodes[j].x;
            const dy = denseNodes[i].y - denseNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxConnectionDist) {
              const avgEnergy = (denseNodes[i].energy + denseNodes[j].energy) / 2;
              const sameSpikeBonus = denseNodes[i].spikeIndex === denseNodes[j].spikeIndex ? 0.2 : 0;
              const alpha = (0.12 + avgEnergy * 0.2 + sameSpikeBonus) * denseAlpha;

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
          const alpha = (0.5 + node.energy * 0.3) * denseAlpha;

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

      if (!mostlyDoneFiredRef.current && t >= MOSTLY_DONE_AT) {
        mostlyDoneFiredRef.current = true;
        onMostlyDoneRef.current?.();
      }

      if (t >= 1) {
        if (!completeFiredRef.current) {
          completeFiredRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
    // sphereCenter/contentRect/contentRectStart are captured once at mount —
    // this is a one-shot transition driven by its own internal clock, not a
    // live-tracking visual. Each expand/collapse cycle mounts a fresh instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, sphereRadius, wavePad, durationMs]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true" />;
}

export default SphereToFrameTransition;

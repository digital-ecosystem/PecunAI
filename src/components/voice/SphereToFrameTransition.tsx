"use client";

import { useEffect, useRef } from "react";
import { SPHERE_NODE_COUNT, generateSphereNodes, projectSpherePoint } from "./sphereMath";
import { frameOutlineTargets, getFrameColors, type FrameRect } from "./frameMath";

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
            const alpha = (0.1 + avgEnergy * 0.22) * fadeOut;

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
        const alpha = (0.45 + p.energy * 0.35) * fadeOut;

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

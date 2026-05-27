"use client";

import { useRef, useEffect } from "react";

interface AnimatedFrameProps {
  isListening:    boolean;
  isSpeaking:     boolean;
  analyserNode?:  AnalyserNode | null;
  micAnalyserNode?: AnalyserNode | null;
  children:       React.ReactNode;
  contentWidth:   number;
  contentHeight:  number;
}

const WAVE_PAD     = 56;
const NODE_SPACING = 18;

const COLORS = {
  speaking:  { r: 59,  g: 130, b: 246, r2: 147, g2: 197, b2: 253 },
  listening: { r: 22,  g: 163, b: 74,  r2: 134, g2: 239, b2: 172 },
};

export function AnimatedFrame({
  isListening,
  isSpeaking,
  analyserNode,
  micAnalyserNode,
  children,
  contentWidth,
  contentHeight,
}: AnimatedFrameProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const contentRef      = useRef<HTMLDivElement>(null);
  const animRef         = useRef<number>(0);
  const isSpeakingRef   = useRef(isSpeaking);
  const isListeningRef  = useRef(isListening);
  const analyserRef     = useRef(analyserNode ?? null);
  const micAnalyserRef  = useRef(micAnalyserNode ?? null);
  const dataArrayRef    = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const colorRef        = useRef(COLORS.speaking);

  useEffect(() => { isSpeakingRef.current  = isSpeaking;  },  [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; },  [isListening]);
  useEffect(() => { analyserRef.current    = analyserNode    ?? null; }, [analyserNode]);
  useEffect(() => { micAnalyserRef.current = micAnalyserNode ?? null; }, [micAnalyserNode]);
  useEffect(() => {
    colorRef.current = isListening ? COLORS.listening : COLORS.speaking;
  }, [isListening]);

  const cornerRadius = Math.round(contentWidth * 0.04);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr     = window.devicePixelRatio || 1;
    const canvasW = contentWidth  + 2 * WAVE_PAD;
    const canvasH = contentHeight + 2 * WAVE_PAD;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.scale(dpr, dpr);

    const rng = (seed: number) => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    type Node = {
      baseX: number; baseY: number;
      x:     number; y:     number;
      normalX: number; normalY: number;
      phase:   number;
      energy:  number;
      depth:   number;
    };

    const nodes: Node[] = [];

    const pushNode = (
      bx: number, by: number,
      nX: number, nY: number,
      depth: number,
    ) => {
      const seed = nodes.length;
      nodes.push({
        baseX: bx, baseY: by, x: bx, y: by,
        normalX: nX, normalY: nY,
        phase:  seed * 0.42 + rng(seed + 1) * Math.PI,
        energy: 0,
        depth,
      });
    };

    // Three-layer border band per edge position + extra corner density
    const addEdge = (
      x1: number, y1: number,
      x2: number, y2: number,
      nX: number, nY: number,
    ) => {
      const len   = Math.hypot(x2 - x1, y2 - y1);
      const count = Math.max(3, Math.floor(len / NODE_SPACING));

      for (let i = 0; i <= count; i++) {
        const t = i / count;

        // Corner zone: double passes near each end
        const isCorner = i <= 1 || i >= count - 1;
        const passes   = isCorner ? 2 : 1;

        for (let p = 0; p < passes; p++) {
          const sid  = nodes.length;
          // Slight jitter along edge for second pass at corners
          const jt   = p === 0 ? 0 : (rng(sid + 7) - 0.5) * 0.35;
          const tc   = Math.max(0, Math.min(1, t + jt));
          const cx   = x1 + (x2 - x1) * tc;
          const cy   = y1 + (y2 - y1) * tc;

          // Layer 1 — inner: 2–6px inside the border
          const innerOff = 2 + rng(nodes.length) * 4;
          pushNode(
            WAVE_PAD + cx - nX * innerOff,
            WAVE_PAD + cy - nY * innerOff,
            nX, nY,
            0.1 + rng(nodes.length + 2) * 0.25,
          );

          // Layer 2 — border: right on the edge
          pushNode(
            WAVE_PAD + cx,
            WAVE_PAD + cy,
            nX, nY,
            0.55 + rng(nodes.length + 2) * 0.35,
          );

          // Layer 3 — outer: 0 to WAVE_PAD outside, creates aura bloom
          const outerOff = rng(nodes.length) * WAVE_PAD;
          pushNode(
            WAVE_PAD + cx + nX * outerOff,
            WAVE_PAD + cy + nY * outerOff,
            nX, nY,
            0.35 + rng(nodes.length + 2) * 0.45,
          );
        }
      }
    };

    addEdge(0,            0,             contentWidth,  0,             0,  -1);
    addEdge(contentWidth, 0,             contentWidth,  contentHeight, 1,   0);
    addEdge(contentWidth, contentHeight, 0,             contentHeight, 0,   1);
    addEdge(0,            contentHeight, 0,             0,            -1,   0);

    const maxDist = NODE_SPACING * 4.5;
    const connections: Array<[number, number]> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].baseX - nodes[j].baseX;
        const dy = nodes[i].baseY - nodes[j].baseY;
        if (Math.hypot(dx, dy) < maxDist) connections.push([i, j]);
      }
    }

    let curR  = 59,  curG  = 130, curB  = 246;
    let curR2 = 147, curG2 = 197, curB2 = 253;
    let time  = 0;

    const animate = () => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect && canvas) {
        canvas.style.left = `${rect.left - WAVE_PAD}px`;
        canvas.style.top  = `${rect.top  - WAVE_PAD}px`;
      }

      ctx.clearRect(0, 0, canvasW, canvasH);
      time += 0.016;

      const speaking  = isSpeakingRef.current;
      const listening = isListeningRef.current;
      const active    = speaking || listening;
      const { r: tr, g: tg, b: tb, r2: tr2, g2: tg2, b2: tb2 } = colorRef.current;

      const ls = 0.06;
      curR  += (tr  - curR)  * ls;  curG  += (tg  - curG)  * ls;  curB  += (tb  - curB)  * ls;
      curR2 += (tr2 - curR2) * ls;  curG2 += (tg2 - curG2) * ls;  curB2 += (tb2 - curB2) * ls;
      const r  = Math.round(curR),  g  = Math.round(curG),  b  = Math.round(curB);
      const r2 = Math.round(curR2), g2 = Math.round(curG2), b2 = Math.round(curB2);

      let audioData: number[] = [];
      let audioAvg            = 0;

      if (active) {
        const analyser = listening
          ? (micAnalyserRef.current ?? analyserRef.current)
          : analyserRef.current;

        if (analyser) {
          if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
          }
          analyser.getByteFrequencyData(dataArrayRef.current);
          audioData = Array.from(dataArrayRef.current);
          audioAvg  = audioData.reduce((s, v) => s + v, 0) / audioData.length / 255;
        }
      }

      nodes.forEach((node, i) => {
        if (active && audioData.length > 0) {
          const idx   = Math.floor((i / nodes.length) * audioData.length);
          const freq  = audioData[idx] / 255;
          node.energy = freq * 0.7 + audioAvg * 0.3;
        } else if (active) {
          const freq   = Math.sin(time * 8  + node.phase)       * 0.5 + 0.5;
          const bass   = Math.sin(time * 3  + i * 0.15)         * 0.5 + 0.5;
          const treble = Math.sin(time * 12 + node.phase * 1.4) * 0.5 + 0.5;
          node.energy  = (freq * 0.5 + bass * 0.3 + treble * 0.2) * 0.8;
        } else {
          const w1    = Math.sin(time * 6   + node.phase)       * 0.5 + 0.5;
          const w2    = Math.sin(time * 3.5 + node.phase * 1.3) * 0.5 + 0.5;
          const w3    = Math.sin(time * 9   + i * 0.22)         * 0.5 + 0.5;
          node.energy = w1 * 0.5 + w2 * 0.3 + w3 * 0.2;
        }
      });

      const dispScale = active ? 52 : 18;
      nodes.forEach(node => {
        node.x = node.baseX + node.normalX * node.energy * dispScale;
        node.y = node.baseY + node.normalY * node.energy * dispScale;
      });

      connections.forEach(([i, j]) => {
        const a   = nodes[i], bn = nodes[j];
        const avg = (a.energy + bn.energy) / 2;
        const op  = active ? 0.08 + avg * 0.5 : 0.03 + avg * 0.12;
        ctx.strokeStyle = `rgba(${r},${g},${b},${op})`;
        ctx.lineWidth   = 0.4 + avg * 1.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(bn.x, bn.y);
        ctx.stroke();
      });

      nodes.forEach(node => {
        const e     = node.energy;
        const scale = 0.5 + node.depth * 0.8;
        const ns    = (1.5 + e * 5.0) * scale;
        const op    = active
          ? (0.3 + e * 0.7)  * (0.4 + node.depth * 0.6)
          : (0.08 + e * 0.18) * (0.4 + node.depth * 0.4);
        const glowR = active ? ns * 3.5 : ns * 3;

        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
        grad.addColorStop(0,   `rgba(${r},${g},${b},${op})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${op * 0.4})`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r2},${g2},${b2},${op})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ns, 0, Math.PI * 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [contentWidth, contentHeight]);

  return (
    <div ref={contentRef} className="relative" style={{ width: contentWidth, height: contentHeight }}>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: cornerRadius, zIndex: 1, isolation: "isolate" }}
      >
        {children}
      </div>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: "fixed",
          width:    contentWidth  + 2 * WAVE_PAD,
          height:   contentHeight + 2 * WAVE_PAD,
          zIndex:   50,
        }}
      />
    </div>
  );
}

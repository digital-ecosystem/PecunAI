"use client";

import { useRef, useEffect, useState } from "react";

interface AnimatedFrameProps {
  isListening:    boolean;
  isSpeaking:     boolean;
  analyserNode?:  AnalyserNode | null;
  micAnalyserNode?: AnalyserNode | null;
  children:       React.ReactNode;
  contentWidth:   number;
  contentHeight:  number;
}

const WAVE_PAD     = 32;
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
  const [canvasRect, setCanvasRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
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

  useEffect(() => {
    const update = () => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCanvasRect({
        left:   rect.left   - WAVE_PAD,
        top:    rect.top    - WAVE_PAD,
        width:  rect.width  + 2 * WAVE_PAD,
        height: rect.height + 2 * WAVE_PAD,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);

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

    // Seeded-ish random using index so it's stable across re-renders
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
      depth:   number; // 0–1, affects size/opacity like sphere z-depth
    };

    const nodes: Node[] = [];

    const addEdge = (
      x1: number, y1: number,
      x2: number, y2: number,
      nX: number, nY: number,
    ) => {
      const len   = Math.hypot(x2 - x1, y2 - y1);
      const count = Math.max(2, Math.floor(len / NODE_SPACING));
      for (let i = 0; i <= count; i++) {
        const seed = nodes.length;
        // Random jitter along the edge (±30% of spacing)
        const jitter = (rng(seed) - 0.5) * NODE_SPACING * 0.6;
        const t  = Math.max(0, Math.min(1, i / count + jitter / len));
        // Random scatter perpendicular to edge: 0 to WAVE_PAD * 0.85
        const perpOffset = rng(seed + 0.5) * WAVE_PAD * 0.85;
        const bx = WAVE_PAD + x1 + (x2 - x1) * t + nX * perpOffset;
        const by = WAVE_PAD + y1 + (y2 - y1) * t + nY * perpOffset;
        nodes.push({
          baseX: bx, baseY: by, x: bx, y: by,
          normalX: nX, normalY: nY,
          phase: seed * 0.42 + t * Math.PI * 2 + rng(seed + 1) * Math.PI,
          energy: 0,
          depth: rng(seed + 2), // random depth for size/opacity variation
        });
      }
    };

    addEdge(0,            0,             contentWidth,  0,             0,  -1);
    addEdge(contentWidth, 0,             contentWidth,  contentHeight, 1,   0);
    addEdge(contentWidth, contentHeight, 0,             contentHeight, 0,   1);
    addEdge(0,            contentHeight, 0,             0,            -1,   0);

    // Wider connection threshold — lets nodes from different edges connect,
    // especially near corners, creating cross-web like the sphere
    const maxDist = NODE_SPACING * 4.5;
    const connections: Array<[number, number]> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].baseX - nodes[j].baseX;
        const dy = nodes[i].baseY - nodes[j].baseY;
        if (Math.hypot(dx, dy) < maxDist) connections.push([i, j]);
      }
    }

    // Smoothly lerped colour
    let curR  = 59,  curG  = 130, curB  = 246;
    let curR2 = 147, curG2 = 197, curB2 = 253;
    let time  = 0;

    const animate = () => {
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

      // ── Same audio energy logic as VoiceSphere ────────────────────
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
          // Real audio — raw frequency per node + overall volume, same as sphere
          const idx   = Math.floor((i / nodes.length) * audioData.length);
          const freq  = audioData[idx] / 255;
          node.energy = freq * 0.7 + audioAvg * 0.3;
        } else if (active) {
          // Simulated while waiting for first audio frame
          const freq   = Math.sin(time * 8  + node.phase)       * 0.5 + 0.5;
          const bass   = Math.sin(time * 3  + i * 0.15)         * 0.5 + 0.5;
          const treble = Math.sin(time * 12 + node.phase * 1.4) * 0.5 + 0.5;
          node.energy  = (freq * 0.5 + bass * 0.3 + treble * 0.2) * 0.8;
        } else {
          // Idle — looks like current speaking mode: high energy, staggered wave
          const w1    = Math.sin(time * 6   + node.phase)       * 0.5 + 0.5;
          const w2    = Math.sin(time * 3.5 + node.phase * 1.3) * 0.5 + 0.5;
          const w3    = Math.sin(time * 9   + i * 0.22)         * 0.5 + 0.5;
          node.energy = w1 * 0.5 + w2 * 0.3 + w3 * 0.2;
        }
      });

      // Idle uses same dispScale as active — it should move and look alive
      // Active cranked higher so real audio volume hits much harder
      const dispScale = active ? 48 : 22;
      nodes.forEach(node => {
        node.x = node.baseX + node.normalX * node.energy * dispScale;
        node.y = node.baseY + node.normalY * node.energy * dispScale;
      });

      // Draw connections
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

      // Draw nodes
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
      {/* PDF content — isolated stacking context so its internal z-indexes stay contained */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: cornerRadius, zIndex: 1, isolation: "isolate" }}
      >
        {children}
      </div>
      {/* Canvas rendered fixed so no parent overflow can clip it */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: "fixed",
          left:     canvasRect.left,
          top:      canvasRect.top,
          width:    canvasRect.width,
          height:   canvasRect.height,
          zIndex:   50,
        }}
      />
    </div>
  );
}

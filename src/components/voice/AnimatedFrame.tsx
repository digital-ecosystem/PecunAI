"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { generateFrameSpikeNodes, getFrameColors } from "./frameMath";

interface AnimatedFrameProps {
  isListening: boolean;
  isSpeaking: boolean;
  children: ReactNode;
  contentWidth: number;
  contentHeight: number;
}

export function AnimatedFrame({ isListening, isSpeaking, children, contentWidth, contentHeight }: AnimatedFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);

  const WAVE_PAD = 82;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasW = contentWidth + 2 * WAVE_PAD;
    const canvasH = contentHeight + 2 * WAVE_PAD;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let drawFrameId: number;
    let lastTime = Date.now();

    const generateSpikeNodes = () =>
      generateFrameSpikeNodes({
        contentWidth,
        contentHeight,
        time: timeRef.current,
        isSpeaking,
        isListening,
        wavePad: WAVE_PAD,
      });


    const drawFrame = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const speed = isSpeaking ? 1.5 : isListening ? 0.6 : 0.52;
      timeRef.current += delta * speed;

      ctx.clearRect(0, 0, canvasW, canvasH);

      const nodes = generateSpikeNodes();

      const maxNearbyNodes = contentWidth < 400 ? 15 : 20;
      const maxConnectionDist = contentWidth < 400 ? 70 : 80;

      // Green when user is speaking (listening), blue when AI is speaking or idle
      const { lineColor, nodeLight, nodeMid, nodeDark, nodeDarkest, nodeCore } = getFrameColors(isListening);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < Math.min(i + maxNearbyNodes, nodes.length); j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDist) {
            const avgEnergy = (nodes[i].energy + nodes[j].energy) / 2;
            const sameSpikeBonus = nodes[i].spikeIndex === nodes[j].spikeIndex ? 0.2 : 0;
            const alpha = (0.12 + avgEnergy * 0.2 + sameSpikeBonus);
            const lineWidthMultiplier = contentWidth < 400 ? 0.36 : 0.42;

            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.lineWidth = (0.8 + avgEnergy * 0.8) * lineWidthMultiplier;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      const nodeSizeMultiplier = contentWidth < 400 ? 0.85 : 1;
      nodes.forEach((node) => {
        const nodeSize = (2 + node.energy * 1.5) * nodeSizeMultiplier;
        const alpha = 0.5 + node.energy * 0.3;

        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 2);
        gradient.addColorStop(0, `rgba(${nodeLight}, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(${nodeMid}, ${alpha * 0.5})`);
        gradient.addColorStop(0.7, `rgba(${nodeDark}, ${alpha * 0.2})`);
        gradient.addColorStop(1, `rgba(${nodeDarkest}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${nodeCore}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      drawFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (drawFrameId) {
        cancelAnimationFrame(drawFrameId);
      }
    };
  }, [contentWidth, contentHeight, isListening, isSpeaking, WAVE_PAD]);

  const cornerRadius = Math.round(contentWidth * 0.04);
  const outerBlur = contentWidth < 400 ? 40 : 45;
  const innerBlur = contentWidth < 400 ? 28 : 30;

  return (
    <div
      className="relative"
      style={{ width: contentWidth, height: contentHeight }}
    >
      {/* Outer glow layer */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: -WAVE_PAD,
          top: -WAVE_PAD,
          width: contentWidth + 2 * WAVE_PAD,
          height: contentHeight + 2 * WAVE_PAD,
          background: isListening
            ? "radial-gradient(ellipse, rgba(34, 197, 94, 0.14) 0%, rgba(34, 197, 94, 0) 65%)"
            : "radial-gradient(ellipse, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 65%)",
          filter: `blur(${outerBlur}px)`,
        }}
        animate={isSpeaking ? {
          opacity: [0.58, 0.8, 0.58],
        } : isListening ? {
          opacity: [0.52, 0.82, 0.52],
        } : {
          opacity: [0.36, 0.52, 0.36],
        }}
        transition={{
          duration: isSpeaking ? 2.4 : isListening ? 1.8 : 3.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner glow layer */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: -WAVE_PAD,
          top: -WAVE_PAD,
          width: contentWidth + 2 * WAVE_PAD,
          height: contentHeight + 2 * WAVE_PAD,
          background: isListening
            ? "radial-gradient(ellipse, rgba(34, 197, 94, 0.18) 0%, rgba(34, 197, 94, 0) 55%)"
            : "radial-gradient(ellipse, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 55%)",
          filter: `blur(${innerBlur}px)`,
        }}
        animate={isSpeaking ? {
          opacity: [0.6, 0.82, 0.6],
        } : isListening ? {
          opacity: [0.55, 0.88, 0.55],
        } : {
          opacity: [0.28, 0.46, 0.28],
        }}
        transition={{
          duration: isSpeaking ? 2.2 : isListening ? 1.6 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.15,
        }}
      />

      {/* Neural network canvas — spikes only outside frame */}
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none m-[0px]"
        style={{
          left: -WAVE_PAD,
          top: -WAVE_PAD,
        }}
      />

      {/* Content */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: cornerRadius }}
      >
        {children}
      </div>
    </div>
  );
}

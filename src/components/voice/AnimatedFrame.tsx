"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface AnimatedFrameProps {
  isListening: boolean;
  isSpeaking: boolean;
  children: ReactNode;
  contentWidth: number;
  contentHeight: number;
}

interface SpikeNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  energy: number;
  spikeIndex: number;
  spikeGroup: number;
  depthRatio: number;
  edgeType: 'top' | 'right' | 'bottom' | 'left';
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

    const getActivity = () => {
      if (isSpeaking) return 0.62;
      if (isListening) return 0.48;
      return 0.38;
    };

    const edgeShapeBoost = (p: number) => {
      const cornerDistance = Math.min(p, 1 - p);
      const cornerBoost = Math.max(0, 1 - cornerDistance / 0.18);
      const middleBoost = Math.pow(Math.abs(Math.sin(p * Math.PI)), 1.35);
      return 0.82 + cornerBoost * 0.4 + middleBoost * 0.15;
    };

    const generateSpikeNodes = () => {
      const activity = getActivity();

      const baseAmp = contentWidth * (
        isSpeaking ? 0.074 :
        isListening ? 0.057 :
        0.049
      );

      const allNodes: SpikeNode[] = [];

      const pointsPerSpike = 5;
      const spikeInterval = contentWidth < 400 ? 5 : 4;

      const breathCycle = Math.sin(timeRef.current * 1.45);
      const group0Multiplier = breathCycle > 0 ? (0.72 + breathCycle * 0.32) : 0.72;
      const group1Multiplier = breathCycle < 0 ? (0.72 - breathCycle * 0.32) : 0.72;

      const createSpikeNodes = (
        baseX: number,
        baseY: number,
        spikeX: number,
        spikeY: number,
        energyWave: number,
        spikeIndex: number,
        spikeGroup: number,
        edgeType: 'top' | 'right' | 'bottom' | 'left'
      ) => {
        const dx = spikeX - baseX;
        const dy = spikeY - baseY;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        const normalX = -dy / length;
        const normalY = dx / length;

        for (let depth = 0; depth < pointsPerSpike; depth++) {
          const depthRatio = depth / (pointsPerSpike - 1);
          const sharpDepthRatio = Math.pow(depthRatio, 1.55);

          const waveAmount =
            Math.sin(
              spikeIndex * 0.85 +
              depth * 1.7 +
              timeRef.current * (isSpeaking ? 2.1 : isListening ? 1.45 : 1.15)
            ) *
            Math.sin(depthRatio * Math.PI) *
            (isSpeaking ? 5.2 : isListening ? 3.8 : 2.9);

          const nodeX = baseX + dx * sharpDepthRatio + normalX * waveAmount;
          const nodeY = baseY + dy * sharpDepthRatio + normalY * waveAmount;

          allNodes.push({
            x: nodeX,
            y: nodeY,
            baseX,
            baseY,
            energy: energyWave,
            spikeIndex,
            spikeGroup,
            depthRatio,
            edgeType
          });
        }
      };

      // Top edge
      for (let i = 0; i <= 50; i += 1) {
        const p = i / 50;
        const x = p * contentWidth;

        const edgeJitter = Math.sin(p * 40 * Math.PI + timeRef.current * 0.28) * (1.5 + activity * 3.1);
        const baseX = WAVE_PAD + x + edgeJitter;
        const baseY = WAVE_PAD + Math.sin(p * 18 * Math.PI + timeRef.current * 0.2) * (0.8 + activity * 1.9);

        const spikeGroup = Math.floor(p * 20) % 2;
        const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

        const primary = Math.sin(p * 10 * Math.PI + timeRef.current * 1.95);
        const secondary = Math.sin(p * 22 * Math.PI + timeRef.current * 1.32);
        const tertiary = Math.sin(p * 37 * Math.PI + timeRef.current * 1.58);

        const sharpPeak = Math.pow(Math.abs(Math.sin(p * 18 * Math.PI + timeRef.current * 0.82)), 2.7);
        const randomNeedle = Math.pow(Math.abs(Math.sin(p * 53 * Math.PI + timeRef.current * 0.62)), 4.2);
        const perimeterBoost = edgeShapeBoost(p);

        const wave =
          primary * amp +
          secondary * (amp * 0.5) +
          tertiary * (amp * 0.23);

        const morphFactor =
          perimeterBoost *
          (
            0.68 +
            activity * 0.22 +
            sharpPeak * (0.22 + activity * 0.36) +
            randomNeedle * (0.07 + activity * 0.36)
          );

        const angleOffset =
          Math.sin(p * 31 * Math.PI + timeRef.current * 1.05) *
          (contentWidth < 400 ? 9 : 13) *
          (0.34 + activity * 0.48 + sharpPeak * 0.24);

        const spikeX = WAVE_PAD + x + angleOffset;
        const spikeY = WAVE_PAD - Math.abs(wave) * morphFactor;

        const energyWave = (primary + 1) / 2;

        if (i % spikeInterval === 0) {
          createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, 'top');
        }
      }

      // Right edge
      for (let i = 0; i <= 80; i += 1) {
        const p = i / 80;
        const y = p * contentHeight;

        const edgeJitter = Math.sin(p * 46 * Math.PI + timeRef.current * 0.28) * (1.5 + activity * 3.1);
        const baseX = WAVE_PAD + contentWidth + Math.sin(p * 20 * Math.PI + timeRef.current * 0.2) * (0.8 + activity * 1.9);
        const baseY = WAVE_PAD + y + edgeJitter;

        const spikeGroup = Math.floor(p * 24) % 2;
        const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

        const primary = Math.sin(p * 12 * Math.PI + timeRef.current * 2.08);
        const secondary = Math.sin(p * 26 * Math.PI + timeRef.current * 1.45);
        const tertiary = Math.sin(p * 41 * Math.PI + timeRef.current * 1.72);

        const sharpPeak = Math.pow(Math.abs(Math.sin(p * 21 * Math.PI + timeRef.current * 0.9)), 2.7);
        const randomNeedle = Math.pow(Math.abs(Math.sin(p * 61 * Math.PI + timeRef.current * 0.68)), 4.2);
        const perimeterBoost = edgeShapeBoost(p);

        const wave =
          primary * amp +
          secondary * (amp * 0.5) +
          tertiary * (amp * 0.23);

        const morphFactor =
          perimeterBoost *
          (
            0.68 +
            activity * 0.22 +
            sharpPeak * (0.22 + activity * 0.36) +
            randomNeedle * (0.07 + activity * 0.36)
          );

        const angleOffset =
          Math.sin(p * 35 * Math.PI + timeRef.current * 1.12) *
          (contentWidth < 400 ? 9 : 13) *
          (0.34 + activity * 0.48 + sharpPeak * 0.24);

        const spikeX = WAVE_PAD + contentWidth + Math.abs(wave) * morphFactor;
        const spikeY = WAVE_PAD + y + angleOffset;

        const energyWave = (primary + 1) / 2;

        if (i % spikeInterval === 0) {
          createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, 'right');
        }
      }

      // Bottom edge
      for (let i = 50; i >= 0; i -= 1) {
        const p = i / 50;
        const x = p * contentWidth;

        const edgeJitter = Math.sin(p * 40 * Math.PI + timeRef.current * 0.28) * (1.5 + activity * 3.1);
        const baseX = WAVE_PAD + x + edgeJitter;
        const baseY = WAVE_PAD + contentHeight + Math.sin(p * 18 * Math.PI + timeRef.current * 0.2) * (0.8 + activity * 1.9);

        const spikeGroup = Math.floor(p * 20) % 2;
        const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

        const primary = Math.sin(p * 10 * Math.PI + timeRef.current * 2.18);
        const secondary = Math.sin(p * 22 * Math.PI + timeRef.current * 1.58);
        const tertiary = Math.sin(p * 37 * Math.PI + timeRef.current * 1.88);

        const sharpPeak = Math.pow(Math.abs(Math.sin(p * 18 * Math.PI + timeRef.current * 0.98)), 2.7);
        const randomNeedle = Math.pow(Math.abs(Math.sin(p * 53 * Math.PI + timeRef.current * 0.75)), 4.2);
        const perimeterBoost = edgeShapeBoost(p);

        const wave =
          primary * amp +
          secondary * (amp * 0.5) +
          tertiary * (amp * 0.23);

        const morphFactor =
          perimeterBoost *
          (
            0.68 +
            activity * 0.22 +
            sharpPeak * (0.22 + activity * 0.36) +
            randomNeedle * (0.07 + activity * 0.36)
          );

        const angleOffset =
          Math.sin(p * 31 * Math.PI + timeRef.current * 1.22) *
          (contentWidth < 400 ? 9 : 13) *
          (0.34 + activity * 0.48 + sharpPeak * 0.24);

        const spikeX = WAVE_PAD + x + angleOffset;
        const spikeY = WAVE_PAD + contentHeight + Math.abs(wave) * morphFactor;

        const energyWave = (primary + 1) / 2;

        if (i % spikeInterval === 0) {
          createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, 'bottom');
        }
      }

      // Left edge
      for (let i = 80; i >= 0; i -= 1) {
        const p = i / 80;
        const y = p * contentHeight;

        const edgeJitter = Math.sin(p * 46 * Math.PI + timeRef.current * 0.28) * (1.5 + activity * 3.1);
        const baseX = WAVE_PAD + Math.sin(p * 20 * Math.PI + timeRef.current * 0.2) * (0.8 + activity * 1.9);
        const baseY = WAVE_PAD + y + edgeJitter;

        const spikeGroup = Math.floor(p * 24) % 2;
        const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

        const primary = Math.sin(p * 12 * Math.PI + timeRef.current * 2.28);
        const secondary = Math.sin(p * 26 * Math.PI + timeRef.current * 1.72);
        const tertiary = Math.sin(p * 41 * Math.PI + timeRef.current * 2.0);

        const sharpPeak = Math.pow(Math.abs(Math.sin(p * 21 * Math.PI + timeRef.current * 1.02)), 2.7);
        const randomNeedle = Math.pow(Math.abs(Math.sin(p * 61 * Math.PI + timeRef.current * 0.82)), 4.2);
        const perimeterBoost = edgeShapeBoost(p);

        const wave =
          primary * amp +
          secondary * (amp * 0.5) +
          tertiary * (amp * 0.23);

        const morphFactor =
          perimeterBoost *
          (
            0.68 +
            activity * 0.22 +
            sharpPeak * (0.22 + activity * 0.36) +
            randomNeedle * (0.07 + activity * 0.36)
          );

        const angleOffset =
          Math.sin(p * 35 * Math.PI + timeRef.current * 1.3) *
          (contentWidth < 400 ? 9 : 13) *
          (0.34 + activity * 0.48 + sharpPeak * 0.24);

        const spikeX = WAVE_PAD - Math.abs(wave) * morphFactor;
        const spikeY = WAVE_PAD + y + angleOffset;

        const energyWave = (primary + 1) / 2;

        if (i % spikeInterval === 0) {
          createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, 'left');
        }
      }

      return allNodes;
    };

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

            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
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
        gradient.addColorStop(0, `rgba(147, 197, 253, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(59, 130, 246, ${alpha * 0.5})`);
        gradient.addColorStop(0.7, `rgba(37, 99, 235, ${alpha * 0.2})`);
        gradient.addColorStop(1, "rgba(29, 78, 216, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(191, 219, 254, ${alpha})`;
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
          background: "radial-gradient(ellipse, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 65%)",
          filter: `blur(${outerBlur}px)`,
        }}
        animate={isSpeaking ? {
          opacity: [0.58, 0.8, 0.58],
        } : isListening ? {
          opacity: [0.48, 0.72, 0.48],
        } : {
          opacity: [0.36, 0.52, 0.36],
        }}
        transition={{
          duration: isSpeaking ? 2.4 : isListening ? 2.8 : 3.4,
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
          background: "radial-gradient(ellipse, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 55%)",
          filter: `blur(${innerBlur}px)`,
        }}
        animate={isSpeaking ? {
          opacity: [0.6, 0.82, 0.6],
        } : isListening ? {
          opacity: [0.48, 0.74, 0.48],
        } : {
          opacity: [0.28, 0.46, 0.28],
        }}
        transition={{
          duration: isSpeaking ? 2.2 : isListening ? 2.6 : 3.5,
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

/**
 * Pure math extracted from AnimatedFrame.tsx — perimeter spike-node
 * generation, the edge shape-boost curve, and the colour palette.
 * AnimatedFrame.tsx imports these directly (same formulas, same output,
 * just relocated). SphereToFrameTransition.tsx reuses edgeShapeBoost and
 * the colour palette for `frameOutlineTargets`, a lighter fixed-count
 * perimeter sampler used only for the morph — not the full spike-cluster
 * density AnimatedFrame renders at steady state.
 */

export interface SpikeNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  energy: number;
  spikeIndex: number;
  spikeGroup: number;
  depthRatio: number;
  edgeType: "top" | "right" | "bottom" | "left";
}

export function getFrameActivity(isSpeaking: boolean, isListening: boolean): number {
  if (isSpeaking) return 0.62;
  if (isListening) return 0.48;
  return 0.38;
}

export function edgeShapeBoost(p: number): number {
  const cornerDistance = Math.min(p, 1 - p);
  const cornerBoost = Math.max(0, 1 - cornerDistance / 0.18);
  const middleBoost = Math.pow(Math.abs(Math.sin(p * Math.PI)), 1.35);
  return 0.82 + cornerBoost * 0.4 + middleBoost * 0.15;
}

export interface FrameColors {
  lineColor: string;
  nodeLight: string;
  nodeMid: string;
  nodeDark: string;
  nodeDarkest: string;
  nodeCore: string;
}

export function getFrameColors(isListening: boolean): FrameColors {
  return isListening
    ? {
        lineColor:   "34, 197, 94",
        nodeLight:   "134, 239, 172",
        nodeMid:     "34, 197, 94",
        nodeDark:    "22, 163, 74",
        nodeDarkest: "21, 128, 61",
        nodeCore:    "187, 247, 208",
      }
    : {
        lineColor:   "59, 130, 246",
        nodeLight:   "147, 197, 253",
        nodeMid:     "59, 130, 246",
        nodeDark:    "37, 99, 235",
        nodeDarkest: "29, 78, 216",
        nodeCore:    "191, 219, 254",
      };
}

interface GenerateFrameSpikeNodesParams {
  contentWidth: number;
  contentHeight: number;
  time: number;
  isSpeaking: boolean;
  isListening: boolean;
  wavePad: number;
}

export function generateFrameSpikeNodes({
  contentWidth,
  contentHeight,
  time,
  isSpeaking,
  isListening,
  wavePad: WAVE_PAD,
}: GenerateFrameSpikeNodesParams): SpikeNode[] {
  const activity = getFrameActivity(isSpeaking, isListening);

  const baseAmp = contentWidth * (
    isSpeaking ? 0.074 :
    isListening ? 0.057 :
    0.049
  );

  const allNodes: SpikeNode[] = [];

  const pointsPerSpike = 5;
  const spikeInterval = contentWidth < 400 ? 5 : 4;

  const breathCycle = Math.sin(time * 1.45);
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
    edgeType: "top" | "right" | "bottom" | "left",
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
          time * (isSpeaking ? 2.1 : isListening ? 1.45 : 1.15)
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
        edgeType,
      });
    }
  };

  // Top edge
  for (let i = 0; i <= 50; i += 1) {
    const p = i / 50;
    const x = p * contentWidth;

    const edgeJitter = Math.sin(p * 40 * Math.PI + time * 0.28) * (1.5 + activity * 3.1);
    const baseX = WAVE_PAD + x + edgeJitter;
    const baseY = WAVE_PAD + Math.sin(p * 18 * Math.PI + time * 0.2) * (0.8 + activity * 1.9);

    const spikeGroup = Math.floor(p * 20) % 2;
    const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

    const primary = Math.sin(p * 10 * Math.PI + time * 1.95);
    const secondary = Math.sin(p * 22 * Math.PI + time * 1.32);
    const tertiary = Math.sin(p * 37 * Math.PI + time * 1.58);

    const sharpPeak = Math.pow(Math.abs(Math.sin(p * 18 * Math.PI + time * 0.82)), 2.7);
    const randomNeedle = Math.pow(Math.abs(Math.sin(p * 53 * Math.PI + time * 0.62)), 4.2);
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
      Math.sin(p * 31 * Math.PI + time * 1.05) *
      (contentWidth < 400 ? 9 : 13) *
      (0.34 + activity * 0.48 + sharpPeak * 0.24);

    const spikeX = WAVE_PAD + x + angleOffset;
    const spikeY = WAVE_PAD - Math.abs(wave) * morphFactor;

    const energyWave = (primary + 1) / 2;

    if (i % spikeInterval === 0) {
      createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, "top");
    }
  }

  // Right edge
  for (let i = 0; i <= 80; i += 1) {
    const p = i / 80;
    const y = p * contentHeight;

    const edgeJitter = Math.sin(p * 46 * Math.PI + time * 0.28) * (1.5 + activity * 3.1);
    const baseX = WAVE_PAD + contentWidth + Math.sin(p * 20 * Math.PI + time * 0.2) * (0.8 + activity * 1.9);
    const baseY = WAVE_PAD + y + edgeJitter;

    const spikeGroup = Math.floor(p * 24) % 2;
    const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

    const primary = Math.sin(p * 12 * Math.PI + time * 2.08);
    const secondary = Math.sin(p * 26 * Math.PI + time * 1.45);
    const tertiary = Math.sin(p * 41 * Math.PI + time * 1.72);

    const sharpPeak = Math.pow(Math.abs(Math.sin(p * 21 * Math.PI + time * 0.9)), 2.7);
    const randomNeedle = Math.pow(Math.abs(Math.sin(p * 61 * Math.PI + time * 0.68)), 4.2);
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
      Math.sin(p * 35 * Math.PI + time * 1.12) *
      (contentWidth < 400 ? 9 : 13) *
      (0.34 + activity * 0.48 + sharpPeak * 0.24);

    const spikeX = WAVE_PAD + contentWidth + Math.abs(wave) * morphFactor;
    const spikeY = WAVE_PAD + y + angleOffset;

    const energyWave = (primary + 1) / 2;

    if (i % spikeInterval === 0) {
      createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, "right");
    }
  }

  // Bottom edge
  for (let i = 50; i >= 0; i -= 1) {
    const p = i / 50;
    const x = p * contentWidth;

    const edgeJitter = Math.sin(p * 40 * Math.PI + time * 0.28) * (1.5 + activity * 3.1);
    const baseX = WAVE_PAD + x + edgeJitter;
    const baseY = WAVE_PAD + contentHeight + Math.sin(p * 18 * Math.PI + time * 0.2) * (0.8 + activity * 1.9);

    const spikeGroup = Math.floor(p * 20) % 2;
    const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

    const primary = Math.sin(p * 10 * Math.PI + time * 2.18);
    const secondary = Math.sin(p * 22 * Math.PI + time * 1.58);
    const tertiary = Math.sin(p * 37 * Math.PI + time * 1.88);

    const sharpPeak = Math.pow(Math.abs(Math.sin(p * 18 * Math.PI + time * 0.98)), 2.7);
    const randomNeedle = Math.pow(Math.abs(Math.sin(p * 53 * Math.PI + time * 0.75)), 4.2);
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
      Math.sin(p * 31 * Math.PI + time * 1.22) *
      (contentWidth < 400 ? 9 : 13) *
      (0.34 + activity * 0.48 + sharpPeak * 0.24);

    const spikeX = WAVE_PAD + x + angleOffset;
    const spikeY = WAVE_PAD + contentHeight + Math.abs(wave) * morphFactor;

    const energyWave = (primary + 1) / 2;

    if (i % spikeInterval === 0) {
      createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, "bottom");
    }
  }

  // Left edge
  for (let i = 80; i >= 0; i -= 1) {
    const p = i / 80;
    const y = p * contentHeight;

    const edgeJitter = Math.sin(p * 46 * Math.PI + time * 0.28) * (1.5 + activity * 3.1);
    const baseX = WAVE_PAD + Math.sin(p * 20 * Math.PI + time * 0.2) * (0.8 + activity * 1.9);
    const baseY = WAVE_PAD + y + edgeJitter;

    const spikeGroup = Math.floor(p * 24) % 2;
    const amp = baseAmp * (spikeGroup === 0 ? group0Multiplier : group1Multiplier);

    const primary = Math.sin(p * 12 * Math.PI + time * 2.28);
    const secondary = Math.sin(p * 26 * Math.PI + time * 1.72);
    const tertiary = Math.sin(p * 41 * Math.PI + time * 2.0);

    const sharpPeak = Math.pow(Math.abs(Math.sin(p * 21 * Math.PI + time * 1.02)), 2.7);
    const randomNeedle = Math.pow(Math.abs(Math.sin(p * 61 * Math.PI + time * 0.82)), 4.2);
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
      Math.sin(p * 35 * Math.PI + time * 1.3) *
      (contentWidth < 400 ? 9 : 13) *
      (0.34 + activity * 0.48 + sharpPeak * 0.24);

    const spikeX = WAVE_PAD - Math.abs(wave) * morphFactor;
    const spikeY = WAVE_PAD + y + angleOffset;

    const energyWave = (primary + 1) / 2;

    if (i % spikeInterval === 0) {
      createSpikeNodes(baseX, baseY, spikeX, spikeY, energyWave, i, spikeGroup, "left");
    }
  }

  return allNodes;
}

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Lighter, fixed-count perimeter sampler used only by the sphere→frame morph
 * transition — not by AnimatedFrame's own steady-state render, which uses
 * the full multi-depth spike clusters from generateFrameSpikeNodes above.
 * Reuses edgeShapeBoost so the outline reads as the same "organic neural
 * frame" family, at a node density matched to the sphere's node count.
 */
export function frameOutlineTargets(
  count: number,
  rect: FrameRect,
  wavePad: number,
): Array<{ x: number; y: number }> {
  const perim = 2 * (rect.w + rect.h);
  const out: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const d = (i / count) * perim;

    let bx: number;
    let by: number;
    let nx: number;
    let ny: number;
    let edgeP: number;

    if (d <= rect.w) {
      edgeP = d / rect.w;
      bx = rect.x + d;
      by = rect.y;
      nx = 0;
      ny = -1;
    } else if (d <= rect.w + rect.h) {
      edgeP = (d - rect.w) / rect.h;
      bx = rect.x + rect.w;
      by = rect.y + (d - rect.w);
      nx = 1;
      ny = 0;
    } else if (d <= 2 * rect.w + rect.h) {
      edgeP = (d - rect.w - rect.h) / rect.w;
      bx = rect.x + rect.w - (d - rect.w - rect.h);
      by = rect.y + rect.h;
      nx = 0;
      ny = 1;
    } else {
      edgeP = (d - 2 * rect.w - rect.h) / rect.h;
      bx = rect.x;
      by = rect.y + rect.h - (d - 2 * rect.w - rect.h);
      nx = -1;
      ny = 0;
    }

    const boost = edgeShapeBoost(edgeP);
    const spike = wavePad * 0.62 * boost * (0.55 + 0.45 * Math.sin(i * 1.83 + 0.7));

    out.push({ x: bx + nx * spike, y: by + ny * spike });
  }

  return out;
}

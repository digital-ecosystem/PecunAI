/**
 * Pure math extracted from VoiceSphere.tsx — node distribution, connection
 * building, and 3D→2D projection. VoiceSphere.tsx imports these directly;
 * SphereToFrameTransition.tsx reuses them to start its morph from an exact
 * match of the live sphere (same node layout, same projection formula), so
 * there is no visual "pop" at the moment the transition takes over.
 */

export const SPHERE_NODE_COUNT = 80;

export interface SphereNode {
  x: number;
  y: number;
  z: number;
}

export function generateSphereNodes(nodeCount: number, baseRadius: number): SphereNode[] {
  const nodes: SphereNode[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const phi   = Math.acos(-1 + (2 * i) / nodeCount);
    const theta = Math.sqrt(nodeCount * Math.PI) * phi;
    const x     = Math.cos(theta) * Math.sin(phi) * baseRadius;
    const y     = Math.sin(theta) * Math.sin(phi) * baseRadius;
    const z     = Math.cos(phi) * baseRadius;
    nodes.push({ x, y, z });
  }

  return nodes;
}

export function buildSphereConnections(
  nodes: Array<{ x: number; y: number; z: number }>,
  maxDist: number,
): Array<[number, number]> {
  const connections: Array<[number, number]> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxDist) connections.push([i, j]);
    }
  }

  return connections;
}

export interface ProjectedSpherePoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

/**
 * Perspective projection used by VoiceSphere — rotates around the Y axis and
 * applies a simple perspective-divide (camera distance 300).
 */
export function projectSpherePoint(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  rotY: number,
): ProjectedSpherePoint {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1   = x * cosY - z * sinY;
  const z1   = x * sinY + z * cosY;
  const s    = 300 / (300 + z1);
  return { x: cx + x1 * s, y: cy + y * s, z: z1, scale: s };
}

// RGB colour sets: [primary, secondary]
export const SPHERE_COLORS = {
  speaking:  { r: 59,  g: 130, b: 246, r2: 147, g2: 197, b2: 253 }, // blue
  listening: { r: 22,  g: 163, b: 74,  r2: 134, g2: 239, b2: 172 }, // green
  idle:      { r: 59,  g: 130, b: 246, r2: 147, g2: 197, b2: 253 }, // blue (default)
};

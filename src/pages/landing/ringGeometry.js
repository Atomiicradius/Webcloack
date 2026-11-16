/**
 * ringGeometry.js — Shared geometry for the split glowing ring.
 * Ellipse in a centred square viewBox (-half..half).
 */

export const RING = { rx: 520, ry: 158, half: 600 }
export const RING_BEADS = [
  { kind: 'bead', r: 5, speed: 11, offset: 0.05 },
  { kind: 'bead', r: 4, speed: 14, offset: 0.38 },
  { kind: 'bead', r: 6, speed: 9.5, offset: 0.63 },
  { kind: 'spark', r: 14, speed: 12.5, offset: 0.82 },
  { kind: 'spark', r: 10, speed: 16, offset: 0.24 },
]

const { rx, ry } = RING
export const BACK = `M ${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0`   // through the top (y < 0)
export const FRONT = `M ${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0`  // through the bottom (y > 0)
/** Full loop starting at the left end, clockwise (top first). */
export const RING_PATH = `${BACK} A ${rx} ${ry} 0 0 1 ${-rx} 0`

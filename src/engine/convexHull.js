/**
 * convexHull.js — Geometric utilities for quad ROI management.
 * Graham Scan convex hull + polygon sorting, expansion, and centroid math.
 */

function cross(O, A, B) {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])
}

/**
 * Graham Scan convex hull for an array of [x, y] points.
 * Returns points in counter-clockwise order.
 */
export function convexHull(points) {
  if (points.length <= 2) return [...points]
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/**
 * Sort 4 (or N) points into clockwise winding order around their centroid.
 */
export function sortQuadClockwise(points) {
  if (points.length < 3) return points
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a[1] - cy, a[0] - cx)
    const angleB = Math.atan2(b[1] - cy, b[0] - cx)
    return angleA - angleB
  })
}

/**
 * Expand a polygon outward from its centroid by `amount` pixels.
 */
export function expandPolygon(points, amount) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return points.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    return [x + (dx / dist) * amount, y + (dy / dist) * amount]
  })
}

/**
 * Compute centroid of a polygon.
 */
export function centroid(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return [cx, cy]
}

/**
 * Compute polygon area using the Shoelace formula.
 */
export function polygonArea(points) {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area) / 2
}

/**
 * Euclidean distance between two 2D points.
 */
export function dist2D(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Smoothly interpolate polygon points toward a target (exponential smoothing).
 */
export function smoothPolygon(current, target, factor = 0.3) {
  if (!current || current.length !== target.length) return target
  return current.map((p, i) => [
    p[0] + (target[i][0] - p[0]) * factor,
    p[1] + (target[i][1] - p[1]) * factor,
  ])
}

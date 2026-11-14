/**
 * decor.js — Constants and helpers for the chrome decor components.
 */

export const ASSETS = {
  logo: '/assets/logo-chrome.png',
  orbitStar: '/assets/orbit-star.png',
  gelOrb: '/assets/gel-orb.png',
}

export const FLOOR_W = 1440
export const FLOOR_H = 260
export const FLOOR_ROWS = 8
export const FLOOR_RAYS = Array.from({ length: 19 }, (_, i) => -720 + i * 160)

/** y of horizontal floor line k (0..rows) at scroll phase p (0..1). */
export function floorY(k, p = 0) {
  const t = (k + p) / FLOOR_ROWS
  return FLOOR_H * t * t
}

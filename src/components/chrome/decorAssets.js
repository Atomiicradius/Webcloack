/**
 * decor.js — Constants and helpers for the chrome decor components.
 */

export const ASSETS = {
  // Full-res source is public/assets/logo-chrome.png (2880x1440); the site
  // serves 1x / 2x web copies through srcset.
  logo: '/assets/web/logo-chrome-1120.jpg',
  logo2x: '/assets/web/logo-chrome-2240.jpg',
  orbitStar: '/assets/orbit-star.png',
  gelOrb: '/assets/gel-orb.png',
}

// Landing art (black backgrounds, screen-blended). Web-sized copies of the
// originals in public/assets/ (made with resize-art; see the commit notes).
export const ART = {
  bust: { src: '/assets/web/bust.jpg', w: 1100, h: 1460 },
  cloakWindow: { src: '/assets/web/cloak-window.jpg', w: 1100, h: 829 },
  chromeBlob: { src: '/assets/web/chrome-blob.jpg', w: 1100, h: 733 },
  sticker: { src: '/assets/web/sticker.jpg', w: 800, h: 533 },
  stepHands: { src: '/assets/web/step-hands.jpg', w: 900, h: 678 },
  stepFrame: { src: '/assets/web/step-frame.jpg', w: 900, h: 678 },
  stepFilter: { src: '/assets/web/step-filter.jpg', w: 900, h: 678 },
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

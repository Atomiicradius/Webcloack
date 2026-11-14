/**
 * Decor.jsx — Shared Y2K "blue chrome" decorative pieces used by the
 * landing, boot and app screens. Everything here is aria-hidden except the
 * logo image (which carries the product name as alt text).
 *
 * Image assets (public/assets/*.png) have solid black backgrounds and no
 * alpha channel; .ch-screen composites them with mix-blend-mode: screen so
 * the black drops out on the blue backgrounds.
 */

import { cx } from '../win98/cx.js'
import { ASSETS, FLOOR_H, FLOOR_RAYS, FLOOR_ROWS, FLOOR_W, floorY } from './decorAssets.js'
import './chrome.css'


const SPARKLE_PATH = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z'

/** Four-point star. */
export function Sparkle({ size = 24, color = 'var(--white)', className, style }) {
  return (
    <svg
      className={cx('ch-sparkle', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={SPARKLE_PATH} fill={color} />
    </svg>
  )
}

const MERIDIANS = [0, 1, 2, 3, 4, 5]

/**
 * Wireframe globe. `spin` turns on the cheap CSS meridian rotation (app);
 * the landing animates the same `.ch-globe__meridian` elements with GSAP.
 */
export function WireGlobe({ className, spin = false, ring = false }) {
  return (
    <svg
      className={cx('ch-globe', spin && 'ch-globe--spin', className)}
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ch-globe-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#4F6DFF" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#1A2BA8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#060C3C" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <circle className="ch-globe__body" cx="200" cy="200" r="180" fill="url(#ch-globe-fill)" />
      <g className="ch-globe__lines">
        <ellipse cx="200" cy="200" rx="180" ry="62" />
        <ellipse cx="200" cy="200" rx="180" ry="124" />
        <line x1="20" y1="200" x2="380" y2="200" />
        <g className="ch-globe__meridians">
          {MERIDIANS.map((i) => (
            <ellipse
              key={i}
              className="ch-globe__meridian"
              cx="200"
              cy="200"
              rx="180"
              ry="180"
              style={{ '--i': i }}
            />
          ))}
        </g>
      </g>
      <circle className="ch-globe__rim" cx="200" cy="200" r="180" />
      {ring && (
        <g className="ch-globe__ring" transform="rotate(-16 200 200)">
          <ellipse className="ch-globe__ring-band" cx="200" cy="200" rx="196" ry="44" />
          <ellipse className="ch-globe__ring-dash" cx="200" cy="200" rx="196" ry="44" />
        </g>
      )}
    </svg>
  )
}


/** Perspective grid floor. Horizontal lines carry .ch-floor__row for GSAP. */
export function GridFloor({ className }) {
  return (
    <svg
      className={cx('ch-floor', className)}
      viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="ch-floor__lines">
        {FLOOR_RAYS.map((x) => (
          <line key={x} x1={FLOOR_W / 2} y1="0" x2={x} y2={FLOOR_H} />
        ))}
        {Array.from({ length: FLOOR_ROWS + 1 }, (_, k) => (
          <line key={k} className="ch-floor__row" data-k={k} x1="0" x2={FLOOR_W} y1={floorY(k)} y2={floorY(k)} />
        ))}
      </g>
    </svg>
  )
}

/**
 * Magenta ticker band. Two identical copies scroll as one track; the whole
 * band is decorative (its phrases are repeated elsewhere on each page).
 * `css` uses a cheap CSS loop (app); the landing drives .ch-ticker__track
 * with GSAP instead.
 */
export function Ticker({ items, css = false, className }) {
  const run = (
    <span className="ch-ticker__run">
      {items.map((item) => (
        <span key={item} className="ch-ticker__item">
          {item}
          <span className="ch-ticker__star">✦</span>
        </span>
      ))}
    </span>
  )
  return (
    <div className={cx('ch-ticker', css && 'ch-ticker--css', className)} aria-hidden="true">
      <div className="ch-ticker__track">
        {run}
        {run}
      </div>
    </div>
  )
}

/** The chrome WEBCLOAK wordmark (real image asset, screen-blended). */
export function ChromeLogo({ className, decorative = false }) {
  return (
    <img
      className={cx('ch-screen ch-logo', className)}
      src={ASSETS.logo}
      width="200"
      height="100"
      alt={decorative ? '' : 'Webcloak'}
      draggable="false"
    />
  )
}

/** Orbit-star image (screen-blended). */
export function OrbitStar({ className }) {
  return (
    <img
      className={cx('ch-screen ch-orbit-star', className)}
      src={ASSETS.orbitStar}
      width="200"
      height="200"
      alt=""
      draggable="false"
    />
  )
}

/** Gel orb image (screen-blended); `hue` rotates it for variety. */
export function GelOrb({ className, hue = 0, style }) {
  return (
    <img
      className={cx('ch-screen ch-gel', className)}
      src={ASSETS.gelOrb}
      width="200"
      height="200"
      alt=""
      draggable="false"
      style={{ ...style, filter: hue ? `hue-rotate(${hue}deg)` : undefined }}
    />
  )
}

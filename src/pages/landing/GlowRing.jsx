/**
 * GlowRing.jsx — Neon ring that wraps the logo, split into two halves so it
 * can pass BEHIND (back half, upper arc) and IN FRONT (front half, lower
 * arc) of whatever sits between them in the DOM.
 *
 * Each half is three stacked layers so the expensive part stays static:
 *   .lp-ring__glow   static SVG: blurred cobalt + ice copies and the thin
 *                    white-to-ice core (gradient fades toward the ends).
 *                    Rasterised once; precession only transforms the
 *                    wrapper, which the compositor handles.
 *   .lp-ring__shine  a short bright dash that travels along the arc.
 *   .lp-ring__beads  bright beads and 4-point sparkles (no filters, so
 *                    moving them repaints a cheap layer). Landing.jsx moves
 *                    each bead along the full ring with MotionPathPlugin and
 *                    shows the back or front copy depending on the arc.
 *
 * Geometry is in a centred square viewBox; the wrapper is sized with --ring.
 */

import { useId } from 'react'
import { BACK, FRONT, RING, RING_BEADS } from './ringGeometry.js'

const { rx, half } = RING

const SPARK = 'M0 -1C.08 -.3 .3 -.08 1 0C.3 .08 .08 .3 0 1C-.08 .3 -.3 .08 -1 0C-.3 -.08 -.08 -.3 0 -1Z'

export default function GlowRingHalf({ side, className = '' }) {
  const id = useId().replace(/:/g, '')
  const d = side === 'back' ? BACK : FRONT
  const box = `${-half} ${-half} ${half * 2} ${half * 2}`
  // Brightest in the middle of each arc, fading toward the ends like a
  // streak of light; the back half is dimmer for depth.
  const peak = side === 'back' ? 0.7 : 1
const edge = 0.1 // the tips fade out (a streak of light), faintly lit so the halves still meet

  return (
    <div className={`lp-ring lp-ring--${side} ${className}`} aria-hidden="true">
      <div className="lp-ring__tilt">
        <svg className="lp-ring__glow" viewBox={box} focusable="false">
          <defs>
            <linearGradient id={`${id}-core`} x1={-rx} x2={rx} y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#9EC0FF" stopOpacity={edge * peak} />
              <stop offset="0.22" stopColor="#9EC0FF" stopOpacity={0.7 * peak} />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={peak} />
              <stop offset="0.78" stopColor="#9EC0FF" stopOpacity={0.7 * peak} />
              <stop offset="1" stopColor="#9EC0FF" stopOpacity={edge * peak} />
            </linearGradient>
            <linearGradient id={`${id}-glow`} x1={-rx} x2={rx} y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#4F6DFF" stopOpacity={edge * peak} />
              <stop offset="0.5" stopColor="#4F6DFF" stopOpacity={peak} />
              <stop offset="1" stopColor="#4F6DFF" stopOpacity={edge * peak} />
            </linearGradient>
            <filter id={`${id}-wide`} x={-half} y={-half} width={half * 2} height={half * 2} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id={`${id}-mid`} x={-half} y={-half} width={half * 2} height={half * 2} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id={`${id}-tight`} x={-half} y={-half} width={half * 2} height={half * 2} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
          </defs>
          <g fill="none" strokeLinecap="round">
            {/* wide cobalt */}
            <path d={d} stroke={`url(#${id}-glow)`} strokeWidth="42" opacity="0.95" filter={`url(#${id}-wide)`} />
            {/* medium ice */}
            <path d={d} stroke={`url(#${id}-core)`} strokeWidth="15" opacity="0.95" filter={`url(#${id}-mid)`} />
            {/* tight white */}
            <path className="lp-ring__line" pathLength="1" d={d} stroke={`url(#${id}-core)`} strokeWidth="6" opacity="1" filter={`url(#${id}-tight)`} />
            {/* core line */}
            <path className="lp-ring__line" pathLength="1" d={d} stroke={`url(#${id}-core)`} strokeWidth="3.4" />
          </g>
        </svg>

        <svg className="lp-ring__shine" viewBox={box} focusable="false">
          <path
            className="lp-ring__shine-path"
            d={d}
            pathLength="1000"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="70 1070"
            strokeDashoffset="70"
            opacity={side === 'back' ? 0.45 : 0.9}
          />
        </svg>

        <svg className="lp-ring__beads" viewBox={box} focusable="false">
          <defs>
            <radialGradient id={`${id}-halo`}>
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="0.35" stopColor="#9EC0FF" stopOpacity="0.55" />
              <stop offset="1" stopColor="#4F6DFF" stopOpacity={edge * peak} />
            </radialGradient>
          </defs>
          {RING_BEADS.map((b, i) => (
            <g key={i} className="lp-ring__bead" data-bead={i} opacity="0">
              <circle r={b.kind === 'spark' ? b.r * 1.6 : b.r * 4} fill={`url(#${id}-halo)`} />
              {b.kind === 'spark' ? (
                <path d={SPARK} transform={`scale(${b.r})`} fill="#FFFFFF" />
              ) : (
                <circle r={b.r} fill="#FFFFFF" />
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

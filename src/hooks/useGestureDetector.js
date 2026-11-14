/**
 * useGestureDetector.js — Pinch detection and filter-switching via pinch-snap.
 * Tracks pinch distance for parameter scaling and detects quick pinch-release for mode cycling.
 */

import { useRef, useCallback } from 'react'

const PINCH_THRESHOLD = 40       // px — considered "pinching"
const RELEASE_THRESHOLD = 80     // px — considered "released"
const SNAP_COOLDOWN = 600        // ms — debounce between snaps

// While pinching, fingertip distance maps onto intensity over this range:
// RELEASE_THRESHOLD px → 0, FULL_PINCH px → 1 (closer = higher intensity).
const FULL_PINCH = 20

export function useGestureDetector(filterCount) {
  const pinchStateRef = useRef({})  // per-hand pinch state
  const lastSnapTimeRef = useRef(0)

  /**
   * Process pinch data each frame and return:
   * - pinchIntensity: 0..1 while at least one hand is actively pinching,
   *   or null when nobody is pinching (callers must then leave intensity alone)
   * - filterSnap: true if a pinch-snap was detected this frame
   */
  const processGestures = useCallback((pinchData) => {
    let pinchIntensity = null
    let filterSnap = false
    const now = performance.now()
    const seen = new Set()

    for (const hand of pinchData) {
      const { hand: handLabel, pinchDist } = hand
      seen.add(handLabel)
      const state = pinchStateRef.current[handLabel] || { isPinching: false }

      // Pinch-snap detection: pinch → release quickly
      if (pinchDist < PINCH_THRESHOLD) {
        if (!state.isPinching) {
          state.isPinching = true
          state.pinchStart = now
        }
      } else if (pinchDist > RELEASE_THRESHOLD && state.isPinching) {
        const duration = now - (state.pinchStart || now)
        state.isPinching = false

        // Quick pinch-release = snap (< 400ms)
        if (duration < 400 && now - lastSnapTimeRef.current > SNAP_COOLDOWN) {
          filterSnap = true
          lastSnapTimeRef.current = now
        }
      }

      // Only an actively pinching hand drives intensity.
      if (state.isPinching) {
        const normalized = Math.max(
          0,
          Math.min(1, 1 - (pinchDist - FULL_PINCH) / (RELEASE_THRESHOLD - FULL_PINCH)),
        )
        pinchIntensity = pinchIntensity === null ? normalized : Math.max(pinchIntensity, normalized)
      }

      pinchStateRef.current[handLabel] = state
    }

    // Hands that left the frame can't still be pinching.
    for (const label of Object.keys(pinchStateRef.current)) {
      if (!seen.has(label)) delete pinchStateRef.current[label]
    }

    return { pinchIntensity, filterSnap }
  }, [])

  return { processGestures }
}

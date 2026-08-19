/**
 * useGestureDetector.js — Pinch detection and filter-switching via pinch-snap.
 * Tracks pinch distance for parameter scaling and detects quick pinch-release for mode cycling.
 */

import { useRef, useCallback } from 'react'

const PINCH_THRESHOLD = 40       // px — considered "pinching"
const RELEASE_THRESHOLD = 80     // px — considered "released"
const SNAP_COOLDOWN = 600        // ms — debounce between snaps

export function useGestureDetector(filterCount) {
  const pinchStateRef = useRef({})  // per-hand pinch state
  const lastSnapTimeRef = useRef(0)

  /**
   * Process pinch data each frame and return:
   * - gestureIntensity: 0..1 normalized pinch distance for parameter scaling
   * - filterSnap: true if a pinch-snap was detected this frame
   */
  const processGestures = useCallback((pinchData) => {
    let gestureIntensity = 0.5
    let filterSnap = false
    const now = performance.now()

    for (const hand of pinchData) {
      const { hand: handLabel, pinchDist } = hand
      const state = pinchStateRef.current[handLabel] || { isPinching: false }

      // Normalize pinch distance for intensity control (closer = higher intensity)
      const normalized = Math.max(0, Math.min(1, 1 - (pinchDist - 20) / 200))
      gestureIntensity = Math.max(gestureIntensity, normalized)

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

      pinchStateRef.current[handLabel] = state
    }

    return { gestureIntensity, filterSnap }
  }, [])

  return { processGestures }
}

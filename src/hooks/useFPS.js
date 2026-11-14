/**
 * useFPS.js — RAF-based FPS counter hook.
 * Measures every frame but only updates React state ~4 times per second.
 */

import { useRef, useState, useEffect } from 'react'

const REPORT_INTERVAL_MS = 250

export function useFPS() {
  const frames    = useRef([])
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let rafId
    let lastReport = 0
    function tick(now) {
      frames.current.push(now)
      // Keep only the last second of frames
      while (frames.current.length > 0 && now - frames.current[0] > 1000) {
        frames.current.shift()
      }
      if (now - lastReport >= REPORT_INTERVAL_MS) {
        lastReport = now
        setFps(frames.current.length)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return fps
}

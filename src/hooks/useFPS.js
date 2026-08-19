/**
 * useFPS.js — Simple RAF-based FPS counter hook.
 */

import { useRef, useState, useEffect } from 'react'

export function useFPS() {
  const frames    = useRef([])
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let rafId
    function tick(now) {
      frames.current.push(now)
      // Keep only last 60 frames
      while (frames.current.length > 0 && now - frames.current[0] > 1000) {
        frames.current.shift()
      }
      setFps(frames.current.length)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return fps
}

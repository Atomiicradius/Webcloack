/**
 * MagicCanvas.jsx — Main compositing canvas driving the RAF render loop.
 * Composites: video → hand tracking → FX pipeline → particles.
 */

import { useEffect, useRef, useCallback } from 'react'
import { renderFrame, getParticleSystem } from '../engine/renderPipeline.js'
import { detectBeat } from '../engine/audioEngine.js'

export default function MagicCanvas({
  videoRef,
  getQuads,
  getPinchData,
  filter,
  intensity,
  bgImage,
  showWireframe,
  audioLevels,
  audioEnabled,
  canvasRef: externalCanvasRef,
}) {
  const internalCanvasRef = useRef(null)
  const canvasRef = externalCanvasRef || internalCanvasRef
  const startTimeRef = useRef(performance.now())
  const rafRef = useRef(null)

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef?.current

    if (!canvas || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderLoop)
      return
    }

    // Match canvas to video resolution
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    const ctx = canvas.getContext('2d')
    const time = (performance.now() - startTimeRef.current) / 1000

    // Get current quads from hand tracking
    const quads = getQuads ? getQuads() : []

    // Emit particles on audio beats
    if (audioEnabled) {
      const isBeat = detectBeat(0.5)
      if (isBeat && quads.length > 0) {
        const ps = getParticleSystem()
        if (ps) {
          for (const quad of quads) {
            ps.emitAlongPolygon(quad, 6)
            // Emit at each vertex
            for (const [x, y] of quad) {
              ps.emit(x, y, 4)
            }
          }
        }
      }
    }

    // Render frame through the pipeline
    renderFrame(ctx, video, quads, {
      filter,
      intensity,
      bgImage,
      showWireframe,
      audioLevels,
      time,
    })

    rafRef.current = requestAnimationFrame(renderLoop)
  }, [videoRef, getQuads, filter, intensity, bgImage, showWireframe, audioLevels, audioEnabled, canvasRef])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [renderLoop])

  return (
    <canvas
      ref={canvasRef}
      className="magic-canvas"
      id="magic-canvas"
    />
  )
}

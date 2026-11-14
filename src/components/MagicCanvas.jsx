/**
 * MagicCanvas.jsx — Main compositing canvas driving the RAF render loop.
 * Composites: video → hand tracking → FX pipeline → particles.
 *
 * The RAF loop starts once on mount and reads everything it needs from refs
 * and the live-state store, so prop/state changes never restart it.
 */

import { memo, useEffect, useRef } from 'react'
import { renderFrame, getParticleSystem } from '../engine/renderPipeline.js'
import { detectBeat, getAudioLevels } from '../engine/audioEngine.js'
import { live, ZERO_LEVELS } from '../engine/liveState.js'

// Distinct render-error messages already logged (log each once).
const loggedErrors = new Set()

function MagicCanvas({
  videoRef,
  getQuads,
  filter,
  bgImage,
  showWireframe,
  audioEnabled,
  paused = false,
  canvasRef: externalCanvasRef,
}) {
  const internalCanvasRef = useRef(null)
  const canvasRef = externalCanvasRef || internalCanvasRef
  const startTimeRef = useRef(performance.now())

  // Latest slow-changing props, read by the loop each frame.
  const propsRef = useRef({ filter, bgImage, showWireframe, audioEnabled, getQuads })
  useEffect(() => {
    propsRef.current = { filter, bgImage, showWireframe, audioEnabled, getQuads }
  })

  useEffect(() => {
    // Paused: no loop at all; the canvas keeps its last frame.
    if (paused) return
    let rafId = null

    function renderLoop() {
      rafId = requestAnimationFrame(renderLoop)

      const canvas = canvasRef.current
      const video = videoRef?.current
      if (!canvas || !video || video.readyState < 2) return

      // Match canvas to video resolution
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const ctx = canvas.getContext('2d')
      const time = (performance.now() - startTimeRef.current) / 1000
      const p = propsRef.current

      // Audio levels are read here and published to the live store;
      // the UI polls the store at a throttled rate.
      const audioLevels = p.audioEnabled ? getAudioLevels() : ZERO_LEVELS
      live.audioLevels = audioLevels

      // Get current quads from hand tracking
      const quads = p.getQuads ? p.getQuads() : []

      // Emit particles on audio beats
      if (p.audioEnabled) {
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

      // Render frame through the pipeline. A throw must never stop the loop.
      try {
        renderFrame(ctx, video, quads, {
          filter: p.filter,
          intensity: live.intensity,
          bgImage: p.bgImage,
          showWireframe: p.showWireframe,
          audioLevels,
          time,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (!loggedErrors.has(message)) {
          loggedErrors.add(message)
          console.error('Render error (further identical errors suppressed):', err)
        }
        // Reassigning width resets the 2D context (clip, save stack, styles)
        // that the failed frame may have left in a bad state.
        const w = canvas.width
        canvas.width = w
        try {
          ctx.drawImage(video, 0, 0, w, canvas.height)
        } catch {
          // Video not drawable this frame; try again next frame.
        }
      }
    }

    rafId = requestAnimationFrame(renderLoop)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [videoRef, canvasRef, paused])

  return (
    <canvas
      ref={canvasRef}
      className="magic-canvas"
      id="magic-canvas"
    />
  )
}

export default memo(MagicCanvas)

/**
 * AudioVisualizer.jsx — Bass/mid/treble history, mint on black.
 * Draws from throttled audio levels; shows a short note when the mic is off.
 */

import { memo, useEffect, useRef } from 'react'

const MINT = '157, 251, 208'

function AudioVisualizer({ audioLevels, visible }) {
  const canvasRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    if (!visible) {
      historyRef.current = []
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { bass, mid, treble } = audioLevels

    historyRef.current.push({ bass, mid, treble })
    if (historyRef.current.length > 64) historyRef.current.shift()

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const history = historyRef.current
    const barW = canvas.width / 64
    const h = canvas.height

    for (let i = 0; i < history.length; i++) {
      const s = history[i]
      const x = i * barW
      // Bass: bottom band, full mint
      ctx.fillStyle = `rgba(${MINT}, 1)`
      ctx.fillRect(x, h - s.bass * h * 0.45, barW - 1, s.bass * h * 0.45)
      // Mid: middle band
      ctx.fillStyle = `rgba(${MINT}, 0.7)`
      ctx.fillRect(x, h * 0.5 - s.mid * h * 0.3, barW - 1, s.mid * h * 0.3)
      // Treble: top band
      ctx.fillStyle = `rgba(${MINT}, 0.45)`
      ctx.fillRect(x, 0, barW - 1, s.treble * h * 0.15)
    }
  }, [audioLevels, visible])

  if (!visible) {
    return (
      <div className="wc-audio">
        <span>mic off</span>
        <span>tick audio reactive to start</span>
      </div>
    )
  }

  const pct = (v) => Math.round(v * 100)
  return (
    <div className="wc-audio">
      <canvas ref={canvasRef} width={200} height={64} className="wc-audio__canvas" aria-hidden="true" />
      <span>
        bass {pct(audioLevels.bass)} mid {pct(audioLevels.mid)} treble {pct(audioLevels.treble)}
      </span>
    </div>
  )
}

export default memo(AudioVisualizer)

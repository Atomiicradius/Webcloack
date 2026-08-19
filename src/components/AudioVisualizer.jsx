/**
 * AudioVisualizer.jsx — Bottom-left audio waveform mini-display.
 * Shows bass/mid/treble energy bars and frequency spectrum.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function AudioVisualizer({ audioLevels, visible }) {
  const canvasRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    if (!visible || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { bass, mid, treble } = audioLevels

    // Push to history
    historyRef.current.push({ bass, mid, treble })
    if (historyRef.current.length > 64) historyRef.current.shift()

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw waveform history
    const history = historyRef.current
    const barW = canvas.width / history.length

    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      const x = i * barW

      // Bass (cyan)
      ctx.fillStyle = `hsla(190, 100%, 60%, ${0.4 + h.bass * 0.5})`
      ctx.fillRect(x, canvas.height - h.bass * canvas.height * 0.4, barW - 1, h.bass * canvas.height * 0.4)

      // Mid (purple)
      ctx.fillStyle = `hsla(280, 100%, 60%, ${0.3 + h.mid * 0.4})`
      ctx.fillRect(x, canvas.height * 0.35 - h.mid * canvas.height * 0.3, barW - 1, h.mid * canvas.height * 0.3)

      // Treble (white)
      ctx.fillStyle = `hsla(0, 0%, 80%, ${0.2 + h.treble * 0.3})`
      ctx.fillRect(x, canvas.height * 0.05, barW - 1, h.treble * canvas.height * 0.15)
    }

    // Band labels
    ctx.font = '8px "JetBrains Mono", monospace'
    ctx.fillStyle = 'hsla(190, 100%, 70%, 0.7)'
    ctx.fillText(`BASS ${Math.round(bass * 100)}`, 4, canvas.height - 4)
    ctx.fillStyle = 'hsla(280, 100%, 70%, 0.7)'
    ctx.fillText(`MID ${Math.round(mid * 100)}`, 4, canvas.height * 0.4)
    ctx.fillStyle = 'hsla(0, 0%, 80%, 0.6)'
    ctx.fillText(`TRB ${Math.round(treble * 100)}`, 4, 10)
  }, [audioLevels, visible])

  if (!visible) return null

  return (
    <motion.div
      className="audio-visualizer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={80}
        className="audio-canvas"
      />
    </motion.div>
  )
}

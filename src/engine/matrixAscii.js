/**
 * matrixAscii.js — Matrix-style digital rain renderer on Canvas 2D.
 * Luminosity-mapped: bright webcam areas (face, eyes) render bright neon characters,
 * dark areas render dim glyphs. A dimmed live camera feed is drawn underneath
 * so facial expressions remain visible through the rain.
 */

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>~'

// Persistent sample canvas to avoid per-frame allocation
let _sampleCanvas = null
let _sampleCtx = null

export class MatrixRain {
  constructor() {
    this.columns = []
    this.fontSize = 14
    this.initialized = false
  }

  /**
   * Initialize rain columns based on canvas dimensions.
   */
  init(width, height) {
    const colCount = Math.floor(width / this.fontSize)
    this.columns = Array.from({ length: colCount }, () => ({
      y: Math.random() * height,
      speed: 2 + Math.random() * 6,
      length: 10 + Math.floor(Math.random() * 20),
    }))
    this.initialized = true
  }

  /**
   * Render matrix rain into the given context, sampling luminosity from the video.
   * No opaque background — facial features remain visible underneath.
   * @param {CanvasRenderingContext2D} ctx — destination context
   * @param {HTMLVideoElement} video — source video for luminosity
   * @param {number} width — canvas width
   * @param {number} height — canvas height
   * @param {number} intensity — 0..1 effect strength
   */
  render(ctx, video, width, height, intensity) {
    if (!this.initialized || this.columns.length === 0) {
      this.init(width, height)
    }

    const cols = Math.floor(width / this.fontSize)
    const rows = Math.floor(height / this.fontSize)

    // Reuse persistent sample canvas
    if (!_sampleCanvas || _sampleCanvas.width !== cols || _sampleCanvas.height !== rows) {
      _sampleCanvas = document.createElement('canvas')
      _sampleCanvas.width = cols
      _sampleCanvas.height = rows
      _sampleCtx = _sampleCanvas.getContext('2d', { willReadFrequently: true })
    }

    // Sample video at character-grid resolution
    _sampleCtx.drawImage(video, 0, 0, cols, rows)
    let imageData = null
    try {
      imageData = _sampleCtx.getImageData(0, 0, cols, rows)
    } catch (e) {
      // Security error — fall back to uniform brightness
    }

    // ── 1. Clear canvas fully (transparent) ──────────────────────
    ctx.clearRect(0, 0, width, height)

    // ── 2. Draw dimmed live camera feed at 30% opacity ───────────
    //    This preserves facial expressions under the rain.
    ctx.save()
    ctx.globalAlpha = 0.3 * intensity
    ctx.drawImage(video, 0, 0, width, height)
    ctx.restore()

    // ── 3. Draw character rain with luminosity mapping ───────────
    ctx.font = `${this.fontSize}px "JetBrains Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i]
      const x = i * this.fontSize + this.fontSize / 2

      // Advance column
      col.y += col.speed * intensity

      // Draw trailing characters
      for (let j = 0; j < col.length; j++) {
        const charY = col.y - j * this.fontSize
        if (charY < 0 || charY > height) continue

        const char = CHARS[Math.floor(Math.random() * CHARS.length)]

        // Sample luminosity from video at this character cell
        let lum = 0.5
        if (imageData) {
          const sx = Math.min(i, cols - 1)
          const sy = Math.min(Math.max(Math.floor(charY / this.fontSize), 0), rows - 1)
          const idx = (sy * cols + sx) * 4
          lum = (imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114) / 255
        }

        const fade = 1 - j / col.length

        if (j === 0) {
          // Head character — bright white-green flash
          const headAlpha = (0.85 + lum * 0.15) * intensity
          ctx.fillStyle = `rgba(180, 255, 180, ${headAlpha})`
        } else if (lum > 0.6) {
          // Bright pixel (face, skin highlights, eyes) — neon green / white
          const bright = lum > 0.8
          const r = bright ? 255 : 57
          const g = bright ? 255 : 255
          const b = bright ? 255 : 20
          const alpha = fade * intensity * (0.6 + lum * 0.4)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        } else {
          // Dark pixel — dim dark green with low opacity
          const green = Math.floor(40 + lum * 120)
          const alpha = fade * intensity * (0.15 + lum * 0.35)
          ctx.fillStyle = `rgba(0, ${green}, ${Math.floor(green * 0.2)}, ${alpha})`
        }

        ctx.fillText(char, x, charY)
      }

      // Reset column when it scrolls off
      if (col.y - col.length * this.fontSize > height) {
        col.y = -this.fontSize * 2
        col.speed = 2 + Math.random() * 6
        col.length = 10 + Math.floor(Math.random() * 20)
      }
    }
  }

  reset() {
    this.columns = []
    this.initialized = false
  }
}

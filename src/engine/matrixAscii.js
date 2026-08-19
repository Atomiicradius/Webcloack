/**
 * matrixAscii.js — Matrix-style digital rain renderer on Canvas 2D.
 * Maps video luminosity to character brightness for organic data-rain look.
 */

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>~'

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
      chars: [],
      length: 10 + Math.floor(Math.random() * 20),
    }))
    this.initialized = true
  }

  /**
   * Render matrix rain into the given context, sampling luminosity from the video.
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

    // Create temporary canvas to sample video luminosity
    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = Math.floor(width / this.fontSize)
    sampleCanvas.height = Math.floor(height / this.fontSize)
    const sampleCtx = sampleCanvas.getContext('2d')
    sampleCtx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height)

    let imageData = null
    try {
      imageData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height)
    } catch (e) {
      // Security error — draw without luminosity mapping
    }

    // Draw background with trail fade
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + (1 - intensity) * 0.1})`
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${this.fontSize}px "JetBrains Mono", monospace`
    ctx.textAlign = 'center'

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

        // Sample luminosity from video
        let lum = 0.5
        if (imageData) {
          const sx = Math.min(i, sampleCanvas.width - 1)
          const sy = Math.min(Math.floor(charY / this.fontSize), sampleCanvas.height - 1)
          const idx = (sy * sampleCanvas.width + sx) * 4
          lum = (imageData.data[idx] * 0.299 + imageData.data[idx + 1] * 0.587 + imageData.data[idx + 2] * 0.114) / 255
        }

        // Head character is bright white-green
        if (j === 0) {
          ctx.fillStyle = `rgba(180, 255, 180, ${0.9 * intensity})`
        } else {
          // Fade green based on position and luminosity
          const fade = 1 - j / col.length
          const green = Math.floor(100 + lum * 155)
          ctx.fillStyle = `rgba(0, ${green}, ${Math.floor(green * 0.3)}, ${fade * intensity * 0.8})`
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

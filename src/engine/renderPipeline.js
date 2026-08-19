/**
 * renderPipeline.js — Main compositing pipeline.
 * Clips video feed inside polygon ROI, applies visual effects,
 * draws feathered borders, wireframe overlay, and particles.
 */

import { sortQuadClockwise, expandPolygon, centroid } from './convexHull.js'
import { ShaderEngine } from './shaderEngine.js'
import { MatrixRain } from './matrixAscii.js'
import { ParticleSystem } from './particleSystem.js'

// ── Available filter modes ──────────────────────────────────────────
export const FILTERS = [
  { id: 'cloak',    label: 'INVISIBILITY',   shaderKey: null },
  { id: 'lens',     label: 'GRAVITATIONAL',  shaderKey: 'lens' },
  { id: 'matrix',   label: 'MATRIX RAIN',    shaderKey: null },
  { id: 'thermal',  label: 'THERMAL',        shaderKey: 'thermal' },
  { id: 'edge',     label: 'EDGE SYNTH',     shaderKey: 'edge' },
  { id: 'pixelate', label: 'PIXEL GLITCH',   shaderKey: 'pixelate' },
]

// ── Pipeline singleton instances ────────────────────────────────────
let shaderEngine = null
let matrixRain = null
let particleSystem = null

// Offscreen canvas for shader intermediate rendering
let offscreenCanvas = null
let offscreenCtx = null

// Matrix rain needs its own persistent canvas for trail fade
let matrixCanvas = null
let matrixCtx = null

export function getParticleSystem() {
  if (!particleSystem) particleSystem = new ParticleSystem()
  return particleSystem
}

/**
 * Initialize the render pipeline.
 */
export function initPipeline(width, height) {
  shaderEngine = new ShaderEngine()
  shaderEngine.init(width, height)

  matrixRain = new MatrixRain()
  particleSystem = new ParticleSystem()

  offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = width
  offscreenCanvas.height = height
  offscreenCtx = offscreenCanvas.getContext('2d')

  matrixCanvas = document.createElement('canvas')
  matrixCanvas.width = width
  matrixCanvas.height = height
  matrixCtx = matrixCanvas.getContext('2d')
}

/**
 * Render a single frame.
 * @param {CanvasRenderingContext2D} ctx — main canvas context
 * @param {HTMLVideoElement} video — live webcam feed
 * @param {Array} quads — array of polygon point arrays [[x,y], ...]
 * @param {Object} config — { filter, intensity, bgImage, showWireframe, audioLevels, time }
 */
export function renderFrame(ctx, video, quads, config) {
  const {
    filter = 'cloak',
    intensity = 0.5,
    bgImage = null,
    showWireframe = true,
    audioLevels = { bass: 0, mid: 0, treble: 0, amplitude: 0 },
    time = 0,
  } = config

  const width = ctx.canvas.width
  const height = ctx.canvas.height

  // ── 1. Draw full video feed as background ────────────────────────
  ctx.drawImage(video, 0, 0, width, height)

  // ── 2. Process each quad portal ──────────────────────────────────
  for (const quad of quads) {
    if (!quad || quad.length < 3) continue

    const sorted = sortQuadClockwise(quad)

    // ── 2a. Create polygon clip path ─────────────────────────────
    ctx.save()

    // Feathered edge: draw expanded shadow first
    const expanded = expandPolygon(sorted, 8)
    drawFeatheredEdge(ctx, sorted, expanded, audioLevels)

    // Clip to polygon
    ctx.beginPath()
    ctx.moveTo(sorted[0][0], sorted[0][1])
    for (let i = 1; i < sorted.length; i++) {
      ctx.lineTo(sorted[i][0], sorted[i][1])
    }
    ctx.closePath()
    ctx.clip()

    // ── 2b. Render the selected effect inside the clip ───────────
    renderEffect(ctx, video, sorted, filter, intensity, bgImage, time, width, height)

    ctx.restore()

    // ── 2c. Draw wireframe overlay ───────────────────────────────
    if (showWireframe) {
      drawWireframe(ctx, sorted, audioLevels, time)
    }

    // ── 2d. Draw vertex markers ──────────────────────────────────
    drawVertexMarkers(ctx, sorted, audioLevels, time)
  }

  // ── 3. Update and render particles ───────────────────────────────
  if (particleSystem) {
    particleSystem.update()
    particleSystem.render(ctx)
  }
}

/**
 * Render the selected visual effect within the clipped region.
 */
function renderEffect(ctx, video, quad, filter, intensity, bgImage, time, width, height) {
  const filterDef = FILTERS.find((f) => f.id === filter)

  if (filter === 'cloak') {
    // ── Invisibility Cloak: draw captured background ───────────
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, width, height)
    } else {
      // No background captured — show transparent checkerboard hint
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(0, 243, 255, 0.3)'
      ctx.font = '16px "Orbitron", sans-serif'
      ctx.textAlign = 'center'
      const c = centroid(quad)
      ctx.fillText('CAPTURE BACKGROUND', c[0], c[1])
    }
  } else if (filter === 'matrix') {
    // ── Matrix ASCII Rain ──────────────────────────────────────
    if (!matrixRain) matrixRain = new MatrixRain()
    if (matrixCanvas.width !== width || matrixCanvas.height !== height) {
      matrixCanvas.width = width
      matrixCanvas.height = height
      matrixRain.reset()
    }
    matrixRain.render(matrixCtx, video, width, height, intensity)
    ctx.drawImage(matrixCanvas, 0, 0)
  } else if (filterDef && filterDef.shaderKey && shaderEngine) {
    // ── WebGL Shader Effects ───────────────────────────────────
    const result = shaderEngine.render(filterDef.shaderKey, video, intensity, time)
    ctx.drawImage(result, 0, 0, width, height)
  }
}

/**
 * Draw feathered/glowing edge around the polygon.
 */
function drawFeatheredEdge(ctx, inner, outer, audioLevels) {
  const glow = 4 + audioLevels.bass * 20

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // Outer glow
  ctx.shadowColor = `hsla(190, 100%, 60%, ${0.3 + audioLevels.amplitude * 0.5})`
  ctx.shadowBlur = glow
  ctx.strokeStyle = `hsla(190, 100%, 70%, ${0.15 + audioLevels.bass * 0.3})`
  ctx.lineWidth = 2 + audioLevels.bass * 4

  ctx.beginPath()
  ctx.moveTo(outer[0][0], outer[0][1])
  for (let i = 1; i < outer.length; i++) {
    ctx.lineTo(outer[i][0], outer[i][1])
  }
  ctx.closePath()
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw the wireframe skeleton of the polygon with animated dash pattern.
 */
function drawWireframe(ctx, points, audioLevels, time) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // Animated dash
  const dashOffset = (time * 40) % 20
  ctx.setLineDash([6, 4])
  ctx.lineDashOffset = -dashOffset

  // Main wireframe
  ctx.strokeStyle = `hsla(190, 100%, 70%, ${0.5 + audioLevels.mid * 0.3})`
  ctx.lineWidth = 1.5 + audioLevels.bass * 2
  ctx.shadowColor = '#00f3ff'
  ctx.shadowBlur = 6 + audioLevels.bass * 10

  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.closePath()
  ctx.stroke()

  // Cross lines (diagonals)
  ctx.setLineDash([3, 8])
  ctx.strokeStyle = `hsla(280, 100%, 70%, ${0.2 + audioLevels.treble * 0.3})`
  ctx.lineWidth = 0.5
  ctx.shadowColor = '#b026ff'
  ctx.shadowBlur = 4

  if (points.length === 4) {
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    ctx.lineTo(points[2][0], points[2][1])
    ctx.moveTo(points[1][0], points[1][1])
    ctx.lineTo(points[3][0], points[3][1])
    ctx.stroke()
  }

  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Draw glowing vertex markers at each polygon point.
 */
function drawVertexMarkers(ctx, points, audioLevels, time) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]
    const pulse = Math.sin(time * 4 + i * 1.5) * 0.3 + 0.7
    const radius = 4 + audioLevels.bass * 6 + pulse * 2

    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
    gradient.addColorStop(0, `hsla(190, 100%, 70%, ${0.6 * pulse})`)
    gradient.addColorStop(0.5, `hsla(190, 100%, 60%, ${0.2 * pulse})`)
    gradient.addColorStop(1, 'hsla(190, 100%, 50%, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6)

    // Core dot
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(190, 100%, 85%, ${0.8 * pulse})`
    ctx.fill()

    // Ring
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(190, 100%, 70%, ${0.4 * pulse})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Cleanup pipeline resources.
 */
export function destroyPipeline() {
  if (shaderEngine) {
    shaderEngine.destroy()
    shaderEngine = null
  }
  if (matrixRain) {
    matrixRain.reset()
    matrixRain = null
  }
  if (particleSystem) {
    particleSystem.clear()
    particleSystem = null
  }
}

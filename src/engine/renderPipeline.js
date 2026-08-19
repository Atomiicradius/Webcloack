/**
 * renderPipeline.js — Main compositing pipeline.
 * Clips video feed inside polygon ROI, applies visual effects,
 * draws vibrating audio-reactive laser string borders, and particles.
 */

import { sortQuadClockwise, expandPolygon, centroid, dist2D } from './convexHull.js'
import { ShaderEngine } from './shaderEngine.js'
import { MatrixRain } from './matrixAscii.js'
import { ParticleSystem } from './particleSystem.js'
import { getTimeDomainData } from './audioEngine.js'

// ── Available filter modes (9 total) ────────────────────────────────
export const FILTERS = [
  { id: 'cloak',        label: 'INVISIBILITY',   shaderKey: null },
  { id: 'matrix',       label: 'MATRIX RAIN',    shaderKey: null },
  { id: 'thermal',      label: 'THERMAL',        shaderKey: 'thermal' },
  { id: 'edge',         label: 'EDGE SYNTH',     shaderKey: 'edge' },
  { id: 'pixelate',     label: 'PIXEL GLITCH',   shaderKey: 'pixelate' },
  { id: 'hearts',       label: 'HEART CROWN',    shaderKey: null },
  { id: 'fisheye',      label: 'FISH EYE',       shaderKey: 'fisheye' },
  { id: 'catwhiskers',  label: 'CAT WHISKERS',   shaderKey: null },
  { id: 'kaleidoscope', label: 'KALEIDOSCOPE',   shaderKey: 'kaleidoscope' },
]

// ── Pipeline singleton instances ────────────────────────────────────
let shaderEngine = null
let matrixRain = null
let particleSystem = null

// Matrix rain persistent canvas
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

  matrixCanvas = document.createElement('canvas')
  matrixCanvas.width = width
  matrixCanvas.height = height
  matrixCtx = matrixCanvas.getContext('2d')
}

/**
 * Render a single frame.
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

    // For overlay-only filters (hearts, cat whiskers), skip clipping
    const isOverlayFilter = filter === 'hearts' || filter === 'catwhiskers'

    if (!isOverlayFilter) {
      // ── 2a. Feathered edge + polygon clip ───────────────────────
      ctx.save()
      const expanded = expandPolygon(sorted, 8)
      drawFeatheredEdge(ctx, sorted, expanded, audioLevels)

      ctx.beginPath()
      ctx.moveTo(sorted[0][0], sorted[0][1])
      for (let i = 1; i < sorted.length; i++) {
        ctx.lineTo(sorted[i][0], sorted[i][1])
      }
      ctx.closePath()
      ctx.clip()

      // ── 2b. Render effect inside clip ───────────────────────────
      renderEffect(ctx, video, sorted, filter, intensity, bgImage, time, width, height)
      ctx.restore()
    } else {
      // Overlay filters: render directly on top of video
      renderEffect(ctx, video, sorted, filter, intensity, bgImage, time, width, height)
    }

    // ── 2c. Draw vibrating string wireframe ───────────────────────
    if (showWireframe) {
      drawVibratingWireframe(ctx, sorted, audioLevels, time)
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
  if (filter === 'cloak') {
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, width, height)
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(0, 243, 255, 0.3)'
      ctx.font = '16px "Orbitron", sans-serif'
      ctx.textAlign = 'center'
      const c = centroid(quad)
      ctx.fillText('CAPTURE BACKGROUND', c[0], c[1])
    }
  } else if (filter === 'matrix') {
    if (!matrixRain) matrixRain = new MatrixRain()
    if (matrixCanvas.width !== width || matrixCanvas.height !== height) {
      matrixCanvas.width = width
      matrixCanvas.height = height
      matrixRain.reset()
    }
    matrixRain.render(matrixCtx, video, width, height, intensity)
    ctx.drawImage(matrixCanvas, 0, 0)
  } else if (filter === 'hearts') {
    renderHeartCrown(ctx, quad, intensity, time)
  } else if (filter === 'catwhiskers') {
    renderCatWhiskers(ctx, quad, intensity, time)
  } else {
    // WebGL shader-based filters
    const filterDef = FILTERS.find((f) => f.id === filter)
    if (filterDef && filterDef.shaderKey && shaderEngine) {
      const result = shaderEngine.render(filterDef.shaderKey, video, intensity, time)
      ctx.drawImage(result, 0, 0, width, height)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// HEART CROWN FILTER
// ═══════════════════════════════════════════════════════════════════

const heartParticles = []

function renderHeartCrown(ctx, quad, intensity, time) {
  if (quad.length < 4) return

  // Find the top two points (smallest Y values = top of frame)
  const byY = [...quad].sort((a, b) => a[1] - b[1])
  const topLeft = byY[0]
  const topRight = byY[1]

  // Arch center and span
  const cx = (topLeft[0] + topRight[0]) / 2
  const cy = (topLeft[1] + topRight[1]) / 2
  const span = dist2D(topLeft, topRight)
  const archHeight = span * 0.4

  // Compute arch tilt angle
  const tiltAngle = Math.atan2(topRight[1] - topLeft[1], topRight[0] - topLeft[0])

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tiltAngle)

  // Draw arch of hearts
  const heartCount = 8 + Math.floor(intensity * 6)
  for (let i = 0; i < heartCount; i++) {
    const t = i / (heartCount - 1)
    const angle = Math.PI * t
    const hx = (t - 0.5) * span
    const hy = -Math.sin(angle) * archHeight

    // Pulsing animation
    const pulse = 0.8 + Math.sin(time * 3 + i * 0.7) * 0.3
    const size = (8 + intensity * 8) * pulse

    // Alternating pink/magenta
    const hue = i % 2 === 0 ? '#ff2d75' : '#ff75c3'

    drawHeart(ctx, hx, hy, size, hue, pulse * intensity)
  }

  // Emit sparkle particles floating upward
  if (Math.random() < 0.3 * intensity) {
    const t = Math.random()
    const angle = Math.PI * t
    const px = (t - 0.5) * span
    const py = -Math.sin(angle) * archHeight
    heartParticles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 1,
      vy: -1 - Math.random() * 2,
      life: 1.0,
      size: 2 + Math.random() * 3,
      hue: Math.random() > 0.5 ? '#ff2d75' : '#ff75c3',
    })
  }

  // Update and draw sparkle particles
  for (let i = heartParticles.length - 1; i >= 0; i--) {
    const p = heartParticles[i]
    p.x += p.vx
    p.y += p.vy
    p.life -= 0.02
    if (p.life <= 0) {
      heartParticles.splice(i, 1)
      continue
    }
    ctx.globalAlpha = p.life * 0.8
    ctx.shadowColor = p.hue
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fillStyle = p.hue
    ctx.fill()
  }
  // Cap particles
  while (heartParticles.length > 80) heartParticles.shift()

  ctx.restore()
}

function drawHeart(ctx, x, y, size, color, alpha) {
  ctx.save()
  ctx.globalAlpha = Math.min(alpha, 1)
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12

  const s = size / 15
  ctx.beginPath()
  ctx.moveTo(0 * s, -3 * s)
  ctx.bezierCurveTo(-5 * s, -10 * s, -14 * s, -4 * s, 0 * s, 8 * s)
  ctx.bezierCurveTo(14 * s, -4 * s, 5 * s, -10 * s, 0 * s, -3 * s)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════════
// CAT WHISKERS + EARS FILTER
// ═══════════════════════════════════════════════════════════════════

function renderCatWhiskers(ctx, quad, intensity, time) {
  if (quad.length < 4) return

  // Find the top two points for ears and compute quad geometry
  const byY = [...quad].sort((a, b) => a[1] - b[1])
  const topLeft = byY[0]
  const topRight = byY[1]
  const bottomLeft = byY[2]
  const bottomRight = byY[3]

  const cx = (topLeft[0] + topRight[0] + bottomLeft[0] + bottomRight[0]) / 4
  const cy = (topLeft[1] + topRight[1] + bottomLeft[1] + bottomRight[1]) / 4

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // ── Cat Ears (triangular neon outlines at top two points) ──────
  const earHeight = dist2D(topLeft, topRight) * 0.35
  const earWidth = earHeight * 0.5

  // Left ear
  drawCatEar(ctx, topLeft[0], topLeft[1], -earWidth, -earHeight, time, intensity)
  // Right ear
  drawCatEar(ctx, topRight[0], topRight[1], earWidth, -earHeight, time, intensity)

  // ── Nose marker (center of quad, slightly above center) ───────
  const noseX = cx
  const noseY = cy - (cy - (topLeft[1] + topRight[1]) / 2) * 0.2
  const noseSize = 6 + intensity * 4

  ctx.beginPath()
  ctx.moveTo(noseX, noseY - noseSize * 0.3)
  ctx.lineTo(noseX - noseSize * 0.5, noseY + noseSize * 0.3)
  ctx.lineTo(noseX + noseSize * 0.5, noseY + noseSize * 0.3)
  ctx.closePath()
  ctx.fillStyle = '#ff75c3'
  ctx.shadowColor = '#ff75c3'
  ctx.shadowBlur = 10
  ctx.fill()

  // ── Whiskers (3 on each side) ─────────────────────────────────
  const whiskerLength = dist2D(topLeft, topRight) * 0.35
  for (let side = -1; side <= 1; side += 2) {
    for (let w = 0; w < 3; w++) {
      const angleOffset = (w - 1) * 0.25
      const wobble = Math.sin(time * 3 + w * 1.5 + side) * 4 * intensity

      const startX = noseX + side * noseSize * 0.7
      const startY = noseY + noseSize * 0.1 + w * 3
      const endX = startX + side * whiskerLength
      const endY = startY + angleOffset * whiskerLength * 0.3 + wobble

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      // Slight curve
      const cpX = (startX + endX) / 2
      const cpY = (startY + endY) / 2 + wobble * 0.5
      ctx.quadraticCurveTo(cpX, cpY, endX, endY)

      const alpha = 0.6 + intensity * 0.4
      ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`
      ctx.lineWidth = 2
      ctx.shadowColor = '#00f3ff'
      ctx.shadowBlur = 8 + intensity * 6
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawCatEar(ctx, baseX, baseY, offsetX, offsetY, time, intensity) {
  const tipX = baseX + offsetX
  const tipY = baseY + offsetY
  const innerOffset = offsetX * 0.3

  // Animated glow pulse
  const pulse = 0.7 + Math.sin(time * 2.5) * 0.3

  ctx.beginPath()
  ctx.moveTo(baseX - innerOffset, baseY)
  ctx.lineTo(tipX, tipY)
  ctx.lineTo(baseX + innerOffset, baseY)

  ctx.strokeStyle = `rgba(176, 38, 255, ${pulse * intensity})`
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#b026ff'
  ctx.shadowBlur = 12 + intensity * 8
  ctx.stroke()

  // Inner fill
  ctx.fillStyle = `rgba(176, 38, 255, ${0.08 * intensity * pulse})`
  ctx.fill()
}

// ═══════════════════════════════════════════════════════════════════
// VIBRATING LASER STRING WIREFRAME
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw edges as vibrating waveform strings displaced by real-time audio.
 * Each edge is subdivided into segments, with perpendicular displacement
 * driven by the time-domain audio buffer.
 */
function drawVibratingWireframe(ctx, points, audioLevels, time) {
  const waveform = getTimeDomainData()
  const hasAudio = waveform.length > 0 && audioLevels.amplitude > 0.01
  const segments = 48

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    // Edge direction and perpendicular normal
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const edgeLen = Math.sqrt(dx * dx + dy * dy)
    if (edgeLen < 1) continue

    const nx = -dy / edgeLen  // perpendicular normal X
    const ny = dx / edgeLen   // perpendicular normal Y

    // Max displacement amplitude, scaled by audio energy
    const maxDisp = hasAudio
      ? (8 + audioLevels.bass * 25 + audioLevels.amplitude * 15)
      : 0

    // Build displaced path
    ctx.beginPath()
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const baseX = p1[0] + dx * t
      const baseY = p1[1] + dy * t

      let displacement = 0
      if (hasAudio && waveform.length > 0) {
        // Sample the waveform buffer along this edge
        const wIdx = Math.floor(t * (waveform.length - 1))
        const sample = (waveform[wIdx] - 128) / 128  // -1..1
        displacement = sample * maxDisp

        // Taper at endpoints so strings stay anchored at vertices
        const taper = Math.sin(t * Math.PI)
        displacement *= taper
      }

      const px = baseX + nx * displacement
      const py = baseY + ny * displacement

      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }

    // Glow intensity based on audio
    const glowAlpha = hasAudio ? (0.5 + audioLevels.amplitude * 0.5) : 0.4
    const glowBlur = hasAudio ? (6 + audioLevels.bass * 20) : 4

    // Primary laser line
    ctx.strokeStyle = `hsla(190, 100%, 70%, ${glowAlpha})`
    ctx.lineWidth = hasAudio ? (1.5 + audioLevels.bass * 2) : 1.2
    ctx.shadowColor = '#00f3ff'
    ctx.shadowBlur = glowBlur
    ctx.stroke()

    // Secondary purple ghost line (slight offset)
    if (hasAudio && audioLevels.amplitude > 0.05) {
      ctx.strokeStyle = `hsla(280, 100%, 60%, ${glowAlpha * 0.4})`
      ctx.lineWidth = 0.8
      ctx.shadowColor = '#b026ff'
      ctx.shadowBlur = glowBlur * 0.5
      ctx.stroke()
    }
  }

  // Cross diagonals (static, dashed)
  if (points.length === 4) {
    const dashOffset = (time * 40) % 20
    ctx.setLineDash([3, 8])
    ctx.lineDashOffset = -dashOffset
    ctx.strokeStyle = `hsla(280, 100%, 70%, ${0.15 + audioLevels.treble * 0.2})`
    ctx.lineWidth = 0.5
    ctx.shadowColor = '#b026ff'
    ctx.shadowBlur = 4

    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    ctx.lineTo(points[2][0], points[2][1])
    ctx.moveTo(points[1][0], points[1][1])
    ctx.lineTo(points[3][0], points[3][1])
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()
}

/**
 * Draw feathered/glowing edge around the polygon.
 */
function drawFeatheredEdge(ctx, inner, outer, audioLevels) {
  const glow = 4 + audioLevels.bass * 20

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

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
 * Draw glowing vertex markers at each polygon point.
 */
function drawVertexMarkers(ctx, points, audioLevels, time) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]
    const pulse = Math.sin(time * 4 + i * 1.5) * 0.3 + 0.7
    const radius = 4 + audioLevels.bass * 6 + pulse * 2

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
    gradient.addColorStop(0, `hsla(190, 100%, 70%, ${0.6 * pulse})`)
    gradient.addColorStop(0.5, `hsla(190, 100%, 60%, ${0.2 * pulse})`)
    gradient.addColorStop(1, 'hsla(190, 100%, 50%, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6)

    ctx.beginPath()
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(190, 100%, 85%, ${0.8 * pulse})`
    ctx.fill()

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

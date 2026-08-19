/**
 * particleSystem.js — Canvas 2D particle emitter for vertex sparks.
 * Emits particles at polygon vertices on audio beats for reactive HUD effects.
 */

export class ParticleSystem {
  constructor() {
    this.particles = []
    this.maxParticles = 500
  }

  /**
   * Emit spark particles at a given position.
   */
  emit(x, y, count = 8, color = null) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 4
      const hue = color || (180 + Math.random() * 60) // cyan-to-purple range
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.03,
        size: 1 + Math.random() * 3,
        hue,
      })
    }
  }

  /**
   * Emit particles along a polygon edge for audio-reactive glow.
   */
  emitAlongPolygon(points, count = 4) {
    if (!points || points.length < 2) return
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * points.length)
      const next = (idx + 1) % points.length
      const t = Math.random()
      const x = points[idx][0] + (points[next][0] - points[idx][0]) * t
      const y = points[idx][1] + (points[next][1] - points[idx][1]) * t
      this.emit(x, y, 2, 190 + Math.random() * 40)
    }
  }

  /**
   * Update all particles (physics step).
   */
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.97
      p.vy *= 0.97
      p.vy += 0.02 // tiny gravity
      p.life -= p.decay

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  /**
   * Render all particles to the given 2D context.
   */
  render(ctx) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    for (const p of this.particles) {
      const alpha = p.life * 0.8
      const size = p.size * p.life
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`
      ctx.fill()

      // Glow
      if (size > 1.5) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.2})`
        ctx.fill()
      }
    }

    ctx.restore()
  }

  clear() {
    this.particles = []
  }
}

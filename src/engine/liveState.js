/**
 * liveState.js — Tiny module-level store for values that change every frame.
 *
 * The render loop and gesture loop read/write these directly so they never
 * pass through React state at 60 Hz. React UI (slider thumb, AudioVisualizer,
 * HUD) polls this store at a throttled rate instead.
 */

export const ZERO_LEVELS = Object.freeze({ bass: 0, mid: 0, treble: 0, amplitude: 0 })

export const live = {
  /** Effect intensity 0..1. Written by the slider and by the gesture loop. */
  intensity: 0.5,
  /** Latest audio band levels. Written by the render loop. */
  audioLevels: ZERO_LEVELS,
}

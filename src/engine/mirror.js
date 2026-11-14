/**
 * mirror.js — The ONLY place the selfie mirror is applied.
 *
 * Two halves of the same transform live here so they can never disagree:
 *  - drawCameraImage(): every raw camera image (the live video frame and the
 *    captured cloak background) is drawn through this, flipped horizontally
 *    when mirroring is on.
 *  - mirrorX(): every landmark x (normalised 0..1) goes through this before
 *    it reaches quad / filter / gesture logic, so landmarks live in the same
 *    (on-screen) space as the drawn image.
 *
 * Everything else (wireframe, particles, text, HUD) is drawn in screen space
 * with no transform, so text is never mirrored. Snapshots and recordings read
 * the output canvas, so they match the screen.
 *
 * Handedness: MediaPipe labels assume a mirrored selfie image, but it always
 * sees the raw (unmirrored) video, so its labels describe the raw frame and
 * do not change with this setting. Quad pairing only needs one hand of each
 * label, which is orientation independent.
 */

let enabled = true

export function setMirror(value) {
  enabled = !!value
}

export function isMirrored() {
  return enabled
}

/** Landmark x (0..1) in on-screen space. */
export function mirrorX(x) {
  return enabled ? 1 - x : x
}

/** Draw a raw camera image (video or captured background) in on-screen space. */
export function drawCameraImage(ctx, image, width, height) {
  if (!enabled) {
    ctx.drawImage(image, 0, 0, width, height)
    return
  }
  ctx.save()
  ctx.setTransform(-1, 0, 0, 1, width, 0)
  ctx.drawImage(image, 0, 0, width, height)
  ctx.restore()
}

/**
 * orbHues.js — Gel-orb hue shift per filter position (app dock and landing
 * selector share it). Kept inside the blue family: aqua ... violet.
 */
export const ORB_HUES = [0, -40, 40, -20, 24, -55, 55]

export function orbHue(index) {
  return ORB_HUES[index % ORB_HUES.length]
}

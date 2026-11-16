/**
 * LiquidMetalBlob.jsx — Paper Shaders `LiquidMetal` in the landing palette.
 * Loaded lazily (its own chunk) by LiquidBlob.jsx, never on first paint.
 * Black background so the parent's screen blend drops it like the PNG.
 */

import { LiquidMetal } from '@paper-design/shaders-react'

export default function LiquidMetalBlob() {
  return (
    <LiquidMetal
      className="lp-blob__shader"
      style={{ width: '100%', height: '100%' }}
      colorBack="#000000"
      colorTint="#8A5CFF"
      shape="metaballs"
      repetition={4}
      softness={0.12}
      shiftRed={0.25}
      shiftBlue={0.7}
      distortion={0.25}
      contour={0.8}
      angle={70}
      speed={0.55}
      scale={1.35}
      fit="contain"
      maxPixelCount={1100 * 733}
    />
  )
}

/**
 * AppScene.jsx — Decorative backdrop of the app screen: perspective floor,
 * faint wireframe globe, orbit star, sparkles and the ticker band. All idle
 * motion is cheap CSS (no render-loop or React-state driven animation).
 */

import { memo } from 'react'
import { GridFloor, OrbitStar, Sparkle, Ticker, WireGlobe } from '../chrome/Decor.jsx'

const TICKER = [
  'tracks 4 hands',
  'invisibility cloak',
  'pinch to switch filters',
  'runs in your browser',
  'no upload',
  'press ? for shortcuts',
]

// [left %, top %, size, colour, delay s]
const SPARKLES = [
  [29, 6, 30, 'var(--white)', 0],
  [69, 12, 20, 'var(--ice)', 0.9],
  [2.4, 76, 38, 'var(--white)', 1.6],
  [56, 92, 18, 'var(--white)', 0.4],
  [97, 58, 22, 'var(--ice)', 2.1],
]

function AppScene() {
  return (
    <div className="ap-scene" aria-hidden="true">
      <div className="ap-scene__floor"><GridFloor /></div>
      <div className="ap-scene__globe"><WireGlobe spin /></div>
      <div className="ap-scene__orbit ch-screen" data-boot-in><OrbitStar /></div>
      {SPARKLES.map(([x, y, size, color, d]) => (
        <span key={`${x}-${y}`} className="ap-scene__spark" style={{ left: `${x}%`, top: `${y}%` }}>
          <Sparkle size={size} color={color} className="ch-sparkle--twinkle" style={{ '--d': `${d}s` }} />
        </span>
      ))}
      <Ticker items={TICKER} css className="ap-scene__ticker" />
    </div>
  )
}

export default memo(AppScene)

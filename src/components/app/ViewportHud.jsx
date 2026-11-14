/**
 * ViewportHud.jsx — Mint VT323 overlays on the camera viewport:
 * recording timer (top-left), hands count (top-right), gesture hint
 * (bottom-left) and the active filter caption (bottom-right).
 */

import { memo, useEffect, useState } from 'react'

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Owns its own ticking so the rest of the app doesn't re-render each second. */
function RecTimer({ startedAt }) {
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  return <span>rec {formatElapsed(now - startedAt)}</span>
}

function ViewportHud({ isRecording, recordStartedAt, handsCount, filter }) {
  const caption = filter
    ? filter.hudLabel && filter.hudLabel !== filter.label
      ? `${filter.label} / ${filter.hudLabel}`.toLowerCase()
      : filter.label.toLowerCase()
    : ''

  return (
    <>
      {isRecording && recordStartedAt != null && (
        <div className="wc-hud wc-hud--tl">
          <span className="wc-hud__rec-dot" aria-hidden="true" />
          <RecTimer startedAt={recordStartedAt} />
        </div>
      )}
      <div className="wc-hud wc-hud--tr">hands {handsCount} / 4</div>
      <div className="wc-hud wc-hud--bl">pinch to scale / quick pinch to switch</div>
      {caption && <div className="wc-hud wc-hud--br">{caption}</div>}
    </>
  )
}

export default memo(ViewportHud)

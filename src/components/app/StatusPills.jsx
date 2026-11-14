/**
 * StatusPills.jsx — live / paused, hands count and fps (real values,
 * refreshed by the app's 10 Hz UI sync).
 */

import { memo } from 'react'

function StatusPills({ state, handsCount, fps, audioEnabled }) {
  const label = state === 'live' ? 'live' : state === 'starting' ? 'starting' : 'paused'
  return (
    <ul className="ap-pills" aria-label="status" data-boot-in>
      <li className={`ap-pill ap-pill--state ap-pill--${state}`}>
        <span aria-hidden="true">{state === 'live' ? '●' : state === 'starting' ? '◌' : '❚❚'}</span> {label}
      </li>
      <li className="ap-pill">hands {handsCount} / 4</li>
      <li className="ap-pill ap-pill--ice">fps {fps}</li>
      {audioEnabled && <li className="ap-pill ap-pill--ice">mic on</li>}
    </ul>
  )
}

export default memo(StatusPills)

/**
 * TrackingBanner.jsx — Non-blocking notice when hand tracking fails to load.
 */

import { Button, ErrorIcon, Panel } from '../win98/index.js'

export default function TrackingBanner({ onRetry }) {
  return (
    <Panel variant="raised" className="ap-banner" role="alert">
      <span aria-hidden="true"><ErrorIcon size={24} /></span>
      <span className="ap-banner__text">hand tracking failed to load. filters still work without it.</span>
      <Button onClick={onRetry}>retry</Button>
    </Panel>
  )
}

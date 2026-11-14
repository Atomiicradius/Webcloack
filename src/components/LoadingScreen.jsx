/**
 * LoadingScreen.jsx — Win98 loading dialog: indeterminate segmented progress
 * bar plus terminal-style status lines driven by the real loading state.
 */

import { memo } from 'react'
import { AppIcon, MessageBox, ProgressBar } from './win98/index.js'

function line(label, state) {
  return `${label} ... ${state}`.trimEnd()
}

function LoadingScreen({ visible, cameraReady, trackingReady, trackingFailed }) {
  if (!visible) return null

  const lines = [line('requesting camera', cameraReady ? 'ok' : '')]
  if (cameraReady) {
    // Shaders compile synchronously when the pipeline initialises on camera-ready
    lines.push(line('compiling shaders', 'ok'))
    lines.push(line('loading hand model', trackingReady ? 'ok' : trackingFailed ? 'failed' : ''))
  }

  return (
    <div className="wc-overlay">
      <MessageBox title="loading webcloak" icon={<AppIcon size={32} />} aria-busy="true">
        <div className="wc-loading">
          <ProgressBar label="loading" />
          <div className="wc-terminal" aria-live="polite">
            {lines.map((l) => <div key={l}>{l}</div>)}
          </div>
        </div>
      </MessageBox>
    </div>
  )
}

export default memo(LoadingScreen)

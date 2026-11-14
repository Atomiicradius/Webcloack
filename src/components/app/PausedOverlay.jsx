/**
 * PausedOverlay.jsx — Shown inside the viewport while the camera is paused
 * (or re-acquiring after resume).
 */

import { Button, CameraIcon, MessageBox, ProgressBar } from '../win98/index.js'

export default function PausedOverlay({ resuming, autoPaused, onResume }) {
  return (
    <div className="wc-paused">
      {resuming ? (
        <MessageBox title="camera" icon={<CameraIcon />} role="status">
          <div className="wc-panel__stack">
            <p>starting camera ...</p>
            <ProgressBar label="starting camera" />
          </div>
        </MessageBox>
      ) : (
        <MessageBox
          title="camera paused"
          icon={<CameraIcon />}
          role="status"
          buttons={<Button variant="default" onClick={onResume}>resume camera</Button>}
        >
          <p>{autoPaused ? 'paused while this tab was hidden.' : 'the camera is off.'}</p>
        </MessageBox>
      )}
    </div>
  )
}

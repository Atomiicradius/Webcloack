/**
 * BootScreen.jsx — "cloak.exe" boot dialog shown over /app.
 *
 * Purely presentational: CameraApp passes the REAL state of each task
 * (hand model, camera permission, shaders, first frame). Lines type out as
 * their task starts and the progress bar only counts finished tasks.
 *
 * phase: 'idle'   — waiting for the user to press start (direct visit)
 *        'boot'   — tasks running
 *        'error'  — camera failed; same dialog style, retry button
 */

import { forwardRef } from 'react'
import { Button, CameraIcon, ErrorIcon, ProgressBar, TitleBarButton, Window } from '../win98/index.js'
import { WireGlobe } from '../chrome/Decor.jsx'
import './boot.css'

const ERROR_MESSAGES = {
  NotAllowedError: 'camera access was blocked. allow the camera for this site in your browser settings, then retry.',
  NotFoundError: 'no camera found. connect one, then retry.',
  NotReadableError: 'the camera is busy or could not be read. close other apps using it, then retry.',
  NotSupportedError: 'this browser cannot use the camera here. it needs https or localhost.',
}

const LINE_WIDTH = 30 // label + dot leader, in characters

const STATUS_TEXT = {
  pending: '',
  active: 'waiting',
  ok: 'ok',
  fail: 'failed',
}

function BootLine({ label, state, detail }) {
  const lead = `> ${label} ${'.'.repeat(Math.max(3, LINE_WIDTH - label.length))}`
  const status = detail || STATUS_TEXT[state]
  return (
    <li className={`bt-line bt-line--${state}`} style={{ '--n': lead.length }}>
      <span className="bt-line__lead">{lead}</span>
      <span className="bt-line__status"> {status}</span>
    </li>
  )
}

const BootScreen = forwardRef(function BootScreen({
  phase,
  lines,
  progress,
  error,
  onStart,
  onRetry,
  onCancel,
}, ref) {
  const isError = phase === 'error'
  const known = Boolean(ERROR_MESSAGES[error?.name])

  return (
    <div className="bt" ref={ref}>
      <div className="bt-globe" aria-hidden="true"><WireGlobe spin ring /></div>
      <div className="bt-flash" aria-hidden="true" />

      <Window
        className="bt-dialog"
        title={isError ? 'cloak.exe - camera error' : 'cloak.exe'}
        titleAs="h1"
        role={isError ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        controls={(
          <TitleBarButton onClick={onCancel} aria-label="close and go back to the landing page">×</TitleBarButton>
        )}
      >
        {isError ? (
          <div className="bt-body">
            <div className="bt-error">
              <span className="bt-error__icon" aria-hidden="true"><ErrorIcon /></span>
              <div className="bt-error__text">
                <p>{ERROR_MESSAGES[error?.name] || 'the camera could not start.'}</p>
                {!known && error?.message && <p>{error.message.toLowerCase()}</p>}
                <p className="bt-muted">error: {error?.name || 'unknown'}</p>
              </div>
            </div>
            <div className="bt-buttons">
              <Button onClick={onCancel}>back</Button>
              <Button variant="default" onClick={onRetry} autoFocus>retry</Button>
            </div>
          </div>
        ) : (
          <div className="bt-body">
            {phase === 'idle' ? (
              <div className="bt-intro">
                <span className="bt-intro__icon" aria-hidden="true"><CameraIcon /></span>
                <p>
                  webcloak needs your camera. it runs locally in this browser and nothing is uploaded.
                </p>
              </div>
            ) : (
              <p>starting webcloak. hands up when the bar fills.</p>
            )}

            <ol className="bt-terminal" aria-live="polite" aria-label="boot log">
              {phase === 'idle' && <li className="bt-line bt-line--idle">&gt; press start to turn the camera on_</li>}
              {lines.filter((l) => l.state !== 'pending').map((l) => (
                <BootLine key={l.id} {...l} />
              ))}
            </ol>

            <ProgressBar value={(progress / 4) * 100} label="boot progress" className="bt-progress" />

            <div className="bt-buttons">
              <Button onClick={onCancel}>cancel</Button>
              {phase === 'idle' && (
                <Button variant="default" onClick={onStart} autoFocus>start ▶</Button>
              )}
            </div>
          </div>
        )}
      </Window>
    </div>
  )
})

export default BootScreen

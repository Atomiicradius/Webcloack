/**
 * CameraGate.jsx — Placeholder start / error screen shown before the camera runs.
 * Plain markup reusing existing styles; will be restyled later.
 */

const ERROR_MESSAGES = {
  NotAllowedError: 'Camera permission was denied. Allow camera access for this site in your browser settings, then try again.',
  NotFoundError: 'No camera was found. Connect a camera and try again.',
  NotReadableError: 'The camera is in use by another app or could not be read. Close other apps using it, then try again.',
}

function describeError(error) {
  const specific = ERROR_MESSAGES[error?.name]
  if (specific) return specific
  return `Could not start the camera${error?.message ? `: ${error.message}` : '.'}`
}

const wrapperStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '0 16px',
}

export default function CameraGate({ status, error, onStart }) {
  const isError = status === 'error'

  return (
    <div style={wrapperStyle}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '24px',
        background: 'linear-gradient(135deg, #00f3ff, #b026ff)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        WEBCLOAK
      </h1>

      {isError ? (
        <>
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px', maxWidth: '480px' }}>
            {describeError(error)}
          </p>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {error?.name}
          </p>
        </>
      ) : (
        <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          Webcloak needs your camera. Nothing is recorded or uploaded.
        </p>
      )}

      <button className="capture-btn" onClick={onStart} id="start-camera-btn">
        {isError ? 'Try again' : 'Start camera'}
      </button>
    </div>
  )
}

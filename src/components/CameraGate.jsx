/**
 * CameraGate.jsx — Start and error dialogs shown before the camera runs.
 * Win98 MessageBoxes on the desktop background.
 */

import { Button, CameraIcon, ErrorIcon, MessageBox } from './win98/index.js'

const ERROR_MESSAGES = {
  NotAllowedError: 'camera access was blocked. allow the camera for this site in your browser settings, then try again.',
  NotFoundError: 'no camera found. connect one, then try again.',
  NotReadableError: 'the camera is busy or could not be read. close other apps using it, then try again.',
}

function describeError(error) {
  return ERROR_MESSAGES[error?.name] || 'the camera could not start.'
}

export default function CameraGate({ status, error, onStart }) {
  if (status === 'error') {
    const known = Boolean(ERROR_MESSAGES[error?.name])
    return (
      <MessageBox
        role="alertdialog"
        title="webcloak.exe - camera error"
        icon={<ErrorIcon />}
        buttons={<Button variant="default" onClick={onStart} autoFocus>try again</Button>}
      >
        <p>{describeError(error)}</p>
        {!known && error?.message && <p>{error.message.toLowerCase()}</p>}
        <p>error: {error?.name || 'unknown'}</p>
      </MessageBox>
    )
  }

  return (
    <MessageBox
      role="dialog"
      title="webcloak.exe"
      icon={<CameraIcon />}
      buttons={<Button variant="default" onClick={onStart} autoFocus>start camera</Button>}
    >
      <p>webcloak needs your camera.</p>
      <p>it runs locally in this browser. nothing is uploaded.</p>
    </MessageBox>
  )
}

/**
 * Toasts.jsx — Small MessageBox notices, bottom-right, auto-dismissed by
 * the caller. The container is a persistent polite live region.
 */

import { memo } from 'react'
import { ErrorIcon, InfoIcon, MessageBox } from '../win98/index.js'

function Toasts({ toasts }) {
  return (
    <div className="ap-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <MessageBox
          key={toast.id}
          role="status"
          title="webcloak"
          className="ap-toast"
          icon={toast.type === 'error' ? <ErrorIcon size={24} /> : <InfoIcon size={24} />}
        >
          {toast.message}
        </MessageBox>
      ))}
    </div>
  )
}

export default memo(Toasts)

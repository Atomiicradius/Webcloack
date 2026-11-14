/**
 * Taskbar.jsx — Desktop taskbar: decorative start band and task tab
 * (aria-hidden, not focusable) plus a real clock.
 */

import { memo, useEffect, useState } from 'react'
import { AppIcon, StatusField } from '../win98/index.js'

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <StatusField className="wc-taskbar__clock">
      <time dateTime={now.toISOString()}>{formatClock(now)}</time>
    </StatusField>
  )
}

function Taskbar() {
  return (
    <div className="wc-taskbar">
      <span className="wc-taskbar__start" aria-hidden="true">start</span>
      <span className="wc-taskbar__tab" aria-hidden="true">
        <AppIcon />
        webcloak.exe
      </span>
      <Clock />
    </div>
  )
}

export default memo(Taskbar)

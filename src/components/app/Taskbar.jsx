/**
 * Taskbar.jsx — Shown while the window is minimized. Its tab is a real
 * button: it restores the window and resumes the camera.
 */

import { forwardRef } from 'react'
import { AppIcon } from '../win98/index.js'

const Taskbar = forwardRef(function Taskbar({ onRestore }, ref) {
  return (
    <div className="ap-taskbar">
      <button ref={ref} type="button" className="ap-taskbar__tab" onClick={onRestore}>
        <span className="ap-taskbar__icon" aria-hidden="true"><AppIcon /></span>
        <span>webcloak.exe</span>
        <span className="ap-taskbar__state">camera paused. click to restore</span>
      </button>
    </div>
  )
})

export default Taskbar

/**
 * ShortcutsDialog.jsx — Modal MessageBox listing keyboard shortcuts.
 * Focus moves to "close" on open; Escape and the button close it; Tab stays
 * inside. The caller restores focus to the opener.
 */

import { useEffect, useRef } from 'react'
import { Button, InfoIcon, MessageBox } from '../win98/index.js'

export default function ShortcutsDialog({ shortcuts, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Tab') {
      // Only one focusable control: keep focus on it
      e.preventDefault()
      closeRef.current?.focus()
    }
  }

  return (
    <div className="wc-modal" onKeyDown={handleKeyDown}>
      <MessageBox
        role="dialog"
        title="keyboard shortcuts"
        icon={<InfoIcon />}
        buttons={<Button ref={closeRef} variant="default" onClick={onClose}>close</Button>}
      >
        <dl className="wc-shortcuts w98-sunken">
          {shortcuts.map(([keys, action]) => (
            <div key={keys} style={{ display: 'contents' }}>
              <dt><kbd className="wc-kbd">{keys}</kbd></dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </MessageBox>
    </div>
  )
}

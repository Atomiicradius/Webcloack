/**
 * FilterTools.jsx — Filter tool grid built from the registry.
 * Selected filter is drawn sunken (aria-pressed). Number keys still select
 * filters (handled in CameraApp); the key is shown faintly on each button.
 */

import { memo } from 'react'
import { ToolButton } from '../win98/index.js'
import { FILTERS } from '../../engine/filters.js'

function FilterTools({ activeFilter, onSelect, children }) {
  return (
    <nav className="wc-tools" aria-label="filters">
      <div className="wc-tools__grid">
        {FILTERS.map((f, idx) => {
          const Icon = f.icon
          const key = idx < 9 ? String(idx + 1) : null
          return (
            <ToolButton
              key={f.id}
              icon={Icon ? <Icon size={22} /> : null}
              label={f.label.toLowerCase()}
              hint={key}
              aria-keyshortcuts={key ?? undefined}
              pressed={activeFilter === f.id}
              onClick={() => onSelect(f.id)}
            />
          )
        })}
      </div>
      {children && <div className="wc-tools__extra">{children}</div>}
    </nav>
  )
}

export default memo(FilterTools)

/**
 * FilterDock.jsx — Gel-orb filter buttons, driven by the filter registry.
 *
 * Each button is itself the screen-blended element (the gel-orb PNG has a
 * black background), so its hover scale and idle bob never isolate the
 * blend. The dock container must not create a stacking context.
 */

import { memo } from 'react'
import { FILTERS } from '../../engine/filters.js'
import { GelOrb } from '../chrome/Decor.jsx'
import { orbHue } from '../chrome/orbHues.js'

function FilterDock({ activeFilter, onSelect }) {
  return (
    <nav className="ap-dock" aria-label="filters">
      <ul className="ap-dock__list">
        {FILTERS.map((f, i) => {
          const Icon = f.icon
          const active = f.id === activeFilter
          return (
            <li key={f.id} className="ap-dock__item">
              <button
                type="button"
                className={`ap-orb ch-screen${active ? ' ap-orb--active' : ''}`}
                style={{ '--i': i }}
                aria-pressed={active}
                aria-label={f.label.toLowerCase().includes(f.short) ? f.label.toLowerCase() : `${f.short}, ${f.label.toLowerCase()}`}
                aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}
                title={`${f.label.toLowerCase()} (${i + 1})`}
                onClick={() => onSelect(f.id)}
                data-boot-in
              >
                <span className="ap-orb__ball">
                  <GelOrb hue={orbHue(i)} className="ap-orb__img" />
                  <span className="ap-orb__icon" aria-hidden="true"><Icon size={26} /></span>
                </span>
                <span className="ap-orb__label" aria-hidden="true">{f.short}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default memo(FilterDock)

/**
 * FilterShowcase.jsx — Filters section: a large preview stage (left) and a
 * gel-orb selector (right), both driven by the filter registry.
 *
 * - Selecting an orb crossfades the stage (GSAP) and updates the caption.
 * - Auto-advances every ~4s while the section is on screen, until the user
 *   interacts (or presses pause). Off entirely with reduced motion.
 * - The selector is a radiogroup with a roving tabindex: arrow keys / Home /
 *   End move the selection, the focus ring follows.
 * - Stage art: public/assets/filters/<id>.png when it exists (build-time
 *   check), framed with screen corners and scanlines; otherwise a
 *   typographic state (the filter name, huge, with a slow moving gradient).
 *
 * Each orb button is itself the screen-blended element (gel-orb.png has a
 * black background); nothing between it and the section background may
 * create a stacking context.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { FILTERS } from '../../engine/filters.js'
import { GelOrb } from '../../components/chrome/Decor.jsx'
import { orbHue } from '../../components/chrome/orbHues.js'
import { FILTER_IMAGES } from './filterImages.js'

const AUTO_MS = 4000

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function StageLayer({ filter, active }) {
  const src = FILTER_IMAGES[filter.id]
  return (
    <div className={`lp-fx__layer${active ? ' is-active' : ''}${src ? ' lp-fx__layer--image' : ''}`} aria-hidden={!active}>
      {src ? (
        <>
          <img className="lp-fx__img" src={src} alt={`${filter.label.toLowerCase()} filter preview`} loading="lazy" decoding="async" />
          <span className="lp-fx__scan" aria-hidden="true" />
          <span className="lp-fx__corners" aria-hidden="true"><i /><i /><i /><i /></span>
        </>
      ) : (
        <p className="lp-fx__word" aria-hidden="true">{filter.label}</p>
      )}
    </div>
  )
}

export default function FilterShowcase() {
  const rootRef = useRef(null)
  const radiosRef = useRef([])
  const prevRef = useRef(0)
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [onScreen, setOnScreen] = useState(false)

  // Only auto-advance while the section is visible
  useEffect(() => {
    const el = rootRef.current
    if (!el || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = auto && onScreen && !prefersReducedMotion()
  useEffect(() => {
    if (!running) return undefined
    const t = setTimeout(() => setActive((i) => (i + 1) % FILTERS.length), AUTO_MS)
    return () => clearTimeout(t)
  }, [running, active])

  const stopAuto = useCallback(() => setAuto(false), [])

  // Crossfade the stage on every change (layout effect, before paint)
  useGSAP(() => {
    const layers = gsap.utils.toArray('.lp-fx__layer')
    const from = prevRef.current
    if (from === active) {
      gsap.set(layers, { autoAlpha: (i) => (i === active ? 1 : 0) })
      return
    }
    prevRef.current = active
    if (prefersReducedMotion()) {
      gsap.set(layers, { autoAlpha: (i) => (i === active ? 1 : 0) })
      return
    }
    gsap.timeline()
      .to(layers[from], { autoAlpha: 0, scale: 0.98, duration: 0.45, ease: 'power2.in' }, 0)
      .fromTo(layers[active],
        { autoAlpha: 0, scale: 1.05, filter: 'brightness(1.6)' },
        { autoAlpha: 1, scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'power2.out', clearProps: 'filter' }, 0.12)
      .fromTo('.lp-fx__caption > *', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05 }, 0.15)
  }, { dependencies: [active], scope: rootRef })

  const select = (i, focus = false) => {
    stopAuto()
    setActive(i)
    if (focus) radiosRef.current[i]?.focus()
  }

  const onKeyDown = (e) => {
    const last = FILTERS.length - 1
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = active === last ? 0 : active + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = active === 0 ? last : active - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    select(next, true)
  }

  const filter = FILTERS[active]
  const number = String(active + 1).padStart(2, '0')

  return (
    <section className="lp-filters" id="filters" aria-labelledby="lp-filters-title" ref={rootRef}>
      <header className="lp-sec-head">
        <h2 id="lp-filters-title" className="lp-h2">filters</h2>
        <p className="lp-sec-head__sub">{FILTERS.length} live effects, all running in your browser.</p>
      </header>

      <div className="lp-fx">
        <div className="lp-fx__main">
          <div className="lp-fx__stage lp-glass">
            {FILTERS.map((f, i) => <StageLayer key={f.id} filter={f} active={i === active} />)}
          </div>
          <div className="lp-fx__caption" aria-live="polite">
            <p className="lp-fx__num">filter {number}</p>
            <h3 className="lp-fx__title">{filter.label.toLowerCase()}</h3>
            <p className="lp-fx__desc">{filter.description.toLowerCase()}.</p>
            <p className="lp-fx__key">press <kbd>{active + 1}</kbd> in the app</p>
          </div>
        </div>

        <div className="lp-fx__side">
          <div
            className="lp-fx__orbs"
            role="radiogroup"
            aria-label="choose a filter"
            onKeyDown={onKeyDown}
            onPointerDown={stopAuto}
          >
            {FILTERS.map((f, i) => {
              const Icon = f.icon
              const checked = i === active
              return (
                <button
                  key={f.id}
                  ref={(el) => { radiosRef.current[i] = el }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={f.label.toLowerCase().includes(f.short) ? f.label.toLowerCase() : `${f.short}, ${f.label.toLowerCase()}`}
                  tabIndex={checked ? 0 : -1}
                  className={`lp-orb ch-screen${checked ? ' is-active' : ''}`}
                  onClick={() => select(i)}
                >
                  <span className="lp-orb__ball" aria-hidden="true">
                    <GelOrb hue={orbHue(i)} className="lp-orb__img" />
                    <span className="lp-orb__icon"><Icon size={24} /></span>
                  </span>
                  <span className="lp-orb__label">{f.short}</span>
                </button>
              )
            })}
          </div>

          <div className="lp-fx__auto">
            <span className="lp-fx__timer" aria-hidden="true">
              {running && <span key={active} className="lp-fx__timer-fill" style={{ '--t': `${AUTO_MS}ms` }} />}
            </span>
            <button type="button" className="lp-fx__pause" onClick={() => setAuto((a) => !a)} aria-pressed={!auto}>
              {auto ? 'pause tour' : 'play tour'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

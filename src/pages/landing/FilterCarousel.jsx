/**
 * FilterCarousel.jsx — Horizontal row of filter cards from the registry.
 *
 * Native horizontal scroll with snap (touch swipe for free), arrow buttons,
 * dots, and mouse drag. The active index only changes React state when it
 * actually changes (scroll is rAF-throttled), never per frame.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FILTERS } from '../../engine/filters.js'
import { FILTER_IMAGES } from './filterImages.js'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function CardMedia({ filter }) {
  const src = FILTER_IMAGES[filter.id]
  if (src) {
    return <img className="lp-card__img" src={src} alt="" loading="lazy" decoding="async" />
  }
  // Placeholder tile: blue gradient + subtle grid + the filter's own icon
  const Icon = filter.icon
  return (
    <div className="lp-card__placeholder" aria-hidden="true">
      <Icon size={44} />
    </div>
  )
}

export default function FilterCarousel() {
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const [active, setActive] = useState(0)
  const [edges, setEdges] = useState({ atStart: true, atEnd: false })
  const { atStart, atEnd } = edges

  const scrollToIndex = useCallback((i) => {
    const track = trackRef.current
    const card = track?.children[i]
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  // Active card = the one whose left edge is closest to the track's left edge
  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const left = track.scrollLeft
        let best = 0
        let bestDist = Infinity
        ;[...track.children].forEach((c, i) => {
          const d = Math.abs(c.offsetLeft - track.offsetLeft - left)
          if (d < bestDist) {
            bestDist = d
            best = i
          }
        })
        // Scrolled to the end: the last card counts as active
        const end = left + track.clientWidth >= track.scrollWidth - 4
        if (end) best = track.children.length - 1
        setActive((prev) => (prev === best ? prev : best))
        const start = left <= 4
        setEdges((prev) => (prev.atStart === start && prev.atEnd === end ? prev : { atStart: start, atEnd: end }))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Mouse drag (touch already scrolls natively)
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const track = trackRef.current
    dragRef.current = { x: e.clientX, left: track.scrollLeft, moved: false }
    track.classList.add('is-dragging')
    track.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.x
    if (Math.abs(dx) > 4) drag.moved = true
    trackRef.current.scrollLeft = drag.left - dx
  }
  const endDrag = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const track = trackRef.current
    track.classList.remove('is-dragging')
    track.releasePointerCapture?.(e.pointerId)
    dragRef.current = null
    // Let the snap settle on the nearest card
    if (drag.moved) scrollToIndex(active)
  }

  // Arrows move by one card (index-based targets can clamp at the end)
  const step = (dir) => {
    const track = trackRef.current
    const card = track?.children[0]
    if (!card) return
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    track.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <section className="lp-filters" id="filters" aria-labelledby="lp-filters-title">
      <header className="lp-sec-head">
        <h2 id="lp-filters-title" className="lp-h2">filters</h2>
        <p className="lp-sec-head__sub">{FILTERS.length} live effects, all running in your browser.</p>
      </header>

      <div className="lp-carousel">
        <ul
          ref={trackRef}
          className="lp-carousel__track"
          aria-label="filter cards"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {FILTERS.map((f, i) => (
            <li
              key={f.id}
              className={`lp-card lp-glass${i === active ? ' is-active' : ''}`}
              aria-label={`${i + 1} of ${FILTERS.length}: ${f.label.toLowerCase()}`}
            >
              <div className="lp-card__media"><CardMedia filter={f} /></div>
              <div className="lp-card__body">
                <h3 className="lp-card__name">{f.label.toLowerCase()}</h3>
                <p className="lp-card__desc">{f.description.toLowerCase()}.</p>
                <p className="lp-card__key">key {i + 1}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="lp-carousel__nav">
          <button
            type="button"
            className="lp-carousel__arrow"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="previous filter"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="lp-carousel__dots">
            {FILTERS.map((f, i) => (
              <button
                key={f.id}
                type="button"
                className={`lp-carousel__dot${i === active ? ' is-active' : ''}`}
                aria-label={`show ${f.label.toLowerCase()}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="lp-carousel__arrow"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="next filter"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </section>
  )
}

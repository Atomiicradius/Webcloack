/**
 * FeedFrame.jsx — The camera feed in a thick chrome bezel.
 *
 * Title strip with REAL window controls (help, minimize = pause camera,
 * maximize = larger feed layout, close = exit to landing), gloss overlay,
 * mint tracking brackets (lock on when 2+ hands are seen), REC pill, gesture
 * hint and a GSAP glitch flash on filter change (transforms/opacity only,
 * no layout shift).
 */

import { forwardRef, memo, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Owns its own ticking so the rest of the app doesn't re-render each second. */
function RecTimer({ startedAt }) {
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  return <span>rec {formatElapsed(now - startedAt)}</span>
}

const WinButton = forwardRef(function WinButton({ label, glyph, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className="ap-winbtn" aria-label={label} title={label} {...rest}>
      <span aria-hidden="true">{glyph}</span>
    </button>
  )
})

function FeedFrame({
  filterId,
  aspect,
  ar,
  isRecording,
  recordStartedAt,
  handsCount,
  isLive,
  maximized,
  helpRef,
  onHelp,
  onMinimize,
  onMaximize,
  onClose,
  overlay,
  children,
}) {
  const frameRef = useRef(null)
  const prevFilter = useRef(filterId)

  // Quick glitch / flash when the filter changes (skips the first render and
  // StrictMode's effect replay because the id is unchanged).
  useGSAP(() => {
    if (prevFilter.current === filterId) return
    prevFilter.current = filterId
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tl = gsap.timeline()
    tl.fromTo('.ap-glitch__flash', { opacity: 0.7 }, { opacity: 0, duration: 0.32, ease: 'power2.out' }, 0)
      .fromTo('.ap-glitch__slice',
        { opacity: 1, xPercent: () => gsap.utils.random(-14, 14) },
        { opacity: 0, xPercent: 0, duration: 0.3, ease: 'steps(4)', stagger: 0.035 }, 0)
      .fromTo('.magic-canvas',
        { x: () => gsap.utils.random(-12, 12), skewX: () => gsap.utils.random(-5, 5) },
        { x: 0, skewX: 0, duration: 0.3, ease: 'steps(5)', clearProps: 'transform' }, 0)
  }, { dependencies: [filterId], scope: frameRef })

  const locked = handsCount >= 2

  return (
    <section className="ap-bezel" aria-label="camera feed" ref={frameRef} style={{ '--cam-ar': ar }} data-boot-in>
      <header className="ap-bezel__bar">
        <h1 className="ap-bezel__title">
          webcloak.exe <span className="ap-bezel__sub">- {isLive ? 'live' : 'paused'}</span>
        </h1>
        <div className="ap-bezel__controls">
          <WinButton ref={helpRef} label="keyboard shortcuts" glyph="?" onClick={onHelp} aria-haspopup="dialog" />
          <WinButton label="minimize (pauses the camera)" glyph="_" onClick={onMinimize} />
          <WinButton
            label={maximized ? 'restore feed size' : 'maximize feed'}
            glyph={maximized ? '❐' : '□'}
            aria-pressed={maximized}
            onClick={onMaximize}
          />
          <WinButton label="close (turns the camera off and exits)" glyph="×" onClick={onClose} className="ap-winbtn ap-winbtn--close" />
        </div>
      </header>

      <div className="ap-screen" style={{ '--cam-aspect': aspect }}>
        {children}

        <div className="ap-screen__gloss" aria-hidden="true" />
        <div className={`ap-brackets${locked ? ' ap-brackets--locked' : ''}`} aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <div className="ap-glitch" aria-hidden="true">
          <span className="ap-glitch__slice" />
          <span className="ap-glitch__slice" />
          <span className="ap-glitch__slice" />
          <span className="ap-glitch__flash" />
        </div>

        {isRecording && recordStartedAt != null && (
          <div className="ap-rec" role="status">
            <span className="ch-dot" aria-hidden="true" />
            <RecTimer startedAt={recordStartedAt} />
          </div>
        )}
        <p className="ap-hint">pinch to scale / quick pinch to switch</p>

        {overlay}
      </div>
    </section>
  )
}

export default memo(FeedFrame)

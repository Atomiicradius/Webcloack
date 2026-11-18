/**
 * Landing.jsx — Marketing landing page (route `/`), animated with GSAP.
 *
 * Must not import anything from src/engine (except the pure filter
 * registry), MediaPipe or the camera hooks: the landing chunk stays free of
 * camera code. Launching only prefetches the /app chunk, then navigates;
 * the camera starts on the boot screen.
 *
 * All motion runs inside useGSAP (scoped to the root, reverted on unmount,
 * StrictMode safe) and gsap.matchMedia: with prefers-reduced-motion the
 * page renders its final static state (CSS defaults) and nothing loops.
 *
 * Blending: the PNG assets have black backgrounds and rely on
 * mix-blend-mode: screen (.ch-screen). Transforms/opacity create isolated
 * stacking contexts, so .ch-screen sits on the OUTERMOST animated element of
 * each asset and none of its ancestors may create a stacking context.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { loadCameraApp } from '../routes.js'
import {
  ChromeLogo, GridFloor, Sparkle, Ticker, WireGlobe,
} from '../components/chrome/Decor.jsx'
import { ART, floorY } from '../components/chrome/decorAssets.js'
import LiquidBlob from './landing/LiquidBlob.jsx'
import GlowRingHalf from './landing/GlowRing.jsx'
import { RING_BEADS, RING_PATH } from './landing/ringGeometry.js'
import HowItWorks from './landing/HowItWorks.jsx'
import FilterShowcase from './landing/FilterShowcase.jsx'
import './landing.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, MotionPathPlugin)

const REPO_URL = 'https://github.com/Atomiicradius/Webcloack'

// Paper Shaders LiquidMetal for the bottom-left blob. Off: in testing the
// rendered chrome-blob image looked richer than the procedural shader.
// Set true to lazy-load it after first paint (WebGL2 + motion only).
const LIQUID_SHADER = false

const TICKER = [
  'tracks 4 hands',
  'invisibility cloak',
  'matrix rain',
  'thermal vision',
  'audio reactive',
  'runs in your browser',
  'no upload',
]

// Hand-placed sparkles, outer side zones only (clear of the globe, bust and
// button): [left %, top %, size px, colour]
const SPARKLES = [
  [27, 13, 22, 'var(--white)'],
  [8, 50, 20, 'var(--ice)'],
  [93, 24, 22, 'var(--white)'],
  [79, 12, 16, 'var(--ice)'],
]

/** One screen-blended art layer. The wrapper is the outermost animated
 *  element (parallax), so it carries the blend; the img inside floats. */
function ArtLayer({ art, className, depth }) {
  return (
    <div className={`lp-art ch-screen ${className}`} data-depth={depth} aria-hidden="true">
      <span className="lp-art__tilt">
        <img className="lp-art__img" src={art.src} width={art.w} height={art.h} alt="" decoding="async" draggable="false" />
      </span>
    </div>
  )
}

export default function Landing() {
  const root = useRef(null)
  const launching = useRef(false)
  const navigate = useNavigate()

  const { contextSafe } = useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        wide: '(min-width: 900px) and (min-height: 600px)',
      },
      (ctx) => {
        const { motion, wide } = ctx.conditions
        if (!motion) return // static final state from CSS, native scroll

        // ── Smooth scrolling (created before any ScrollTrigger) ──
        // Native scroll position still drives it, so keyboard, wheel and
        // scrollbar work; touch stays native (smoothTouch off).
        const smoother = ScrollSmoother.create({
          wrapper: root.current.querySelector('.lp-smooth'),
          content: root.current.querySelector('.lp-smooth__content'),
          smooth: 1.1,
          effects: false,
        })
        // In-page links: let the smoother scroll (content is transformed),
        // then move focus to the target like a native anchor jump would.
        const onAnchor = (e) => {
          const link = e.target.closest('a[href^="#"]')
          if (!link) return
          const target = root.current.querySelector(link.getAttribute('href'))
          if (!target) return
          e.preventDefault()
          smoother.scrollTo(target, true, 'top top')
          history.replaceState(null, '', link.getAttribute('href'))
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
          target.focus({ preventScroll: true })
        }
        const rootEl = root.current
        rootEl.addEventListener('click', onAnchor)

        // ── Hero intro ───────────────────────────────────────────
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
        intro
          .from('.lp-hero__globe', { opacity: 0, scale: 0.55, duration: 1.3 })
          .from('.lp-floor', { opacity: 0, yPercent: 30, duration: 1.1 }, 0)
          // Art floats in, deeper layers travelling further (staggered parallax)
          .from('.lp-art__img', {
            opacity: 0,
            y: (i, el) => 45 * Number(el.closest('[data-depth]')?.dataset.depth || 1),
            scale: 0.9,
            duration: 1.2,
            stagger: 0.14,
            ease: 'power3.out',
          }, 0.2)
          .from('.lp-hero__logo', { yPercent: -180, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.35)
          .fromTo('.lp-flash', { opacity: 0 }, { opacity: 0.7, duration: 0.05, ease: 'none', yoyo: true, repeat: 1 }, '-=0.28')
          .from('.lp-kicker', { opacity: 0, y: -12, duration: 0.4 }, '<')
          // Ring: glow fades in while the thin line draws around (back arc, then front)
          .from('.lp-hero .lp-ring', { opacity: 0, scale: 0.8, duration: 1.1, ease: 'power2.out' }, '<')
          .fromTo('.lp-hero .lp-ring--back .lp-ring__line', { strokeDasharray: '0 1' }, { strokeDasharray: '1 0', duration: 0.7, ease: 'power2.in' }, '<')
          .fromTo('.lp-hero .lp-ring--front .lp-ring__line', { strokeDasharray: '0 1' }, { strokeDasharray: '1 0', duration: 0.7, ease: 'power2.out' }, '>')
          .from('.lp-cta > *', { opacity: 0, y: 18, duration: 0.45, clearProps: 'transform,opacity' }, 1.5)

        // ── Idle loops ───────────────────────────────────────────
        // Globe: each meridian squeezes like a rotating sphere (|cos|)
        gsap.utils.toArray('.lp-hero__globe .ch-globe__meridian').forEach((el, i) => {
          gsap.fromTo(el,
            { scaleX: 1 },
            { scaleX: 0.002, duration: 14, ease: 'sine.in', yoyo: true, repeat: -1, transformOrigin: '50% 50%' },
          ).totalTime(i * (28 / 6))
        })
        // Glowing rings (hero + final CTA): precess the tilt of both halves in
        // sync, a light streak travels each arc, beads ride the full loop
        const ringRaw = MotionPathPlugin.cacheRawPathMeasurements(MotionPathPlugin.getRawPath(RING_PATH))
        const animateRing = (scope, delay) => {
          gsap.to(`${scope} .lp-ring__tilt`, {
            rotation: -5, scaleY: 1.14, duration: 7.5, ease: 'sine.inOut', yoyo: true, repeat: -1,
          })
          gsap.utils.toArray(`${scope} .lp-ring__shine-path`).forEach((path, i) => {
            gsap.fromTo(path, { strokeDashoffset: 70 }, {
              strokeDashoffset: -1000, duration: 2.4, ease: 'power1.inOut', repeat: -1, repeatDelay: 2.4, delay: delay + i * 2.4,
            })
          })
          RING_BEADS.forEach((bead, i) => {
            const back = root.current.querySelector(`${scope} .lp-ring--back [data-bead="${i}"]`)
            const front = root.current.querySelector(`${scope} .lp-ring--front [data-bead="${i}"]`)
            if (!back || !front) return
            const state = { p: bead.offset }
            gsap.to(state, {
              p: bead.offset + 1, duration: bead.speed, ease: 'none', repeat: -1,
              onUpdate: () => {
                const pt = MotionPathPlugin.getPositionOnPath(ringRaw, state.p % 1)
                const t = `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`
                const inFront = pt.y > 0
                back.setAttribute('transform', t)
                front.setAttribute('transform', t)
                back.setAttribute('opacity', inFront ? 0 : 0.7)
                front.setAttribute('opacity', inFront ? 1 : 0)
              },
            })
          })
        }
        animateRing('.lp-hero', 2)
        animateRing('.lp-final', 0.5)
        // Art layers bob gently, out of phase
        gsap.utils.toArray('.lp-art__img').forEach((img, i) => {
          gsap.to(img, {
            y: i % 2 ? 10 : -12, duration: 3.4 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 + i * 0.2,
          })
        })
        // Sparkles twinkle with staggered scale loops
        gsap.fromTo('.lp-spark',
          { scale: 0.45, opacity: 0.5, rotation: 0 },
          {
            scale: 1, opacity: 1, rotation: 25, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1,
            stagger: { each: 0.37, from: 'random', repeat: -1, yoyo: true },
          })
        // Ticker: infinite loop (two identical runs, shift by half)
        gsap.utils.toArray('.lp .ch-ticker__track').forEach((track) => {
          const loop = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 })
          const band = track.parentElement
          band.addEventListener('mouseenter', () => loop.pause())
          band.addEventListener('mouseleave', () => loop.play())
        })
        // Grid floor scrolls toward the viewer
        const rows = gsap.utils.toArray('.lp-floor .ch-floor__row')
        const phase = { p: 0 }
        gsap.to(phase, {
          p: 1, duration: 2.6, ease: 'none', repeat: -1,
          onUpdate: () => {
            rows.forEach((row) => {
              const y = floorY(Number(row.dataset.k), phase.p)
              row.setAttribute('y1', y)
              row.setAttribute('y2', y)
            })
          },
        })

        // ── Pointer parallax on globe, orbit and sparkles ────────
        const hero = root.current.querySelector('.lp-hero')
        const layers = gsap.utils.toArray('[data-depth]').map((el) => ({
          depth: Number(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
        }))
        const onMove = (e) => {
          const r = hero.getBoundingClientRect()
          const nx = (e.clientX - r.left) / r.width - 0.5
          const ny = (e.clientY - r.top) / r.height - 0.5
          layers.forEach((l) => {
            l.x(nx * 36 * l.depth)
            l.y(ny * 24 * l.depth)
          })
        }
        hero.addEventListener('pointermove', onMove)

        // ── How it works ─────────────────────────────────────────
        if (wide) {
          // Heading plays in as the section arrives, so the pinned view is
          // never empty; the scrub then covers the panels.
          gsap.from('.lp-how .lp-sec-head', {
            y: 40, opacity: 0, duration: 0.7, ease: 'power2.out',
            scrollTrigger: { trigger: '.lp-how', start: 'top 70%' },
          })
          // Pinned at exactly one viewport tall, scrubbed over ~175% of a
          // viewport: each panel, its illustration settling,
          // and the connector drawing to the next one.
          const how = gsap.timeline({
            defaults: { ease: 'power2.out' },
            scrollTrigger: {
              trigger: '.lp-how',
              start: 'top top',
              end: '+=175%',
              pin: true,
              scrub: 0.8,
              anticipatePin: 1,
            },
          })
          gsap.utils.toArray('.lp-step').forEach((step, i) => {
            const at = i * 1.1
            how.from(step, { x: -70, y: 30, opacity: 0, duration: 0.8 }, at)
              .from(step.querySelector('.lp-step__img'), {
                scale: 1.14, filter: 'brightness(1.8) saturate(1.3)', duration: 0.8, ease: 'power1.out',
              }, at + 0.15)
              .fromTo(step.querySelector('.lp-step__well'),
                { boxShadow: '0 0 34px rgba(158, 192, 255, 0.85)' },
                { boxShadow: '0 0 0px rgba(158, 192, 255, 0)', duration: 0.8 }, at + 0.15)
            const line = step.querySelector('.lp-step__line')
            if (line) {
              how.from(line, { scaleX: 0, duration: 0.4, ease: 'none' }, at + 0.75)
                .from(step.querySelector('.lp-step__head'), { opacity: 0, scale: 0, duration: 0.15 }, at + 1.1)
            }
          })
          how.to({}, { duration: 0.3 }) // brief hold on the finished state
        } else {
          gsap.from('.lp-how .lp-sec-head', {
            y: 30, opacity: 0, duration: 0.6, ease: 'power2.out',
            scrollTrigger: { trigger: '.lp-how', start: 'top 85%' },
          })
          gsap.utils.toArray('.lp-step').forEach((step) => {
            gsap.from(step, {
              y: 50, opacity: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform,opacity',
              scrollTrigger: { trigger: step, start: 'top 85%' },
            })
          })
        }

        gsap.from('.lp-filters .lp-sec-head', {
          y: 30, opacity: 0, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: '.lp-filters', start: 'top 85%' },
        })
        // Filters: stage rises in, orbs pop in (each orb is its own blend
        // element, so animating it never isolates the screen blend)
        gsap.from('.lp-fx__stage', {
          y: 50, opacity: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.lp-fx', start: 'top 80%' },
        })
        gsap.from('.lp-orb', {
          y: 30, scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.06, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.lp-fx', start: 'top 75%' },
        })
        gsap.from('.lp-final__stage, .lp-final__text, .lp-final .lp-launch', {
          y: 40, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: '.lp-final', start: 'top 75%' },
        })

        return () => {
          hero.removeEventListener('pointermove', onMove)
          rootEl.removeEventListener('click', onAnchor)
        }
      },
      root.current,
    )

    return () => mm.revert()
  }, { scope: root })

  // ── Launch: globe zooms, screen flashes white, then /app (boot) ──
  const launch = contextSafe((e) => {
    if (launching.current) return
    launching.current = true
    loadCameraApp() // prefetch the chunk; starts no camera
    const go = () => navigate('/app', { state: { launch: true } })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      go()
      return
    }
    const heroVisible = window.scrollY < window.innerHeight * 0.6
    const tl = gsap.timeline({ onComplete: go })
    tl.to(e.currentTarget, { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut' })
    if (heroVisible) {
      // (never fade the logo stage itself: opacity there would isolate the blend)
      tl.to('.lp-kicker, .lp-hero__logo, .lp-hero .lp-ring, .lp-cta, .lp-nav', {
        opacity: 0, scale: 1.15, duration: 0.35, ease: 'power2.in',
      }, 0.05)
        .to('.lp-hero__globe', { scale: 7, duration: 0.8, ease: 'power3.in' }, 0.05)
        .to('.lp-art, .lp-sparks', { scale: 1.6, opacity: 0, duration: 0.6, ease: 'power2.in' }, 0.05)
    }
    tl.to('.lp-flash', { opacity: 1, duration: 0.28, ease: 'power1.in' }, heroVisible ? 0.55 : 0.1)
  })

  const prefetch = () => { loadCameraApp() }

  return (
    <div className="lp" ref={root}>
      <div className="lp-flash" aria-hidden="true" />

      <div className="lp-smooth">
      <div className="lp-smooth__content">
      <header className="lp-nav">
        <a className="lp-nav__brand" href="#top">webcloak.exe</a>
        <nav className="lp-nav__links" aria-label="sections">
          <a href="#how-it-works">how it works</a>
          <a href="#filters">filters</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">github</a>
        </nav>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="lp-hero" id="top" aria-labelledby="lp-title">
          <div className="lp-floor"><GridFloor /></div>

          <div className="lp-hero__stage">
            <ArtLayer art={ART.cloakWindow} className="lp-art--window" depth="1.3" />
            <div className="lp-art ch-screen lp-art--blob" data-depth="1.6" aria-hidden="true">
              <span className="lp-art__tilt"><LiquidBlob enableShader={LIQUID_SHADER} /></span>
            </div>
            <ArtLayer art={ART.sticker} className="lp-art--sticker" depth="1.9" />
            <div className="lp-sparks" data-depth="1.6" aria-hidden="true">
              {SPARKLES.map(([x, y, size, color]) => (
                <span key={`${x}-${y}`} className="lp-spark-pos" style={{ left: `${x}%`, top: `${y}%` }}>
                  <Sparkle size={size} color={color} className="lp-spark" />
                </span>
              ))}
            </div>

            {/* Composition, all positioned from one origin (--cx / --cy, the
                viewport centre): back ring, globe, logo halo, bust, logo,
                ring front half, kicker, launch button. DOM order is paint
                order: the bust sits behind the logo and the ring's front
                half, and above the globe so its fill never tints the pink
                bubble. No element in this run may create a stacking context
                (the logo, ring and bust blend through it). */}
            <GlowRingHalf side="back" />
            <div className="lp-hero__globe-wrap" data-depth="0.4">
              <div className="lp-hero__globe"><WireGlobe /></div>
            </div>
            <div className="lp-halo" aria-hidden="true" />

            {/* Marble bust (faces left, toward the logo). Screen blend lets
                the logo and ring read through it; backlight and a faint
                halftone live inside the blended stack. */}
            <div className="lp-art ch-screen lp-art--bust" data-depth="0.7" aria-hidden="true">
              <span className="lp-art__tilt lp-art__img lp-bust">
                <img className="lp-bust__img" src={ART.bust.src} width={ART.bust.w} height={ART.bust.h} alt="" decoding="async" draggable="false" />
                <span className="lp-bust__glow" />
                <span className="lp-bust__dots" />
              </span>
            </div>

            <h1 id="lp-title" className="lp-hero__logo ch-screen">
              <ChromeLogo sizes="(max-width: 760px) 94vw, min(44vw, 88vh, 1120px)" />
            </h1>
            <GlowRingHalf side="front" />
            {/* after the ring, so its glow never dims the text */}
            <p className="lp-kicker">introducing</p>
            <div className="lp-cta">
              <button
                type="button"
                className="ch-pill lp-launch"
                onClick={launch}
                onPointerEnter={prefetch}
                onFocus={prefetch}
              >
                <span aria-hidden="true">▶</span> launch cloak.exe
              </button>
            </div>
          </div>
        </section>

        <Ticker items={TICKER} />

        <HowItWorks />

        <FilterShowcase />

        {/* ── Final call to action ───────────────────────────────── */}
        <section className="lp-final" aria-labelledby="lp-final-title">
          <div className="lp-final__stage">
            <GlowRingHalf side="back" />
            <h2 id="lp-final-title" className="lp-final__title">ready? hands up.</h2>
            <GlowRingHalf side="front" />
          </div>
          <p className="lp-final__text">runs in your browser. nothing is uploaded. the camera only turns on after you press launch, and you can stop it any time.</p>
          <button
            type="button"
            className="ch-pill lp-launch"
            onClick={launch}
            onPointerEnter={prefetch}
            onFocus={prefetch}
          >
            <span aria-hidden="true">▶</span> launch cloak.exe
          </button>
        </section>
      </main>

      <footer className="lp-footer">
        <span>webcloak. made with mediapipe, webgl and react.</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">source on github</a>
      </footer>
      </div>
      </div>
    </div>
  )
}

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
import { Draggable } from 'gsap/Draggable'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { FILTERS } from '../engine/filters.js'
import { loadCameraApp } from '../routes.js'
import { Window } from '../components/win98/Window.jsx'
import {
  ChromeLogo, GelOrb, GridFloor, Sparkle, Ticker, WireGlobe,
} from '../components/chrome/Decor.jsx'
import { ART, floorY } from '../components/chrome/decorAssets.js'
import LiquidBlob from './landing/LiquidBlob.jsx'
import GlowRingHalf from './landing/GlowRing.jsx'
import { RING_BEADS, RING_PATH } from './landing/ringGeometry.js'
import './landing.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, Draggable, SplitText, MotionPathPlugin)

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

// Hand-placed sparkles: [left %, top %, size px, colour]
const SPARKLES = [
  [24, 16, 30, 'var(--white)'],
  [71, 10, 20, 'var(--ice)'],
  [62, 78, 36, 'var(--white)'],
  [33, 70, 18, 'var(--ice)'],
  [50, 6, 14, 'var(--white)'],
  [8, 62, 20, 'var(--white)'],
  [88, 52, 24, 'var(--white)'],
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

// Filter windows in the draggable playground (from the single registry)
const PLAYGROUND = [
  { id: 'cloak', hue: 0 },
  { id: 'matrix', hue: -40 },
  { id: 'thermal', hue: 40 },
  { id: 'kaleidoscope', hue: -20 },
].map((p, i) => {
  const def = FILTERS.find((f) => f.id === p.id)
  return { ...p, def, index: FILTERS.indexOf(def) + 1, slot: i + 1 }
})

const STEPS = [
  {
    file: 'step1.exe',
    title: 'raise your hands',
    text: 'hold both hands up to the camera. webcloak tracks up to four at once.',
    art: (
      <svg viewBox="0 0 200 110" className="lp-step__art" aria-hidden="true" focusable="false">
        <g fill="none" stroke="var(--ice)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M38 96V52M38 52L26 22M38 52l14-30M38 60l-18-6" />
          <path d="M162 96V52M162 52l12-30M162 52l-14-30M162 60l18-6" />
        </g>
        <g fill="var(--white)">
          <circle cx="26" cy="22" r="6" /><circle cx="52" cy="22" r="6" />
          <circle cx="148" cy="22" r="6" /><circle cx="174" cy="22" r="6" />
        </g>
      </svg>
    ),
  },
  {
    file: 'step2.exe',
    title: 'make a frame',
    text: 'your thumbs and index fingers become the four corners of a window.',
    art: (
      <svg viewBox="0 0 200 110" className="lp-step__art" aria-hidden="true" focusable="false">
        <polygon points="40,22 160,12 172,92 30,98" fill="rgba(158,192,255,0.18)" stroke="var(--white)" strokeWidth="3" strokeDasharray="8 6" />
        <g fill="var(--white)">
          <circle cx="40" cy="22" r="7" /><circle cx="160" cy="12" r="7" />
          <circle cx="172" cy="92" r="7" /><circle cx="30" cy="98" r="7" />
        </g>
      </svg>
    ),
  },
  {
    file: 'step3.exe',
    title: 'pick a filter',
    text: 'click one, press 1-7, or pinch quickly to flip through them.',
    art: (
      <div className="lp-step__orbs" aria-hidden="true">
        {[0, -40, 40, -20].map((h) => <GelOrb key={h} hue={h} className="lp-step__orb" />)}
      </div>
    ),
  },
]

export default function Landing() {
  const root = useRef(null)
  const launching = useRef(false)
  const navigate = useNavigate()

  const { contextSafe } = useGSAP(() => {
    const mm = gsap.matchMedia()

    // ── Draggable filter windows (user-driven, so on for everyone) ──
    const drags = Draggable.create('.lp-win', {
      bounds: '.lp-playground',
      zIndexBoost: true,
      cursor: 'grab',
      activeCursor: 'grabbing',
    })

    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        wide: '(min-width: 900px)',
      },
      (ctx) => {
        const { motion, wide } = ctx.conditions
        if (!motion) return // static final state from CSS

        // ── Hero intro ───────────────────────────────────────────
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
        intro
          .from('.lp-hero__globe', { opacity: 0, scale: 0.55, duration: 1.3 })
          .from('.lp-floor', { opacity: 0, yPercent: 30, duration: 1.1 }, 0)
          .from('.lp-art__img', {
            opacity: 0, y: 60, scale: 0.9, duration: 1.1, stagger: 0.12, ease: 'power3.out',
          }, 0.2)
          .from('.lp-hero__logo', { yPercent: -180, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.35)
          .fromTo('.lp-flash', { opacity: 0 }, { opacity: 0.7, duration: 0.05, ease: 'none', yoyo: true, repeat: 1 }, '-=0.28')
          .from('.lp-kicker', { opacity: 0, y: -12, duration: 0.4 }, '<')
          .from('.lp-hero .lp-ring', { opacity: 0, scale: 0.75, duration: 1.1, ease: 'power2.out' }, '<')
          .from('.lp-cta > *, .lp-note', { opacity: 0, y: 18, stagger: 0.08, duration: 0.45 }, '+=0.45')
          .from('.lp-chip', { opacity: 0, scale: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(2.2)' }, '<')

        // Tagline revealed line by line (re-splits after fonts / resize)
        SplitText.create('.lp-tagline', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 110, opacity: 0, duration: 0.6, stagger: 0.14, ease: 'power3.out',
            delay: intro.time() < 1.2 ? 1.25 - intro.time() : 0,
          }),
        })

        // ── Idle loops ───────────────────────────────────────────
        // Globe: each meridian squeezes like a rotating sphere (|cos|)
        gsap.utils.toArray('.lp-hero__globe .ch-globe__meridian').forEach((el, i) => {
          gsap.fromTo(el,
            { scaleX: 1 },
            { scaleX: 0.002, duration: 14, ease: 'sine.in', yoyo: true, repeat: -1, transformOrigin: '50% 50%' },
          ).totalTime(i * (28 / 6))
        })
        // Glowing ring: precess the tilt (both halves in sync), a light
        // streak travels each arc, beads ride the full loop
        gsap.to('.lp-hero .lp-ring__tilt', {
          rotation: -5, scaleY: 1.14, duration: 7.5, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
        gsap.utils.toArray('.lp-hero .lp-ring__shine-path').forEach((path, i) => {
          gsap.fromTo(path, { strokeDashoffset: 70 }, {
            strokeDashoffset: -1000, duration: 2.4, ease: 'power1.inOut', repeat: -1, repeatDelay: 2.4, delay: 2 + i * 2.4,
          })
        })
        const ringRaw = MotionPathPlugin.cacheRawPathMeasurements(MotionPathPlugin.getRawPath(RING_PATH))
        RING_BEADS.forEach((bead, i) => {
          const back = root.current.querySelector(`.lp-hero .lp-ring--back [data-bead="${i}"]`)
          const front = root.current.querySelector(`.lp-hero .lp-ring--front [data-bead="${i}"]`)
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

        // ── How it works: pinned + scrubbed (wide), reveals (narrow) ──
        const steps = gsap.utils.toArray('.lp-step')
        if (wide) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: '.lp-how',
              start: 'top top',
              end: '+=220%',
              pin: true,
              scrub: 0.6,
            },
          })
          steps.forEach((step, i) => {
            tl.from(step, {
              xPercent: i % 2 ? 130 : -130,
              yPercent: 30,
              rotation: i % 2 ? 10 : -10,
              opacity: 0,
              duration: 1,
              ease: 'power2.out',
            }, i * 0.9)
            tl.fromTo(`.lp-how__seg:nth-child(${i + 1})`, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'none' }, i * 0.9 + 0.4)
          })
          tl.to({}, { duration: 0.4 }) // hold the last frame briefly
        } else {
          steps.forEach((step, i) => {
            gsap.from(step, {
              xPercent: i % 2 ? 40 : -40,
              opacity: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: { trigger: step, start: 'top 85%' },
            })
          })
        }

        // Filter windows drop in once
        gsap.from('.lp-win__inner', {
          y: -60, opacity: 0, rotation: () => gsap.utils.random(-14, 14), stagger: 0.12, duration: 0.7,
          ease: 'back.out(1.6)',
          scrollTrigger: { trigger: '.lp-playground', start: 'top 75%' },
        })

        return () => hero.removeEventListener('pointermove', onMove)
      },
      root.current,
    )

    return () => {
      drags.forEach((d) => d.kill())
      mm.revert()
    }
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
      tl.to('.lp-kicker, .lp-hero__logo, .lp-hero .lp-ring, .lp-tagline, .lp-cta, .lp-note, .lp-chip, .lp-nav', {
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

      <header className="lp-nav">
        <a className="lp-nav__brand" href="#top">webcloak.exe</a>
        <nav className="lp-nav__links" aria-label="sections">
          <a href="#how">how it works</a>
          <a href="#filters">filters</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">github</a>
        </nav>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="lp-hero" id="top" aria-labelledby="lp-title">
          <div className="lp-floor"><GridFloor /></div>

          <div className="lp-hero__stage">
            <ArtLayer art={ART.bust} className="lp-art--bust" depth="0.7" />
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

            <div className="lp-hero__copy">
              {/* Paint order inside the stage: back ring, globe, logo, front ring */}
              <div className="lp-logo-stage">
                <p className="lp-kicker">introducing</p>
                <GlowRingHalf side="back" />
                <div className="lp-hero__globe-wrap" data-depth="0.4">
                  <div className="lp-hero__globe"><WireGlobe /></div>
                </div>
                <h1 id="lp-title" className="lp-hero__logo ch-screen"><ChromeLogo /></h1>
                <GlowRingHalf side="front" />
              </div>
              <p className="lp-tagline">
                your hands are<br />the invisibility cloak.
              </p>
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
                <a className="lp-link" href="#how">how it works ↓</a>
              </div>
              <p className="lp-note">runs in your browser. nothing is uploaded.</p>
            </div>

            <ul className="lp-chips" aria-label="at a glance">
              <li className="lp-chip lp-chip--a">4 hands</li>
              <li className="lp-chip lp-chip--b">{FILTERS.length} filters</li>
              <li className="lp-chip lp-chip--c">0 uploads</li>
            </ul>
          </div>
        </section>

        <Ticker items={TICKER} />

        {/* ── How it works (pinned on wide screens) ──────────────── */}
        <section className="lp-how" id="how" aria-labelledby="lp-how-title">
          <div className="lp-how__inner">
            <div className="lp-how__head">
              <h2 id="lp-how-title" className="lp-h2">how it works</h2>
              <div className="lp-how__bar" aria-hidden="true">
                <span className="lp-how__seg" /><span className="lp-how__seg" /><span className="lp-how__seg" />
              </div>
            </div>
            <ol className="lp-how__steps">
              {STEPS.map((s, i) => (
                <li key={s.file} className="lp-step" style={{ '--tilt': `${[-2, 1.5, -1][i]}deg` }}>
                  <Window title={s.file} titleAs="h3" decorativeControls className="lp-step__win">
                    <div className="lp-step__body">
                      <div className="lp-step__screen">{s.art}</div>
                      <p className="lp-step__title"><span className="lp-step__num">{i + 1}.</span> {s.title}</p>
                      <p className="lp-step__text">{s.text}</p>
                    </div>
                  </Window>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Filters playground (draggable) ─────────────────────── */}
        <section className="lp-filters" id="filters" aria-labelledby="lp-filters-title">
          <div className="lp-filters__head">
            <h2 id="lp-filters-title" className="lp-h2">filters</h2>
            <p className="lp-filters__sub">
              {FILTERS.length} live effects. these four windows can be dragged around.
            </p>
          </div>
          <div className="lp-playground">
            {PLAYGROUND.map(({ id, hue, def, index, slot }) => {
              const Icon = def.icon
              return (
                <div key={id} className={`lp-win lp-win--${slot}`}>
                  <div className="lp-win__inner">
                    <Window title={`${id}.exe`} titleAs="h3" decorativeControls>
                      <div className="lp-win__body">
                        <div className="lp-win__orb" aria-hidden="true">
                          <GelOrb hue={hue} />
                          <span className="lp-win__icon"><Icon size={26} /></span>
                        </div>
                        <div>
                          <p className="lp-win__name">{def.label.toLowerCase()}</p>
                          <p className="lp-win__desc">{def.description.toLowerCase()}.</p>
                          <p className="lp-win__key">key {index}</p>
                        </div>
                      </div>
                    </Window>
                  </div>
                </div>
              )
            })}
            <Sparkle size={30} className="lp-playground__spark lp-playground__spark--a" />
            <Sparkle size={18} color="var(--ice)" className="lp-playground__spark lp-playground__spark--b" />
          </div>
        </section>

        {/* ── Final call to action ───────────────────────────────── */}
        <section className="lp-final" aria-labelledby="lp-final-title">
          <div className="lp-final__globe" aria-hidden="true"><WireGlobe /></div>
          <h2 id="lp-final-title" className="lp-final__title">ready? hands up.</h2>
          <p className="lp-final__text">the camera only turns on after you press launch. you can stop it any time.</p>
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
  )
}

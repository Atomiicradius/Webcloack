/**
 * HowItWorks.jsx — Three steps on flat frosted-glass panels, joined by thin
 * glowing connectors. On wide screens Landing.jsx pins the section (exactly
 * one viewport tall) and scrubs a timeline through the steps; on phones the
 * steps simply reveal as they scroll in.
 *
 * The step art is screen-blended against its own opaque dark well: the
 * glass panel (backdrop-filter) and the reveal transform are stacking
 * contexts, so the blend needs a solid backdrop inside them.
 * step-filter.jpg already contains its own corner brackets.
 */

import { ART } from '../../components/chrome/decorAssets.js'

const STEPS = [
  {
    n: '01',
    title: 'detect hands',
    art: ART.stepHands,
    text: 'hold both hands up to the camera. webcloak tracks up to four at once.',
  },
  {
    n: '02',
    title: 'make a frame',
    art: ART.stepFrame,
    text: 'your thumbs and index fingers become the four corners of a window.',
  },
  {
    n: '03',
    title: 'apply a filter',
    art: ART.stepFilter,
    text: 'pick one, press 1-7, or pinch quickly to flip through them.',
  },
]

export default function HowItWorks() {
  return (
    <section className="lp-how" id="how-it-works" aria-labelledby="lp-how-title">
      <div className="lp-how__inner">
        <header className="lp-sec-head">
          <h2 id="lp-how-title" className="lp-h2">how it works</h2>
          <p className="lp-sec-head__sub">three steps. nothing to install.</p>
        </header>
        <ol className="lp-how__steps">
          {STEPS.map((s, i) => (
            <li key={s.n} className="lp-step lp-glass">
              {i < STEPS.length - 1 && (
                <span className="lp-step__link" aria-hidden="true">
                  <span className="lp-step__line" />
                  <span className="lp-step__head" />
                </span>
              )}
              <div className="lp-step__well">
                <img
                  className="lp-step__img"
                  src={s.art.src}
                  width={s.art.w}
                  height={s.art.h}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="lp-step__label">
                <span className="lp-step__num">{s.n}</span> {s.title}
              </h3>
              <p className="lp-step__text">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

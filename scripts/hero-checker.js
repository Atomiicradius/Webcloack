// hero-checker.js — evaluated in the page by hero-check.mjs (dev only).
// Centre-column intrusions, decoration overlaps, nav overlaps, logo / text
// inside the viewport, bubble vs ring path distance, stack gaps, and the
// rendered vs natural width of every landing image.
// Read as text and wrapped by hero-check.mjs, hence a bare expression.
// oxlint-disable-next-line no-unused-expressions
() => {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)]
  const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
  const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } }
  const hit = (a, b, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad
  const W = document.documentElement.clientWidth, H = innerHeight
  const textEls = { kicker: q('.lp-kicker'), tagline: q('.lp-tagline'), launch: q('.lp-launch'), link: q('.lp-link'), note: q('.lp-note') }
  const stage = R(q('.lp-logo-stage'))
  const col = {
    l: Math.min(stage.l, ...Object.values(textEls).map((e) => R(e).l)),
    r: Math.max(stage.r, ...Object.values(textEls).map((e) => R(e).r)),
    t: R(textEls.kicker).t,
    b: R(textEls.note).b,
  }
  const deco = {}
  for (const [k, sel] of [['window', '.lp-art--window'], ['blob', '.lp-art--blob'], ['sticker', '.lp-art--sticker']]) {
    const el = q(sel); if (vis(el)) deco[k] = R(el.querySelector('img') || el)
  }
  const bust = q('.lp-bust'), br = R(bust), bw = br.r - br.l, bh = br.b - br.t
  const bubble = { l: br.l + 0.08 * bw, r: br.l + 0.34 * bw, t: br.t + 0.21 * bh, b: br.t + 0.41 * bh }
  if (vis(bust)) deco.bust = { l: bubble.l, r: br.r, t: br.t + 0.04 * bh, b: Math.min(br.b, H) }
  qa('.lp-chip').forEach((c, i) => { if (vis(c)) deco['chip-' + ['4hands', '7filters', '0uploads'][i]] = R(c) })
  qa('.lp-spark').forEach((s, i) => { if (vis(s)) deco['spark' + i] = R(s) })
  const problems = []
  for (const [k, r] of Object.entries(deco)) if (hit(r, col, 8)) problems.push(`${k} enters centre column`)
  const names = Object.keys(deco).filter((k) => !k.startsWith('spark'))
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (hit(deco[names[i]], deco[names[j]])) problems.push(`${names[i]} overlaps ${names[j]}`)
  const nav = R(q('.lp-nav__links')), brand = R(q('.lp-nav__brand'))
  for (const [k, r] of Object.entries(deco)) if (hit(r, nav) || hit(r, brand)) problems.push(`${k} overlaps nav`)
  // text vs text inside the column (e.g. link vs note)
  const tk = Object.keys(textEls)
  for (let i = 0; i < tk.length; i++) for (let j = i + 1; j < tk.length; j++) if (hit(R(textEls[tk[i]]), R(textEls[tk[j]]))) problems.push(`${tk[i]} overlaps ${tk[j]}`)
  const logo = R(q('.lp-hero__logo img')), lw = logo.r - logo.l
  const word = { l: logo.l + 0.03 * lw, r: logo.r - 0.03 * lw, t: logo.t + 0.14 * lw, b: logo.t + 0.34 * lw }
  const logoVisible = word.l >= 0 && word.r <= W && word.t >= 0 && word.b <= H
  if (!logoVisible) problems.push('logo not fully visible')
  for (const [k, e] of Object.entries(textEls)) { const r = R(e); if (!(r.t >= 0 && r.b <= H && r.l >= 0 && r.r <= W)) problems.push(`${k} outside viewport`) }
  if (hit(R(textEls.kicker), nav) || hit(stage, nav)) problems.push('centre column under nav')
  let gap = Infinity
  const cx = (bubble.l + bubble.r) / 2, cy = (bubble.t + bubble.b) / 2, rad = (bubble.r - bubble.l) / 2
  qa('.lp-hero .lp-ring__line').forEach((p) => {
    const len = p.getTotalLength(), m = p.getScreenCTM()
    for (let i = 0; i <= 80; i++) { const pt = p.getPointAtLength((len * i) / 80).matrixTransform(m); gap = Math.min(gap, Math.hypot(pt.x - cx, pt.y - cy) - rad) }
  })
  if (vis(bust)) {
    if (gap < 12) problems.push(`bubble touches ring (${Math.round(gap)}px)`)
    if (!(bubble.l >= 0 && bubble.r <= W && bubble.t >= 0 && bubble.b <= H)) problems.push('bubble outside viewport')
    if (!(br.l + 0.87 * bw <= W && br.t + 0.05 * bh >= 0)) problems.push('headphones outside viewport')
  }
  const g = (a, b) => Math.round(R(b).t - R(a).b)
  const images = {}
  qa('.lp img').forEach((img) => {
    const n = (img.currentSrc || img.src).split('/').pop()
    const w = img.offsetWidth
    if (w && (!images[n] || images[n].shown < w)) images[n] = { shown: w, natural: img.naturalWidth }
  })
  return {
    size: `${W}x${H}`,
    ok: problems.length === 0,
    problems,
    logoW: Math.round(lw),
    gaps: {
      'kicker→logo': Math.round(word.t - R(textEls.kicker).b),
      'logo→tagline': Math.round(R(textEls.tagline).t - word.b),
      'tagline→cta': g(textEls.tagline, q('.lp-cta')),
      'cta→note': g(q('.lp-cta'), textEls.note),
      'note→bottom': Math.round(H - R(textEls.note).b),
    },
    bubbleRingGap: Number.isFinite(gap) ? Math.round(gap) : null,
    visible: Object.keys(deco).filter((k) => !k.startsWith('spark')),
    images,
  }
}

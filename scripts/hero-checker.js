// hero-checker.js — evaluated in the page by hero-check.mjs (dev only).
// Checks the hero composition at the current viewport size:
//  (a) globe fully inside the viewport (visible rim circle)
//  (b) globe centre within 2% of the horizontal centre (and ~vertical centre)
//  (c) logo wordmark inside the globe, concentric with it
//  (d) launch button horizontally centred (1%) and fully inside the viewport
//  (e) bust bounding box overlaps neither the wordmark, the button nor the nav
//  (f) bubble to wordmark distance >= 40px
//  (g) bust at least 30vw wide at widths >= 1280
// plus: kicker / wordmark / button rhythm >= 28px, decoration overlaps, and
// rendered vs natural width of every landing image.
// Read as text and wrapped by hero-check.mjs, hence a bare expression.
// oxlint-disable-next-line no-unused-expressions
() => {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)]
  const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
  const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } }
  const hit = (a, b, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad
  const dist = (a, b) => Math.hypot(Math.max(0, a.l - b.r, b.l - a.r), Math.max(0, a.t - b.b, b.t - a.b))
  const W = document.documentElement.clientWidth, H = innerHeight
  const problems = []
  const m = {}

  // globe: the visible rim circle
  const rim = R(q('.lp-hero__globe-wrap .ch-globe__rim'))
  const gd = rim.r - rim.l, gx = (rim.l + rim.r) / 2, gy = (rim.t + rim.b) / 2
  m.globe = `${Math.round(gd)}px at (${Math.round(gx)},${Math.round(gy)})`
  if (!(rim.l >= 0 && rim.r <= W && rim.t >= 0 && rim.b <= H)) problems.push(`(a) globe not fully visible: top ${Math.round(rim.t)}, bottom ${Math.round(rim.b)} of ${H}`)
  if (Math.abs(gx - W / 2) > 0.02 * W) problems.push(`(b) globe not horizontally centred (${Math.round(gx - W / 2)}px off)`)
  if (Math.abs(gy - H / 2) > 0.02 * H + 8) problems.push(`globe not vertically centred (${Math.round(gy - H / 2)}px off)`)
  const wantD = Math.min(0.88 * H, 0.62 * W)
  m.globeD = `${Math.round(gd)} (spec min(88svh, 62vw) = ${Math.round(wantD)}${W <= 760 ? ', phones use min(96vw, 70svh)' : ''})`

  // logo: wordmark box from the image fractions
  const logo = R(q('.lp-hero__logo img')), lw = logo.r - logo.l
  const word = { l: logo.l + 0.035 * lw, r: logo.r - 0.035 * lw, t: logo.t + 0.29 * lw / 2 * 2 * 0.5 * 2 / 2, b: 0 }
  word.t = logo.t + 0.29 * (lw / 2)
  word.b = logo.t + 0.65 * (lw / 2)
  const wcx = (word.l + word.r) / 2, wcy = (word.t + word.b) / 2
  const corners = [[word.l, word.t], [word.r, word.t], [word.l, word.b], [word.r, word.b]]
  const inGlobe = corners.every(([x, y]) => Math.hypot(x - gx, y - gy) <= gd / 2)
  if (!inGlobe) problems.push('(c) wordmark not inside the globe')
  if (Math.hypot(wcx - gx, wcy - gy) > 0.03 * gd) problems.push(`(c) logo not concentric with globe (${Math.round(Math.hypot(wcx - gx, wcy - gy))}px)`)
  m.logoW = Math.round(lw)
  if (lw > Math.min(0.46 * W, 0.88 * H, 1120) + 1 && W > 760) problems.push('logo wider than min(46vw, 88svh, 1120px)')
  if (!(word.l >= 0 && word.r <= W && word.t >= 0 && word.b <= H)) problems.push('logo not fully visible')

  // launch button
  const btn = R(q('.lp-launch'))
  const bcx = (btn.l + btn.r) / 2
  if (Math.abs(bcx - W / 2) > 0.01 * W) problems.push(`(d) button not centred (${Math.round(bcx - W / 2)}px off)`)
  if (!(btn.l >= 0 && btn.r <= W && btn.t >= 0 && btn.b <= H)) problems.push('(d) button not inside the viewport')
  m.button = `${Math.round(btn.r - btn.l)}x${Math.round(btn.b - btn.t)} centre y ${Math.round((100 * (btn.t + btn.b)) / 2 / H)}%`

  // rhythm
  // the kicker element spans the full width; measure its text
  const kr = document.createRange(); kr.selectNodeContents(q('.lp-kicker'))
  const kick = (({ left, right, top, bottom }) => ({ l: left, r: right, t: top, b: bottom }))(kr.getBoundingClientRect())
  const gapKW = Math.round(word.t - kick.b), gapWB = Math.round(btn.t - word.b)
  m.rhythm = `kicker→logo ${gapKW}, logo→button ${gapWB}`
  if (gapKW < 28) problems.push(`kicker→logo gap ${gapKW}px < 28`)
  if (gapWB < 28) problems.push(`logo→button gap ${gapWB}px < 28`)
  if (kick.t < 0) problems.push('kicker above the viewport')

  // nav
  const nav = R(q('.lp-nav__links')), brand = R(q('.lp-nav__brand'))

  // bust
  const bustEl = q('.lp-bust'), bImg = R(bustEl), bw = bImg.r - bImg.l, bh = bImg.b - bImg.t
  const bust = { l: bImg.l + 0.08 * bw, r: Math.min(bImg.r, W), t: bImg.t + 0.04 * bh, b: Math.min(bImg.b, H) }
  const bubble = { l: bImg.l + 0.082 * bw, r: bImg.l + 0.341 * bw, t: bImg.t + 0.209 * bh, b: bImg.t + 0.411 * bh }
  if (vis(bustEl)) {
    for (const [k, r] of [['wordmark', word], ['launch button', btn], ['nav links', nav], ['nav brand', brand], ['kicker', kick]]) {
      if (hit(bust, r)) problems.push(`(e) bust box overlaps ${k}`)
    }
    const bd = dist(bubble, word)
    m.bubble = `${Math.round(bd)}px from the wordmark`
    if (bd < 40) problems.push(`(f) bubble ${Math.round(bd)}px from the logo (< 40)`)
    if (!(bubble.l >= 0 && bubble.r <= W && bubble.t >= 0 && bubble.b <= H)) problems.push('bubble outside the viewport')
    const phones = { r: bImg.l + 0.87 * bw }
    m.bust = `${Math.round(bw)}px wide (${Math.round((100 * bw) / W)}vw), ${Math.round((100 * bh) / H)}svh tall, headphones to ${Math.round(phones.r)} of ${W}`
    if (W >= 1280 && bw < 0.3 * W) problems.push(`(g) bust ${Math.round((100 * bw) / W)}vw < 30vw`)
    if (phones.r > W + 2) problems.push('headphones cut off by the right edge')
  }

  // decorations: overlaps with each other and with the centre pieces
  const deco = {}
  for (const [k, sel] of [['window', '.lp-art--window'], ['blob', '.lp-art--blob'], ['sticker', '.lp-art--sticker']]) {
    const el = q(sel); if (vis(el)) deco[k] = R(el.querySelector('img') || el)
  }
  if (vis(bustEl)) deco.bust = bust
  qa('.lp-spark').forEach((s, i) => { if (vis(s)) deco['spark' + i] = R(s) })
  for (const [k, r] of Object.entries(deco)) {
    if (k === 'bust') continue
    for (const [n, c] of [['wordmark', word], ['kicker', kick], ['button', btn]]) if (hit(r, c, 6)) problems.push(`${k} overlaps ${n}`)
    if (hit(r, nav) || hit(r, brand)) problems.push(`${k} overlaps nav`)
  }
  const names = Object.keys(deco).filter((k) => !k.startsWith('spark'))
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (hit(deco[names[i]], deco[names[j]])) problems.push(`${names[i]} overlaps ${names[j]}`)
  for (const [k, r] of Object.entries(deco)) if (k.startsWith('spark') && hit(r, bust)) problems.push(`${k} overlaps bust`)
  m.visible = Object.keys(deco).filter((k) => !k.startsWith('spark')).join(',')

  // glowing ring: sample the rendered core line of both halves in screen
  // space (this includes the precession transform at the moment of the check)
  const ringPts = (side) => {
    const p = q(`.lp-hero .lp-ring--${side} .lp-ring__line`)
    const len = p.getTotalLength(), ctm = p.getScreenCTM(), out = []
    for (let i = 0; i <= 160; i++) { const pt = p.getPointAtLength((len * i) / 160).matrixTransform(ctm); out.push([pt.x, pt.y]) }
    return out
  }
  const back = ringPts('back'), front = ringPts('front'), ring = back.concat(front)
  const rxs = ring.map((p) => p[0])
  const rw = Math.max(...rxs) - Math.min(...rxs)
  const rcx = ring.reduce((a, p) => a + p[0], 0) / ring.length, rcy = ring.reduce((a, p) => a + p[1], 0) / ring.length
  const rect2 = (x, y, r) => Math.hypot(Math.max(0, r.l - x, x - r.r), Math.max(0, r.t - y, y - r.b))
  const minDist = (pts, r) => Math.min(...pts.map(([x, y]) => rect2(x, y, r)))
  // ring centre vs globe centre (within 6% of the globe diameter)
  if (Math.hypot(rcx - gx, rcy - gy) > 0.06 * gd) problems.push(`(ring) centre ${Math.round(Math.hypot(rcx - gx, rcy - gy))}px from the globe centre (> 6%)`)
  // width 1.25x..1.5x the globe, unless the viewport clamps it (then both tips must still be visible)
  const wLo = Math.min(1.25 * gd, 0.9 * W), wHi = 1.5 * gd
  if (rw < wLo || rw > wHi) problems.push(`(ring) width ${Math.round(rw)}px = ${(rw / gd).toFixed(2)}x the globe (want 1.25-1.5x${W < 760 ? ', clamped on phones' : ''})`)
  if (Math.min(...rxs) < 0 || Math.max(...rxs) > W) problems.push('(ring) a tip leaves the viewport')
  if (Math.max(...ring.map((p) => p[1])) > H || Math.min(...ring.map((p) => p[1])) < 0) problems.push('(ring) leaves the viewport vertically')
  // front arc vs launch button, plus the other pieces
  const dBtn = minDist(front, btn)
  if (dBtn < 20) problems.push(`(ring) front arc ${Math.round(dBtn)}px from the launch button (< 20)`)
  const dNav = Math.min(minDist(ring, nav), minDist(ring, brand))
  if (dNav < 8) problems.push(`(ring) ${Math.round(dNav)}px from the nav`)
  let dBubble = null
  if (vis(bustEl)) {
    const bcx2 = (bubble.l + bubble.r) / 2, bcy2 = (bubble.t + bubble.b) / 2, br2 = (bubble.r - bubble.l) / 2
    dBubble = Math.min(...ring.map(([x, y]) => Math.hypot(x - bcx2, y - bcy2) - br2))
    if (dBubble < 12) problems.push(`(ring) ${Math.round(dBubble)}px from the bubble (< 12)`)
  }
  const near = {}
  // the art has black margins that screen-blend away: shrink the image boxes to the visible figure
  const trim = { window: [0.06, 0.06, 0.08, 0.1], blob: [0.02, 0.02, 0.12, 0.12], sticker: [0.1, 0.1, 0.15, 0.15] }
  const visibleBox = (k, r) => { const t = trim[k]; if (!t) return r; const w = r.r - r.l, h = r.b - r.t; return { l: r.l + t[0] * w, r: r.r - t[1] * w, t: r.t + t[2] * h, b: r.b - t[3] * h } }
  for (const [k, r0] of Object.entries(deco)) {
    if (k.startsWith('spark')) continue
    const r = visibleBox(k, r0)
    near[k] = Math.round(minDist(ring, r))
    if (k !== 'bust' && near[k] < 1) problems.push(`(ring) crosses the ${k}`)
  }
  // how much of the wordmark the front arc covers (band ~12px wide)
  let inside = 0
  for (let i = 1; i < front.length; i++) {
    const [x0, y0] = front[i - 1], [x1, y1] = front[i]
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    if (mx >= word.l && mx <= word.r && my >= word.t && my <= word.b) inside += Math.hypot(x1 - x0, y1 - y0)
  }
  const covered = (inside * 12) / ((word.r - word.l) * (word.b - word.t))
  if (covered > 0.15) problems.push(`(ring) front arc covers ${Math.round(covered * 100)}% of the wordmark (> 15%)`)
  m.ring = `${Math.round(rw)}px = ${(rw / gd).toFixed(2)}x globe, centre ${Math.round(rcx - gx)},${Math.round(rcy - gy)}px off, front arc ${Math.round(dBtn)}px from the button, ${dBubble === null ? 'n/a' : Math.round(dBubble) + 'px'} from the bubble, covers ${Math.round(covered * 100)}% of the letters, near: ${JSON.stringify(near)}`

  // removed things stay removed
  for (const sel of ['.lp-tagline', '.lp-link', '.lp-note', '.lp-chip']) if (q('.lp-hero ' + sel)) problems.push(`${sel} still in the hero`)

  const images = {}
  qa('.lp img').forEach((img) => {
    const n = (img.currentSrc || img.src).split('/').pop()
    const w = img.offsetWidth
    if (w && (!images[n] || images[n].shown < w)) images[n] = { shown: w, natural: img.naturalWidth }
  })
  return { size: `${W}x${H}`, ok: problems.length === 0, problems, metrics: m, images }
}

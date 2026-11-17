// hero-check.mjs — dev-only landing hero check (never imported by the app).
//
// Launches Chrome/Edge headless, sets exact CSS viewport sizes through the
// DevTools protocol (Node 22+ built-in WebSocket, no dependencies), waits
// for the hero intro, runs scripts/hero-checker.js and saves a screenshot
// per size. Needs the dev server running (npm run dev).
//
//   node scripts/hero-check.mjs [outDir] [1366x768,390x844,...]
//   CHROME_PATH=... DEV_URL=http://localhost:5173/ node scripts/hero-check.mjs
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'webcloak-hero-check'))
fs.mkdirSync(OUT, { recursive: true })
const PAGE = process.env.DEV_URL || 'http://localhost:5173/'
const SIZES = (process.argv[3] || '1366x768,1536x864,1440x900,1280x720,1920x1080,2560x1440,390x844')
  .split(',').map((s) => s.split('x').map(Number))
const PORT = 9333
const profile = path.join(OUT, 'chrome-profile')

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    target = list.find((t) => t.type === 'page')
  } catch { /* not up yet */ }
}
if (!target) throw new Error('chrome did not start')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
  return r.result.result.value
}

const checker = fs.readFileSync(new URL('./hero-checker.js', import.meta.url), 'utf8')
await send('Page.enable')
const results = []
for (const [w, h] of SIZES) {
  const mobile = w < 760
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: PAGE + '?t=' + Date.now() })
  await sleep(5500) // load + hero intro timeline
  const res = await evaluate(`(${checker})()`)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const file = path.join(OUT, `hero-${w}x${h}.png`)
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'))
  results.push({ ...res, file })
  const status = res.ok ? 'OK  ' : 'FAIL'
  const issues = res.problems.length ? '\n  ' + res.problems.join('\n  ') : ''
  console.log(`${res.size} ${status} logo ${res.logoW}px  gaps ${JSON.stringify(res.gaps)}  bubble-ring ${res.bubbleRingGap}px${issues}`)
}
console.log('screenshots + hero-results.json in', OUT)
process.exitCode = results.every((r) => r.ok) ? 0 : 1
fs.writeFileSync(path.join(OUT, 'hero-results.json'), JSON.stringify(results, null, 2))
ws.close()
chrome.kill()

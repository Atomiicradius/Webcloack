/**
 * Landing.jsx — Temporary placeholder landing page (to be replaced).
 * Must not import anything from src/engine, MediaPipe or framer-motion.
 */

import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div
      className="app-container"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '20px', textAlign: 'center',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--cyan)' }}>WEBCLOAK</h1>
      <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>
        A hand-tracked spatial magic window that runs in your browser.
      </p>
      <Link
        to="/app"
        style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', border: '1px solid var(--cyan)', padding: '10px 20px', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}
      >
        Launch app
      </Link>
    </div>
  )
}

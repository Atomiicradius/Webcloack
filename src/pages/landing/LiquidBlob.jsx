/**
 * LiquidBlob.jsx — Bottom-left liquid chrome blob.
 *
 * Always renders chrome-blob.jpg first (the poster). Once the page has
 * loaded and gone idle, and only if WebGL2 exists and reduced motion is
 * off, it lazy-loads the Paper Shaders LiquidMetal chunk and swaps it in.
 * Any failure (no WebGL2, import error, render error) keeps the image.
 */

import { Component, lazy, Suspense, useEffect, useState } from 'react'
import { ART } from '../../components/chrome/decorAssets.js'

const LiquidMetalBlob = lazy(() => import('./LiquidMetalBlob.jsx'))

function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/** Swallows a failed chunk import or shader error and reports it. */
class ShaderBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('Liquid metal shader unavailable, using the image:', error)
    this.props.onFail()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function LiquidBlob({ enableShader = true }) {
  const [mode, setMode] = useState('image') // 'image' | 'shader' | 'failed'

  useEffect(() => {
    if (!enableShader) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (!hasWebGL2()) return undefined

    let idleId
    let timer
    const start = () => setMode((m) => (m === 'image' ? 'shader' : m))
    const schedule = () => {
      if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(start, { timeout: 2500 })
      else timer = setTimeout(start, 800)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })

    return () => {
      window.removeEventListener('load', schedule)
      if (idleId) window.cancelIdleCallback?.(idleId)
      clearTimeout(timer)
    }
  }, [enableShader])

  const art = ART.chromeBlob
  return (
    <span className={`lp-art__img lp-blob lp-blob--${mode}`}>
      <img className="lp-blob__img" src={art.src} width={art.w} height={art.h} alt="" decoding="async" draggable="false" />
      {mode === 'shader' && (
        <ShaderBoundary onFail={() => setMode('failed')}>
          <Suspense fallback={null}>
            <span className="lp-blob__layer"><LiquidMetalBlob /></span>
          </Suspense>
        </ShaderBoundary>
      )}
    </span>
  )
}

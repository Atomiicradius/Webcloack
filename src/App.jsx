/**
 * App.jsx — Router shell only.
 * `/` is the landing page; `/app` is the camera app (lazy-loaded so the
 * landing route never downloads MediaPipe or the engine).
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'

const CameraApp = lazy(() => import('./CameraApp.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="route-loading">LOADING...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<CameraApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

/**
 * App.jsx — Router shell only.
 * `/` is the landing page; `/app` is the camera app (lazy-loaded so the
 * landing route never downloads MediaPipe or the engine). The boot screen
 * is the first phase of /app, so the camera only starts from a user action.
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import { loadCameraApp } from './routes.js'

const CameraApp = lazy(loadCameraApp)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="route-loading">loading cloak.exe ...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<CameraApp />} />
          <Route path="/boot" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

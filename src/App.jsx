/**
 * App.jsx — Webcloak: Spatial Magic Window
 * Root component wiring webcam, hand tracking, shaders, audio, and UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Hooks
import { useWebcam } from './hooks/useWebcam.js'
import { useHandTracking } from './hooks/useHandTracking.js'
import { useGestureDetector } from './hooks/useGestureDetector.js'
import { useFPS } from './hooks/useFPS.js'

// Engine
import { initPipeline } from './engine/renderPipeline.js'
import { FILTERS, getFilter } from './engine/filters.js'
import { initAudio, destroyAudio } from './engine/audioEngine.js'
import { live, ZERO_LEVELS } from './engine/liveState.js'

// Components
import HUDHeader from './components/HUDHeader.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import MagicCanvas from './components/MagicCanvas.jsx'
import AudioVisualizer from './components/AudioVisualizer.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

const UI_SYNC_INTERVAL_MS = 100

export default function App() {
  // ── State ──────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('cloak')
  const [intensity, setIntensity] = useState(0.5)
  const [showWireframe, setShowWireframe] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [bgImage, setBgImage] = useState(null)
  const [audioLevels, setAudioLevels] = useState(ZERO_LEVELS)
  const [confidence, setConfidence] = useState(0)
  const [handsCount, setHandsCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const [loadingMessage, setLoadingMessage] = useState('INITIALIZING NEURAL ENGINE...')

  // ── Refs ───────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const pipelineInitRef = useRef(false)
  const toastIdRef = useRef(0)

  // ── Hooks ──────────────────────────────────────────────────────
  const { videoRef, isReady: isVideoReady, error: webcamError, resolution } = useWebcam()
  const {
    isLoading: isTrackingLoading,
    isInitialized: isTrackingReady,
    getQuads,
    getPinchData,
    getConfidence,
    getHandsCount,
  } = useHandTracking(videoRef, isVideoReady)
  const { processGestures } = useGestureDetector(FILTERS.length)
  const fps = useFPS()

  // ── Computed ───────────────────────────────────────────────────
  const isLoading = !isVideoReady || isTrackingLoading

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current
    setToasts([{ id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  // ── Initialize render pipeline ─────────────────────────────────
  useEffect(() => {
    if (isVideoReady && videoRef.current && !pipelineInitRef.current) {
      const w = videoRef.current.videoWidth || 1280
      const h = videoRef.current.videoHeight || 720
      initPipeline(w, h)
      pipelineInitRef.current = true
    }
  }, [isVideoReady, videoRef])

  // ── Loading messages ───────────────────────────────────────────
  useEffect(() => {
    if (!isVideoReady) {
      setLoadingMessage('CONNECTING TO CAMERA...')
    } else if (isTrackingLoading) {
      setLoadingMessage('LOADING MEDIAPIPE NEURAL ENGINE...')
    }
  }, [isVideoReady, isTrackingLoading])

  // ── Throttled UI sync (~10 Hz) ─────────────────────────────────
  // Per-frame values (intensity, audio levels, tracking stats) live in refs /
  // the live-state store. React state is refreshed from them at a low rate,
  // only for UI that displays them.
  useEffect(() => {
    const id = setInterval(() => {
      setIntensity(live.intensity)
      setAudioLevels(live.audioLevels)
      setConfidence(Math.round(getConfidence() * 100) / 100)
      setHandsCount(getHandsCount())
    }, UI_SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [getConfidence, getHandsCount])

  // ── Gesture processing ─────────────────────────────────────────
  useEffect(() => {
    if (!isTrackingReady) return

    let rafId
    function gestureLoop() {
      const { pinchIntensity, filterSnap } = processGestures(getPinchData())

      // A pinch overrides the slider only while actively pinching; when it
      // ends, live.intensity simply keeps its last value.
      if (pinchIntensity !== null) {
        live.intensity = live.intensity * 0.8 + pinchIntensity * 0.2
      }

      // Cycle filter on pinch-snap
      if (filterSnap) {
        setActiveFilter((prev) => {
          const idx = FILTERS.findIndex((f) => f.id === prev)
          const next = (idx + 1) % FILTERS.length
          return FILTERS[next].id
        })
      }
      rafId = requestAnimationFrame(gestureLoop)
    }
    rafId = requestAnimationFrame(gestureLoop)
    return () => cancelAnimationFrame(rafId)
  }, [isTrackingReady, getPinchData, processGestures])

  // ── Capture background ─────────────────────────────────────────
  const captureBackground = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = video.videoWidth
    bgCanvas.height = video.videoHeight
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.drawImage(video, 0, 0)
    setBgImage(bgCanvas)
    showToast('BACKGROUND CAPTURED', 'success')
  }, [videoRef, showToast])

  // ── Screenshot ─────────────────────────────────────────────────
  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webcloak-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      showToast('SCREENSHOT SAVED', 'success')
    }, 'image/png')
  }, [showToast])

  // ── Video recording ────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
      showToast('RECORDING STOPPED', 'info')
    } else {
      // Start recording
      const canvas = canvasRef.current
      if (!canvas) return

      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      })

      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `webcloak-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
        showToast('VIDEO EXPORTED', 'success')
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      showToast('RECORDING STARTED', 'info')
    }
  }, [isRecording, showToast])

  // ── Audio toggle ───────────────────────────────────────────────
  const toggleAudio = useCallback(async () => {
    if (audioEnabled) {
      destroyAudio()
      setAudioEnabled(false)
      live.audioLevels = ZERO_LEVELS
      setAudioLevels(ZERO_LEVELS)
      showToast('AUDIO DISABLED', 'info')
    } else {
      const ok = await initAudio()
      if (ok) {
        setAudioEnabled(true)
        showToast('AUDIO REACTIVE ENABLED', 'success')
      } else {
        showToast('AUDIO INIT FAILED', 'error')
      }
    }
  }, [audioEnabled, showToast])

  // ── Stable handlers for memoized children ──────────────────────
  const handleFilterChange = useCallback((f) => {
    setActiveFilter(f)
    showToast(`${getFilter(f)?.label} MODE`, 'info')
  }, [showToast])

  const handleIntensityChange = useCallback((v) => {
    live.intensity = v
    setIntensity(v)
  }, [])

  const handleToggleWireframe = useCallback(() => setShowWireframe((v) => !v), [])
  const handleToggleCollapse = useCallback(() => setPanelCollapsed((v) => !v), [])

  // ── Keyboard shortcuts (defined after callbacks) ───────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT') return

      switch (e.key) {
        case 'b':
        case 'B':
          captureBackground()
          break
        case 's':
        case 'S':
          takeScreenshot()
          break
        case 'r':
        case 'R':
          toggleRecording()
          break
        case 'w':
        case 'W':
          setShowWireframe((v) => !v)
          break
        case 'a':
        case 'A':
          toggleAudio()
          break
        default: {
          // Digit keys 1..N select filters; N comes from the registry (max 9).
          if (/^[1-9]$/.test(e.key)) {
            const filter = FILTERS[parseInt(e.key, 10) - 1]
            if (filter) {
              setActiveFilter(filter.id)
              showToast(`${filter.label} MODE`, 'info')
            }
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showToast, captureBackground, takeScreenshot, toggleRecording, toggleAudio])

  // ── Webcam error ───────────────────────────────────────────────
  if (webcamError) {
    return (
      <div className="app-container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '20px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '24px',
          background: 'linear-gradient(135deg, #00f3ff, #b026ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          WEBCLOAK
        </h1>
        <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          Camera access denied or unavailable.
        </p>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Please allow camera permissions and reload the page.
        </p>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="webcam-video"
        autoPlay
        playsInline
        muted
      />

      {/* Main render canvas */}
      <MagicCanvas
        videoRef={videoRef}
        getQuads={getQuads}
        filter={activeFilter}
        bgImage={bgImage}
        showWireframe={showWireframe}
        audioEnabled={audioEnabled}
        canvasRef={canvasRef}
      />

      {/* CRT scanline overlay */}
      <div className="crt-overlay" />

      {/* Loading screen */}
      <LoadingScreen
        visible={isLoading}
        message={loadingMessage}
      />

      {/* HUD Header */}
      {!isLoading && (
        <HUDHeader
          fps={fps}
          confidence={confidence}
          handsCount={handsCount}
          resolution={resolution}
          activeFilter={activeFilter}
          audioEnabled={audioEnabled}
        />
      )}

      {/* Control Panel */}
      {!isLoading && (
        <ControlPanel
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          intensity={intensity}
          onIntensityChange={handleIntensityChange}
          showWireframe={showWireframe}
          onToggleWireframe={handleToggleWireframe}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          onCaptureBackground={captureBackground}
          onScreenshot={takeScreenshot}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          hasBgImage={!!bgImage}
          isCollapsed={panelCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      )}

      {/* Audio Visualizer */}
      <AnimatePresence>
        {audioEnabled && !isLoading && (
          <AudioVisualizer
            audioLevels={audioLevels}
            visible={audioEnabled}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`toast ${toast.type}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

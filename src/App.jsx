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
import { initPipeline, FILTERS } from './engine/renderPipeline.js'
import { initAudio, getAudioLevels, destroyAudio } from './engine/audioEngine.js'

// Components
import HUDHeader from './components/HUDHeader.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import MagicCanvas from './components/MagicCanvas.jsx'
import AudioVisualizer from './components/AudioVisualizer.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export default function App() {
  // ── State ──────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('cloak')
  const [intensity, setIntensity] = useState(0.5)
  const [showWireframe, setShowWireframe] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [bgImage, setBgImage] = useState(null)
  const [audioLevels, setAudioLevels] = useState({ bass: 0, mid: 0, treble: 0, amplitude: 0 })
  const [toasts, setToasts] = useState([])
  const [loadingMessage, setLoadingMessage] = useState('INITIALIZING NEURAL ENGINE...')

  // ── Refs ───────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const audioRafRef = useRef(null)
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
  const confidence = getConfidence()
  const handsCount = getHandsCount()

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

  // ── Audio processing loop ──────────────────────────────────────
  useEffect(() => {
    if (!audioEnabled) {
      if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current)
      return
    }

    function audioLoop() {
      const levels = getAudioLevels()
      setAudioLevels(levels)
      audioRafRef.current = requestAnimationFrame(audioLoop)
    }
    audioRafRef.current = requestAnimationFrame(audioLoop)

    return () => {
      if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current)
    }
  }, [audioEnabled])

  // ── Gesture processing ─────────────────────────────────────────
  useEffect(() => {
    if (!isTrackingReady) return

    let rafId
    function gestureLoop() {
      const pinchData = getPinchData()
      if (pinchData.length > 0) {
        const { gestureIntensity, filterSnap } = processGestures(pinchData)

        // Auto-adjust intensity from pinch gesture
        setIntensity((prev) => prev * 0.8 + gestureIntensity * 0.2)

        // Cycle filter on pinch-snap
        if (filterSnap) {
          setActiveFilter((prev) => {
            const idx = FILTERS.findIndex((f) => f.id === prev)
            const next = (idx + 1) % FILTERS.length
            return FILTERS[next].id
          })
        }
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
      setAudioLevels({ bass: 0, mid: 0, treble: 0, amplitude: 0 })
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

  // ── Keyboard shortcuts (defined after callbacks) ───────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT') return

      switch (e.key) {
        case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
          const idx = parseInt(e.key) - 1
          if (FILTERS[idx]) {
            setActiveFilter(FILTERS[idx].id)
            showToast(`${FILTERS[idx].label} MODE`, 'info')
          }
          break
        }
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
        default:
          break
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
        getPinchData={getPinchData}
        filter={activeFilter}
        intensity={intensity}
        bgImage={bgImage}
        showWireframe={showWireframe}
        audioLevels={audioLevels}
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
          onFilterChange={(f) => {
            setActiveFilter(f)
            showToast(`${FILTERS.find((x) => x.id === f)?.label} MODE`, 'info')
          }}
          intensity={intensity}
          onIntensityChange={setIntensity}
          showWireframe={showWireframe}
          onToggleWireframe={() => setShowWireframe((v) => !v)}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          onCaptureBackground={captureBackground}
          onScreenshot={takeScreenshot}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          hasBgImage={!!bgImage}
          isCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((v) => !v)}
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

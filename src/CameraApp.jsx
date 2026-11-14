/**
 * CameraApp.jsx — Webcloak camera app (/app).
 * Wires webcam, hand tracking, shaders, audio and the Win98-style UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Hooks
import { useWebcam } from './hooks/useWebcam.js'
import { useHandTracking } from './hooks/useHandTracking.js'
import { useGestureDetector } from './hooks/useGestureDetector.js'
import { useFPS } from './hooks/useFPS.js'

// Engine
import { initPipeline, destroyPipeline, getShaderFailures } from './engine/renderPipeline.js'
import { FILTERS, getFilter } from './engine/filters.js'
import { initAudio, destroyAudio } from './engine/audioEngine.js'
import { live, ZERO_LEVELS } from './engine/liveState.js'

// Components
import MagicCanvas from './components/MagicCanvas.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import CameraGate from './components/CameraGate.jsx'
import { AppIcon, StatusField, TitleBarButton, Window } from './components/win98/index.js'
import FilterTools from './components/app/FilterTools.jsx'
import SidePanel from './components/app/SidePanel.jsx'
import ViewportHud from './components/app/ViewportHud.jsx'
import Taskbar from './components/app/Taskbar.jsx'
import ShortcutsDialog from './components/app/ShortcutsDialog.jsx'
import './components/app/app.css'

const UI_SYNC_INTERVAL_MS = 100

const SHORTCUTS = [
  [`1-${Math.min(FILTERS.length, 9)}`, 'select filter'],
  ['b', 'capture background'],
  ['s', 'snapshot'],
  ['r', 'start / stop recording'],
  ['w', 'wireframe on / off'],
  ['a', 'audio reactive on / off'],
  ['esc', 'close this dialog'],
]

// First supported WebM codec, best first; null when recording isn't available.
function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null
  }
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || null
}

export default function CameraApp() {
  // ── State ──────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('cloak')
  const [intensity, setIntensity] = useState(0.5)
  const [showWireframe, setShowWireframe] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordStartedAt, setRecordStartedAt] = useState(null)
  const [bgImage, setBgImage] = useState(null)
  const [audioLevels, setAudioLevels] = useState(ZERO_LEVELS)
  const [confidence, setConfidence] = useState(0)
  const [handsCount, setHandsCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const [loadingMessage, setLoadingMessage] = useState('INITIALIZING NEURAL ENGINE...')
  const [helpOpen, setHelpOpen] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const toastTimersRef = useRef(new Set())
  const toastIdRef = useRef(0)
  const helpButtonRef = useRef(null)
  const helpOpenRef = useRef(false)

  // ── Hooks ──────────────────────────────────────────────────────
  const {
    videoRef,
    status: cameraStatus,
    isReady: isVideoReady,
    error: webcamError,
    resolution,
    start: startCamera,
  } = useWebcam()
  const {
    isLoading: isTrackingLoading,
    isInitialized: isTrackingReady,
    error: trackingError,
    retry: retryTracking,
    getQuads,
    getPinchData,
    getConfidence,
    getHandsCount,
  } = useHandTracking(videoRef, isVideoReady)
  const { processGestures } = useGestureDetector()
  const fps = useFPS()

  // ── Computed ───────────────────────────────────────────────────
  const isLoading = !isVideoReady || isTrackingLoading
  const filterDef = getFilter(activeFilter)

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current
    setToasts([{ id, message, type }])
    const timer = setTimeout(() => {
      toastTimersRef.current.delete(timer)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
    toastTimersRef.current.add(timer)
  }, [])

  // ── Initialize render pipeline ─────────────────────────────────
  // Created when the camera becomes ready, destroyed when it stops or the
  // component unmounts (initPipeline is itself idempotent).
  useEffect(() => {
    if (!isVideoReady) return
    const video = videoRef.current
    initPipeline(video?.videoWidth || 1280, video?.videoHeight || 720)

    // One-time toast naming any filter whose shader failed to compile/link.
    // Those filters fall back to plain video.
    const failed = getShaderFailures()
    if (failed.length > 0) {
      const names = FILTERS.filter((f) => failed.includes(f.shaderKey)).map((f) => f.label.toLowerCase())
      showToast(`shader failed: ${names.join(', ')}`, 'error')
    }
    return () => destroyPipeline()
  }, [isVideoReady, videoRef, showToast])

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
    if (!video || video.readyState < 2) return

    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = video.videoWidth
    bgCanvas.height = video.videoHeight
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.drawImage(video, 0, 0)
    setBgImage(bgCanvas)
    showToast('background captured', 'success')
  }, [videoRef, showToast])

  // ── Screenshot ─────────────────────────────────────────────────
  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webcloak-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      showToast('snapshot saved', 'success')
    }, 'image/png')
  }, [showToast])

  // ── Video recording ────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const active = mediaRecorderRef.current
    if (active && active.state !== 'inactive') {
      active.stop() // onstop saves the file
    }
    setIsRecording(false)
    setRecordStartedAt(null)
  }, [])

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mimeType = pickRecorderMimeType()
    if (!mimeType || typeof canvas.captureStream !== 'function') {
      showToast('recording is not supported in this browser', 'error')
      return
    }

    let recorder
    try {
      const stream = canvas.captureStream(30)
      recorder = new MediaRecorder(stream, { mimeType })
    } catch (err) {
      console.error('MediaRecorder init failed:', err)
      showToast('recording is not supported in this browser', 'error')
      return
    }

    recordedChunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webcloak-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
      showToast('video saved', 'success')
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setRecordStartedAt(Date.now())
    showToast('recording started', 'info')
  }, [showToast])

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording()
    else startRecording()
  }, [isRecording, startRecording, stopRecording])

  // ── Audio toggle ───────────────────────────────────────────────
  const toggleAudio = useCallback(async () => {
    if (audioEnabled) {
      destroyAudio()
      setAudioEnabled(false)
      live.audioLevels = ZERO_LEVELS
      setAudioLevels(ZERO_LEVELS)
      showToast('audio reactive off', 'info')
    } else {
      const result = await initAudio()
      if (result.ok) {
        setAudioEnabled(true)
        showToast('audio reactive on', 'success')
      } else if (result.errorName === 'Cancelled') {
        // torn down mid-request (e.g. navigated away); nothing to report
      } else if (result.errorName === 'NotAllowedError') {
        showToast('microphone access denied', 'error')
      } else if (result.errorName === 'NotFoundError') {
        showToast('no microphone found', 'error')
      } else {
        showToast('audio could not start', 'error')
      }
    }
  }, [audioEnabled, showToast])

  // ── Unmount cleanup: recorder, microphone, toast timers ────────
  // (camera stream, RAF loops, landmarker and pipeline are released by their
  // own hooks/effects.) Safe under StrictMode's mount → unmount → mount.
  useEffect(() => {
    const timers = toastTimersRef.current
    return () => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null // don't trigger a download on teardown
        recorder.stop()
      }
      recorder?.stream?.getTracks().forEach((t) => t.stop())
      mediaRecorderRef.current = null
      destroyAudio()
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  // ── Stable handlers for memoized children ──────────────────────
  const handleFilterChange = useCallback((f) => {
    setActiveFilter(f)
    showToast(`${getFilter(f)?.label.toLowerCase()} mode`, 'info')
  }, [showToast])

  const handleIntensityChange = useCallback((v) => {
    live.intensity = v
    setIntensity(v)
  }, [])

  const handleToggleWireframe = useCallback(() => setShowWireframe((v) => !v), [])

  // ── Help dialog ────────────────────────────────────────────────
  const openHelp = useCallback(() => {
    helpOpenRef.current = true
    setHelpOpen(true)
  }, [])
  const closeHelp = useCallback(() => {
    helpOpenRef.current = false
    setHelpOpen(false)
    helpButtonRef.current?.focus()
  }, [])

  // ── Keyboard shortcuts (defined after callbacks) ───────────────
  useEffect(() => {
    function handleKey(e) {
      // Leave browser/OS shortcuts (Ctrl+R, Ctrl+S, ...) alone
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // The help dialog handles its own keys
      if (helpOpenRef.current) return

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
              showToast(`${filter.label.toLowerCase()} mode`, 'info')
            }
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showToast, captureBackground, takeScreenshot, toggleRecording, toggleAudio])

  const showApp = cameraStatus === 'starting' || cameraStatus === 'ready'
  const aspect = resolution.w > 0 && resolution.h > 0 ? `${resolution.w} / ${resolution.h}` : '16 / 9'

  let statusMessage = 'ready'
  if (isRecording) statusMessage = 'recording'
  else if (trackingError) statusMessage = 'hand tracking unavailable'
  else if (handsCount < 2) statusMessage = 'show both hands to open a portal'

  return (
    <div className="wc-desktop">
      {/* Hidden source video */}
      <video ref={videoRef} className="wc-video" autoPlay playsInline muted />

      <main className="wc-main">
        {/* Start / error screen (nothing camera-related runs until Start) */}
        {!showApp && (
          <CameraGate status={cameraStatus} error={webcamError} onStart={startCamera} />
        )}

        {showApp && (
          <Window
            className="wc-window"
            title="webcloak.exe - live"
            titleAs="h1"
            icon={<AppIcon />}
            decorativeControls
            controls={(
              <TitleBarButton
                ref={helpButtonRef}
                onClick={openHelp}
                aria-label="keyboard shortcuts"
                aria-haspopup="dialog"
              >
                ?
              </TitleBarButton>
            )}
            statusBar={(
              <>
                <StatusField grow>{statusMessage}</StatusField>
                <StatusField>fps {fps}</StatusField>
                <StatusField>track {Math.round(confidence * 100)}%</StatusField>
                <StatusField>mic {audioEnabled ? 'on' : 'off'}</StatusField>
              </>
            )}
          >
            <div className="wc-body">
              <FilterTools activeFilter={activeFilter} onSelect={handleFilterChange} />

              <div className="wc-stage">
                {/* Non-blocking hand-tracking failure notice */}
                {trackingError && !isLoading && (
                  <div
                    role="alert"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px 14px', background: 'var(--black)', color: 'var(--mint)',
                    }}
                  >
                    <span>Hand tracking failed to load</span>
                    <button className="capture-btn" onClick={retryTracking}>Retry</button>
                  </div>
                )}

                <div className="wc-viewport w98-sunken">
                  <div className="wc-viewport__screen" style={{ '--cam-aspect': aspect }}>
                    <MagicCanvas
                      videoRef={videoRef}
                      getQuads={getQuads}
                      filter={activeFilter}
                      bgImage={bgImage}
                      showWireframe={showWireframe}
                      audioEnabled={audioEnabled}
                      canvasRef={canvasRef}
                    />
                    <ViewportHud
                      isRecording={isRecording}
                      recordStartedAt={recordStartedAt}
                      handsCount={handsCount}
                      filter={filterDef}
                    />
                  </div>
                </div>
              </div>

              <SidePanel
                filter={filterDef}
                intensity={intensity}
                onIntensityChange={handleIntensityChange}
                audioEnabled={audioEnabled}
                onToggleAudio={toggleAudio}
                showWireframe={showWireframe}
                onToggleWireframe={handleToggleWireframe}
                hasBgImage={!!bgImage}
                canCapture={isVideoReady}
                onCaptureBackground={captureBackground}
                onScreenshot={takeScreenshot}
                isRecording={isRecording}
                canRecord={isVideoReady}
                onToggleRecording={toggleRecording}
                audioLevels={audioLevels}
              />
            </div>
          </Window>
        )}
      </main>

      {/* Loading screen */}
      {showApp && <LoadingScreen visible={isLoading} message={loadingMessage} />}

      {helpOpen && <ShortcutsDialog shortcuts={SHORTCUTS} onClose={closeHelp} />}

      <Taskbar />

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

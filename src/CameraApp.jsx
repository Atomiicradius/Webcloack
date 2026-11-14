/**
 * CameraApp.jsx — Webcloak camera app (/app).
 * Wires webcam, hand tracking, shaders, audio and the Win98-style UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

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
import { setMirror } from './engine/mirror.js'

// Components
import MagicCanvas from './components/MagicCanvas.jsx'
import BootScreen from './components/boot/BootScreen.jsx'
import { AppIcon, StatusField, TitleBarButton, ToolButton, Window } from './components/win98/index.js'
import FilterTools from './components/app/FilterTools.jsx'
import SidePanel from './components/app/SidePanel.jsx'
import ViewportHud from './components/app/ViewportHud.jsx'
import Taskbar from './components/app/Taskbar.jsx'
import ShortcutsDialog from './components/app/ShortcutsDialog.jsx'
import Toasts from './components/app/Toasts.jsx'
import TrackingBanner from './components/app/TrackingBanner.jsx'
import PausedOverlay from './components/app/PausedOverlay.jsx'
import { IconCamera } from './components/Icons.jsx'
import './components/app/app.css'

gsap.registerPlugin(useGSAP)

const UI_SYNC_INTERVAL_MS = 100
const BOOT_MIN_MS = 1200 // boot dialog never flashes by faster than this
const MIRROR_KEY = 'webcloak.mirror'

// Selfie mirror preference; defaults to on. Storage may be unavailable.
function readMirrorPref() {
  try {
    return localStorage.getItem(MIRROR_KEY) !== '0'
  } catch {
    return true
  }
}

const SHORTCUTS = [
  [`1-${Math.min(FILTERS.length, 9)}`, 'select filter'],
  ['b', 'capture background'],
  ['s', 'snapshot'],
  ['r', 'start / stop recording'],
  ['w', 'wireframe on / off'],
  ['m', 'mirror camera on / off'],
  ['a', 'audio reactive on / off'],
  ['c', 'camera on / off'],
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
  const [helpOpen, setHelpOpen] = useState(false)
  const [autoPaused, setAutoPaused] = useState(false)
  const [mirror, setMirrorState] = useState(readMirrorPref)
  // Boot: requested by a user action (landing "launch" or the start button)
  const location = useLocation()
  const navigate = useNavigate()
  // Arrived via the landing page's launch button (that click is the action)
  const [launched] = useState(() => Boolean(location.state?.launch))
  const [bootRequested, setBootRequested] = useState(launched)
  const [minElapsed, setMinElapsed] = useState(false)
  const [pipelineInfo, setPipelineInfo] = useState({ ready: false, failed: 0 })
  const [bootDone, setBootDone] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const toastTimersRef = useRef(new Set())
  const toastIdRef = useRef(0)
  const helpButtonRef = useRef(null)
  const helpOpenRef = useRef(false)
  const autoPausedRef = useRef(false)   // paused by tab visibility, not by the user
  const cameraStatusRef = useRef('idle')
  const rootRef = useRef(null)
  const overlayOpenRef = useRef(true)
  const launchedRef = useRef(launched)

  // ── Hooks ──────────────────────────────────────────────────────
  const {
    videoRef,
    status: cameraStatus,
    isReady: isVideoReady,
    isPaused: isCameraPaused,
    sessionLive,
    error: webcamError,
    resolution,
    start: startCamera,
    pause: pauseWebcam,
  } = useWebcam()
  const {
    isInitialized: isTrackingReady,
    error: trackingError,
    retry: retryTracking,
    getQuads,
    getPinchData,
    getConfidence,
    getHandsCount,
  } = useHandTracking(videoRef, { enabled: bootRequested, running: isVideoReady })
  const { processGestures } = useGestureDetector()
  const fps = useFPS(isVideoReady)

  // ── Computed ───────────────────────────────────────────────────
  // Engines stay alive but every loop stops while paused or re-acquiring
  const isHalted = sessionLive && !isVideoReady
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

  const reportPipeline = useCallback((info) => setPipelineInfo(info), [])

  // ── Boot: start the camera (and, in parallel, the hand model) ──
  const requestStart = useCallback(() => {
    setBootRequested(true)
    startCamera()
  }, [startCamera])

  // Arrived from the landing launch button: that click is the user action.
  // Consume the flag so a reload does not start the camera on its own.
  // (StrictMode re-runs this; the second start() supersedes the first.)
  useEffect(() => {
    if (!launchedRef.current) return
    navigate(location.pathname, { replace: true, state: null })
    startCamera()
  }, [navigate, location.pathname, startCamera])

  // Minimum boot display time (never fakes progress, only delays the exit)
  useEffect(() => {
    if (!bootRequested) return
    const t = setTimeout(() => setMinElapsed(true), BOOT_MIN_MS)
    return () => clearTimeout(t)
  }, [bootRequested])

  const exitToLanding = useCallback(() => navigate('/'), [navigate])

  // ── Initialize render pipeline ─────────────────────────────────
  // Created when the camera session starts, kept through pauses, destroyed
  // on camera error or unmount (initPipeline is itself idempotent).
  useEffect(() => {
    if (!sessionLive) return
    const video = videoRef.current
    initPipeline(video?.videoWidth || 1280, video?.videoHeight || 720)

    // One-time toast naming any filter whose shader failed to compile/link.
    // Those filters fall back to plain video.
    const failed = getShaderFailures()
    if (failed.length > 0) {
      const names = FILTERS.filter((f) => failed.includes(f.shaderKey)).map((f) => f.label.toLowerCase())
      showToast(`shader failed: ${names.join(', ')}`, 'error')
    }
    reportPipeline({ ready: true, failed: failed.length })
    return () => {
      destroyPipeline()
      reportPipeline({ ready: false, failed: 0 })
    }
  }, [sessionLive, videoRef, showToast, reportPipeline])

  // ── Mirror: push to the engine and persist ─────────────────────
  useEffect(() => {
    setMirror(mirror)
    try {
      localStorage.setItem(MIRROR_KEY, mirror ? '1' : '0')
    } catch {
      // storage blocked: the setting just won't persist
    }
  }, [mirror])

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
    if (!isTrackingReady || !isVideoReady) return

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
  }, [isTrackingReady, isVideoReady, getPinchData, processGestures])

  // ── Capture background ─────────────────────────────────────────
  const captureBackground = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      showToast('turn the camera on first', 'info')
      return
    }

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
    if (cameraStatusRef.current !== 'ready') {
      showToast('turn the camera on first', 'info')
      return
    }

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

  // ── Camera pause / resume ──────────────────────────────────────
  useEffect(() => {
    cameraStatusRef.current = cameraStatus
  }, [cameraStatus])

  /** Stop the camera (light off), saving any recording first. Engines stay alive. */
  const pauseCamera = useCallback((auto = false) => {
    if (cameraStatusRef.current !== 'ready') return
    if (mediaRecorderRef.current?.state === 'recording') stopRecording()
    autoPausedRef.current = auto
    setAutoPaused(auto)
    pauseWebcam()
  }, [pauseWebcam, stopRecording])

  /** Re-acquire the camera; on failure useWebcam lands on the error screen. */
  const resumeCamera = useCallback(() => {
    if (cameraStatusRef.current !== 'paused') return
    autoPausedRef.current = false
    setAutoPaused(false)
    startCamera()
  }, [startCamera])

  const toggleCamera = useCallback(() => {
    if (cameraStatusRef.current === 'ready') pauseCamera(false)
    else if (cameraStatusRef.current === 'paused') resumeCamera()
  }, [pauseCamera, resumeCamera])

  // Auto-pause while the tab is hidden; auto-resume only if the app paused it
  // (a manual stop is never overridden).
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (cameraStatusRef.current === 'ready') pauseCamera(true)
      } else if (autoPausedRef.current && cameraStatusRef.current === 'paused') {
        resumeCamera()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pauseCamera, resumeCamera])

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
  const handleToggleMirror = useCallback(() => setMirrorState((v) => !v), [])

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
      // The help dialog handles its own keys; the boot overlay owns the screen
      if (helpOpenRef.current || overlayOpenRef.current) return

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
        case 'm':
        case 'M':
          setMirrorState((v) => !v)
          break
        case 'a':
        case 'A':
          toggleAudio()
          break
        case 'c':
        case 'C':
          toggleCamera()
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
  }, [showToast, captureBackground, takeScreenshot, toggleRecording, toggleAudio, toggleCamera])

  // ── Boot tasks (real states only) ──────────────────────────────
  const modelState = !bootRequested ? 'pending' : trackingError ? 'fail' : isTrackingReady ? 'ok' : 'active'
  const cameraState = !bootRequested ? 'pending' : sessionLive ? 'ok' : cameraStatus === 'error' ? 'fail' : 'active'
  const shaderState = !sessionLive ? 'pending' : pipelineInfo.ready ? 'ok' : 'active'
  const frameState = !pipelineInfo.ready ? 'pending' : isVideoReady ? 'ok' : 'active'
  const bootLines = [
    {
      id: 'model',
      label: 'loading hand model',
      state: modelState,
      detail: modelState === 'active' ? 'loading' : modelState === 'fail' ? 'failed (filters still work)' : undefined,
    },
    {
      id: 'camera',
      label: 'requesting camera permission',
      state: cameraState,
      detail: cameraState === 'fail' ? 'denied' : undefined,
    },
    {
      id: 'shaders',
      label: 'compiling shaders',
      state: shaderState,
      detail: shaderState === 'ok' && pipelineInfo.failed > 0 ? `ok (${pipelineInfo.failed} failed)` : undefined,
    },
    { id: 'frame', label: 'camera ready', state: frameState },
  ]
  const bootProgress = bootLines.filter((l) => l.state === 'ok' || l.state === 'fail').length
  const bootReady = bootRequested && (isTrackingReady || Boolean(trackingError))
    && pipelineInfo.ready && isVideoReady && minElapsed
  const bootPhase = cameraStatus === 'error' ? 'error' : bootRequested ? 'boot' : 'idle'
  const overlayOpen = !bootDone || cameraStatus === 'error'

  useEffect(() => {
    overlayOpenRef.current = overlayOpen
  }, [overlayOpen])

  // Boot dialog entrance (white flash fades out when coming from launch)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (launchedRef.current) {
        gsap.fromTo('.bt-flash', { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power2.out' })
        gsap.from('.bt-globe', { scale: 2.6, duration: 1, ease: 'power3.out' })
      }
      gsap.from('.bt-dialog', { scale: 0.7, opacity: 0, duration: 0.45, ease: 'back.out(1.7)', delay: 0.15 })
    }, rootRef.current)
    return () => mm.revert()
  }, { scope: rootRef })

  // Boot exit: dialog collapses, then the app frames slide and scale in
  useGSAP(() => {
    if (!bootReady || bootDone) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBootDone(true)
      return
    }
    const tl = gsap.timeline({ onComplete: () => setBootDone(true) })
    tl.to('.bt-dialog', { scaleY: 0.03, duration: 0.22, ease: 'power2.in' })
      .to('.bt-dialog', { scaleX: 0, opacity: 0, duration: 0.16, ease: 'power2.in' })
      .to('.bt-globe', { scale: 1.8, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.bt', { opacity: 0, duration: 0.3, ease: 'none' }, 0.3)
      .from('[data-boot-in]', {
        opacity: 0, y: 48, scale: 0.92, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)', clearProps: 'transform,opacity',
      }, 0.35)
  }, { dependencies: [bootReady, bootDone], scope: rootRef })

  const aspect = resolution.w > 0 && resolution.h > 0 ? `${resolution.w} / ${resolution.h}` : '16 / 9'

  let statusMessage = 'ready'
  if (isCameraPaused) statusMessage = 'camera paused'
  else if (isHalted) statusMessage = 'starting camera'
  else if (isRecording) statusMessage = 'recording'
  else if (trackingError) statusMessage = 'hand tracking unavailable'
  else if (handsCount < 2) statusMessage = 'show both hands to open a portal'

  return (
    <div className="wc-desktop" ref={rootRef}>
      {/* Hidden source video */}
      <video ref={videoRef} className="wc-video" autoPlay playsInline muted />

      <main className="wc-main">
        {(
          <Window
            data-boot-in
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
              <FilterTools activeFilter={activeFilter} onSelect={handleFilterChange}>
                <ToolButton
                  layout="row"
                  icon={<IconCamera size={20} />}
                  label={isCameraPaused ? 'camera: off' : 'camera: on'}
                  aria-label="camera"
                  aria-keyshortcuts="c"
                  pressed={!isCameraPaused}
                  disabled={cameraStatus === 'starting'}
                  onClick={toggleCamera}
                />
              </FilterTools>

              <div className="wc-stage">
                {/* Non-blocking hand-tracking failure notice */}
                {trackingError && bootDone && <TrackingBanner onRetry={retryTracking} />}

                <div className="wc-viewport w98-sunken">
                  <div className="wc-viewport__screen" style={{ '--cam-aspect': aspect }}>
                    <MagicCanvas
                      videoRef={videoRef}
                      getQuads={getQuads}
                      filter={activeFilter}
                      bgImage={bgImage}
                      showWireframe={showWireframe}
                      audioEnabled={audioEnabled}
                      paused={!isVideoReady}
                      canvasRef={canvasRef}
                    />
                    <ViewportHud
                      isRecording={isRecording}
                      recordStartedAt={recordStartedAt}
                      handsCount={handsCount}
                      filter={filterDef}
                    />
                    {isHalted && bootDone && (
                      <PausedOverlay
                        resuming={cameraStatus === 'starting'}
                        autoPaused={autoPaused}
                        onResume={resumeCamera}
                      />
                    )}
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
                mirror={mirror}
                onToggleMirror={handleToggleMirror}
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

      {/* Boot dialog (and camera errors, in the same style) */}
      {overlayOpen && (
        <BootScreen
          phase={bootPhase}
          lines={bootLines}
          progress={bootProgress}
          error={webcamError}
          onStart={requestStart}
          onRetry={requestStart}
          onCancel={exitToLanding}
        />
      )}

      {helpOpen && <ShortcutsDialog shortcuts={SHORTCUTS} onClose={closeHelp} />}

      <Taskbar />

      <Toasts toasts={toasts} />
    </div>
  )
}

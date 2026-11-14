/**
 * useWebcam.js — React hook for webcam access and video element management.
 *
 * Nothing runs on mount. Call `start()` (from a click) to request the camera;
 * `status` goes idle → starting → ready | error. `start()` can be called again
 * to retry after an error. The stream is released on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export function useWebcam() {
  const videoRef = useRef(null)
  const videoElRef = useRef(null)   // element we attached to (videoRef is nulled before unmount cleanups)
  const streamRef = useRef(null)
  const attemptRef = useRef(0)      // bumped to invalidate in-flight start() calls
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [resolution, setResolution] = useState({ w: 0, h: 0 })

  /** Stop all tracks and detach the stream from the video element. */
  const release = useCallback(() => {
    attemptRef.current++
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => {
        t.onended = null
        t.stop()
      })
      streamRef.current = null
    }
    const video = videoElRef.current
    if (video) {
      video.onloadedmetadata = null
      video.srcObject = null
      videoElRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    release()
    const attempt = attemptRef.current
    setStatus('starting')
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const e = new Error('Camera API unavailable (requires HTTPS or localhost)')
        e.name = 'NotSupportedError'
        throw e
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      // Superseded (retry) or unmounted while waiting for permission
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error('Video element not available')
      }

      streamRef.current = stream
      videoElRef.current = video

      // Camera unplugged / taken by another app mid-session
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (attempt !== attemptRef.current) return
          release()
          setError({ name: 'NotReadableError', message: 'Camera disconnected' })
          setStatus('error')
        }
      })

      video.onloadedmetadata = () => {
        if (attempt !== attemptRef.current) return
        video.play().catch(() => {})
        setResolution({ w: video.videoWidth, h: video.videoHeight })
        setStatus('ready')
      }
      video.srcObject = stream
    } catch (err) {
      if (attempt !== attemptRef.current) return
      console.error('Webcam error:', err)
      release()
      setError({ name: err?.name || 'Error', message: err?.message || '' })
      setStatus('error')
    }
  }, [release])

  // Release the camera when the component using this hook unmounts.
  useEffect(() => release, [release])

  return {
    videoRef,
    status,
    isReady: status === 'ready',
    error,
    resolution,
    start,
  }
}

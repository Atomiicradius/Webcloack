/**
 * useWebcam.js — React hook for webcam access and video element management.
 */

import { useEffect, useRef, useState } from 'react'

export function useWebcam() {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [resolution, setResolution] = useState({ w: 0, h: 0 })

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setResolution({
              w: videoRef.current.videoWidth,
              h: videoRef.current.videoHeight,
            })
            setIsReady(true)
          }
        }
      } catch (err) {
        console.error('Webcam error:', err)
        setError(err.message)
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  return { videoRef, isReady, error, resolution }
}

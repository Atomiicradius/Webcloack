/**
 * useHandTracking.js — React hook wrapping MediaPipe hand detection loop.
 * Runs on RAF, extracts quads and pinch data each frame.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { initHandLandmarker, closeHandLandmarker, detectHands, extractQuads, extractPinchData, getConfidence } from '../engine/handTracker.js'
import { smoothPolygon } from '../engine/convexHull.js'

export function useHandTracking(videoRef, isVideoReady) {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)  // bumped by retry() to re-run init
  const quadsRef = useRef([])
  const pinchDataRef = useRef([])
  const confidenceRef = useRef(0)
  const handsCountRef = useRef(0)
  const rafRef = useRef(null)
  const prevQuadsRef = useRef([])

  // Initialize MediaPipe — only once the camera is running
  useEffect(() => {
    if (!isVideoReady) return
    let cancelled = false

    async function setup() {
      try {
        await initHandLandmarker()
        if (!cancelled) {
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (e) {
        if (cancelled) return // superseded by cleanup (unmount / StrictMode)
        console.error('Hand tracking init error:', e)
        setError(e?.message || 'Hand tracking failed to load')
        setIsLoading(false)
      }
    }

    setup()
    return () => {
      cancelled = true
      closeHandLandmarker()
      setIsInitialized(false)
      setIsLoading(true)
      setError(null)
    }
  }, [isVideoReady, attempt])

  // Detection loop
  useEffect(() => {
    if (!isInitialized || !isVideoReady || !videoRef.current) return

    const video = videoRef.current

    function detect() {
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const result = detectHands(video, performance.now())

      if (result) {
        const rawQuads = extractQuads(result, video.videoWidth, video.videoHeight)

        // Smooth polygon points for stability
        const smoothed = rawQuads.map((quad, i) => {
          const prev = prevQuadsRef.current[i]
          return smoothPolygon(prev, quad, 0.35)
        })
        prevQuadsRef.current = smoothed

        quadsRef.current = smoothed
        pinchDataRef.current = extractPinchData(result, video.videoWidth, video.videoHeight)
        confidenceRef.current = getConfidence(result)
        handsCountRef.current = result.landmarks?.length || 0
      } else {
        // Decay quads when no hands detected
        if (quadsRef.current.length > 0) {
          quadsRef.current = []
          prevQuadsRef.current = []
        }
        pinchDataRef.current = []
        confidenceRef.current = 0
        handsCountRef.current = 0
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      quadsRef.current = []
      prevQuadsRef.current = []
      pinchDataRef.current = []
      confidenceRef.current = 0
      handsCountRef.current = 0
    }
  }, [isInitialized, isVideoReady, videoRef])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  const getQuads = useCallback(() => quadsRef.current, [])
  const getPinchData = useCallback(() => pinchDataRef.current, [])
  const getConfidenceValue = useCallback(() => confidenceRef.current, [])
  const getHandsCount = useCallback(() => handsCountRef.current, [])

  return {
    isLoading,
    isInitialized,
    error,
    retry,
    getQuads,
    getPinchData,
    getConfidence: getConfidenceValue,
    getHandsCount,
  }
}

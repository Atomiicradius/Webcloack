/**
 * handTracker.js — MediaPipe Tasks Vision hand tracking wrapper.
 * Initializes HandLandmarker and extracts quad ROI from 4 fingertips.
 */

/* global __MEDIAPIPE_VERSION__ */
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { convexHull, sortQuadClockwise } from './convexHull.js'

// WASM assets are fetched from the exact version of @mediapipe/tasks-vision
// that is installed (injected by vite.config.js from node_modules).
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`

// Landmark indices
export const LANDMARK = {
  THUMB_TIP: 4,
  INDEX_TIP: 8,
}

let handLandmarker = null
let initPromise = null
let generation = 0   // bumped by closeHandLandmarker() to cancel in-flight inits

/**
 * Initialize MediaPipe HandLandmarker with GPU acceleration.
 * Idempotent: concurrent/repeated calls share one landmarker. If
 * closeHandLandmarker() is called while init is in flight, the landmarker
 * that finishes loading is closed immediately and the promise rejects.
 */
export function initHandLandmarker() {
  if (handLandmarker) return Promise.resolve(handLandmarker)
  if (initPromise) return initPromise

  const gen = generation
  const promise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      WASM_URL
    )
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 4,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    if (gen !== generation) {
      landmarker.close()
      throw new Error('Hand landmarker init cancelled')
    }
    handLandmarker = landmarker
    return landmarker
  })()

  initPromise = promise
  const clear = () => { if (initPromise === promise) initPromise = null }
  promise.then(clear, clear)
  return promise
}

/**
 * Close the landmarker and reset the module singleton so it can be re-created.
 */
export function closeHandLandmarker() {
  generation++
  initPromise = null
  if (handLandmarker) {
    try {
      handLandmarker.close()
    } catch (e) {
      console.warn('HandLandmarker close error:', e)
    }
    handLandmarker = null
  }
}

/**
 * Run detection on a single video frame.
 * Returns raw MediaPipe result.
 */
export function detectHands(video, timestamp) {
  if (!handLandmarker) return null
  try {
    return handLandmarker.detectForVideo(video, timestamp)
  } catch (e) {
    console.warn('Hand detection error:', e)
    return null
  }
}

/**
 * Classify detected hands into left/right groups using handedness data.
 */
function classifyHands(result) {
  const groups = { Left: [], Right: [] }
  if (!result || !result.landmarks) return groups

  for (let i = 0; i < result.landmarks.length; i++) {
    const handedness = result.handednesses?.[i]?.[0]
    // MediaPipe mirrors: "Left" in data = user's right hand
    const label = handedness?.categoryName || 'Right'
    if (groups[label]) {
      groups[label].push(result.landmarks[i])
    }
  }
  return groups
}

/**
 * Extract all quad portals from a detection result.
 * Each quad is 4 points: [leftThumb, leftIndex, rightThumb, rightIndex]
 * If 2 hands (one left, one right), returns 1 quad.
 * If 4 hands (2 left, 2 right), returns 2 quads.
 */
export function extractQuads(result, videoWidth, videoHeight) {
  const groups = classifyHands(result)
  const quads = []

  const leftHands = groups.Left
  const rightHands = groups.Right

  const pairCount = Math.min(leftHands.length, rightHands.length)
  for (let i = 0; i < pairCount; i++) {
    const lh = leftHands[i]
    const rh = rightHands[i]

    const rawPoints = [
      [lh[LANDMARK.THUMB_TIP].x * videoWidth, lh[LANDMARK.THUMB_TIP].y * videoHeight],
      [lh[LANDMARK.INDEX_TIP].x * videoWidth, lh[LANDMARK.INDEX_TIP].y * videoHeight],
      [rh[LANDMARK.THUMB_TIP].x * videoWidth, rh[LANDMARK.THUMB_TIP].y * videoHeight],
      [rh[LANDMARK.INDEX_TIP].x * videoWidth, rh[LANDMARK.INDEX_TIP].y * videoHeight],
    ]

    // Compute convex hull to prevent self-intersection, then sort clockwise
    const hull = convexHull(rawPoints)
    const sorted = sortQuadClockwise(hull)

    quads.push(sorted)
  }

  return quads
}

/**
 * Extract pinch distance for each detected hand.
 * Returns array of { hand: 'Left'|'Right', pinchDist, thumbTip, indexTip }
 */
export function extractPinchData(result, videoWidth, videoHeight) {
  if (!result || !result.landmarks) return []

  return result.landmarks.map((lm, i) => {
    const handedness = result.handednesses?.[i]?.[0]?.categoryName || 'Unknown'
    const thumb = lm[LANDMARK.THUMB_TIP]
    const index = lm[LANDMARK.INDEX_TIP]
    const dx = (thumb.x - index.x) * videoWidth
    const dy = (thumb.y - index.y) * videoHeight
    const pinchDist = Math.sqrt(dx * dx + dy * dy)
    return {
      hand: handedness,
      pinchDist,
      thumbTip: [thumb.x * videoWidth, thumb.y * videoHeight],
      indexTip: [index.x * videoWidth, index.y * videoHeight],
    }
  })
}

/**
 * Get average confidence across all detected hands.
 */
export function getConfidence(result) {
  if (!result || !result.handednesses || result.handednesses.length === 0) return 0
  const scores = result.handednesses.map((h) => h[0]?.score || 0)
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

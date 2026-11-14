/**
 * audioEngine.js — Web Audio API AnalyserNode for real-time mic frequency analysis.
 * Provides bass/mid/treble energy bands and overall amplitude for HUD modulation.
 */

let audioCtx = null
let analyser = null
let micStream = null
let dataArray = null
let freqArray = null
let bufferLength = 0
let audioGeneration = 0   // bumped by destroyAudio() to cancel an in-flight init

let audioInitPromise = null

/**
 * Initialize microphone input and create audio analysis pipeline.
 * Resolves to { ok: true } or { ok: false, errorName }. On any failure the
 * AudioContext is closed and all state reset, so a retry starts clean.
 * errorName 'Cancelled' means destroyAudio() ran while initialising.
 */
export function initAudio() {
  if (audioCtx && micStream) return Promise.resolve({ ok: true })
  if (audioInitPromise) return audioInitPromise

  const gen = audioGeneration
  const promise = (async () => {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.8
      bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
      freqArray = new Uint8Array(bufferLength)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (gen !== audioGeneration) {
        // destroyAudio() ran while waiting for permission: don't leak the mic
        stream.getTracks().forEach((t) => t.stop())
        return { ok: false, errorName: 'Cancelled' }
      }
      micStream = stream
      const source = audioCtx.createMediaStreamSource(micStream)
      source.connect(analyser)
      return { ok: true }
    } catch (e) {
      console.warn('Audio init failed:', e)
      if (gen === audioGeneration) destroyAudio() // full reset so a retry starts clean
      return { ok: false, errorName: e?.name || 'Error' }
    }
  })()

  audioInitPromise = promise
  const clear = () => { if (audioInitPromise === promise) audioInitPromise = null }
  promise.then(clear, clear)
  return promise
}

/**
 * Get frequency data split into bass/mid/treble energy bands + overall amplitude.
 * Returns { bass, mid, treble, amplitude } normalized 0..1
 */
export function getAudioLevels() {
  if (!analyser || !dataArray) {
    return { bass: 0, mid: 0, treble: 0, amplitude: 0 }
  }

  analyser.getByteFrequencyData(freqArray)
  analyser.getByteTimeDomainData(dataArray)

  // Frequency bands (rough mapping for 44.1kHz, fftSize=1024)
  const binCount = freqArray.length
  const bassEnd = Math.floor(binCount * 0.1)    // ~0-440 Hz
  const midEnd = Math.floor(binCount * 0.4)     // ~440-1760 Hz

  let bassSum = 0, midSum = 0, trebleSum = 0

  for (let i = 0; i < binCount; i++) {
    const val = freqArray[i] / 255
    if (i < bassEnd) bassSum += val
    else if (i < midEnd) midSum += val
    else trebleSum += val
  }

  const bass = bassEnd > 0 ? bassSum / bassEnd : 0
  const mid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0
  const treble = (binCount - midEnd) > 0 ? trebleSum / (binCount - midEnd) : 0

  // Overall amplitude from time domain
  let ampSum = 0
  for (let i = 0; i < bufferLength; i++) {
    const v = (dataArray[i] - 128) / 128
    ampSum += v * v
  }
  const amplitude = Math.sqrt(ampSum / bufferLength)

  return { bass, mid, treble, amplitude }
}

/**
 * Get raw time-domain waveform data for vibrating string rendering.
 * Returns a Uint8Array where 128 = silence, 0/255 = max amplitude.
 */
export function getTimeDomainData() {
  if (!analyser || !dataArray) return new Uint8Array(0)
  analyser.getByteTimeDomainData(dataArray)
  return dataArray
}

/**
 * Check if a beat (bass spike) was detected.
 */
let lastBassAvg = 0
export function detectBeat(threshold = 0.6) {
  const { bass } = getAudioLevels()
  const isBeat = bass > threshold && bass > lastBassAvg * 1.4
  lastBassAvg = lastBassAvg * 0.9 + bass * 0.1
  return isBeat
}

/**
 * Cleanup audio resources.
 */
export function destroyAudio() {
  audioGeneration++
  audioInitPromise = null
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop())
    micStream = null
  }
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
  analyser = null
  dataArray = null
  freqArray = null
}

/**
 * LoadingScreen.jsx — Full-screen loading overlay shown while MediaPipe initializes.
 * Features animated hexagon, scanning lines, and status messages.
 */

import { motion, AnimatePresence } from 'framer-motion'

export default function LoadingScreen({ visible, message = 'INITIALIZING NEURAL ENGINE...' }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Background grid */}
          <div className="loading-grid" />

          {/* Scanning line */}
          <motion.div
            className="loading-scanline"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Central logo animation */}
          <div className="loading-center">
            <motion.div
              className="loading-hexagon"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 100 100" width="100" height="100">
                <defs>
                  <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f3ff" />
                    <stop offset="100%" stopColor="#b026ff" />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="none"
                  stroke="url(#loadGrad)"
                  strokeWidth="2"
                />
              </svg>
            </motion.div>

            <motion.div
              className="loading-hexagon-inner"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 100 100" width="60" height="60">
                <polygon
                  points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5"
                  fill="none"
                  stroke="#00f3ff"
                  strokeWidth="1"
                  opacity="0.4"
                />
              </svg>
            </motion.div>

            {/* Central pulse dot */}
            <motion.div
              className="loading-pulse"
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Title and status */}
          <div className="loading-text">
            <motion.h1
              className="loading-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              WEBCLOAK
            </motion.h1>
            <motion.p
              className="loading-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {message}
            </motion.p>
          </div>

          {/* Progress bar */}
          <motion.div
            className="loading-progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          >
            <div className="loading-progress-bar" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

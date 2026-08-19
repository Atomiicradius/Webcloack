/**
 * ControlPanel.jsx — Glassmorphic floating control panel with filter gallery,
 * sliders, toggles, and capture controls.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconEye, IconEyeOff, IconCamera, IconImage, IconVideo, IconVideoOff,
  IconMic, IconGrid, IconSliders, IconChevronLeft, IconChevronRight,
  IconZap, IconDownload, IconSettings,
} from './Icons.jsx'
import { FILTERS } from '../engine/renderPipeline.js'

const FILTER_ICONS = {
  cloak:    IconEyeOff,
  lens:     IconZap,
  matrix:   IconGrid,
  thermal:  IconActivity,
  edge:     IconZap,
  pixelate: IconGrid,
}

// Fallback activity icon
function IconActivity(props) {
  return (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

const FILTER_DESCRIPTIONS = {
  cloak:    'Blend captured background into the ROI',
  lens:     'Barrel distortion with chromatic aberration',
  matrix:   'Digital rain reflecting video luminosity',
  thermal:  'Infrared heatmap with edge glow accents',
  edge:     'Neon Sobel edges with color cycling',
  pixelate: 'Resolution downsampling with glitch artifacts',
}

const FILTER_SHORTCUTS = {
  cloak:    '1',
  lens:     '2',
  matrix:   '3',
  thermal:  '4',
  edge:     '5',
  pixelate: '6',
}

export default function ControlPanel({
  activeFilter,
  onFilterChange,
  intensity,
  onIntensityChange,
  showWireframe,
  onToggleWireframe,
  audioEnabled,
  onToggleAudio,
  onCaptureBackground,
  onScreenshot,
  isRecording,
  onToggleRecording,
  hasBgImage,
  isCollapsed,
  onToggleCollapse,
}) {
  const [hoveredFilter, setHoveredFilter] = useState(null)

  return (
    <motion.aside
      className="control-panel"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      {/* Collapse toggle */}
      <button
        className="panel-collapse-btn"
        onClick={onToggleCollapse}
        id="panel-collapse-toggle"
      >
        {isCollapsed ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="panel-content"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 280 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Section: Filter Gallery ───────────────────────── */}
            <div className="panel-section">
              <h3 className="panel-section-title">
                <IconSliders size={14} />
                FILTER ENGINE
              </h3>
              <div className="filter-grid">
                {FILTERS.map((f) => {
                  const Icon = FILTER_ICONS[f.id] || IconZap
                  const isActive = activeFilter === f.id
                  return (
                    <motion.button
                      key={f.id}
                      className={`filter-card ${isActive ? 'active' : ''}`}
                      onClick={() => onFilterChange(f.id)}
                      onMouseEnter={() => setHoveredFilter(f.id)}
                      onMouseLeave={() => setHoveredFilter(null)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      id={`filter-btn-${f.id}`}
                    >
                      <div className="filter-card-icon">
                        <Icon size={18} />
                      </div>
                      <span className="filter-card-label">{f.label}</span>
                      <span className="filter-card-shortcut">{FILTER_SHORTCUTS[f.id]}</span>
                      {isActive && (
                        <motion.div
                          className="filter-active-indicator"
                          layoutId="activeFilter"
                          transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Filter description tooltip */}
              <AnimatePresence>
                {hoveredFilter && (
                  <motion.p
                    className="filter-description"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                  >
                    {FILTER_DESCRIPTIONS[hoveredFilter]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Section: Parameters ───────────────────────────── */}
            <div className="panel-section">
              <h3 className="panel-section-title">
                <IconSettings size={14} />
                PARAMETERS
              </h3>

              {/* Intensity slider */}
              <div className="slider-group">
                <div className="slider-header">
                  <span>Effect Intensity</span>
                  <span className="slider-value">{Math.round(intensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(intensity * 100)}
                  onChange={(e) => onIntensityChange(parseInt(e.target.value) / 100)}
                  className="hud-slider"
                  id="intensity-slider"
                />
              </div>

              {/* Toggle switches */}
              <div className="toggle-group">
                <label className="toggle-row" htmlFor="wireframe-toggle">
                  <span className="toggle-label">
                    <IconGrid size={14} />
                    Wireframe Overlay
                  </span>
                  <button
                    className={`hud-toggle ${showWireframe ? 'active' : ''}`}
                    onClick={onToggleWireframe}
                    id="wireframe-toggle"
                  />
                </label>

                <label className="toggle-row" htmlFor="audio-toggle">
                  <span className="toggle-label">
                    <IconMic size={14} />
                    Audio Reactive
                  </span>
                  <button
                    className={`hud-toggle ${audioEnabled ? 'active' : ''}`}
                    onClick={onToggleAudio}
                    id="audio-toggle"
                  />
                </label>
              </div>
            </div>

            {/* ── Section: Capture Suite ─────────────────────────── */}
            <div className="panel-section">
              <h3 className="panel-section-title">
                <IconCamera size={14} />
                CAPTURE
              </h3>

              <div className="capture-buttons">
                <motion.button
                  className={`capture-btn ${hasBgImage ? 'has-bg' : ''}`}
                  onClick={onCaptureBackground}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id="capture-bg-btn"
                >
                  <IconImage size={16} />
                  <span>{hasBgImage ? 'RECAPTURE BG' : 'CAPTURE BG'}</span>
                  <span className="capture-shortcut">B</span>
                </motion.button>

                <motion.button
                  className="capture-btn"
                  onClick={onScreenshot}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id="screenshot-btn"
                >
                  <IconDownload size={16} />
                  <span>SCREENSHOT</span>
                  <span className="capture-shortcut">S</span>
                </motion.button>

                <motion.button
                  className={`capture-btn recording ${isRecording ? 'active' : ''}`}
                  onClick={onToggleRecording}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id="record-btn"
                >
                  {isRecording ? <IconVideoOff size={16} /> : <IconVideo size={16} />}
                  <span>{isRecording ? 'STOP REC' : 'RECORD'}</span>
                  <span className="capture-shortcut">R</span>
                </motion.button>
              </div>
            </div>

            {/* ── Keyboard shortcuts reference ──────────────────── */}
            <div className="panel-section panel-shortcuts">
              <p className="shortcut-hint">
                Keys: 1-6 filters / B capture / S screenshot / R record / W wireframe / A audio / P pinch-snap
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}

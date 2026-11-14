/**
 * HUDHeader.jsx — Top floating HUD bar with app title, active filter, and telemetry badges.
 */

import { motion } from 'framer-motion'
import { IconHexagon, IconActivity } from './Icons.jsx'
import { getFilter } from '../engine/filters.js'


export default function HUDHeader({
  fps = 0,
  confidence = 0,
  handsCount = 0,
  resolution = { w: 0, h: 0 },
  activeFilter = 'cloak',
  audioEnabled = false,
}) {
  return (
    <motion.header
      className="hud-header"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hud-header-left">
        <div className="hud-logo">
          <IconHexagon size={22} className="hud-logo-icon" />
          <span className="hud-title">WEBCLOAK</span>
        </div>
        <div className="hud-divider" />
        <motion.span
          className="hud-filter-label"
          key={activeFilter}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {getFilter(activeFilter)?.hudLabel || 'UNKNOWN'}
        </motion.span>
      </div>

      <div className="hud-header-right">
        <div className="hud-badge" data-status={fps >= 24 ? 'good' : fps >= 15 ? 'warn' : 'bad'}>
          <IconActivity size={14} />
          <span>{fps} FPS</span>
        </div>

        <div className="hud-badge" data-status={confidence > 0.7 ? 'good' : confidence > 0.4 ? 'warn' : 'neutral'}>
          <span>TRACK</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>

        <div className="hud-badge" data-status={handsCount >= 2 ? 'good' : handsCount === 1 ? 'warn' : 'neutral'}>
          <span>HANDS</span>
          <span>{handsCount}</span>
        </div>

        <div className="hud-badge">
          <span>{resolution.w}x{resolution.h}</span>
        </div>

        {audioEnabled && (
          <motion.div
            className="hud-badge"
            data-status="active"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <span>AUDIO</span>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}

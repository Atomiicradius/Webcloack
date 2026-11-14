/** Flat SVG icons for MessageBoxes (decorative: callers aria-hide them). */

export function ErrorIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" focusable="false">
      <circle cx="16" cy="16" r="14" fill="var(--magenta)" stroke="var(--black)" strokeWidth="2" />
      <path d="M10 10 L22 22 M22 10 L10 22" stroke="var(--white)" strokeWidth="3.5" strokeLinecap="square" />
    </svg>
  )
}

export function InfoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" focusable="false">
      <circle cx="16" cy="16" r="14" fill="var(--white)" stroke="var(--navy-title)" strokeWidth="2" />
      <rect x="14" y="13" width="4" height="11" fill="var(--navy-title)" />
      <rect x="14" y="7" width="4" height="4" fill="var(--navy-title)" />
    </svg>
  )
}

export function CameraIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" focusable="false">
      <rect x="2" y="9" width="21" height="16" fill="var(--win-gray)" stroke="var(--black)" strokeWidth="2" />
      <path d="M23 14 L30 10 L30 24 L23 20 Z" fill="var(--win-gray)" stroke="var(--black)" strokeWidth="2" />
      <rect x="6" y="13" width="5" height="4" fill="var(--magenta)" />
    </svg>
  )
}

/** 16px app glyph for title bars and the taskbar tab. */
export function AppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" focusable="false">
      <rect x="1" y="1" width="14" height="14" fill="var(--black)" />
      <rect x="3" y="3" width="10" height="10" fill="none" stroke="var(--mint)" strokeWidth="1.5" />
      <rect x="6" y="6" width="4" height="4" fill="var(--magenta)" />
    </svg>
  )
}

/**
 * SidePanel.jsx — Right column: glass filter card, tilted settings.exe
 * window (real settings only) and glossy pill buttons.
 */

import { memo } from 'react'
import { FILTERS } from '../../engine/filters.js'
import { Checkbox, Slider, Window } from '../win98/index.js'
import AudioVisualizer from '../AudioVisualizer.jsx'

function SidePanel({
  filter,
  intensity,
  onIntensityChange,
  audioEnabled,
  onToggleAudio,
  showWireframe,
  onToggleWireframe,
  mirror,
  onToggleMirror,
  hasBgImage,
  canCapture,
  onCaptureBackground,
  onScreenshot,
  isRecording,
  canRecord,
  onToggleRecording,
  cameraPaused,
  cameraBusy,
  onToggleCamera,
  audioLevels,
  banner,
}) {
  // The cloak shows nothing useful until a background exists: make it obvious.
  const isCloak = filter?.id === 'cloak'
  const needsBg = isCloak && !hasBgImage
  const number = String(FILTERS.indexOf(filter) + 1).padStart(2, '0')

  return (
    <aside className="ap-side" aria-label="controls">
      {banner}

      <section className="ap-glass" aria-labelledby="ap-filter-name" data-boot-in>
        <p className="ap-glass__kicker">filter {number}</p>
        <h2 id="ap-filter-name" className="ap-glass__name">{filter?.label}</h2>
        <p className="ap-glass__desc">{filter?.description.toLowerCase()}.</p>
        {isCloak && (
          <div className="ap-glass__bg">
            {needsBg && <p className="ap-glass__note">no background yet. step out of frame, then capture.</p>}
            <button
              type="button"
              className="ch-pill ch-pill--silver ap-glass__capture"
              onClick={onCaptureBackground}
              disabled={!canCapture}
              aria-keyshortcuts="b"
            >
              {hasBgImage ? 'recapture background' : 'capture background'}
            </button>
          </div>
        )}
      </section>

      <div className="ap-settings-wrap" data-boot-in>
        <Window title="settings.exe" titleAs="h2" className="ap-settings">
          <div className="ap-settings__body">
            <Slider
              className="ap-gel-slider"
              label="intensity"
              value={Math.round(intensity * 100)}
              onChange={(v) => onIntensityChange(v / 100)}
              format={(v) => `${v}%`}
            />
            <Checkbox label="mirror camera" checked={mirror} onChange={onToggleMirror} aria-keyshortcuts="m" />
            <Checkbox label="audio reactive" checked={audioEnabled} onChange={onToggleAudio} aria-keyshortcuts="a" />
            <Checkbox label="wireframe" checked={showWireframe} onChange={onToggleWireframe} aria-keyshortcuts="w" />
            {audioEnabled && (
              <div className="ap-settings__audio">
                <AudioVisualizer audioLevels={audioLevels} visible />
              </div>
            )}
          </div>
        </Window>
      </div>

      <div className="ap-actions" data-boot-in>
        <button type="button" className="ch-pill ch-pill--silver" onClick={onScreenshot} aria-keyshortcuts="s">
          snapshot
        </button>
        <button
          type="button"
          className={`ch-pill${isRecording ? ' ap-actions__rec--on' : ''}`}
          aria-pressed={isRecording}
          onClick={onToggleRecording}
          disabled={!isRecording && !canRecord}
          aria-keyshortcuts="r"
        >
          <span className="ch-dot" aria-hidden="true" /> {isRecording ? 'stop rec' : 'record'}
        </button>
        <button
          type="button"
          className="ch-pill ap-actions__camera"
          onClick={onToggleCamera}
          disabled={cameraBusy}
          aria-keyshortcuts="c"
        >
          <span aria-hidden="true">{cameraPaused ? '▶' : '❚❚'}</span>
          {cameraPaused ? ' resume camera' : ' stop camera'}
        </button>
      </div>
    </aside>
  )
}

export default memo(SidePanel)

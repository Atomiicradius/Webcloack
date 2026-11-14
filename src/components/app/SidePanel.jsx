/**
 * SidePanel.jsx — Right-hand controls: current filter, intensity, toggles,
 * background capture, snapshot/record and the audio visualizer.
 */

import { memo } from 'react'
import { Button, Checkbox, Groupbox, Panel, Slider } from '../win98/index.js'
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
  audioLevels,
}) {
  // The cloak shows nothing useful until a background exists: make it obvious.
  const needsBg = filter?.id === 'cloak' && !hasBgImage

  return (
    <aside className="wc-panel" aria-label="controls">
      <Groupbox legend="filter">
        <div className="wc-panel__stack">
          <p className="wc-panel__filter-name">{filter?.label.toLowerCase()}</p>
          <p className="wc-panel__text">{filter?.description}</p>
        </div>
      </Groupbox>

      <Groupbox legend="background">
        <div className="wc-panel__stack">
          {needsBg ? (
            <p className="wc-band">no background yet. step out of frame, then capture.</p>
          ) : (
            <p className="wc-panel__text">background: {hasBgImage ? 'captured' : 'none'}</p>
          )}
          <Button
            block
            variant={needsBg ? 'default' : 'normal'}
            onClick={onCaptureBackground}
            disabled={!canCapture}
            aria-keyshortcuts="b"
          >
            {hasBgImage ? 'recapture background' : 'capture background'}
          </Button>
        </div>
      </Groupbox>

      <Groupbox legend="settings">
        <div className="wc-panel__stack">
          <Slider
            label="intensity"
            value={Math.round(intensity * 100)}
            onChange={(v) => onIntensityChange(v / 100)}
            format={(v) => `${v}%`}
          />
          <Checkbox
            label="mirror camera"
            checked={mirror}
            onChange={onToggleMirror}
            aria-keyshortcuts="m"
          />
          <Checkbox
            label="audio reactive"
            checked={audioEnabled}
            onChange={onToggleAudio}
            aria-keyshortcuts="a"
          />
          <Checkbox
            label="wireframe"
            checked={showWireframe}
            onChange={onToggleWireframe}
            aria-keyshortcuts="w"
          />
        </div>
      </Groupbox>

      <Groupbox legend="capture">
        <div className="wc-panel__stack">
          <Button block onClick={onScreenshot} aria-keyshortcuts="s">snapshot</Button>
          <Button
            block
            aria-pressed={isRecording}
            onClick={onToggleRecording}
            disabled={!isRecording && !canRecord}
            aria-keyshortcuts="r"
          >
            {isRecording ? 'stop recording' : 'record'}
          </Button>
        </div>
      </Groupbox>

      <Panel variant="sunken" dark>
        <AudioVisualizer audioLevels={audioLevels} visible={audioEnabled} />
      </Panel>
    </aside>
  )
}

export default memo(SidePanel)

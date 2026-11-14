/**
 * filters.js — Single source of truth for every selectable filter.
 *
 * Adding a filter = add one entry here (plus its renderer in renderPipeline.js
 * or a shader in shaderEngine.js). The control panel, HUD, keyboard shortcuts
 * and render pipeline all read from this array.
 *
 * Fields:
 *   id          — stable key used in state and the render dispatcher
 *   short       — one-word name under the dock orb
 *   label       — name shown in the side panel and in toasts
 *   hudLabel    — longer name shown in the HUD header
 *   icon        — icon component for the control-panel card
 *   description — hover text in the control panel
 *   shaderKey   — key into ShaderEngine programs, or null for non-shader filters
 */

import {
  IconEyeOff, IconGrid, IconActivity, IconZap, IconCat, IconRainbow,
} from '../components/Icons.jsx'

export const FILTERS = [
  {
    id: 'cloak',
    short: 'cloak',
    label: 'INVISIBILITY',
    hudLabel: 'INVISIBILITY CLOAK',
    icon: IconEyeOff,
    description: 'Blend the captured background into the space between your hands',
    shaderKey: null,
  },
  {
    id: 'matrix',
    short: 'matrix',
    label: 'MATRIX RAIN',
    hudLabel: 'MATRIX RAIN',
    icon: IconGrid,
    description: 'Digital rain reflecting video luminosity',
    shaderKey: null,
  },
  {
    id: 'thermal',
    short: 'thermal',
    label: 'THERMAL',
    hudLabel: 'THERMAL VISION',
    icon: IconActivity,
    description: 'Infrared heatmap with edge glow accents',
    shaderKey: 'thermal',
  },
  {
    id: 'edge',
    short: 'edge',
    label: 'EDGE SYNTH',
    hudLabel: 'EDGE SYNTH',
    icon: IconZap,
    description: 'Neon Sobel edges with color cycling',
    shaderKey: 'edge',
  },
  {
    id: 'pixelate',
    short: 'glitch',
    label: 'PIXEL GLITCH',
    hudLabel: 'PIXEL GLITCH',
    icon: IconGrid,
    description: 'Resolution downsampling with glitch artifacts',
    shaderKey: 'pixelate',
  },
  {
    id: 'catwhiskers',
    short: 'whiskers',
    label: 'CAT WHISKERS',
    hudLabel: 'CAT WHISKERS',
    icon: IconCat,
    description: 'Neon cat ears and whisker overlay',
    shaderKey: null,
  },
  {
    id: 'kaleidoscope',
    short: 'kaleido',
    label: 'KALEIDOSCOPE',
    hudLabel: 'KALEIDOSCOPE',
    icon: IconRainbow,
    description: 'Rainbow disco mandala with hue cycling',
    shaderKey: 'kaleidoscope',
  },
]

export function getFilter(id) {
  return FILTERS.find((f) => f.id === id)
}

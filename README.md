# Webcloak

Webcloak is a high-performance web application that utilizes real-time multi-hand computer vision to create an interactive Region of Interest (ROI) visual synthesizer inside a dynamic 4-finger polygon. By tracking the fingertips of two hands simultaneously, Webcloak isolates spatial geometry to apply WebGL GLSL shaders, visual effects, dynamic background rendering, and audio-reactive particle fields.

## Overview

Webcloak transforms a browser webcam stream into a tactile spatial window. The core tracking pipeline isolates primary fingertip landmarks from MediaPipe Hands to construct a dynamic bounding quad. Inside this bounded ROI, users can dispatch real-time image processing shaders, thermal heatmaps, gravitational refraction lenses, matrix rain effects, and custom background snapshots.

## Key Features

- **Spatial Hand Tracking**: Tracks up to 4 hands simultaneously using MediaPipe HandLandmarker with GPU acceleration.
- **Geometric Bounding**: Uses 2D Convex Hull algorithms (Graham Scan) to eliminate polygon self-intersection and twist artifacts when hands rotate or cross over.
- **WebGL Shader Pipeline**: Includes real-time custom GLSL shaders (Thermal/Inferno, Sobel Edge Synth, Gravitational Lens Refraction, Pixelate/Glitch).
- **Invisibility Cloak Mode**: Blends captured background snapshots into the ROI with radial boundary feathering and edge smoothing.
- **Matrix ASCII Rain**: Converts video luminosity into dynamic green digital rain.
- **Tactile Gestures**: Euclidean distance calculation between thumb and index fingertips enables real-time parameter scaling and pinch-snap filter switching.
- **Audio-Reactive HUD**: Microphones input processing via Web Audio API `AnalyserNode` modulates wireframe glow, border pulse, and vertex spark emissions on bass/frequency peaks.
- **Integrated Capture Suite**: Canvas snapshot capture and full WebM video recording via native `MediaRecorder` API.

## Technical Architecture

Webcloak is structured with modular separation across vision processing, shader compositing, audio analysis, and user interface layers.

```
Webcam Stream (1280x720 @ 30fps)
  └─► MediaPipe HandLandmarker (GPU Delegate)
        ├─► 2D Convex Hull & Polygon Sorting
        │     └─► Exponential Smoothing
        ├─► Gesture Engine (Pinch Distance & Snap Detection)
        └─► Render Pipeline (Canvas 2D / WebGL)
              ├─► Polygon ROI Clipping & Feathering
              ├─► WebGL Shaders / Matrix Rain / Cloak Composite
              ├─► Audio-Reactive Wireframe & Spark Emission
              └─► Canvas Compositing & Capture Engine
```

### System Stack

- **Framework**: React 18, Vite
- **Styling**: Vanilla CSS with custom glassmorphism design tokens and utility classes
- **Motion & UI**: Framer Motion
- **Computer Vision**: `@mediapipe/tasks-vision`
- **Graphics Pipeline**: WebGL 1.0 (GLSL Shaders), Canvas 2D API
- **Audio Engine**: Web Audio API (`AudioContext`, `AnalyserNode`)

## Installation and Setup

### Prerequisites

- Node.js version 18.0.0 or higher
- NPM package manager

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Atomiicradius/Webcloack.git
   cd Webcloack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in a WebGL and camera-supported browser.

## Controls and Shortcuts

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `1` - `6` | Switch visual filter mode |
| `B` | Capture current camera frame as background snapshot |
| `S` | Export high-resolution PNG screenshot |
| `R` | Start / Stop WebM video recording |
| `W` | Toggle wireframe and vertex markers |
| `A` | Toggle audio-reactive processing |

### Gestures

- **Pinch (Thumb + Index)**: Modulates active filter intensity (closer distance increases intensity).
- **Pinch-Snap (Quick Pinch & Release)**: Cycles to the next filter mode automatically.
- **4-Finger Quad (Both hands present)**: Defines the bounding ROI portal.

## Shader Pipeline Specifications

- **Invisibility Cloak**: Replaces inner polygon pixels with captured static scene background using soft edge blending.
- **Gravitational Lens**: Applies radial barrel distortion with dynamic chromatic aberration and iridescent perimeter interference.
- **Sobel Edge Synth**: Calculates directional image gradients to produce neon cyan and magenta edge outlines.
- **Thermal Vision**: Maps pixel luminosity onto an Inferno colormap with derivative edge glow (`OES_standard_derivatives`).
- **Pixel Glitch**: Performs dynamic spatial downsampling with stochastic line offsets and RGB channel splitting.

## License

This project is licensed under the MIT License.

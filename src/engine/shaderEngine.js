/**
 * shaderEngine.js — WebGL GLSL shader pipeline for visual effects.
 * Each shader operates on an offscreen WebGL canvas, reading from a video texture
 * and writing FX output to be composited back into the main canvas.
 */

// ── Shared vertex shader ────────────────────────────────────────────
const VERT_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

// ── THERMAL / PREDATOR VISION ──────────────────────────────────────
const THERMAL_FRAG = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform float u_time;

  vec3 inferno(float t) {
    vec3 c0 = vec3(0.0, 0.0, 0.02);
    vec3 c1 = vec3(0.42, 0.05, 0.53);
    vec3 c2 = vec3(0.89, 0.32, 0.15);
    vec3 c3 = vec3(0.99, 0.91, 0.14);
    vec3 c4 = vec3(0.99, 1.0, 0.64);

    if (t < 0.25) return mix(c0, c1, t * 4.0);
    if (t < 0.5)  return mix(c1, c2, (t - 0.25) * 4.0);
    if (t < 0.75) return mix(c2, c3, (t - 0.5) * 4.0);
    return mix(c3, c4, (t - 0.75) * 4.0);
  }

  void main() {
    vec4 pixel = texture2D(u_image, v_texCoord);
    float lum = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
    lum = pow(lum, 1.0 / (u_intensity * 1.5 + 0.5));

    float shimmer = sin(v_texCoord.y * 80.0 + u_time * 3.0) * 0.02 * u_intensity;
    lum = clamp(lum + shimmer, 0.0, 1.0);

    vec3 thermal = inferno(lum);

    float edge = abs(dFdx(lum)) + abs(dFdy(lum));
    thermal += vec3(0.4, 0.8, 1.0) * edge * 8.0 * u_intensity;

    gl_FragColor = vec4(thermal, 1.0);
  }
`

// ── CYBERPUNK EDGE SYNTH (Sobel) ───────────────────────────────────
const EDGE_FRAG = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform float u_time;
  uniform vec2 u_resolution;

  float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec2 texel = 1.0 / u_resolution;

    float tl = luminance(texture2D(u_image, v_texCoord + vec2(-texel.x, -texel.y)).rgb);
    float t  = luminance(texture2D(u_image, v_texCoord + vec2( 0.0,     -texel.y)).rgb);
    float tr = luminance(texture2D(u_image, v_texCoord + vec2( texel.x, -texel.y)).rgb);
    float l  = luminance(texture2D(u_image, v_texCoord + vec2(-texel.x,  0.0)).rgb);
    float r  = luminance(texture2D(u_image, v_texCoord + vec2( texel.x,  0.0)).rgb);
    float bl = luminance(texture2D(u_image, v_texCoord + vec2(-texel.x,  texel.y)).rgb);
    float b  = luminance(texture2D(u_image, v_texCoord + vec2( 0.0,      texel.y)).rgb);
    float br = luminance(texture2D(u_image, v_texCoord + vec2( texel.x,  texel.y)).rgb);

    float gx = tl + 2.0*l + bl - tr - 2.0*r - br;
    float gy = tl + 2.0*t + tr - bl - 2.0*b - br;
    float edge = sqrt(gx*gx + gy*gy);

    float hue = u_time * 0.2 + v_texCoord.x * 0.5;
    vec3 neon1 = vec3(0.0, 1.0, 1.0);
    vec3 neon2 = vec3(1.0, 0.0, 0.8);
    vec3 color = mix(neon1, neon2, sin(hue) * 0.5 + 0.5);

    float strength = edge * u_intensity * 4.0;
    vec3 result = color * strength;
    vec3 bg = texture2D(u_image, v_texCoord).rgb * 0.08;
    result += bg;

    gl_FragColor = vec4(result, 1.0);
  }
`

// ── PIXELATE & GLITCH ──────────────────────────────────────────────
const PIXELATE_FRAG = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform float u_time;
  uniform vec2 u_resolution;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float pixelSize = mix(1.0, 20.0, u_intensity);
    vec2 pixelated = floor(v_texCoord * u_resolution / pixelSize) * pixelSize / u_resolution;

    float glitchLine = step(0.98, rand(vec2(floor(v_texCoord.y * 30.0), floor(u_time * 10.0))));
    float glitchAmount = glitchLine * 0.05 * u_intensity;
    pixelated.x += glitchAmount * (rand(vec2(u_time)) * 2.0 - 1.0);

    float ca = u_intensity * 0.01 * (1.0 + glitchLine * 5.0);
    float r = texture2D(u_image, pixelated + vec2(ca, 0.0)).r;
    float g = texture2D(u_image, pixelated).g;
    float b = texture2D(u_image, pixelated - vec2(ca, 0.0)).b;

    vec3 color = vec3(r, g, b);

    if (glitchLine > 0.5) {
      color = mix(color, vec3(rand(pixelated + u_time), 0.0, rand(pixelated.yx + u_time)), 0.3 * u_intensity);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

// ── RAINBOW DISCO KALEIDOSCOPE ─────────────────────────────────────
const KALEIDOSCOPE_FRAG = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_intensity;
  uniform float u_time;
  uniform vec2 u_resolution;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = v_texCoord - 0.5;
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Multi-axis kaleidoscope symmetry (8-way)
    float segments = mix(4.0, 8.0, u_intensity);
    float segAngle = 3.14159265 * 2.0 / segments;
    angle = mod(angle + u_time * 0.3, segAngle);
    // Mirror alternating segments
    if (angle > segAngle * 0.5) {
      angle = segAngle - angle;
    }

    // Reconstruct UV from polar coordinates
    vec2 kalUV = vec2(cos(angle), sin(angle)) * radius + 0.5;
    kalUV = clamp(kalUV, 0.0, 1.0);

    vec3 texColor = texture2D(u_image, kalUV).rgb;

    // HSV hue-shift modulation for disco effect
    float hueShift = mod(u_time * 0.5, 1.0);
    float lumBase = dot(texColor, vec3(0.299, 0.587, 0.114));
    vec3 rainbow = hsv2rgb(vec3(hueShift + radius * 2.0 + angle * 0.3, 0.7 * u_intensity, 1.0));

    // Blend original texture with rainbow overlay
    vec3 result = mix(texColor, texColor * rainbow * 1.8, u_intensity * 0.6);

    // Add mandala glow ring
    float ring = smoothstep(0.01, 0.02, abs(mod(radius * 10.0 - u_time * 2.0, 1.0) - 0.5));
    result += rainbow * (1.0 - ring) * 0.15 * u_intensity;

    gl_FragColor = vec4(result, 1.0);
  }
`

// Shader programs compiled at init, keyed by filter shaderKey
const SHADER_SOURCES = {
  thermal: THERMAL_FRAG,
  edge: EDGE_FRAG,
  pixelate: PIXELATE_FRAG,
  kaleidoscope: KALEIDOSCOPE_FRAG,
}

// ── Shader compilation helpers ─────────────────────────────────────

function compileShader(gl, source, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl, vertSource, fragSource) {
  const vert = compileShader(gl, vertSource, gl.VERTEX_SHADER)
  const frag = compileShader(gl, fragSource, gl.FRAGMENT_SHADER)
  if (!vert || !frag) return null

  const program = gl.createProgram()
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return null
  }
  return program
}

// ── ShaderEngine class ─────────────────────────────────────────────

export class ShaderEngine {
  constructor() {
    this.canvas = document.createElement('canvas')
    this.gl = this.canvas.getContext('webgl', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })
    this.programs = {}
    this.texture = null
    this.posBuffer = null
    this.texBuffer = null
    this.initialized = false
    this.frameSource = null // source already uploaded this frame by beginFrame()
    this.failedShaders = []  // shader keys that failed to compile/link
  }

  init(width, height) {
    const gl = this.gl
    if (!gl) {
      // No WebGL at all: every shader filter is unavailable
      this.failedShaders = Object.keys(SHADER_SOURCES)
      return
    }

    this.canvas.width = width
    this.canvas.height = height

    // Enable OES_standard_derivatives for dFdx/dFdy in thermal shader
    gl.getExtension('OES_standard_derivatives')

    // Compile all shader programs
    this.failedShaders = []
    for (const [name, frag] of Object.entries(SHADER_SOURCES)) {
      const program = createProgram(gl, VERT_SHADER, frag)
      if (program) {
        this.programs[name] = {
          program,
          locations: {
            a_position: gl.getAttribLocation(program, 'a_position'),
            a_texCoord: gl.getAttribLocation(program, 'a_texCoord'),
            u_image: gl.getUniformLocation(program, 'u_image'),
            u_intensity: gl.getUniformLocation(program, 'u_intensity'),
            u_time: gl.getUniformLocation(program, 'u_time'),
            u_resolution: gl.getUniformLocation(program, 'u_resolution'),
          },
        }
      } else {
        this.failedShaders.push(name)
      }
    }

    // Full-screen quad geometry
    this.posBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
       1, -1,  1,  1,  -1, 1,
    ]), gl.STATIC_DRAW)

    this.texBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  1, 1,  0, 0,
      1, 1,  1, 0,  0, 0,
    ]), gl.STATIC_DRAW)

    // Create texture
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    this.initialized = true
  }

  /**
   * Upload the source frame to the GPU once. Call before the per-quad
   * render() calls; render() then skips its own upload for the same source.
   */
  beginFrame(source) {
    const gl = this.gl
    if (!gl || !this.initialized) return
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    this.frameSource = source
  }

  /** Forget the per-frame upload so a later render() uploads fresh data. */
  endFrame() {
    this.frameSource = null
  }

  /**
   * Render a shader effect on the given source (video or canvas).
   * Uploads the source unless beginFrame() already did so for it.
   * @param {string} shaderName
   * @param {HTMLVideoElement|HTMLCanvasElement} source
   * @param {number} intensity — 0..1
   * @param {number} time — elapsed time in seconds
   * @returns {HTMLCanvasElement} — the output canvas
   */
  render(shaderName, source, intensity, time) {
    const gl = this.gl
    if (!gl || !this.initialized) return this.canvas

    const prog = this.programs[shaderName]
    if (!prog) return this.canvas

    // Resize if needed
    if (this.canvas.width !== source.videoWidth && source.videoWidth) {
      this.canvas.width = source.videoWidth || source.width
      this.canvas.height = source.videoHeight || source.height
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(prog.program)

    // Upload video texture (skipped when beginFrame() already uploaded it)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    if (this.frameSource !== source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }

    // Set uniforms
    gl.uniform1i(prog.locations.u_image, 0)
    gl.uniform1f(prog.locations.u_intensity, intensity)
    gl.uniform1f(prog.locations.u_time, time)
    if (prog.locations.u_resolution) {
      gl.uniform2f(prog.locations.u_resolution, this.canvas.width, this.canvas.height)
    }

    // Bind position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
    gl.enableVertexAttribArray(prog.locations.a_position)
    gl.vertexAttribPointer(prog.locations.a_position, 2, gl.FLOAT, false, 0, 0)

    // Bind texcoord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer)
    gl.enableVertexAttribArray(prog.locations.a_texCoord)
    gl.vertexAttribPointer(prog.locations.a_texCoord, 2, gl.FLOAT, false, 0, 0)

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    return this.canvas
  }

  destroy() {
    const gl = this.gl
    if (!gl) return
    for (const p of Object.values(this.programs)) {
      gl.deleteProgram(p.program)
    }
    if (this.texture) gl.deleteTexture(this.texture)
    if (this.posBuffer) gl.deleteBuffer(this.posBuffer)
    if (this.texBuffer) gl.deleteBuffer(this.texBuffer)
    this.programs = {}
    this.texture = null
    this.posBuffer = null
    this.texBuffer = null
    this.frameSource = null
    this.initialized = false
    // Free the context now rather than waiting for GC (browsers cap live contexts)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

// "Hover ink" for the Projects hero: the pointer paints a ragged ink stroke, and inside the ink
// a drifting wall of project tiles shows through. The ink dries (fades) on its own after ~1.5s.
//
// Two WebGL passes per frame:
//   1. update  - a half-resolution mask that decays every frame and gets new brush splats stamped in
//   2. display - thresholds the mask against noise for torn ink edges and fills it with the tile wall
// The loop only runs while there is ink on screen, so an idle hero costs nothing.

export type InkOptions = {
  // One square image per project (posters). Up to six; they are packed into a 3x2 atlas.
  images: string[]
  // Optional reels, same order as `images`. Loaded only after the first mouse stroke.
  videos?: string[]
  // Called every frame while ink is live: brush position (CSS px, relative to the host),
  // the project tile under the brush (-1 if none yet) and whether the brush is still painting.
  onBrush?: (x: number, y: number, project: number, painting: boolean) => void
}

export type InkEngine = {
  move: (x: number, y: number, pointerType: string) => void
  blot: (x: number, y: number) => void
  leave: () => void
  // Paints a scripted stroke along `path` (t from 0 to 1) - used for the intro sweep.
  sweep: (path: (t: number) => { x: number; y: number }, duration: number) => void
  destroy: () => void
}

const CELL = 512 // atlas cell size in px; posters and reels are 512x512
const ATLAS_W = CELL * 3
const ATLAS_H = CELL * 2
const MASK_SCALE = 0.5 // mask resolution relative to CSS px
const MAX_DPR = 1.5
const MAX_SPLATS = 12
const DECAY_PER_SEC = 0.6 // mask units per second; the edge threshold sits at ~0.45
const LIFETIME_MS = 2400 // stop the loop this long after the last splat
const NEW_STROKE_MS = 280 // a pause longer than this starts a fresh, tapered stroke
const GAP = 10
const INK = [0.882, 0.024, 0] // --red-strong
const RIM = [1, 0.102, 0.102] // --red

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}`

// Decays the previous mask, lets it creep a little (ink bleed), then stamps this frame's splats.
const UPDATE = `${HEADER}
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform vec2 uTexel;
uniform float uDecay;
uniform float uTime;
uniform vec4 uSeg[${MAX_SPLATS}];
uniform vec2 uDot[${MAX_SPLATS}];
uniform int uCount;

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 p = vUv * uRes;
  vec2 creep = vec2(noise(p * 0.03 + uTime * 0.7), noise(p * 0.03 - uTime * 0.7 + 31.7)) - 0.5;
  float v = texture2D(uPrev, vUv + creep * uTexel * 0.6).r;
  // Patches dry at different speeds, so old ink breaks into blobs instead of fading evenly.
  v = max(v - uDecay * (0.55 + 0.9 * noise(p * 0.009 + 5.3)), 0.0);
  for (int i = 0; i < ${MAX_SPLATS}; i++) {
    if (i >= uCount) break;
    vec4 s = uSeg[i];
    vec2 d = uDot[i];
    float jag = (noise(p * 0.035 + float(i) * 13.7) - 0.5) * d.x * 0.3;
    float a = 1.0 - smoothstep(d.x * 0.35, d.x, sdSeg(p, s.xy, s.zw) + jag);
    v = max(v, a * d.y);
  }
  gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
}`

// Torn ink edge from mask + noise, a bright wet rim, and the tile wall inside.
const DISPLAY = `${HEADER}
uniform sampler2D uMask;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform float uTime;
uniform float uTile;
uniform float uGap;
uniform float uDrift;
uniform float uTiles;
uniform vec2 uShift;
uniform vec3 uInk;
uniform vec3 uRim;

void main() {
  float m = texture2D(uMask, vUv).r;
  if (m < 0.03) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 p = vUv * uRes;
  float n = fbm(p * 0.011 + vec2(uTime * 0.04, 0.0));
  float e = m + (n - 0.44) * 0.4;
  float edge = smoothstep(0.40, 0.42, e);
  if (edge <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float body = smoothstep(0.435, 0.455, e);

  // Wall of tiles: columns drift in alternating directions and are staggered vertically.
  vec2 q = p + uShift;
  float pitch = uTile + uGap;
  float col = floor(q.x / pitch);
  q.y += (mod(col, 2.0) > 0.5 ? -uDrift : uDrift) + col * uTile * 0.41;
  float row = floor(q.y / pitch);
  vec2 local = q - vec2(col, row) * pitch;
  vec2 dq = abs(local - uTile * 0.5) - (uTile * 0.5 - 12.0);
  float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 12.0;
  float inTile = 1.0 - smoothstep(-0.8, 0.8, sd);

  float idx = floor(mod(row + col * 2.0 + 0.5, uTiles));
  float cy = floor((idx + 0.5) / 3.0);
  vec2 cell = vec2(idx - cy * 3.0, 1.0 - cy);
  vec2 tuv = clamp(local / uTile, 0.0, 1.0);
  vec2 auv = (cell * ${CELL}.0 + 1.0 + tuv * ${CELL - 2}.0) / vec2(${ATLAS_W}.0, ${ATLAS_H}.0);
  vec3 media = texture2D(uAtlas, auv).rgb;

  // Ink pools darker towards the edge of the stroke.
  float depth = smoothstep(0.46, 0.8, e);
  vec3 ink = uInk * (0.8 + 0.4 * n);
  vec3 inside = mix(ink, media * (0.5 + 0.36 * depth), inTile);
  vec3 color = mix(uRim, inside, body);
  gl_FragColor = vec4(color * edge, edge);
}`

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer }
type Splat = { ax: number; ay: number; bx: number; by: number; r: number; s: number }

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function createInkEngine(host: HTMLElement, opts: InkOptions): InkEngine | null {
  const canvas = document.createElement('canvas')
  canvas.className = 'ink-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[ink]', gl.getShaderInfoLog(shader))
      return null
    }
    return shader
  }
  const link = (fragment: string) => {
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, fragment)
    if (!vs || !fs) return null
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'aPos')
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[ink]', gl.getProgramInfoLog(prog))
      return null
    }
    return prog
  }

  const updateProg = link(UPDATE)
  const displayProg = link(DISPLAY)
  if (!updateProg || !displayProg) return null
  const uni = (prog: WebGLProgram, names: string[]) =>
    Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]))
  const uU = uni(updateProg, ['uPrev', 'uRes', 'uTexel', 'uDecay', 'uTime', 'uSeg', 'uDot', 'uCount'])
  const uD = uni(displayProg, [
    'uMask', 'uAtlas', 'uRes', 'uTime', 'uTile', 'uGap', 'uDrift', 'uTiles', 'uShift', 'uInk', 'uRim',
  ])

  // One big triangle covers the viewport.
  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const texture = (w: number, h: number) => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  // ---- Media atlas ----
  const atlas = texture(ATLAS_W, ATLAS_H)
  const tiles = Math.min(opts.images.length, 6)
  const scratch = document.createElement('canvas')
  scratch.width = scratch.height = CELL
  const scratchCtx = scratch.getContext('2d')

  const upload = (i: number, src: HTMLImageElement | HTMLVideoElement) => {
    const w = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth
    const h = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight
    if (!w || !h) return
    let source: TexImageSource = src
    if (w !== CELL || h !== CELL) {
      // Cover-crop anything that isn't already a 512 square.
      if (!scratchCtx) return
      const s = Math.max(CELL / w, CELL / h)
      scratchCtx.drawImage(src, (CELL - w * s) / 2, (CELL - h * s) / 2, w * s, h * s)
      source = scratch
    }
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, (i % 3) * CELL, (1 - Math.floor(i / 3)) * CELL, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  let destroyed = false
  opts.images.slice(0, tiles).forEach((src, i) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => !destroyed && upload(i, img)
    img.src = src
  })

  // Reels replace the posters once they can play. Mouse users only, after their first stroke.
  const videos: HTMLVideoElement[] = []
  const lastFrame: number[] = []
  let nextVideo = 0
  const loadVideos = () => {
    if (!opts.videos || videos.length) return
    opts.videos.slice(0, tiles).forEach((src) => {
      const v = document.createElement('video')
      v.className = 'ink-video'
      v.muted = true
      v.loop = true
      v.playsInline = true
      v.preload = 'auto'
      v.setAttribute('aria-hidden', 'true')
      v.src = src
      host.appendChild(v)
      videos.push(v)
      lastFrame.push(-1)
      if (raf) v.play().catch(() => {})
    })
  }
  const uploadVideos = () => {
    // Round-robin two reels per frame (~24fps each) to keep texture uploads cheap.
    for (let k = 0; k < Math.min(2, videos.length); k++) {
      const i = nextVideo
      nextVideo = (nextVideo + 1) % videos.length
      const v = videos[i]
      if (v.readyState >= 2 && v.currentTime !== lastFrame[i]) {
        lastFrame[i] = v.currentTime
        upload(i, v)
      }
    }
  }

  // ---- Mask ping-pong ----
  let cssW = 1
  let cssH = 1
  let maskW = 1
  let maskH = 1
  let read: Target | null = null
  let write: Target | null = null
  let base = 60 // brush radius in CSS px
  let tile = 300

  const target = (w: number, h: number): Target => {
    const tex = texture(w, h)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fbo }
  }
  const freeTarget = (t: Target | null) => {
    if (!t) return
    gl.deleteTexture(t.tex)
    gl.deleteFramebuffer(t.fbo)
  }

  const resize = () => {
    const rect = host.getBoundingClientRect()
    cssW = Math.max(1, rect.width)
    cssH = Math.max(1, rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    maskW = Math.max(1, Math.round(cssW * MASK_SCALE))
    maskH = Math.max(1, Math.round(cssH * MASK_SCALE))
    freeTarget(read)
    freeTarget(write)
    read = target(maskW, maskH)
    write = target(maskW, maskH)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    base = Math.min(Math.max(Math.min(cssW, cssH) * 0.095, 40), 104)
    tile = Math.min(Math.max(cssH * 0.36, 170), 320)
  }
  host.appendChild(canvas)
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  // ---- Brush state (CSS px, y down) ----
  let raf = 0
  let last = 0
  let time = 0
  let drift = 0
  let pendingDecay = 0
  let lastInk = -Infinity
  let lastMove = -Infinity
  let painting = false
  let inside = false
  let tx = 0
  let ty = 0
  let bx = 0
  let by = 0
  let radius = 0
  let shiftX = 0
  let shiftY = 0
  let project = -1
  let script: { start: number; duration: number; path: (t: number) => { x: number; y: number } } | null = null
  const queue: Splat[] = []
  const segs = new Float32Array(MAX_SPLATS * 4)
  const dots = new Float32Array(MAX_SPLATS * 2)

  const splat = (ax: number, ay: number, bx2: number, by2: number, r: number, s = 1) => {
    if (queue.length < MAX_SPLATS * 3) queue.push({ ax, ay: cssH - ay, bx: bx2, by: cssH - by2, r, s })
    lastInk = performance.now()
  }
  const droplet = (x: number, y: number, reach: number, size: number) => {
    const a = Math.random() * Math.PI * 2
    const d = reach * (0.6 + Math.random() * 0.8)
    const r = size * (0.5 + Math.random())
    const px = x + Math.cos(a) * d
    const py = y + Math.sin(a) * d
    splat(px, py, px, py, r, 0.95)
  }
  const startStroke = (x: number, y: number) => {
    bx = tx = x
    by = ty = y
    radius = base * 0.35 // strokes start thin and swell as they speed up
  }

  // Which project tile sits under a point - mirrors the wall maths in the display shader.
  const tileAt = (x: number, y: number) => {
    const pitch = tile + GAP
    const qx = x + shiftX
    let qy = cssH - y + shiftY
    const col = Math.floor(qx / pitch)
    qy += (((col % 2) + 2) % 2 === 1 ? -drift : drift) + col * tile * 0.41
    const row = Math.floor(qy / pitch)
    if (qx - col * pitch > tile || qy - row * pitch > tile) return -1
    return (((row + col * 2) % tiles) + tiles) % tiles
  }

  const step = (now: number, dt: number) => {
    if (script) {
      const t = (now - script.start) / script.duration
      if (t >= 1) {
        script = null
      } else {
        const pt = script.path(easeInOut(Math.max(t, 0)))
        tx = pt.x
        ty = pt.y
        lastMove = now
        painting = true
      }
    }
    if (!painting) return

    const k = 1 - Math.pow(0.7, dt * 60)
    const nx = bx + (tx - bx) * k
    const ny = by + (ty - by) * k
    const dist = Math.hypot(nx - bx, ny - by)
    const speed = dist / Math.max(dt, 0.001)
    const want = base * (0.5 + 0.75 * smoothstep(60, 1600, speed))
    radius += (want - radius) * (1 - Math.pow(0.82, dt * 60))
    if (dist > 0.25) {
      splat(bx, by, nx, ny, radius)
      // Fast flicks throw droplets off the side of the stroke.
      if (speed > 1100 && Math.random() < dt * 7) droplet(nx, ny, radius * 2.2, radius * 0.16)
    }
    bx = nx
    by = ny
    if (now - lastMove > 600 && dist < 0.1) painting = false
  }

  const draw = () => {
    if (!read || !write) return
    let decay = 0
    const q = Math.floor(pendingDecay * 255) / 255
    if (q >= 2 / 255) {
      // 8-bit mask: apply decay in whole steps so small values don't stall on rounding.
      decay = q
      pendingDecay -= q
    }

    const batch = queue.splice(0, MAX_SPLATS)
    batch.forEach((s, i) => {
      segs.set([s.ax, s.ay, s.bx, s.by], i * 4)
      dots.set([s.r, s.s], i * 2)
    })

    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo)
    gl.viewport(0, 0, maskW, maskH)
    gl.useProgram(updateProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(uU.uPrev, 0)
    gl.uniform2f(uU.uRes, cssW, cssH)
    gl.uniform2f(uU.uTexel, 1 / maskW, 1 / maskH)
    gl.uniform1f(uU.uDecay, decay)
    gl.uniform1f(uU.uTime, time)
    gl.uniform4fv(uU.uSeg, segs)
    gl.uniform2fv(uU.uDot, dots)
    gl.uniform1i(uU.uCount, batch.length)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    ;[read, write] = [write, read]

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(displayProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.uniform1i(uD.uMask, 0)
    gl.uniform1i(uD.uAtlas, 1)
    gl.uniform2f(uD.uRes, cssW, cssH)
    gl.uniform1f(uD.uTime, time)
    gl.uniform1f(uD.uTile, tile)
    gl.uniform1f(uD.uGap, GAP)
    gl.uniform1f(uD.uDrift, drift)
    gl.uniform1f(uD.uTiles, tiles)
    gl.uniform2f(uD.uShift, shiftX, shiftY)
    gl.uniform3fv(uD.uInk, INK)
    gl.uniform3fv(uD.uRim, RIM)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now: number) => {
    raf = 0
    const dt = Math.min((now - last) / 1000, 1 / 20)
    last = now
    time += dt
    drift += dt * 14
    pendingDecay += DECAY_PER_SEC * dt

    step(now, dt)
    // The wall slides gently against the brush, like looking through a window.
    const ease = 1 - Math.pow(0.92, dt * 60)
    shiftX += ((cssW / 2 - bx) * 0.06 - shiftX) * ease
    shiftY += ((by - cssH / 2) * 0.06 - shiftY) * ease

    uploadVideos()
    draw()

    const under = tileAt(bx, by)
    if (under >= 0) project = under
    opts.onBrush?.(bx, by, project, painting && (inside || !!script) && now - lastInk < 300)

    if (now - lastInk > LIFETIME_MS && !painting && !script) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      videos.forEach((v) => v.pause())
      return
    }
    raf = requestAnimationFrame(frame)
  }

  const wake = () => {
    if (raf || destroyed) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
    videos.forEach((v) => v.play().catch(() => {}))
  }

  const lost = (e: Event) => {
    e.preventDefault()
    cancelAnimationFrame(raf)
    destroyed = true
  }
  canvas.addEventListener('webglcontextlost', lost)

  return {
    move(x, y, pointerType) {
      const now = performance.now()
      script = null
      inside = true
      if (!painting || now - lastMove > NEW_STROKE_MS) startStroke(x, y)
      tx = x
      ty = y
      lastMove = now
      painting = true
      if (pointerType === 'mouse') loadVideos()
      wake()
    },
    blot(x, y) {
      const now = performance.now()
      script = null
      inside = true
      startStroke(x, y)
      lastMove = now
      painting = true
      splat(x, y, x, y, base * 1.15)
      for (let i = 0; i < 7; i++) droplet(x, y, base * 2.1, base * 0.14)
      wake()
    },
    leave() {
      inside = false
    },
    sweep(path, duration) {
      const start = path(0)
      startStroke(start.x, start.y)
      script = { start: performance.now(), duration, path }
      painting = true
      wake()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('webglcontextlost', lost)
      videos.forEach((v) => {
        v.pause()
        v.removeAttribute('src')
        v.load()
        v.remove()
      })
      freeTarget(read)
      freeTarget(write)
      gl.deleteTexture(atlas)
      gl.deleteBuffer(quad)
      gl.deleteProgram(updateProg)
      gl.deleteProgram(displayProg)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    },
  }
}

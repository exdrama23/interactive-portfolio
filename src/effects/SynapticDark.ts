import * as THREE from 'three'

export interface SynapticState {
  active: boolean
  intensity: number
  age: number
  stage: number
  filled: boolean
  darkMode: boolean
  vacuumProgress: number
  blackOverlay: number
  reverseProgress: number
}

const CLICK_WINDOW     = 1200
const NUM_PARTICLES    = 300
const VACUUM_DURATION  = 4.5   // segundos de aspiração de pixels
const FILL_DURATION    = 10.0
const FINAL_FADE_DUR   = 1.2
const REVERSE_DURATION = 2.0   // duração do toggle dark → light

// ─────────────────────────────────────────────────────────────────────────────
// Shaders do feedback de partículas (dark mode)
// ─────────────────────────────────────────────────────────────────────────────

const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const EFFECT_FRAG = /* glsl */`
precision highp float;

uniform float uIntensity;
uniform float uAspect;
uniform float uTime;
uniform vec2  uOrigin;
uniform sampler2D uPrevFrame;

uniform vec3 uPos[300];
uniform vec3 uVel[300];

varying vec2 vUv;

float mag(vec3 p) { return dot(p, p); }

vec4 drawParticles(vec3 ro, vec3 rd) {
  vec4 rez = vec4(0.0);
  for (int i = 0; i < 300; i++) {
    vec3 pos = uPos[i];
    vec3 vel = uVel[i];
    for (int j = 0; j < 7; j++) {
      float d = mag((ro + rd * dot(pos - ro, rd)) - pos);
      d *= 1000.0;
      d  = 0.14 / (pow(d, 1.1) + 0.03);
      rez.rgb += d * vec3(0.5) * 0.04;
      pos += vel * 0.2 * 1.2;
    }
  }
  rez /= 7.0;
  return rez;
}

void main() {
  vec2 offset = (uOrigin - vec2(0.5)) * vec2(uAspect, 1.0);
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) - offset;
  vec3 ro = vec3(0.0, 0.0, 2.5);
  vec3 rd = normalize(vec3(p, -0.5));
  vec4 particles = drawParticles(ro, rd);
  vec4 prev      = texture(uPrevFrame, vUv);
  vec4 col = particles + prev;
  col *= 0.9975;
  float a = clamp(max(length(col.rgb) * 0.4, col.a), 0.0, 1.0);
  gl_FragColor = vec4(col.rgb, a) * uIntensity;
}
`

const BLIT_FRAG = /* glsl */`
precision highp float;

uniform sampler2D uTexture;
uniform float     uBlackOverlay;
uniform float     uDarkMode;
uniform float     uDarkBg;
uniform float     uIntensity;

varying vec2 vUv;

void main() {
  vec4 acc = texture(uTexture, vUv);

  // Fundo: branco (light) ou preto (dark)
  vec3 bgColor = mix(vec3(1.0), vec3(0.0), uDarkBg);

  // Partículas: invertidas no light, diretas no dark
  vec3 particleColor = mix(1.0 - acc.rgb, acc.rgb * 2.0, uDarkMode);

  // Alpha da partícula (baseado no brilho acumulado)
  float particleAlpha = clamp(acc.a, 0.0, 1.0);

  // Composição: fundo + partículas por cima
  vec3 finalColor = mix(bgColor, particleColor, particleAlpha);

  // Overlay preto (final fade)
  finalColor = mix(finalColor, vec3(0.0), uBlackOverlay);

  // Transparência: só opaco quando dark mode ativo ou partículas visíveis
  float showOverlay = max(uDarkMode, particleAlpha * (max(uIntensity, 0.01)));
  gl_FragColor = vec4(finalColor, showOverlay);
}
`

// ─────────────────────────────────────────────────────────────────────────────
// VACUUM: feedback de pixels — cada frame desloca UVs em direção ao centro,
// reamostram o frame anterior e acumulam. Os pixels migram fisicamente
// para o centro, deixando vazios brancos e acumulando preto no meio.
// ─────────────────────────────────────────────────────────────────────────────

const VACUUM_ACCUM_FRAG = /* glsl */`
precision highp float;

uniform sampler2D uAccum;
uniform sampler2D uScene;

uniform float uProgress;
uniform float uTime;
uniform vec2  uCenter;
uniform float uAspect;

varying vec2 vUv;

void main() {
  // 1. Deslocamento de UV em direção ao centro 
  float pull = pow(uProgress, 1.8) * 0.065;

  vec2 toCenter   = uCenter - vUv;
  vec2 toCenterAS = toCenter * vec2(1.0, 1.0 / uAspect);
  float dist      = length(toCenterAS);

  float distFactor = 0.3 + dist * 4.0;

  vec2 srcUV = vUv + toCenter * pull * distFactor;
  srcUV = clamp(srcUV, 0.001, 0.999);

  // 1b. Noise distortion 
  float noiseX = sin(vUv.x * 60.0 + uTime * 3.0) * cos(vUv.y * 55.0 + uTime * 2.3);
  float noiseY = cos(vUv.x * 50.0 + uTime * 2.7) * sin(vUv.y * 65.0 + uTime * 3.3);
  float noiseStr = uProgress * 0.035;
  vec2 noiseOffset = vec2(noiseX, noiseY) * noiseStr;
  srcUV += noiseOffset;
  srcUV = clamp(srcUV, 0.001, 0.999);

  // 2. Amostra o acumulado com pull 
  vec4 pulled = texture(uAccum, srcUV);

  // 3. Mistura com cena original (âncora leve) 
  vec4 scene  = texture(uScene, vUv);
  float sceneMix = max(0.0, 1.0 - uProgress * 2.5);
  vec4 col = mix(pulled, scene, sceneMix * 0.03);

  //  4. Decay mais lento
  float decayBase  = 0.995 - uProgress * 0.003;
  float centerMask = 1.0 - smoothstep(0.0, 0.3, dist);
  float decay      = mix(decayBase, 0.998, centerMask);
  col.rgb *= decay;

  //  5. Escurecimento periférico suave 
  float peripheral = smoothstep(0.0, 0.7, dist);
  float darken     = 1.0 - peripheral * uProgress * 0.25;
  col.rgb *= darken;

  //  6. Acúmulo escuro no centro (atrasado)
  float centerDrain = smoothstep(0.45, 1.0, uProgress) * centerMask * 0.35;
  col.rgb = mix(col.rgb, vec3(0.0), centerDrain);

  //7. Onda de preto do centro (atrasada) 
  float blackWave  = smoothstep(0.7, 1.0, uProgress);
  float blackFront = smoothstep(dist, dist + 0.25, blackWave * 0.85);
  col.rgb = mix(col.rgb, vec3(0.0), blackFront);

  //  8. Anel de compressão (acúmulo visível no centro)
  float ringRadius = 0.04 + uProgress * 0.36;
  float ringAlpha  = smoothstep(ringRadius, 0.0, dist);
  float compressionRing = sin(dist * 35.0 - uProgress * 12.0) * 0.5 + 0.5;
  compressionRing *= ringAlpha * uProgress * 0.7;
  col.rgb += compressionRing * 0.3;

  col.a = 1.0;
  gl_FragColor = col;
}
`

const VACUUM_OUT_FRAG = /* glsl */`
precision highp float;

uniform sampler2D uAccum;
uniform float     uProgress;

varying vec2 vUv;

void main() {
  vec4 col = texture(uAccum, vUv);

  // No final, força preto total (mais tarde)
  float blackFinal = smoothstep(0.92, 1.0, uProgress);
  col.rgb = mix(col.rgb, vec3(0.0), blackFinal);

  gl_FragColor = vec4(col.rgb, 1.0);
}
`

export function createSynapticDark(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const state: SynapticState = {
    active:          false,
    intensity:       0,
    age:             0,
    stage:           0,
    filled:          false,
    darkMode:        false,
    vacuumProgress:  0,
    blackOverlay:    0,
    reverseProgress: 0,
  }

  const posArray = new Float32Array(NUM_PARTICLES * 3)
  const velArray = new Float32Array(NUM_PARTICLES * 3)

  const particleUniforms = {
    uIntensity: { value: 0.0 },
    uAspect:    { value: window.innerWidth / window.innerHeight },
    uTime:      { value: 0.0 },
    uOrigin:    { value: new THREE.Vector2(0.5, 0.5) },
    uPrevFrame: { value: null as THREE.Texture | null },
    uPos:       { value: posArray },
    uVel:       { value: new Float32Array(NUM_PARTICLES * 3) },
  }

  const geo = new THREE.PlaneGeometry(2, 2)
  const particleMat = new THREE.ShaderMaterial({
    uniforms:       particleUniforms,
    vertexShader:   QUAD_VERT,
    fragmentShader: EFFECT_FRAG,
    transparent:    true,
    depthTest:      false,
    depthWrite:     false,
  })
  const effectScene  = new THREE.Scene()
  const effectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  effectScene.add(new THREE.Mesh(geo, particleMat))

  const blitUniforms = {
    uTexture:      { value: null as THREE.Texture | null },
    uBlackOverlay: { value: 0.0 },
    uDarkMode:     { value: 0.0 },
    uDarkBg:       { value: 0.0 },
    uIntensity:    { value: 0.0 },
  }
  const blitGeo = new THREE.PlaneGeometry(2, 2)
  const blitMat = new THREE.ShaderMaterial({
    uniforms:       blitUniforms,
    vertexShader:   QUAD_VERT,
    fragmentShader: BLIT_FRAG,
    transparent:    true,
    depthTest:      false,
    depthWrite:     false,
  })
  const blitScene  = new THREE.Scene()
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  blitScene.add(new THREE.Mesh(blitGeo, blitMat))

  const vacuumAccumUniforms = {
    uAccum:    { value: null as THREE.Texture | null },
    uScene:    { value: null as THREE.Texture | null },
    uProgress: { value: 0.0 },
    uTime:     { value: 0.0 },
    uCenter:   { value: new THREE.Vector2(0.5, 0.5) },
    uAspect:   { value: window.innerWidth / window.innerHeight },
  }
  const vacuumAccumGeo = new THREE.PlaneGeometry(2, 2)
  const vacuumAccumMat = new THREE.ShaderMaterial({
    uniforms:       vacuumAccumUniforms,
    vertexShader:   QUAD_VERT,
    fragmentShader: VACUUM_ACCUM_FRAG,
    depthTest:      false,
    depthWrite:     false,
  })
  const vacuumAccumScene  = new THREE.Scene()
  const vacuumAccumCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  vacuumAccumScene.add(new THREE.Mesh(vacuumAccumGeo, vacuumAccumMat))

  const vacuumOutUniforms = {
    uAccum:    { value: null as THREE.Texture | null },
    uProgress: { value: 0.0 },
  }
  const vacuumOutGeo = new THREE.PlaneGeometry(2, 2)
  const vacuumOutMat = new THREE.ShaderMaterial({
    uniforms:       vacuumOutUniforms,
    vertexShader:   QUAD_VERT,
    fragmentShader: VACUUM_OUT_FRAG,
    depthTest:      false,
    depthWrite:     false,
  })
  const vacuumOutScene  = new THREE.Scene()
  const vacuumOutCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  vacuumOutScene.add(new THREE.Mesh(vacuumOutGeo, vacuumOutMat))

  const fbOpts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.FloatType,
  }
  const rtOpts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
  }

  let fbRTs: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null
  let vacuumRTs: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null
  let sceneRT: THREE.WebGLRenderTarget | null = null
  let vacuumReadIdx = 0
  let fbReadIdx     = 0

  function initRTs(w: number, h: number) {
    fbRTs?.forEach(rt => rt.dispose())
    vacuumRTs?.forEach(rt => rt.dispose())
    sceneRT?.dispose()

    fbRTs = [
      new THREE.WebGLRenderTarget(w, h, { ...fbOpts }),
      new THREE.WebGLRenderTarget(w, h, { ...fbOpts }),
    ]
    vacuumRTs = [
      new THREE.WebGLRenderTarget(w, h, { ...rtOpts }),
      new THREE.WebGLRenderTarget(w, h, { ...rtOpts }),
    ]
    sceneRT = new THREE.WebGLRenderTarget(w, h, { ...rtOpts })

    fbReadIdx     = 0
    vacuumReadIdx = 0
  }

  initRTs(window.innerWidth, window.innerHeight)

  function hash3(x: number, y: number, z: number): [number, number, number] {
    let px = ((x * 443.8975) % 1 + 1) % 1
    let py = ((y * 397.2973) % 1 + 1) % 1
    let pz = ((z * 491.1871) % 1 + 1) % 1
    const dot = pz * (py + 19.1) + px * (pz + 19.1) + py * (px + 19.1)
    px += dot; py += dot; pz += dot
    return [
      ((px * py) % 1 + 1) % 1 - 0.5,
      ((pz * px) % 1 + 1) % 1 - 0.5,
      ((py * pz) % 1 + 1) % 1 - 0.5,
    ]
  }

  function initParticles() {
    const spreadArea = 10.0
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      posArray[i3]     = (Math.random() - 0.5) * spreadArea
      posArray[i3 + 1] = (Math.random() - 0.5) * spreadArea
      posArray[i3 + 2] = (Math.random() - 0.5) * spreadArea
      velArray[i3]     = (Math.random() - 0.5) * 30.0
      velArray[i3 + 1] = (Math.random() - 0.5) * 30.0
      velArray[i3 + 2] = (Math.random() - 0.5) * 30.0
    }
  }

  function updateParticles(t: number) {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      let vx = velArray[i3],     vy = velArray[i3 + 1], vz = velArray[i3 + 2]
      let px = posArray[i3],     py = posArray[i3 + 1], pz = posArray[i3 + 2]

      vx *= 0.999; vy *= 0.999; vz *= 0.999
      const [hx, hy, hz] = hash3(vx + t, vy + t, vz + t)
      vx += hx * 105.0; vy += hy * 105.0; vz += hz * 105.0

      const len = Math.sqrt(px * px + py * py + pz * pz)
      const d   = Math.pow(len * 1.2, 0.75)
      const f   = Math.sin(-t * 0.55) * 0.5 + 0.5
      const omf = 1.0 - f
      vx = vx * omf + (-px * d) * f
      vy = vy * omf + (-py * d) * f
      vz = vz * omf + (-pz * d) * f

      px += vx * 0.002; py += vy * 0.002; pz += vz * 0.002
      posArray[i3] = px; posArray[i3 + 1] = py; posArray[i3 + 2] = pz
      velArray[i3] = vx; velArray[i3 + 1] = vy; velArray[i3 + 2] = vz
    }
    particleUniforms.uPos.value = posArray
    particleUniforms.uVel.value = velArray
  }

  const clicks: { x: number; y: number; time: number }[] = []
  let clickCount = 0
  let clickUV    = new THREE.Vector2(0.5, 0.5)

  let vacuumInitialized = false

  function registerClick(
    clientX: number,
    clientY: number,
    _worldPos: THREE.Vector3,
    _containerW: number,
    _containerH: number,
    ndcX: number,
    ndcY: number,
  ) {
    if (state.stage === 3 || state.stage === 4) return

    const now = performance.now()
    clicks.push({ x: clientX, y: clientY, time: now })
    const recent = clicks.filter(c => now - c.time < CLICK_WINDOW)
    clicks.length = 0
    clicks.push(...recent)

    clickCount++

    const uv = new THREE.Vector2(
      (ndcX + 1.0) / 2.0,
      1.0 - (ndcY + 1.0) / 2.0,
    )

    if (clickCount === 1) {
      clickUV.copy(uv)
      state.stage = 1

    } else if (clickCount >= 2) {
      clickUV.copy(uv)

      if (state.darkMode) {
        state.active         = true
        state.filled         = false
        state.stage          = 4
        state.age            = 0
        state.reverseProgress = 0
        clickCount           = 0
        onReverseStart?.()
        return
      }

      vacuumAccumUniforms.uCenter.value.copy(clickUV)
      vacuumAccumUniforms.uAspect.value = window.innerWidth / window.innerHeight

      state.active         = true
      state.stage          = 3
      state.age            = 0
      state.intensity      = 0
      state.filled         = false
      state.vacuumProgress = 0
      state.blackOverlay   = 0
      state.darkMode       = false
      vacuumInitialized    = false
      clickCount           = 0
      onVacuumStart?.()
    }
  }

  let onDarkModeActivated: (() => void) | null = null
  function setOnDarkModeActivated(cb: () => void) {
    onDarkModeActivated = cb
  }

  let onReverseProgress: ((p: number) => void) | null = null
  function setOnReverseProgress(cb: (p: number) => void) {
    onReverseProgress = cb
  }

  let onReverseComplete: (() => void) | null = null
  function setOnReverseComplete(cb: () => void) {
    onReverseComplete = cb
  }

  let onVacuumStart: (() => void) | null = null
  function setOnVacuumStart(cb: () => void) {
    onVacuumStart = cb
  }

  let onReverseStart: (() => void) | null = null
  function setOnReverseStart(cb: () => void) {
    onReverseStart = cb
  }

  function update(dt: number, elapsedTime: number) {
    particleUniforms.uTime.value       = elapsedTime
    vacuumAccumUniforms.uTime.value    = elapsedTime

    if (!state.active) {
      particleUniforms.uIntensity.value = 0
      blitUniforms.uIntensity.value = 0
      return
    }

    state.age += dt

    const glslSmoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
      return t * t * (3 - 2 * t)
    }

    if (state.stage === 3) {
      state.vacuumProgress = Math.min(state.age / VACUUM_DURATION, 1.0)
      vacuumAccumUniforms.uProgress.value = state.vacuumProgress
      vacuumOutUniforms.uProgress.value   = state.vacuumProgress

      if (state.vacuumProgress >= 1.0 && !state.darkMode) {
        state.darkMode = true
        state.stage    = 0
        state.age      = 0
        state.filled   = true
        state.active   = false

        renderer.setRenderTarget(null)

        onDarkModeActivated?.()
      }
    }

    if (state.stage === 4) {
      state.reverseProgress = Math.min(state.age / REVERSE_DURATION, 1.0)
      const p = state.reverseProgress

      onReverseProgress?.(p)

      if (p >= 1.0) {
        reset()
        onReverseComplete?.()
      }
    }
  }

  function render(mainScene: THREE.Scene, mainCamera: THREE.Camera) {
    if (!fbRTs || !vacuumRTs || !sceneRT) return

    if (state.active && state.stage === 3) {

      renderer.setRenderTarget(sceneRT)
      renderer.clear()
      renderer.render(mainScene, mainCamera)
      renderer.setRenderTarget(null)

      if (!vacuumInitialized) {
        const initWriteIdx = 1 - vacuumReadIdx
        vacuumAccumUniforms.uAccum.value = sceneRT.texture
        vacuumAccumUniforms.uScene.value = sceneRT.texture
        renderer.setRenderTarget(vacuumRTs[vacuumReadIdx])
        renderer.clear()
        renderer.render(vacuumAccumScene, vacuumAccumCamera)
        renderer.setRenderTarget(null)
        vacuumInitialized = true
      }

      const vacuumWriteIdx = 1 - vacuumReadIdx
      vacuumAccumUniforms.uAccum.value = vacuumRTs[vacuumReadIdx].texture
      vacuumAccumUniforms.uScene.value = sceneRT.texture

      renderer.setRenderTarget(vacuumRTs[vacuumWriteIdx])
      renderer.clear()
      renderer.render(vacuumAccumScene, vacuumAccumCamera)
      renderer.setRenderTarget(null)

      vacuumReadIdx = vacuumWriteIdx

      vacuumOutUniforms.uAccum.value = vacuumRTs[vacuumReadIdx].texture
      const prevClear = renderer.autoClear
      renderer.autoClear = false
      renderer.render(vacuumOutScene, vacuumOutCamera)
      renderer.autoClear = prevClear
    }
  }

  function resize(w: number, h: number) {
    particleUniforms.uAspect.value      = w / h
    vacuumAccumUniforms.uAspect.value   = w / h
    initRTs(w, h)
  }

  function reset() {
    state.active          = false
    state.filled          = false
    state.stage           = 0
    state.age             = 0
    state.intensity       = 0
    state.darkMode        = false
    state.vacuumProgress  = 0
    state.blackOverlay    = 0
    state.reverseProgress = 0
    vacuumInitialized     = false
    clickCount            = 0

    particleUniforms.uIntensity.value    = 0.0
    blitUniforms.uBlackOverlay.value     = 0.0
    blitUniforms.uDarkMode.value         = 0.0
    blitUniforms.uDarkBg.value           = 0.0
    blitUniforms.uIntensity.value        = 0.0
    vacuumAccumUniforms.uProgress.value  = 0.0
    vacuumOutUniforms.uProgress.value    = 0.0

    fbRTs?.forEach(rt => {
      renderer.setRenderTarget(rt)
      renderer.clear()
    })
    vacuumRTs?.forEach(rt => {
      renderer.setRenderTarget(rt)
      renderer.clear()
    })
    renderer.setRenderTarget(null)
  }

  function dispose() {
    geo.dispose()
    particleMat.dispose()
    blitGeo.dispose()
    blitMat.dispose()
    vacuumAccumGeo.dispose()
    vacuumAccumMat.dispose()
    vacuumOutGeo.dispose()
    vacuumOutMat.dispose()
    fbRTs?.forEach(rt => rt.dispose())
    vacuumRTs?.forEach(rt => rt.dispose())
    sceneRT?.dispose()
  }

  return {
    state,
    registerClick,
    update,
    render,
    resize,
    reset,
    dispose,
    setOnDarkModeActivated,
    setOnReverseProgress,
    setOnReverseComplete,
    setOnVacuumStart,
    setOnReverseStart,
  }
}
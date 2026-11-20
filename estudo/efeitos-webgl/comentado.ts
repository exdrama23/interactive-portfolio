import * as THREE from 'three'

export interface SynapticState {
  active: boolean
  intensity: number
  age: number
  stage: number
  filled: boolean
}

const CLICK_WINDOW = 1200


const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
precision highp float; // Força alta precisão nos cálculos matemáticos

// Variáveis (Uniforms) enviadas do JavaScript (CPU) para a Placa de Vídeo (GPU)
uniform float uIntensity;      // Opacidade geral
uniform float uAspect;         // Proporção da tela (largura / altura) para não distorcer
uniform float uTime;           // Relógio contínuo para animar as cores neon
uniform vec2 uSynapticOrigin;  // Coordenadas exatas de onde o usuário clicou (em UV)

uniform sampler2D uPrevFrame;  // A textura com o "frame anterior" (usada para o rastro infinito)

// Arrays com as posições e velocidades das 140 partículas, atualizados no JS
uniform vec3 uParticlePos[140];
uniform vec3 uParticleVel[140];

// Coordenadas UV recebidas do Vertex Shader
varying vec2 vUv;

// Função auxiliar rápida para calcular o quadrado da magnitude (distância)
float mag(vec3 p) { return dot(p, p); }

// A função que efetivamente desenha as "teias" na tela
vec4 drawSynaptic(vec3 ro, vec3 rd) {
  vec4 rez = vec4(0.0);

  // Percorre todas as 140 partículas
  for (int i = 0; i < 140; i++) {
    vec3 pos = uParticlePos[i];
    vec3 vel = uParticleVel[i];

    // Desenha 7 "sombras" intermediárias por frame.
    // Isso evita que partículas rápidas pareçam pontos tracejados, criando linhas suaves.
    for (int j = 0; j < 7; j++) {
      // Calcula a distância matemática entre o raio da câmera e a partícula
      float d = mag((ro + rd * dot(pos - ro, rd)) - pos);
      d *= 1000.0;
      d = 0.14 / (pow(d, 1.1) + 0.03); // Curva de brilho (glow)

      // Fórmula trigonométrica que gera as cores neon vibrantes baseadas no tempo e no ID da partícula
      float tf = uTime * 0.06 + float(i) * 0.003 + 2.0;
      vec3 cc = abs(sin(vec3(2.0, 3.4, 1.2) * tf + vec3(0.8, 0.0, 1.2))) * 0.7 + 0.3;

      // Adiciona a cor calculada ao pixel atual
      rez.rgb += d * cc * 0.04;

      // Projeta a partícula levemente para frente (previsão de movimento)
      pos += vel * 0.002 * 0.2;
    }
  }
  // Tira a média dos 7 passos
  rez /= 7.0;
  return rez;
}

void main() {
  // Ajusta o sistema de coordenadas para centralizar o ponto zero exatamente onde o mouse clicou
  vec2 offset = (uSynapticOrigin - vec2(0.5)) * vec2(uAspect, 1.0);
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) - offset;

  // Configura uma câmera virtual 3D dentro do shader
  vec3 ro = vec3(0.0, 0.0, 2.5); // Origem do raio
  vec3 rd = normalize(vec3(p, -0.5)); // Direção do raio

  // Desenha as partículas da iteração atual
  vec4 particleCol = drawSynaptic(ro, rd);

  // Pega a textura do frame passado para criar o rastro
  vec4 prev = texture(uPrevFrame, vUv);

  // Mistura o desenho atual com o passado (Feedback Loop)
  vec4 col = particleCol + prev;
  col *= 0.9975; // Decaimento: apaga o rastro muito lentamente (0.9975 < 1)

  // Ajusta a opacidade final para evitar estouro de cor
  float a = clamp(max(length(col.rgb) * 0.3, col.a), 0.0, 1.0);

  // Envia a cor final do pixel para o monitor
  gl_FragColor = vec4(col.rgb, a) * uIntensity;
}
`

const FILL_VERTEX_SHADER = `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const FILL_FRAGMENT_SHADER = `
  precision highp float;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity); }
`

export function createSynapticDark(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const state: SynapticState = { active: false, intensity: 0, age: 0, stage: 0, filled: false }

  function setSynapticBlack(_val: boolean) {}

  const clicks: { x: number; y: number; time: number }[] = []
  let stageClickCount = 0

  const uniforms = {
    uIntensity:      { value: 0.0 },
    uAspect:         { value: window.innerWidth / window.innerHeight },
    uTime:           { value: 0.0 },
    uFillProgress:   { value: 0.0 },
    uSynapticOrigin: { value: new THREE.Vector2(0.5, 0.5) },
    uPrevFrame:      { value: null as THREE.Texture | null },
    uParticlePos:    { value: new Float32Array(140 * 3) },
    uParticleVel:    { value: new Float32Array(140 * 3) },
  }

  const NUM_PARTICLES = 140
  const posArray = uniforms.uParticlePos.value
  const velArray = uniforms.uParticleVel.value

  const geo = new THREE.PlaneGeometry(2, 2)
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })

  const effectScene  = new THREE.Scene()
  const effectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new THREE.Mesh(geo, mat)
  effectScene.add(quad)

  const fillUniforms = { uOpacity: { value: 0.0 } }
  const fillGeo = new THREE.PlaneGeometry(2, 2)
  const fillMat = new THREE.ShaderMaterial({
    uniforms: fillUniforms,
    vertexShader: FILL_VERTEX_SHADER,
    fragmentShader: FILL_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const fillScene = new THREE.Scene()
  fillScene.add(new THREE.Mesh(fillGeo, fillMat))
  const fillCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)


  function hash3(x: number, y: number, z: number): [number, number, number] {
    let px = ((x * 443.8975) % 1 + 1) % 1
    let py = ((y * 397.2973) % 1 + 1) % 1
    let pz = ((z * 491.1871) % 1 + 1) % 1
    const dotVal = pz * (py + 19.1) + px * (pz + 19.1) + py * (px + 19.1)
    px += dotVal; py += dotVal; pz += dotVal
    return [
      ((px * py) % 1 + 1) % 1 - 0.5,
      ((pz * px) % 1 + 1) % 1 - 0.5,
      ((py * pz) % 1 + 1) % 1 - 0.5,
    ]
  }

  function initParticles() {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      posArray[i3]     = (Math.random() - 0.5) * 0.1
      posArray[i3 + 1] = (Math.random() - 0.5) * 0.1
      posArray[i3 + 2] = (Math.random() - 0.5) * 0.1

      velArray[i3]     = (Math.random() - 0.5) * 20
      velArray[i3 + 1] = (Math.random() - 0.5) * 20
      velArray[i3 + 2] = (Math.random() - 0.5) * 20
    }
  }

  function updateParticles(time: number) {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      let vx = velArray[i3],     vy = velArray[i3 + 1], vz = velArray[i3 + 2]
      let px = posArray[i3],     py = posArray[i3 + 1], pz = posArray[i3 + 2]

      vx *= 0.999; vy *= 0.999; vz *= 0.999

      const h = hash3(vx + time, vy + time, vz + time)
      vx += h[0] * 2.0 * 7.0
      vy += h[1] * 2.0 * 7.0
      vz += h[2] * 2.0 * 7.0

      const len = Math.sqrt(px * px + py * py + pz * pz)
      const d = Math.pow(len * 1.2, 0.75)

      const f = Math.sin(-time * 0.55) * 0.5 + 0.5
      const omf = 1.0 - f

      vx = vx * omf + (-px * d) * f
      vy = vy * omf + (-py * d) * f
      vz = vz * omf + (-pz * d) * f

      px += vx * 0.002; py += py * 0.002; pz += vz * 0.002

      posArray[i3] = px; posArray[i3 + 1] = py; posArray[i3 + 2] = pz
      velArray[i3] = vx; velArray[i3 + 1] = vy; velArray[i3 + 2] = vz
    }
  }

  const fbOpts = {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.FloatType,
  }

  let fbRTs: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null
  let fbReadIdx = 0

  function initFeedbackRTs(w: number, h: number) {
    fbRTs?.forEach(rt => rt.dispose())
    fbRTs = [
      new THREE.WebGLRenderTarget(w, h, fbOpts),
      new THREE.WebGLRenderTarget(w, h, fbOpts),
    ]
    fbReadIdx = 0
  }

  initFeedbackRTs(window.innerWidth, window.innerHeight)

  const blitGeo = new THREE.PlaneGeometry(2, 2)
  const blitMat = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: null },
      uIntensity: uniforms.uIntensity,
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform sampler2D uTexture; uniform float uIntensity; varying vec2 vUv; void main(){vec4 texVal=texture(uTexture,vUv);gl_FragColor=vec4(texVal.rgb,texVal.a * uIntensity);}`,
    transparent: true, depthTest: false, depthWrite: false,
  })
  const blitScene = new THREE.Scene()
  blitScene.add(new THREE.Mesh(blitGeo, blitMat))
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)


  function registerClick(
    clientX: number, clientY: number, worldPos: THREE.Vector3,
    containerW: number, containerH: number, ndcX: number, ndcY: number,
  ) {
    if (state.filled) return

    const now = performance.now()
    clicks.push({ x: clientX, y: clientY, time: now })
    const recent = clicks.filter(c => now - c.time < CLICK_WINDOW)
    clicks.length = 0
    clicks.push(...recent)

    stageClickCount++

    if (stageClickCount === 1) {
      state.stage = 1
    }
    else if (stageClickCount >= 2) {
      if (state.stage !== 3) {
        initParticles()

        uniforms.uSynapticOrigin.value.set(
          (ndcX + 1.0) / 2.0,
          1.0 - (ndcY + 1.0) / 2.0,
        )
      }

      state.active = true
      state.stage  = 3
      state.age    = 0
      state.filled = false
      stageClickCount = 0
    }
  }

  const FILL_DURATION = 10.0

  function update(dt: number, elapsedTime: number) {
    uniforms.uTime.value = elapsedTime

    if (!state.active || (state.stage !== 2 && state.stage !== 3)) {
      uniforms.uIntensity.value = 0
      return
    }

    state.age += dt

    const fillProgress = Math.min(state.age / FILL_DURATION, 1.0)
    uniforms.uFillProgress.value = fillProgress

    const fadeIn = Math.min(state.age / 0.3, 1.0)
    state.intensity = fadeIn
    uniforms.uIntensity.value = state.intensity

    updateParticles(elapsedTime)
  }

  function render() {
    if (!fbRTs) return

    if (state.active && (state.stage === 2 || state.stage === 3)) {
      const writeIdx = 1 - fbReadIdx

      uniforms.uPrevFrame.value = fbRTs[fbReadIdx].texture

      renderer.setRenderTarget(fbRTs[writeIdx])
      renderer.clear()
      renderer.render(effectScene, effectCamera)
      renderer.setRenderTarget(null)

      blitMat.uniforms.uTexture.value = fbRTs[writeIdx].texture
      const prevClear = renderer.autoClear
      renderer.autoClear = false
      renderer.render(blitScene, blitCamera)
      renderer.autoClear = prevClear

      fbReadIdx = writeIdx
    }

    if (fillUniforms.uOpacity.value > 0.0 && !state.filled) {
      const prevClear = renderer.autoClear
      renderer.autoClear = false
      renderer.render(fillScene, fillCamera)
      renderer.autoClear = prevClear
    }
  }

  function resize(w: number, h: number) {
    uniforms.uAspect.value = w / h
    initFeedbackRTs(w, h)
  }

  function dispose() {
    geo.dispose()
    mat.dispose()
    fillGeo.dispose()
    fillMat.dispose()
    blitGeo.dispose()
    blitMat.dispose()
    fbRTs?.forEach(rt => rt.dispose())
  }

  function reset() {
    state.active  = false
    state.filled  = false
    state.stage   = 0
    state.age     = 0
    state.intensity = 0
    stageClickCount = 0
    uniforms.uIntensity.value   = 0.0
    fbRTs?.forEach(rt => {
      renderer.setRenderTarget(rt)
      renderer.clear()
    })
    renderer.setRenderTarget(null)
  }

  return { state, registerClick, update, render, resize, dispose, reset, setSynapticBlack }
}
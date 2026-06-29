// Importa a biblioteca principal do Three.js para acesso aos motores de renderização e matemática 3D
import * as THREE from 'three'

// Interface TypeScript que define o estado interno (o "cérebro") da nossa animação
export interface SynapticState {
  active: boolean      // Se a animação está rodando no momento
  intensity: number    // Controle do canal Alpha (transparência global do efeito)
  age: number          // Tempo de vida da animação desde que foi disparada
  stage: number        // Em qual fase estamos (0 = inativo, 1 = preparado, 2/3 = explodindo)
  filled: boolean      // Flag para saber se a tela já foi totalmente preenchida de preto
}

// Tempo máximo (em milissegundos) permitido entre o primeiro e o segundo clique
const CLICK_WINDOW = 1200

// ── SHADERS PRINCIPAIS ──

// Vertex Shader: Roda para cada vértice da nossa geometria (no caso, um plano 2D simples).
// Sua única função é mapear a textura (UV) e projetar o plano na tela da câmera.
const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment Shader: Roda para cada pixel da tela. Aqui acontece a mágica do desenho.
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

// ── SHADERS DE PREENCHIMENTO (Opcional, caso queira escurecer a tela) ──
const FILL_VERTEX_SHADER = `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const FILL_FRAGMENT_SHADER = `
  precision highp float;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity); }
`

// ── FUNÇÃO PRINCIPAL EXPORTADA ──
export function createSynapticDark(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  // Inicializa o estado interno zerado
  const state: SynapticState = { active: false, intensity: 0, age: 0, stage: 0, filled: false }

  // Função vazia mantida para compatibilidade de API (caso você chame ela de fora)
  function setSynapticBlack(_val: boolean) {}

  // Fila para guardar o histórico de cliques do mouse
  const clicks: { x: number; y: number; time: number }[] = []
  let stageClickCount = 0

  // ── PREPARAÇÃO DA PONTE CPU-GPU (UNIFORMS) ──
  const uniforms = {
    uIntensity:      { value: 0.0 },
    uAspect:         { value: window.innerWidth / window.innerHeight },
    uTime:           { value: 0.0 },
    uFillProgress:   { value: 0.0 },
    uSynapticOrigin: { value: new THREE.Vector2(0.5, 0.5) }, // Vai guardar o local do clique
    uPrevFrame:      { value: null as THREE.Texture | null }, // Vai guardar as texturas do ping-pong
    // Usamos Float32Array pois é o tipo de dado binário mais rápido para enviar números ao WebGL
    uParticlePos:    { value: new Float32Array(140 * 3) }, 
    uParticleVel:    { value: new Float32Array(140 * 3) },
  }

  const NUM_PARTICLES = 140
  // Atalhos para não precisar digitar uniforms.uParticle... toda hora
  const posArray = uniforms.uParticlePos.value
  const velArray = uniforms.uParticleVel.value

  // Cria a tela 2D onde o shader vai ser "pintado"
  const geo = new THREE.PlaneGeometry(2, 2)
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthTest: false, // Desliga o teste de profundidade (Z-buffer) pois é um efeito 2D
    depthWrite: false,
  })

  // Cena isolada para renderizar as partículas puras (sem atrapalhar seu site principal)
  const effectScene  = new THREE.Scene()
  const effectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new THREE.Mesh(geo, mat)
  effectScene.add(quad)

  // Cena de preenchimento (Fade para preto)
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

  // ── LÓGICA DE FÍSICA (CPU) ──

  // Função matemática que cospe um número "caótico" pseudo-aleatório baseado nas entradas.
  // É isso que faz os fios parecerem cobras/neurônios orgânicos em vez de linhas retas.
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

  // Acionada na hora do clique para resetar todas as partículas para o centro (0,0,0)
  function initParticles() {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      // Nasce em um raio bem pertinho do centro
      posArray[i3]     = (Math.random() - 0.5) * 0.1
      posArray[i3 + 1] = (Math.random() - 0.5) * 0.1
      posArray[i3 + 2] = (Math.random() - 0.5) * 0.1
      
      // Dá um "chute" de explosão bem forte (velocidade aleatória de -10 a 10)
      velArray[i3]     = (Math.random() - 0.5) * 20
      velArray[i3 + 1] = (Math.random() - 0.5) * 20
      velArray[i3 + 2] = (Math.random() - 0.5) * 20
    }
  }

  // Roda a 60 FPS no loop do React para recalcular para onde cada ponto está indo
  function updateParticles(time: number) {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3
      // Extrai os eixos X, Y e Z
      let vx = velArray[i3],     vy = velArray[i3 + 1], vz = velArray[i3 + 2]
      let px = posArray[i3],     py = posArray[i3 + 1], pz = posArray[i3 + 2]

      // Atrito: Vai freando a partícula a cada frame (multiplica por 0.999)
      vx *= 0.999; vy *= 0.999; vz *= 0.999
      
      // Soma o caos (ruído) na direção, para a partícula desviar a rota loucamente
      const h = hash3(vx + time, vy + time, vz + time)
      vx += h[0] * 2.0 * 7.0
      vy += h[1] * 2.0 * 7.0
      vz += h[2] * 2.0 * 7.0

      // Calcula o quão longe a partícula está do centro
      const len = Math.sqrt(px * px + py * py + pz * pz)
      const d = Math.pow(len * 1.2, 0.75)
      
      // Cria uma gravidade elástica usando "sin" (pulsação)
      const f = Math.sin(-time * 0.55) * 0.5 + 0.5
      const omf = 1.0 - f

      // Puxa a partícula de volta para o centro de acordo com a pulsação
      vx = vx * omf + (-px * d) * f
      vy = vy * omf + (-py * d) * f
      vz = vz * omf + (-pz * d) * f

      // Aplica a velocidade na posição final (Mecânica clássica: Posição = Posição + Velocidade * Delta)
      px += vx * 0.002; py += py * 0.002; pz += vz * 0.002

      // Salva de volta no Float32Array para ser enviado à GPU
      posArray[i3] = px; posArray[i3 + 1] = py; posArray[i3 + 2] = pz
      velArray[i3] = vx; velArray[i3 + 1] = vy; velArray[i3 + 2] = vz
    }
  }

  // ── RENDER TARGETS (Técnica de Ping-Pong para o Rastro) ──
  const fbOpts = {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.FloatType, // Usa FloatType para não perder qualidade de cor a cada frame
  }
  
  // Nossas duas "lousas em branco"
  let fbRTs: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null
  let fbReadIdx = 0 // Indica qual "lousa" estamos lendo no momento

  function initFeedbackRTs(w: number, h: number) {
    fbRTs?.forEach(rt => rt.dispose()) // Evita memory leak ao redimensionar a tela
    fbRTs = [
      new THREE.WebGLRenderTarget(w, h, fbOpts),
      new THREE.WebGLRenderTarget(w, h, fbOpts),
    ]
    fbReadIdx = 0
  }

  initFeedbackRTs(window.innerWidth, window.innerHeight)

  // Material "carimbo" -> Ele simplesmente pega uma textura pronta e joga no monitor do usuário
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

  // ── API PÚBLICA (Funções que você chama no seu React Component) ──

  // Disparada toda vez que o usuário clica ou toca na tela
  function registerClick(
    clientX: number, clientY: number, worldPos: THREE.Vector3,
    containerW: number, containerH: number, ndcX: number, ndcY: number,
  ) {
    if (state.filled) return

    // Verifica se o clique atual está dentro da janela de tempo (ex: 1.2 segundos) do clique anterior
    const now = performance.now()
    clicks.push({ x: clientX, y: clientY, time: now })
    const recent = clicks.filter(c => now - c.time < CLICK_WINDOW)
    clicks.length = 0
    clicks.push(...recent)

    stageClickCount++

    // Primeiro clique: Apenas engatilha, não faz nada visual ainda
    if (stageClickCount === 1) {
      state.stage = 1
    }
    // Segundo clique (Duplo clique confirmado):
    else if (stageClickCount >= 2) {
      if (state.stage !== 3) {
        initParticles() // Reseta as coordenadas das partículas

        // Salva as coordenadas UV do mouse (onde o usuário clicou) para explodir dali
        uniforms.uSynapticOrigin.value.set(
          (ndcX + 1.0) / 2.0,
          1.0 - (ndcY + 1.0) / 2.0,
        )
      }
      
      // Muda o status para ativar o loop de Render e Atualização
      state.active = true
      state.stage  = 3
      state.age    = 0
      state.filled = false
      stageClickCount = 0
    }
  }

  const FILL_DURATION = 10.0 // Tempo opcional de preenchimento (se quiser usar o fade escuro no futuro)

  // Disparada no 'requestAnimationFrame' do React. Atualiza a física e a opacidade.
  function update(dt: number, elapsedTime: number) {
    uniforms.uTime.value = elapsedTime

    // Se não estourou a bomba sináptica ainda, aborta
    if (!state.active || (state.stage !== 2 && state.stage !== 3)) {
      uniforms.uIntensity.value = 0
      return
    }

    state.age += dt // Incrementa o relógio interno da explosão

    const fillProgress = Math.min(state.age / FILL_DURATION, 1.0)
    uniforms.uFillProgress.value = fillProgress

    // Faz as partículas surgirem suavemente (Fade In de 0.3 segundos)
    const fadeIn = Math.min(state.age / 0.3, 1.0)
    state.intensity = fadeIn
    uniforms.uIntensity.value = state.intensity

    // Roda os cálculos matemáticos da CPU
    updateParticles(elapsedTime)
  }

  // Também disparada no loop do React. Orquestra as "lousas de giz" (Render Targets).
  function render() {
    if (!fbRTs) return

    if (state.active && (state.stage === 2 || state.stage === 3)) {
      const writeIdx = 1 - fbReadIdx // Se lê do 0, escreve no 1. Se lê do 1, escreve no 0.
      
      // Passa a "lousa" antiga para o Shader como variável
      uniforms.uPrevFrame.value = fbRTs[fbReadIdx].texture

      // Manda a placa de vídeo desenhar o frame novo na "lousa" atual
      renderer.setRenderTarget(fbRTs[writeIdx])
      renderer.clear()
      renderer.render(effectScene, effectCamera)
      renderer.setRenderTarget(null)

      // Usa o material "carimbo" para desenhar a lousa pronta direto no monitor do usuário
      blitMat.uniforms.uTexture.value = fbRTs[writeIdx].texture
      const prevClear = renderer.autoClear
      renderer.autoClear = false
      renderer.render(blitScene, blitCamera)
      renderer.autoClear = prevClear

      // Prepara o Ping-Pong para o próximo frame invertendo as lousas
      fbReadIdx = writeIdx
    }

    // Desenha o fade preto por cima se for o caso
    if (fillUniforms.uOpacity.value > 0.0 && !state.filled) {
      const prevClear = renderer.autoClear
      renderer.autoClear = false
      renderer.render(fillScene, fillCamera)
      renderer.autoClear = prevClear
    }
  }

  // Ajusta as lousas virtuais caso o usuário vire o celular ou redimensione a janela
  function resize(w: number, h: number) {
    uniforms.uAspect.value = w / h
    initFeedbackRTs(w, h)
  }

  // FUNÇÃO CRÍTICA PARA APLICAÇÕES REACT SPA!
  // Roda no useEffect 'return cleanup()'. Limpa as coisas pesadas da VRAM da placa de vídeo.
  function dispose() {
    geo.dispose()
    mat.dispose()
    fillGeo.dispose()
    fillMat.dispose()
    blitGeo.dispose()
    blitMat.dispose()
    fbRTs?.forEach(rt => rt.dispose())
  }

  // Força uma parada total no efeito
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

  // Expõe os métodos para o ParticleGlobe.tsx do React utilizar
  return { state, registerClick, update, render, resize, dispose, reset, setSynapticBlack }
}
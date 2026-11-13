import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

// ── Grade de pontos (superfície ondulada) ───────────────────────────────────
const GRID_X      = 120
const GRID_Y      = 66
const SEPARATION  = 56
const GRID_START_Z = -2600

const WAVE_AMP      = 26
const MOUSE_RADIUS  = 620
const MOUSE_LERP    = 0.08
const MOUSE_BUMP    = 55

const POINT_COLOR   = 0x0f172a

interface ParticleGlobeProps {
  children?: ReactNode
  /** Preenche a altura do contêiner em vez de usar 100vh. */
  fill?: boolean
}

export default function ParticleGlobe({ children, fill = false }: ParticleGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── Renderer / cena / câmera ─────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias:       true,
      alpha:           true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xffffff, 1)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      1,
      12000,
    )
    camera.position.set(0, 380, 900)
    camera.lookAt(0, 0, -200)

    // ── Geometria: grade no plano XZ ─────────────────────────────────────
    const count     = GRID_X * GRID_Y
    const positions = new Float32Array(count * 3)
    const grid      = new Float32Array(count * 2)

    let i = 0
    for (let ix = 0; ix < GRID_X; ix++) {
      for (let iy = 0; iy < GRID_Y; iy++) {
        positions[i * 3]     = ix * SEPARATION - (GRID_X * SEPARATION) / 2
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = iy * SEPARATION + GRID_START_Z

        grid[i * 2]     = ix
        grid[i * 2 + 1] = iy
        i++
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2))

    // ── Material: ondas em shader + reação ao mouse ──────────────────────
    const uniforms = {
      uTime:       { value: 0 },
      uMouse:      { value: new THREE.Vector2(99999, 99999) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor:      { value: new THREE.Color(POINT_COLOR) },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite:  false,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec2  uMouse;
        uniform float uPixelRatio;

        attribute vec2 aGrid;

        varying float vProx;
        varying float vHeight;

        void main() {
          vec3 pos = position;

          // Ondas senoidais da superfície pontilhada
          float waveA = sin((aGrid.x + uTime * 0.45) * 0.32) * ${WAVE_AMP.toFixed(1)};
          float waveB = sin((aGrid.y + uTime * 0.60) * 0.45) * ${WAVE_AMP.toFixed(1)};
          pos.y += waveA + waveB;

          // Proximidade do mouse (plano XZ)
          float d    = distance(pos.xz, uMouse);
          float prox = 1.0 - smoothstep(0.0, ${MOUSE_RADIUS.toFixed(1)}, d);
          prox = prox * prox;

          // Elevação + ondulação ao redor do cursor
          float ripple = sin(d * 0.018 - uTime * 2.2) * 12.0;
          pos.y += prox * ${MOUSE_BUMP.toFixed(1)} + ripple * prox;

          vProx   = prox;
          vHeight = clamp((pos.y + 60.0) / 120.0, 0.0, 1.0);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float size = 3.0 + prox * 6.5;
          gl_PointSize = clamp(
            size * (1000.0 / max(-mvPosition.z, 1.0)) * uPixelRatio,
            1.2 * uPixelRatio,
            18.0 * uPixelRatio
          );
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;

        varying float vProx;
        varying float vHeight;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;

          float edge  = smoothstep(0.5, 0.18, d);
          float alpha = edge * (0.44 + vProx * 0.45 + vHeight * 0.10);

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // ── Interação com o mouse ────────────────────────────────────────────
    const raycaster      = new THREE.Raycaster()
    const mouseNDC       = new THREE.Vector2()
    const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const targetMouse    = new THREE.Vector2(99999, 99999)
    const currentMouse   = new THREE.Vector2(99999, 99999)
    const hitPoint       = new THREE.Vector3()

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouseNDC.x =  ((e.clientX - rect.left) / container.clientWidth)  * 2 - 1
      mouseNDC.y = -((e.clientY - rect.top)  / container.clientHeight) * 2 + 1

      raycaster.setFromCamera(mouseNDC, camera)
      if (raycaster.ray.intersectPlane(intersectPlane, hitPoint)) {
        targetMouse.set(hitPoint.x, hitPoint.z)
      }
    }

    const handlePointerLeave = () => {
      targetMouse.set(99999, 99999)
    }

    // ── Loop de animação ─────────────────────────────────────────────────
    const clock          = new THREE.Clock()
    const reducedMotion  = window.matchMedia('(prefers-reduced-motion: reduce)')
    let   frameId        = 0
    let   looping        = false
    let   onScreen       = true
    let   pageVisible    = document.visibilityState !== 'hidden'

    function draw() {
      currentMouse.lerp(targetMouse, MOUSE_LERP)
      uniforms.uMouse.value.copy(currentMouse)
      renderer.render(scene, camera)
    }

    function animate() {
      frameId = requestAnimationFrame(animate)

      uniforms.uTime.value = clock.getElapsedTime()
      draw()
    }

    function start() {
      if (looping || !onScreen || !pageVisible) return
      // Mesmo visual congelado para quem pediu menos movimento: um frame só.
      if (reducedMotion.matches) {
        draw()
        return
      }
      looping = true
      clock.start()
      frameId = requestAnimationFrame(animate)
    }

    function stop() {
      if (!looping) return
      looping = false
      cancelAnimationFrame(frameId)
      clock.stop()
    }

    function sync() {
      if (onScreen && pageVisible) start()
      else stop()
    }

    start()

    // ── Resize ───────────────────────────────────────────────────────────
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return

      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)

      const dpr = Math.min(window.devicePixelRatio, 2)
      renderer.setPixelRatio(dpr)
      uniforms.uPixelRatio.value = dpr
      if (!looping) draw()
    }

    const handleVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden'
      sync()
    }

    const handleReducedMotion = () => sync()

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1]?.isIntersecting ?? true
        sync()
      },
      { threshold: 0 },
    )

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('visibilitychange', handleVisibility)
    reducedMotion.addEventListener('change', handleReducedMotion)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    visibilityObserver.observe(container)

    return () => {
      stop()
      visibilityObserver.disconnect()
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('visibilitychange', handleVisibility)
      reducedMotion.removeEventListener('change', handleReducedMotion)
      resizeObserver.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      className={`relative w-full ${fill ? 'h-full' : 'h-screen'} overflow-hidden bg-white`}
      style={{ touchAction: 'none' }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {children && (
        <div className="relative z-10 w-full h-full flex items-center pointer-events-none px-6 md:px-24">
          <div className="max-w-2xl pointer-events-auto text-slate-900">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

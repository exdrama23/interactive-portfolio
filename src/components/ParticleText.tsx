import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { createSynapticDark } from '../effects/SynapticDark'

const PARTICLE_COUNT = 3000
const CAMERA_Z       = 44

const WAVE_FREQ  = 0.80
const WAVE_SPEED = 0.60
const WAVE_AMP   = 0.50

const RIPPLE_FREQ      = 1.5
const RIPPLE_SPEED     = 1.2
const RIPPLE_AMP       = 1.0
const RIPPLE_PEAK_DIST = 8.0

const SIZE_SPEED = 0.45
const SIZE_MIN   = 0.70
const SIZE_MAX   = 1.40

const MOUSE_LERP   = 0.08
const MOUSE_RADIUS = 15.0

const TRACE_RADIUS = 0.007
const TRACE_LENGTH = 0.05

interface ParticleGlobeProps {
  children?: ReactNode
}

export default function ParticleGlobe({ children }: ParticleGlobeProps) {
  const containerRef              = useRef<HTMLDivElement>(null)
  const [contentOpacity, setContentOpacity] = useState(1)
  const [isDarkMode, setIsDarkMode]         = useState(false)
  const [showHint, setShowHint]             = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = CAMERA_Z

    const fovRad = THREE.MathUtils.degToRad(45)
    const halfH  = CAMERA_Z * Math.tan(fovRad / 2)
    const halfW  = halfH * (container.clientWidth / container.clientHeight)

    const mouse2D        = new THREE.Vector2(-9999, -9999)
    const targetMouse3D  = new THREE.Vector3(0, 0, 0)
    const currentMouse3D = new THREE.Vector3(0, 0, 0)
    const raycaster      = new THREE.Raycaster()
    const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

    const synaptic = createSynapticDark(renderer, scene, camera)

    synaptic.setOnVacuumStart(() => {
      document.documentElement.classList.add('transitioning')
      setTimeout(() => {
        window.scrollTo(0, 0)
        document.documentElement.classList.add('no-scroll')
      }, 300)
    })

    synaptic.setOnDarkModeActivated(() => {
      document.documentElement.classList.remove('transitioning', 'no-scroll')
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
      scene.background = new THREE.Color(0x000000)
      renderer.setClearColor(0x000000, 1)
      material.color.setHex(0xffffff)
    })

    const whiteColor = new THREE.Color(0xffffff)
    const darkColor = new THREE.Color(0x222222)
    const blackColor = new THREE.Color(0x000000)

    synaptic.setOnReverseStart(() => {
      document.documentElement.classList.add('transitioning')
      setTimeout(() => {
        window.scrollTo(0, 0)
        document.documentElement.classList.add('no-scroll')
      }, 300)
    })

    synaptic.setOnReverseProgress((p: number) => {
      material.color.copy(whiteColor).lerp(darkColor, p)

      scene.background = new THREE.Color().copy(blackColor).lerp(whiteColor, p)
      setContentOpacity(Math.min(1, (p - 0.3) / 0.5))
    })

    synaptic.setOnReverseComplete(() => {
      document.documentElement.classList.remove('transitioning', 'no-scroll')
      document.documentElement.classList.remove('dark')
      setIsDarkMode(false)
      scene.background = new THREE.Color(0xffffff)
      renderer.setClearColor(0xffffff, 1)
      material.color.setHex(0x222222)
      material.opacity = 0.8
      setContentOpacity(1)
    })

    const geometry = new THREE.CylinderGeometry(TRACE_RADIUS, TRACE_RADIUS, TRACE_LENGTH, 5)
    geometry.rotateX(Math.PI / 2)

    const shaderUniforms = {
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
    }

    const material = new THREE.MeshBasicMaterial({
      color:       0x222222,
      transparent: true,
      opacity:     0.80,
    })

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime  = shaderUniforms.uTime
      shader.uniforms.uMouse = shaderUniforms.uMouse

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3  uMouse;
        varying float vAlpha;
        float hash11(float p) {
          return fract(sin(p * 127.1) * 43758.5453);
        }
        ${shader.vertexShader}
      `
      shader.fragmentShader = `
        varying float vAlpha;
        ${shader.fragmentShader}
      `

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 instPos  = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float mMag    = distance(instPos.xy, uMouse.xy);
        float mouseProx = 1.0 - smoothstep(0.0, ${MOUSE_RADIUS.toFixed(4)}, mMag);
        float sizeOffset = hash11(float(gl_InstanceID) * 3.0) * 6.283;
        float sizePhase  = uTime * ${SIZE_SPEED.toFixed(4)} + sizeOffset;
        float sizeWave   = sin(sizePhase);
        float sizeScale  = smoothstep(-1.0, 1.0, sizeWave)
                           * ${(SIZE_MAX - SIZE_MIN).toFixed(4)}
                           + ${SIZE_MIN.toFixed(4)};
        float sizeBoost  = 1.0 + 6.0 * mouseProx;
        transformed *= sizeScale * sizeBoost;
        `,
      )

      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vec4 worldPos  = modelMatrix * mvPosition;
        float wDist    = length(worldPos.xyz);
        vec3 radialDir = normalize(worldPos.xyz);
        float ambientOffset = hash11(float(gl_InstanceID)) * 6.283;
        float ambient = sin(wDist * ${WAVE_FREQ.toFixed(4)} - uTime * ${WAVE_SPEED.toFixed(4)} + ambientOffset);
        worldPos.xyz += radialDir * ambient * ${WAVE_AMP.toFixed(4)};
        float mDist       = distance(worldPos.xyz, uMouse);
        float rippleOffset = hash11(float(gl_InstanceID) * 2.0) * 6.283;
        float ripple = sin(mDist * ${RIPPLE_FREQ.toFixed(4)} - uTime * ${RIPPLE_SPEED.toFixed(4)} + rippleOffset);
        float env    = (mDist / ${RIPPLE_PEAK_DIST.toFixed(4)})
                       * exp(1.0 - mDist / ${RIPPLE_PEAK_DIST.toFixed(4)});
        env = clamp(env, 0.0, 1.0);
        vec3 rippleDir = normalize(worldPos.xyz - uMouse);
        worldPos.xyz  += rippleDir * ripple * env * ${RIPPLE_AMP.toFixed(4)};
        float _mProx = 1.0 - smoothstep(0.0, ${MOUSE_RADIUS.toFixed(4)}, mDist);
        vAlpha = clamp(0.04 + 0.71 * _mProx, 0.0, 1.0);
        mvPosition  = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        `,
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        'gl_FragColor = vec4( outgoingLight, vAlpha );',
      )
    }

    const mesh  = new THREE.InstancedMesh(geometry, material, PARTICLE_COUNT)
    const dummy = new THREE.Object3D()

    let added = 0
    while (added < PARTICLE_COUNT) {
      const x = (Math.random() * 2 - 1) * halfW
      const y = (Math.random() * 2 - 1) * halfH
      dummy.position.set(x, y, 0)
      const thickness = 0.5 + Math.random() * 1.0
      const len       = 0.5 + Math.random() * 1.0
      dummy.scale.set(thickness, thickness, len)
      dummy.updateMatrix()
      mesh.setMatrixAt(added, dummy.matrix)
      added++
    }
    mesh.instanceMatrix.needsUpdate = true
    scene.add(mesh)

    let frameId: number
    const clock = new THREE.Clock()

    function animate() {
      frameId = requestAnimationFrame(animate)
      const dt = clock.getDelta()
      const t  = clock.elapsedTime

      shaderUniforms.uTime.value = t
      currentMouse3D.lerp(targetMouse3D, MOUSE_LERP)
      shaderUniforms.uMouse.value.copy(currentMouse3D)

      if (synaptic.state.stage === 3) {
        const vp = synaptic.state.vacuumProgress
        setContentOpacity(Math.max(0, 1.0 - vp * 3.5))
      } else if (synaptic.state.stage === 0 || synaptic.state.stage === 1) {
        setContentOpacity(1)
      }

      renderer.render(scene, camera)

      synaptic.update(dt, t)
      synaptic.render(scene, camera)
    }

    animate()

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouse2D.x =  ((e.clientX - rect.left)  / container.clientWidth)  * 2 - 1
      mouse2D.y = -((e.clientY - rect.top)   / container.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse2D, camera)
      raycaster.ray.intersectPlane(intersectPlane, targetMouse3D)
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (synaptic.state.stage === 3 || synaptic.state.stage === 4) return

      const rect = container.getBoundingClientRect()
      const mx =  ((e.clientX - rect.left)  / container.clientWidth)  * 2 - 1
      const my = -((e.clientY - rect.top)   / container.clientHeight) * 2 + 1
      mouse2D.set(mx, my)
      raycaster.setFromCamera(mouse2D, camera)
      const hit = new THREE.Vector3()
      raycaster.ray.intersectPlane(intersectPlane, hit)

      const wasStage0or1 = synaptic.state.stage === 0 || synaptic.state.stage === 1

      synaptic.registerClick(
        e.clientX, e.clientY,
        hit,
        container.clientWidth, container.clientHeight,
        mx, my,
      )

      if (wasStage0or1 && synaptic.state.stage === 1) {
        setShowHint(true)
        setTimeout(() => setShowHint(false), 2200)
      }
    }

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      synaptic.resize(w, h)
    }

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerdown', handlePointerDown)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerdown', handlePointerDown)
      resizeObserver.disconnect()
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      synaptic.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${
        isDarkMode ? 'bg-black' : 'bg-white'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'auto' }}
      />

      <div
        className="relative z-10 w-full h-full flex items-center pointer-events-none px-6 md:px-24"
        style={{ opacity: contentOpacity, transition: 'opacity 0.2s ease' }}
      >
        <div
          className={`max-w-2xl pointer-events-auto transition-colors duration-500 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {children}
        </div>
      </div>

      {showHint && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20
            px-5 py-2 rounded-full text-sm font-mono
            pointer-events-none select-none
            bg-black/6 text-slate-500 border border-black/8"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          clique novamente
        </div>
      )}

      {!isDarkMode && (
        <div
          className="fixed bottom-6 right-6 z-20 pointer-events-none flex items-center gap-2"
          style={{ opacity: contentOpacity }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-widest">× 2</span>
        </div>
      )}
    </div>
  )
}
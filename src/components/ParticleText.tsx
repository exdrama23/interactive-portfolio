import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

const ICONS = [
  'fa-code',
  'fa-laptop-code', 
  'fa-github',
  'fa-cube',
  'fa-rocket',
  'fa-star',
  'fa-fire',
  'fa-bolt',
  'fa-gem',
  'fa-palette',
  'fa-heart',
  'fa-crown',
]

const PARTICLE_COUNT = 12000
const ICON_CHANGE_INTERVAL = 10000 

interface ParticleGlobeProps {
  children?: ReactNode
}

export default function ParticleGlobe({ children }: ParticleGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let scene: THREE.Scene
    let camera: THREE.PerspectiveCamera
    let renderer: THREE.WebGLRenderer
    let particles: THREE.Points
    let frameId: number
    let currentIcon = 0
    let state: 'sphere' | 'shape' | 'transition' = 'sphere'
    let morphToIconTimeout: number | null = null
    let morphToSphereTimeout: number | null = null
    let autoChangeTimeout: number | null = null
    let time = 0

    const mouse = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const morph = { val: 0, explosion: 0 }
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 11)
    let isHovering = false

    const CURSOR = {
      sphere: {
        radius: 6,
        strength: 0.35,
        damping: 0.88,
      },
      shape: {
        radius: 9,
        strength: 0.08,
        damping: 0.92,
      }
    }

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 28

    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.pointerEvents = 'auto'
    containerRef.current.appendChild(renderer.domElement)

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const spherePos = new Float32Array(PARTICLE_COUNT * 3)
    const textPos = new Float32Array(PARTICLE_COUNT * 3)
    const normals = new Float32Array(PARTICLE_COUNT * 3)
    const rnd = new Float32Array(PARTICLE_COUNT)

    const radius = 11

    const phi = Math.PI * (3 - Math.sqrt(5)) 

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      
      const theta = phi * i
      const x = Math.cos(theta) * radiusAtY
      const z = Math.sin(theta) * radiusAtY

      const sx = x * radius
      const sy = y * radius
      const sz = z * radius

      positions.set([sx, sy, sz], i * 3)
      spherePos.set([sx, sy, sz], i * 3)
      normals.set([x, y, z], i * 3)
      rnd[i] = Math.random()

      const t = (sy + radius) / (radius * 2)
      const vermilion = new THREE.Color().setHSL(0.02, 1, 0.55)
      const black = new THREE.Color(0x000000)
      const c = new THREE.Color().copy(black).lerp(vermilion, t)
      
      colors.set([c.r, c.g, c.b], i * 3)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('spherePos', new THREE.BufferAttribute(spherePos, 3))
    geometry.setAttribute('textPos', new THREE.BufferAttribute(textPos, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorphVal: { value: 0 },
        uState: { value: 0 },
        uColorA: { value: new THREE.Color(0x000000) },
        uColorB: { value: new THREE.Color().setHSL(0.02, 1, 0.55) },
        uHover: { value: 0 },
        uExplosion: { value: 0 },
        uTransitionProgress: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uMorphVal;
        uniform float uState;
        uniform float uHover;
        uniform float uExplosion;
        uniform float uTransitionProgress;
        attribute float rnd;
        attribute vec3 spherePos;
        attribute vec3 textPos;
        varying float vDepth;
        varying float vRandom;
        varying float vDistance;
        varying float vTransition;
        
        void main() {
          vec3 pos = mix(spherePos, textPos, uMorphVal);
          
          if (uState > 0.5) {
            float breathe = sin(uTime * 1.5 + rnd * 6.283) * 0.15;
            pos += normal * breathe;
          }
          
          float transitionWave = uTransitionProgress;
          if (uState > 0.5 && uState < 1.5) {
            float wave = sin(uTime * 3.0 + rnd * 6.283 + length(pos) * 2.0) * 0.5 + 0.5;
            transitionWave *= wave;

            float orbitAngle = uTime * 0.5 + rnd * 6.283;
            vec3 orbit = vec3(
              cos(orbitAngle) * 0.2,
              sin(orbitAngle) * 0.1,
              sin(orbitAngle * 1.5) * 0.15
            );
            pos += orbit * transitionWave * (1.0 - uMorphVal);
          }
          
          if (uExplosion > 0.0) {
            float explosionFactor = uExplosion * (0.8 + rnd * 0.4);
            vec3 explosionDir = normalize(pos + normal * 0.5);
            pos += explosionDir * explosionFactor;
          }

          float hoverEffect = uHover * (0.5 + rnd * 0.5);
          pos += normal * hoverEffect;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mvPosition.z / 50.0;
          vRandom = rnd;
          vDistance = length(pos);
          vTransition = transitionWave;
          
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 4.0 * (1.0 + uMorphVal * 0.3) / length(mvPosition.xyz);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uTime;
        varying float vDepth;
        varying float vRandom;
        varying float vDistance;
        varying float vTransition;
        
        void main() {
          float gradient = clamp(vDepth, 0.0, 1.0);
          vec3 color = mix(uColorA, uColorB, gradient);

          float pulse = sin(uTime * 2.0 + vRandom * 6.283) * 0.15 + 0.85;
          color *= pulse;

          color *= (1.0 + vTransition * 0.3);

          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float dist = length(uv);

          float alpha = 1.0 - smoothstep(0.75, 0.95, dist);

          float core = 1.0 - smoothstep(0.0, 0.4, dist);
          color += core * 0.25;
          
          float edgeGlow = (1.0 - dist) * vTransition * 0.5;
          color += edgeGlow * uColorB;
          
          gl_FragColor = vec4(color, alpha * 0.9);
        }
      `,
    })

    particles = new THREE.Points(geometry, material)
    scene.add(particles)

    const iconPositionsCache = new Map<string, Float32Array>()
    
    let fontAwesomeLoaded = false
    
    async function loadFontAwesome(): Promise<void> {
      if (fontAwesomeLoaded) return
      
      const fontAwesomeFont = new FontFace(
        'Font Awesome 6 Free',
        'url(https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2)'
      )
      
      try {
        await fontAwesomeFont.load()
        document.fonts.add(fontAwesomeFont)
        await document.fonts.ready
        fontAwesomeLoaded = true
      } catch (error) {
        console.warn('Erro ao carregar fonte:', error)
      }
    }

    async function createIconPositions(iconClass: string): Promise<Float32Array> {
      if (iconPositionsCache.has(iconClass)) {
        return iconPositionsCache.get(iconClass)!
      }

      await loadFontAwesome()

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = 512
      canvas.height = 512

      const fontSize = 350
      ctx.font = `900 ${fontSize}px "Font Awesome 6 Free"`
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const iconMap: Record<string, string> = {
        'fa-code': '\uf121',
        'fa-laptop-code': '\uf5fc',
        'fa-github': '\uf09b',
        'fa-cube': '\uf1b2',
        'fa-rocket': '\uf135',
        'fa-star': '\uf005',
        'fa-fire': '\uf06d',
        'fa-bolt': '\uf0e7',
        'fa-gem': '\uf3a5',
        'fa-palette': '\uf53f',
        'fa-heart': '\uf004',
        'fa-crown': '\uf521',
      }

      const iconChar = iconMap[iconClass] || '\uf121'

      ctx.fillText(iconChar, canvas.width / 2, canvas.height / 2)

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const w = canvas.width
      const h = canvas.height

      let minX = w, maxX = 0, minY = h, maxY = 0
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          if (data[idx] > 50) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const iconWidth = maxX - minX
      const iconHeight = maxY - minY
      const iconSize = Math.max(iconWidth, iconHeight)

      const iconPoints: {x: number, y: number, density: number}[] = []
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          const alpha = data[idx]
          
          if (alpha > 20) {
            const normX = (x - centerX) / (iconSize * 0.5)
            const normY = (y - centerY) / (iconSize * 0.5)
            
            const weight = alpha / 255
            
            const pointsToAdd = Math.max(1, Math.floor(weight * 3))
            for (let i = 0; i < pointsToAdd; i++) {
              const jitterX = (Math.random() - 0.5) * 0.05
              const jitterY = (Math.random() - 0.5) * 0.05
              iconPoints.push({
                x: normX + jitterX,
                y: normY + jitterY,
                density: weight
              })
            }
          }
        }
      }

      const positions = new Float32Array(PARTICLE_COUNT * 3)
      
      if (iconPoints.length > 0) {
        let sumX = 0, sumY = 0
        for (const point of iconPoints) {
          sumX += point.x
          sumY += point.y
        }
        const avgX = sumX / iconPoints.length
        const avgY = sumY / iconPoints.length

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const point = iconPoints[Math.floor(Math.random() * iconPoints.length)]
          
          const SCALE = 18
          const x = (point.x - avgX) * SCALE
          const y = (point.y - avgY) * SCALE
          
          const r = Math.sqrt(x*x + y*y) / SCALE
          const curvature = Math.max(0, 1 - r * 0.15)
          
          const z = (Math.random() - 0.5) * 3 * curvature * (0.5 + point.density)
          
          positions[i * 3] = x
          positions[i * 3 + 1] = y
          positions[i * 3 + 2] = z
        }
      } else {
        console.warn(`Nenhum ponto encontrado para ${iconClass}, usando fallback`)
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const r = 5 + Math.random() * 3
          
          const x = r * Math.sin(phi) * Math.cos(theta)
          const y = r * Math.sin(phi) * Math.sin(theta)
          const z = r * Math.cos(phi)
          
          positions[i * 3] = x
          positions[i * 3 + 1] = y
          positions[i * 3 + 2] = z
        }
      }

      iconPositionsCache.set(iconClass, positions)
      return positions
    }

    async function morphToIcon() {
      if (state === 'transition') return
      state = 'transition'

      if (morphToSphereTimeout) clearTimeout(morphToSphereTimeout)
      if (morphToIconTimeout) clearTimeout(morphToIconTimeout)
      if (autoChangeTimeout) clearTimeout(autoChangeTimeout)

      const iconPositions = await createIconPositions(ICONS[currentIcon])

      const attr = geometry.attributes.textPos as THREE.BufferAttribute
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        attr.array[i] = iconPositions[i]
      }
      attr.needsUpdate = true

      velocities.fill(0)
      particles.rotation.set(0, 0, 0)

      material.uniforms.uState.value = 2 

      const timeline = gsap.timeline({
        onComplete: () => {
          state = 'shape'
          material.uniforms.uState.value = 1 
          material.uniforms.uTransitionProgress.value = 0
          morphToSphereTimeout = window.setTimeout(morphToSphere, 6000)
        }
      })

      timeline.to(material.uniforms.uTransitionProgress, {
        value: 1,
        duration: 0.8,
        ease: "power2.out"
      }, 0)

      timeline.to(material.uniforms.uExplosion, {
        value: 8,
        duration: 0.6,
        ease: "power2.out"
      }, 0.2)

      timeline.to(morph, {
        val: 1,
        duration: 1.8,
        ease: "power2.inOut"
      }, 0.4)
      
      timeline.to(material.uniforms.uExplosion, {
        value: 0,
        duration: 1.8,
        ease: "power2.in"
      }, 0.8)
      
      timeline.to(material.uniforms.uMorphVal, {
        value: 1,
        duration: 1.8,
        ease: "power2.inOut"
      }, 0.4)

      gsap.to(camera.position, {
        z: 35,
        duration: 2,
        ease: "power2.inOut"
      })
    }

    function morphToSphere() {
      if (state === 'transition') return
      state = 'transition'

      if (morphToIconTimeout) clearTimeout(morphToIconTimeout)
      if (morphToSphereTimeout) clearTimeout(morphToSphereTimeout)
      if (autoChangeTimeout) clearTimeout(autoChangeTimeout)

      velocities.fill(0)

      material.uniforms.uState.value = 2 
      material.uniforms.uTransitionProgress.value = 1

      const timeline = gsap.timeline({
        onComplete: () => {
          state = 'sphere'
          material.uniforms.uState.value = 0 
          material.uniforms.uTransitionProgress.value = 0
          currentIcon = (currentIcon + 1) % ICONS.length
          
          autoChangeTimeout = window.setTimeout(() => {
            if (state === 'sphere') {
              morphToIcon()
            }
          }, ICON_CHANGE_INTERVAL)
        }
      })
      
      timeline.to(material.uniforms.uExplosion, {
        value: 3,
        duration: 0.3,
        ease: "power2.out"
      }, 0)

      timeline.to(morph, {
        val: 0,
        duration: 1.2,
        ease: "power2.inOut"
      }, 0.2)
      
      timeline.to(material.uniforms.uExplosion, {
        value: 0,
        duration: 1.0,
        ease: "power2.in"
      }, 0.4)
      
      timeline.to(material.uniforms.uMorphVal, { 
        value: 0, 
        duration: 1.2, 
        ease: "power2.inOut" 
      }, 0.2)
      
      timeline.to(material.uniforms.uTransitionProgress, {
        value: 0,
        duration: 1.2,
        ease: "power2.inOut"
      }, 0.2)
      
      gsap.to(camera.position, {
        z: 28,
        duration: 1.2,
        ease: "power2.inOut"
      })
    }

    function animate() {
      frameId = requestAnimationFrame(animate)

      const pos = geometry.attributes.position as THREE.BufferAttribute
      const sp = geometry.attributes.spherePos as THREE.BufferAttribute
      const tp = geometry.attributes.textPos as THREE.BufferAttribute
      const n = geometry.attributes.normal as THREE.BufferAttribute

      raycaster.setFromCamera(mouse, camera)
      const hit = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, hit)

      const rayOrigin = raycaster.ray.origin
      const rayDir = raycaster.ray.direction.clone().normalize()
      const toCenter = new THREE.Vector3().subVectors(sphere.center, rayOrigin)
      const projectionLength = toCenter.dot(rayDir)
      let isHoveringIcon = false

      if (projectionLength > 0) {
        const closestPoint = rayOrigin.clone().addScaledVector(rayDir, projectionLength)
        const distToSphere = closestPoint.distanceTo(sphere.center)
        isHovering = distToSphere < sphere.radius && state === 'sphere'
        
        if (state === 'shape') {
          const shapeCenter = new THREE.Vector3(0, 0, 0)
          const shapeRadius = 12
          const distToShape = closestPoint.distanceTo(shapeCenter)
          isHoveringIcon = distToShape < shapeRadius
        }
      } else {
        isHovering = false
        isHoveringIcon = false
      }

      material.uniforms.uHover.value = (isHovering || isHoveringIcon) ? 0.5 : 0

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = sp.getX(i)
        const y = sp.getY(i)
        const z = sp.getZ(i)

        let cx = x + (tp.getX(i) - x) * morph.val
        let cy = y + (tp.getY(i) - y) * morph.val
        let cz = z + (tp.getZ(i) - z) * morph.val

        if (material.uniforms.uExplosion.value > 0) {
          const explosion = material.uniforms.uExplosion.value
          cx += n.getX(i) * explosion * rnd[i] * 0.1
          cy += n.getY(i) * explosion * rnd[i] * 0.1
          cz += n.getZ(i) * explosion * rnd[i] * 0.1
        }

        if ((state === 'sphere') || (state === 'shape' && morph.val > 0.98)) {
          const cfg = state === 'sphere' ? CURSOR.sphere : CURSOR.shape

          const dx = cx - hit.x
          const dy = cy - hit.y
          const dz = cz - hit.z

          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if ((isHovering || isHoveringIcon) && dist > 0.0001 && dist < cfg.radius) {
            const falloff = 1 - dist / cfg.radius
            const force = falloff * falloff * cfg.strength

            velocities[i * 3] += (dx / dist) * force
            velocities[i * 3 + 1] += (dy / dist) * force
            velocities[i * 3 + 2] += (dz / dist) * force
          }

          velocities[i * 3] *= cfg.damping
          velocities[i * 3 + 1] *= cfg.damping
          velocities[i * 3 + 2] *= cfg.damping

          cx += velocities[i * 3]
          cy += velocities[i * 3 + 1]
          cz += velocities[i * 3 + 2]
        }

        pos.setXYZ(i, cx, cy, cz)
      }

      pos.needsUpdate = true

      time += 0.02
      material.uniforms.uTime.value = time

      material.uniforms.uMorphVal.value = morph.val

      if (state === 'sphere') {
        particles.rotation.y += 0.002
        particles.rotation.x += 0.0005
      }

      renderer.render(scene, camera)
    }

    animate()

    autoChangeTimeout = window.setTimeout(() => {
      if (state === 'sphere') {
        morphToIcon()
      }
    }, ICON_CHANGE_INTERVAL)

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const handleClick = () => {
      if (state === 'sphere') {
        raycaster.setFromCamera(mouse, camera)
        const rayOrigin = raycaster.ray.origin
        const rayDir = raycaster.ray.direction.clone().normalize()
        const toCenter = new THREE.Vector3().subVectors(sphere.center, rayOrigin)
        const projectionLength = toCenter.dot(rayDir)

        if (projectionLength > 0) {
          const closestPoint = rayOrigin.clone().addScaledVector(rayDir, projectionLength)
          const distToSphere = closestPoint.distanceTo(sphere.center)
          if (distToSphere < sphere.radius) {
            morphToIcon()
          }
        }
      } else if (state === 'shape') {
        morphToSphere()
      }
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('click', handleClick)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      if (morphToIconTimeout) clearTimeout(morphToIconTimeout)
      if (morphToSphereTimeout) clearTimeout(morphToSphereTimeout)
      if (autoChangeTimeout) clearTimeout(autoChangeTimeout)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('click', handleClick)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative w-full h-screen">
      <div
        ref={containerRef}
        className="fixed inset-0 bg-white z-0"
        style={{ pointerEvents: 'auto' }}/>
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <div className="max-w-4xl mx-auto px-6 py-12 text-white pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
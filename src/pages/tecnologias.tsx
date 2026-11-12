import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Cloud, Database, Smartphone } from 'lucide-react'
import { TechOrbit } from '../components/ui/tech-orbit'
import { TECH_CATEGORIES, type TechItem } from '../components/ui/tech-data'

const GRID_TECHS: TechItem[] = [
  { name: 'React', slug: 'react', category: 'Front-end & UI' },
  { name: 'Tailwind', slug: 'tailwindcss', category: 'Front-end & UI' },
  { name: 'Vite', slug: 'vite', category: 'Front-end & UI' },
  { name: 'three.js', slug: 'threedotjs', category: 'Front-end & UI' },
  { name: 'GSAP', slug: 'greensock', category: 'Front-end & UI' },
  { name: 'Express', slug: 'express', category: 'Back-end & APIs' },
  { name: 'Socket.io', slug: 'socketdotio', category: 'Back-end & APIs' },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'Banco de Dados & Cache' },
  { name: 'MySQL', slug: 'mysql', category: 'Banco de Dados & Cache' },
  { name: 'Redis', slug: 'redis', category: 'Banco de Dados & Cache' },
  { name: 'Prisma', slug: 'prisma', category: 'Back-end & APIs' },
  { name: 'Docker', slug: 'docker', category: 'Cloud & DevOps' },
  { name: 'Git', slug: 'git', category: 'Cloud & DevOps' },
  { name: 'GitHub', slug: 'github', category: 'Cloud & DevOps' },
  { name: 'Azure', icon: Cloud, category: 'Cloud & DevOps' },
  { name: 'Postman', slug: 'postman', category: 'Ferramentas e Plataformas' },
  { name: 'DBeaver', slug: 'dbeaver', category: 'Ferramentas e Plataformas' },
  { name: 'Anime.js', slug: 'animedotjs', category: 'Front-end & UI' },
  { name: 'SQL Server', icon: Database, category: 'Banco de Dados & Cache' },
  { name: 'Bootstrap', slug: 'bootstrap', category: 'Front-end & UI' },
  { name: 'n8n', slug: 'n8n', category: 'Conceitos & Especialidades' },
  { name: 'MediaPipe', slug: 'mediapipe', category: 'Conceitos & Especialidades' },
  { name: 'React Native', icon: Smartphone, category: 'Front-end & UI' },
  { name: 'GLSL / Shaders', slug: 'opengl', category: 'Front-end & UI' },
]

const EXTRA_TECHS: TechItem[] = [
  { name: 'particles.js', category: 'Front-end & UI' },
  { name: 'ScrollTrigger', category: 'Front-end & UI' },
  { name: 'Lenis / Smooth Scroll', category: 'Front-end & UI' },
  { name: 'Interactive UI & motion systems', category: 'Front-end & UI' },
  { name: 'React Three Fiber', category: 'Front-end & UI' },
  { name: 'API REST', category: 'Back-end & APIs' },
  { name: 'IXC', category: 'Back-end & APIs' },
  { name: 'Machine Learning', category: 'Conceitos & Especialidades' },
  { name: 'Arquitetura de Software (POO)', category: 'Conceitos & Especialidades' },
  { name: 'Sistemas em Cloud', category: 'Conceitos & Especialidades' },
  { name: 'Real-time interaction', category: 'Conceitos & Especialidades' },
]

/** Os 14 nós do círculo, na ordem espacial (front, back, dados, devops). */
const BOARD_TECHS = GRID_TECHS.slice(0, 14)
const REST_TECHS = [...GRID_TECHS.slice(14), ...EXTRA_TECHS]
const ALL_TECHS = [...GRID_TECHS, ...EXTRA_TECHS]

const PANELS = TECH_CATEGORIES.map((category) => ({
  category,
  techs: ALL_TECHS.filter((tech) => tech.category === category),
}))

/** Painel de texto de uma área — entra conforme o trilho desliza. */
function CategoryPanel({
  category,
  techs,
  index,
  total,
  start,
  progress,
  reduced,
}: {
  category: string
  techs: readonly TechItem[]
  index: number
  total: number
  start: number
  progress: MotionValue<number>
  reduced: boolean
}) {
  // Cada painel acorda quando chega perto do centro da tela.
  const at = start + index * ((0.96 - start) / total)
  const opacity = useTransform(progress, [at - 0.07, at + 0.02], [reduced ? 1 : 0.08, 1])
  const y = useTransform(progress, [at - 0.07, at + 0.02], [reduced ? 0 : 44, 0])

  return (
    <motion.div
      style={reduced ? undefined : { opacity, y }}
      className="relative flex h-full w-[84vw] shrink-0 items-center px-8 md:w-[48vw] md:px-[4vw]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[4vw] -translate-y-1/2 font-serif text-[34vw] leading-none text-white/[0.03] select-none md:text-[18vw]"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="relative w-full max-w-[520px]">
        <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.26em] text-stone-500 uppercase">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span className="h-px w-8 bg-white/20" />
          <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </div>

        <h3 className="mt-5 font-serif text-[clamp(2.1rem,4vw,3.9rem)] leading-[0.95] tracking-tight text-stone-50">
          {category}
        </h3>

        <div className="mt-6 flex items-baseline gap-4 border-b border-white/10 pb-5">
          <span className="font-serif text-4xl leading-none text-stone-200 md:text-5xl">
            {String(techs.length).padStart(2, '0')}
          </span>
          <span className="font-mono text-[10px] tracking-[0.24em] text-stone-500 uppercase">
            tecnologias
          </span>
        </div>

        <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.9] text-stone-400 md:text-base">
          {techs.map((tech) => tech.name).join(' · ')}
        </p>
      </div>
    </motion.div>
  )
}

export function Tecnologias() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(0)
  const [panelWidth, setPanelWidth] = useState(0)
  const [viewportH, setViewportH] = useState(0)

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track) return
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
      setPanelWidth(window.innerWidth)
      setViewportH(window.innerHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (trackRef.current) observer.observe(trackRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // 0 = topo da seção no topo da tela; 1 = fim do trecho fixado.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    mass: 0.4,
    restDelta: 0.0005,
  })

  // Fração do trilho consumida pela entrada lateral (um viewport). É o mesmo
  // intervalo em que o Sobre desliza para a esquerda: os dois formam um
  // único trilho horizontal. Sem spring aqui, para casar com o Sobre.
  const entrySpan = viewportH > 0 && distance > 0 ? viewportH / distance : 0.2
  const enterX = useTransform(scrollYProgress, [0, entrySpan], [panelWidth, 0])
  const slideStart = Math.min(0.55, entrySpan + 0.1)
  const slideX = useTransform(progress, [slideStart, 0.98], [0, -distance])
  const x = useTransform([enterX, slideX], (latest: number[]) => latest[0] + latest[1])

  // O círculo fecha antes de o trilho começar a andar.
  const circle = useTransform(
    progress,
    [entrySpan * 0.45, Math.min(entrySpan + 0.15, 0.72)],
    [0, 1],
  )
  const bar = useTransform(progress, [0, 0.98], [0, 1])
  const barOpacity = useTransform(progress, [entrySpan * 0.8, entrySpan + 0.05], [0, 1])

  if (reduceMotion) {
    return (
      <section
        id="skills"
        className="relative w-full bg-black px-6 py-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:py-32 lg:px-12"
      >
        <div className="mx-auto max-w-[1400px]">
          <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
            Hard skills
          </p>
          <h2 className="mt-5 max-w-[900px] font-serif text-[2.75rem] leading-[1.05] tracking-tight text-stone-50 md:text-[4rem] lg:text-[5rem]">
            Tecnologias que eu uso.
          </h2>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
            Cada nó é uma ferramenta que já coloquei em produção. As 14 principais
            fecham o círculo; o centro abre o resto da stack — com e sem logo
            oficial.
          </p>

          <div className="mx-auto mt-16 max-w-[560px]">
            <TechOrbit progress={progress} items={BOARD_TECHS} rest={REST_TECHS} />
          </div>

          <div className="mt-20 grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {PANELS.map((panel, index) => (
              <div key={panel.category} className="border-t border-white/10 pt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-2xl text-stone-50">{panel.category}</h3>
                  <span className="font-mono text-xs text-stone-500">
                    {String(panel.techs.length).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  {panel.techs.map((tech) => tech.name).join(' · ')}
                </p>
                <span className="sr-only">Área {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="relative z-20 w-full text-stone-200 antialiased selection:bg-stone-100 selection:text-black"
      style={{
        height: `calc(100svh + ${distance}px)`,
        marginTop: 'calc(-1 * var(--handoff-overlap, 100svh))',
      }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden pointer-events-none">
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex h-full w-max bg-black will-change-transform"
        >
          {/* Painel 1 — título + círculo que nasce da linha do Sobre. */}
          <div className="relative flex h-full w-screen shrink-0 items-center px-6 lg:px-12">
            <div className="mx-auto grid w-full max-w-[1400px] items-center gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
                  Hard skills
                </p>
                <h2 className="mt-5 max-w-[900px] font-serif text-[2.5rem] leading-[1.03] tracking-tight text-stone-50 md:text-[3.6rem] lg:text-[4.6rem]">
                  Tecnologias que eu uso.
                </h2>
                <p className="mt-6 hidden max-w-md text-base leading-relaxed text-stone-400 md:block md:text-lg">
                  Cada nó é uma ferramenta que já coloquei em produção. As 14
                  principais fecham o círculo; o centro abre o resto da stack.
                </p>
                <p className="mt-10 hidden items-center gap-3 font-mono text-[10px] tracking-[0.24em] text-stone-500 uppercase md:flex">
                  <span className="h-px w-10 bg-white/20" />
                  role para percorrer as áreas
                </p>
              </div>

              <div className="mx-auto w-full max-w-[520px] md:max-w-[600px]">
                <TechOrbit progress={circle} items={BOARD_TECHS} rest={REST_TECHS} />
              </div>
            </div>

            <span className="pointer-events-none absolute bottom-6 left-6 font-mono text-[10px] tracking-[0.24em] text-stone-600 uppercase lg:left-12">
              hard skills — 2026
            </span>
          </div>

          {/* Painéis 2..7 — as áreas em texto, deslizando na horizontal. */}
          {PANELS.map((panel, index) => (
            <CategoryPanel
              key={panel.category}
              category={panel.category}
              techs={panel.techs}
              index={index}
              total={PANELS.length}
              start={entrySpan + 0.02}
              progress={progress}
              reduced={false}
            />
          ))}
        </motion.div>

        {/* Barra de progresso do trilho. */}
        <motion.div
          style={{ opacity: barOpacity }}
          className="pointer-events-none absolute right-6 bottom-6 left-6 lg:right-12 lg:left-12"
        >
          <div className="h-px w-full bg-white/10">
            <motion.div
              style={{ scaleX: bar }}
              className="h-px w-full origin-left bg-stone-400"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Tecnologias

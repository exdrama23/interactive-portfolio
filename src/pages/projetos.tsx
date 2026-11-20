import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { Link } from 'react-router-dom'
import CurvedLensCarousel from '../components/ui/3d-curved-carousel'
import {
  ProjectFocusInfo,
  type ProjectDetail,
} from '@/components/ui/projetos/project-focus-info'
import projetosData from '../data/projetos.json'

interface ProjetosData {
  label: string
  hint: string
  projects: ProjectDetail[]
}

const DATA = projetosData as unknown as ProjetosData
const PROJETOS: ProjectDetail[] = DATA.projects
const DESTAQUES = PROJETOS.filter((project) => project.featured)
const SLIDES = DESTAQUES.length > 0 ? DESTAQUES : PROJETOS

const WINDOW_RISE_END = 0.1
const WINDOW_OPEN_END = 0.5
const WINDOW_SIZE = 0.48
const INTRO_GATE = 0.54

export function Projetos() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [opened, setOpened] = useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    const measure = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    const timer = window.setTimeout(measure, 600)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearTimeout(timer)
    }
  }, [])

  const { w, h } = viewport
  const side = Math.min(w, h) * WINDOW_SIZE || 1

  const rise = useTransform(
    scrollYProgress,
    [0, WINDOW_RISE_END],
    [h * 0.12, 0],
  )
  const open = useTransform(
    scrollYProgress,
    [WINDOW_RISE_END, WINDOW_OPEN_END],
    [0, 1],
  )
  const scaleX = useTransform(open, [0, 1], [1, (w / side) * 1.04])
  const scaleY = useTransform(open, [0, 1], [1, (h / side) * 1.04])
  const windowRadius = useTransform(open, [0, 0.7], [26, 0])
  const windowOpacity = useTransform(scrollYProgress, [0, 0.03], [0, 1])
  const carouselOpacity = useTransform(
    scrollYProgress,
    [0, WINDOW_OPEN_END - 0.004, WINDOW_OPEN_END],
    [0, 0, 1],
  )
  const carouselEntrance = useTransform(
    scrollYProgress,
    [0, WINDOW_OPEN_END],
    [0, INTRO_GATE],
  )

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setOpened(value >= WINDOW_OPEN_END - 0.004)
  })

  return (
    <section
      ref={sectionRef}
      id="projetos"
      className="pointer-events-none relative z-40 h-[300svh] w-full overflow-x-clip text-stone-200 antialiased selection:bg-stone-100 selection:text-black motion-reduce:h-[100svh]"
      style={reduceMotion ? undefined : { marginTop: 'calc(-200svh)' }}
    >
      <div className="pointer-events-none sticky top-0 h-[100svh] w-full overflow-hidden">
        {!reduceMotion && w > 0 ? (
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: side, height: side }}
          >
            <motion.div
              style={{
                y: rise,
                scaleX,
                scaleY,
                borderRadius: windowRadius,
                opacity: windowOpacity,
              }}
              className="h-full w-full bg-black"
            />
          </div>
        ) : null}

        <motion.div
          style={
            reduceMotion
              ? undefined
              : { opacity: carouselOpacity }
          }
          className={
            'absolute inset-0 h-full w-full' +
            (reduceMotion || opened ? ' pointer-events-auto' : '')
          }
        >
          <CurvedLensCarousel
            slides={SLIDES}
            label={DATA.label}
            hint={DATA.hint}
            topRight={
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline">{DATA.hint}</span>
                <Link
                  to="/projetos"
                  className="pointer-events-auto inline-flex items-center gap-1.5 border-b border-current/40 pb-0.5 tracking-[0.18em] transition-colors hover:border-current"
                >
                  Ver todos
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            }
            bend={0.6}
            background="#000000"
            ink="#f3ede4"
            height="100svh"
            entrance={carouselEntrance}
            renderFocus={(_slide, index) => (
              <ProjectFocusInfo
                project={SLIDES[index] ?? SLIDES[0]}
                index={index}
                total={SLIDES.length}
              />
            )}
          />
        </motion.div>
      </div>
    </section>
  )
}

export default Projetos

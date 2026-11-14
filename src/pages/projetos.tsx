import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import CurvedLensCarousel from '../components/ui/3d-curved-carousel'
import {
  ProjectFocusInfo,
  type ProjectDetail,
} from '../components/ui/project-focus-info'
import projetosData from '../data/projetos.json'

interface ProjetosData {
  label: string
  hint: string
  projects: ProjectDetail[]
}

const DATA = projetosData as unknown as ProjetosData
const PROJETOS: ProjectDetail[] = DATA.projects

// Fases do progresso da secao (0 = topo da secao no topo da tela, 1 = fim):
// 1) a janela sobe ate o centro; 2) abre ate cobrir a tela; 3) palco parado
// com a entrada dos cartoes. O restante do progresso (50% -> 100%) fica para
// o carrossel, entao nao da para passar sem ver a animacao.
const WINDOW_RISE_END = 0.1
const WINDOW_OPEN_END = 0.5
const WINDOW_SIZE = 0.48
// O carrossel dispara a entrada dos cartoes quando `entrance` cruza 0.54.
// Remapeamos o progresso para esse gate cair exatamente no instante em que a
// janela termina de cobrir a tela, sem editar o componente do carrossel.
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

  // A janela sobe do centro para baixo ate o centro da tela e depois se
  // estica ate cobrir o viewport. O conteudo e preto liso, entao esticar por
  // `scale` nao distorce nada - e fica tudo em transform (GPU).
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

  // So depois que a janela cobre a tela o carrossel aceita ponteiro/foco;
  // antes disso ele esta montado (pre-carrega texturas) mas invisivel.
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
            slides={PROJETOS}
            label={DATA.label}
            hint={DATA.hint}
            bend={0.6}
            background="#000000"
            ink="#f3ede4"
            height="100svh"
            entrance={carouselEntrance}
            renderFocus={(_slide, index) => (
              <ProjectFocusInfo
                project={PROJETOS[index] ?? PROJETOS[0]}
                index={index}
                total={PROJETOS.length}
              />
            )}
          />
        </motion.div>
      </div>
    </section>
  )
}

export default Projetos

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
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

export function Projetos() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const contentX = useTransform(scrollYProgress, [0, 0.55], ['100vw', '0vw'])
  const contentStyle = reduceMotion ? undefined : { x: contentX }

  return (
    <section
      ref={sectionRef}
      id="projetos"
      className="pointer-events-none relative z-40 h-[200svh] w-full overflow-x-clip text-stone-200 antialiased selection:bg-stone-100 selection:text-black motion-reduce:h-[100svh]"
      style={reduceMotion ? undefined : { marginTop: 'calc(-100svh)' }}
    >

      <div className="pointer-events-none sticky top-0 h-[100svh] w-full">

        <motion.div
          style={contentStyle}
          className="pointer-events-auto h-full w-full bg-black"
        >
          <CurvedLensCarousel
            slides={PROJETOS}
            label={DATA.label}
            hint={DATA.hint}
            bend={0.6}
            background="#000000"
            ink="#f3ede4"
            height="100svh"
            entrance={scrollYProgress}
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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { EASE } from '../components/ui/easing'
import { WrittenText } from '../components/ui/written-text'
import { StoryImage } from '../components/ui/story-image'
import { ImageDialog, type StoryImageInfo } from '../components/ui/image-dialog'
import sobreData from '../data/sobre.json'

interface StoryBlock {
  body: string
  image: string
  alt: string
  side: 'left' | 'right'
  info: Omit<StoryImageInfo, 'src' | 'alt'>
}

interface SobreData {
  headline: string[]
  story: StoryBlock[]
  card: { eyebrow: string; name: string; location: string[] }
  social: { label: string; url: string }[]
}

const DATA = sobreData as unknown as SobreData

const HEADLINE = DATA.headline
const STORY = DATA.story
const CARD = DATA.card
const SOCIAL = DATA.social

const LINE_PATH =
  'M876.605 394.131C788.982 335.917 696.198 358.139 691.836 416.303C685.453 501.424 853.722 498.43 941.95 409.714C1016.1 335.156 1008.64 186.907 906.167 142.846C807.014 100.212 712.699 198.494 789.049 245.127C889.053 306.207 986.062 116.979 840.548 43.3233C743.932 -5.58141 678.027 57.1682 672.279 112.188C666.53 167.208 712.538 172.943 736.353 163.088C760.167 153.234 764.14 120.924 746.651 93.3868C717.461 47.4252 638.894 77.8642 601.018 116.979C568.164 150.908 557 201.079 576.467 246.924C593.342 286.664 630.24 310.55 671.68 302.614C756.114 286.446 729.747 206.546 681.86 186.442C630.54 164.898 492 209.318 495.026 287.644C496.837 334.494 518.402 366.466 582.455 367.287C680.013 368.538 771.538 299.456 898.634 292.434C1007.02 286.446 1192.67 309.384 1242.36 382.258C1266.99 418.39 1273.65 443.108 1247.75 474.477C1217.32 511.33 1149.4 511.259 1096.84 466.093C1044.29 420.928 1029.14 380.576 1033.97 324.172C1038.31 273.428 1069.55 228.986 1117.2 216.384C1152.2 207.128 1188.29 213.629 1194.45 245.127C1201.49 281.062 1132.22 280.104 1100.44 272.673C1065.32 264.464 1044.22 234.837 1032.77 201.413C1019.29 162.061 1029.71 131.126 1056.44 100.965C1086.19 67.4032 1143.96 54.5526 1175.78 86.1513C1207.02 117.17 1186.81 143.379 1156.22 166.691C1112.57 199.959 1052.57 186.238 999.784 155.164C957.312 130.164 899.171 63.7054 931.284 26.3214C952.068 2.12513 996.288 3.87363 1007.22 43.58C1018.15 83.2749 1003.56 122.644 975.969 163.376C948.377 204.107 907.272 255.122 913.558 321.045C919.727 385.734 990.968 497.068 1063.84 503.35C1111.46 507.456 1166.79 511.984 1175.68 464.527C1191.52 379.956 1101.26 334.985 1030.29 377.017C971.109 412.064 956.297 483.647 953.797 561.655C947.587 755.413 1197.56 941.828 936.039 1140.66C745.771 1285.32 321.926 950.737 134.536 1202.19C-6.68295 1391.68 -53.4837 1655.38 131.935 1760.5C478.381 1956.91 1124.19 1515 1201.28 1997.83C1273.66 2451.23 100.805 1864.7 303.794 2668.89'

const HANDOFF_TOP = 0.18

function RichText({ text }: { text: string }) {
  return (
    <p>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className="font-medium text-stone-50">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  )
}

interface SobreProps {
  active?: boolean
}

function LinePath({
  progress,
  className,
}: {
  progress: MotionValue<number>
  className?: string
}) {
  const pathLength = useTransform(progress, [0, 1], [0.5, 1])
  const dashOffset = useTransform(pathLength, (value) => 1 - value)

  return (
    <svg
      viewBox="0 0 1278 2319"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-zoom-dim=""
      className={className}
    >
      <motion.path
        d={LINE_PATH}
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ pathLength, strokeDashoffset: dashOffset }}
      />
    </svg>
  )
}

function StoryItem({
  frameRef,
  index,
  progress,
  reduced,
  className = '',
  children,
}: {
  frameRef: RefObject<HTMLDivElement | null>
  index: number
  progress: MotionValue<number>
  reduced: boolean
  className?: string
  children: ReactNode
}) {
  const itemRef = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0.1 + index * 0.13)

  useEffect(() => {
    const measure = () => {
      const frame = frameRef.current
      const item = itemRef.current
      if (!frame || !item) return
      const host = frame.getBoundingClientRect()
      const box = item.getBoundingClientRect()
      if (host.height <= 0) return
      const fraction = (box.top + box.height / 2 - host.top) / host.height
      setAt(Math.max(0, Math.min(1, 0.08 + 0.86 * fraction)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (frameRef.current) observer.observe(frameRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [frameRef])

  const start = Math.max(0, at - 0.11)
  const end = Math.min(1, at + 0.03)
  const y = useTransform(progress, [start, end], [44, 0])

  if (reduced) {
    return (
      <div
        ref={itemRef}
        className={`relative max-w-[52ch] font-sans text-lg leading-[1.75] text-stone-300 md:text-[1.2rem] ${className}`}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={itemRef}
      data-zoom-dim=""
      style={{ y }}
      className={`relative max-w-[52ch] font-sans text-lg leading-[1.75] text-stone-300 will-change-transform md:text-[1.2rem] ${className}`}
    >
      <WrittenText progress={progress} from={start} to={end} hostRef={itemRef}>
        {children}
      </WrittenText>
    </motion.div>
  )
}

export function Sobre({ active = false }: SobreProps) {
  const [fallback, setFallback] = useState(false)
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [handoff, setHandoff] = useState({ start: 0, span: 900 })
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [hovered, setHovered] = useState<{
    index: number
    stage: number
  } | null>(null)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  const handleOpenImage = useCallback((index: number) => {
    setLightbox(index)
  }, [])

  const handleHoverImage = useCallback(
    (
      state: {
        index: number
        stage: number
        origin: { x: number; y: number } | null
      } | null,
    ) => {
      if (!state) {
        setHovered(null)
        return
      }
      setHovered({ index: state.index, stage: state.stage })
      if (state.origin) setZoomOrigin(state.origin)
    },
    [],
  )

  const closeLightbox = useCallback(() => {
    setLightbox(null)
  }, [])

  const lightboxItem: StoryImageInfo | null = useMemo(
    () =>
      lightbox === null
        ? null
        : {
            src: STORY[lightbox].image,
            alt: STORY[lightbox].alt,
            ...STORY[lightbox].info,
          },
    [lightbox],
  )

  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start 85%', 'end 40%'],
  })

  const drawn = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
    restDelta: 0.0005,
  })

  const lineProgress = useTransform(scrollYProgress, [0, 0.72], [0, 1])
  const lineDrawn = useSpring(lineProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.35,
    restDelta: 0.0005,
  })

  const { scrollY } = useScroll()
  const exitX = useTransform(
    scrollY,
    [handoff.start, handoff.start + handoff.span],
    ['0vw', '-100vw'],
  )

  useEffect(() => {
    let synced = false
    const measure = () => {
      const stage = stageRef.current
      const section = sectionRef.current
      if (!stage || !section) return
      const vh = window.innerHeight
      const stageTop = stage.getBoundingClientRect().top + window.scrollY
      const stickyTop = stickyRef.current
        ? parseFloat(getComputedStyle(stickyRef.current).top) || vh * HANDOFF_TOP
        : vh * HANDOFF_TOP
      const start = stageTop - stickyTop
      setHandoff({ start, span: vh })

      const overlap =
        section.getBoundingClientRect().top +
        window.scrollY +
        section.offsetHeight -
        start
      document.documentElement.style.setProperty(
        '--handoff-overlap',
        `${Math.round(overlap)}px`,
      )
      if (!synced) {
        synced = true
        window.dispatchEvent(new Event('resize'))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (frameRef.current) observer.observe(frameRef.current)
    window.addEventListener('resize', measure)
    const timer = window.setTimeout(measure, 900)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (active || fallback) return
    const timer = window.setTimeout(() => {
      const hero = document.querySelector('.hero-glyph')
      if (hero?.getAttribute('data-gp-motion') !== 'on') setFallback(true)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [active, fallback])

  const shown = active || fallback

  return (
    <section
      ref={sectionRef}
      id="sobre"
      className="relative z-10 w-full overflow-clip bg-black px-6 pt-24 pb-8 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:pt-28 md:pb-10 lg:px-12"
    >
      <motion.div
        style={reduced ? undefined : { x: exitX }}
        className="mx-auto max-w-[1400px]"
      >

        <div
          ref={zoomRef}
          data-zoom-on={hovered?.stage === 2 ? 'true' : undefined}
          className="sobre-zoom"
          style={
            reduced
              ? undefined
              : {
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  transform: `scale(${
                    hovered ? (hovered.stage >= 2 ? 1.045 : 1.022) : 1
                  })`,
                }
          }
        >
        <div ref={frameRef} className="relative">

          <LinePath
            progress={lineDrawn}
            className="pointer-events-none absolute top-0 left-1/2 z-0 h-full w-[170%] -translate-x-1/2 opacity-35 md:left-0 md:w-full md:translate-x-0 md:opacity-100"
          />

          <h2
            data-zoom-dim=""
            className="relative z-10 flex max-w-[1200px] flex-col font-serif text-[3.5rem] leading-[1.02] tracking-tight text-stone-50 md:text-[5.5rem] lg:text-[7.5rem]"
          >
            {HEADLINE.map((line, index) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  initial={{ y: '112%' }}
                  animate={shown ? { y: '0%' } : { y: '112%' }}
                  transition={{ duration: 1.15, ease: EASE, delay: index * 0.07 }}
                  className="block will-change-transform"
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>

          <div className="relative z-10 mt-16 flex flex-col gap-12 md:mt-24 md:gap-20">
            {STORY.map((block, index) => (
              <div key={index} className="relative">
                <StoryItem
                  frameRef={frameRef}
                  index={index}
                  progress={drawn}
                  reduced={reduced}
                  className={
                    block.side === 'right'
                      ? 'md:w-[56%] md:ml-auto'
                      : 'md:w-[56%]'
                  }
                >
                  {block.body && <RichText text={block.body} />}
                </StoryItem>


                <StoryImage
                  src={block.image}
                  alt={block.alt}
                  title={block.info.title}
                  index={index}
                  side={block.side}
                  reduced={reduced}
                  dimmed={hovered !== null && hovered.index !== index}
                  zoomRef={zoomRef}
                  onOpen={handleOpenImage}
                  onHover={handleHoverImage}
                />
              </div>
            ))}
          </div>


          <div ref={stageRef} className="relative mt-24 md:mt-32">
            <div
              ref={stickyRef}
              className={reduced ? '' : 'sticky top-[18svh] z-10'}
            >
              <motion.div
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 1.15, ease: EASE }}
                className="relative overflow-hidden rounded-[26px] bg-[#f4f1ea] px-6 py-10 text-neutral-900 md:rounded-[34px] md:px-12 md:py-14"
              >
            <p className="text-[10px] font-medium tracking-[0.28em] text-neutral-500 uppercase md:text-[11px]">
              {CARD.eyebrow}
            </p>

            <h3 className="mt-6 text-center font-serif text-[clamp(2.6rem,10.5vw,9rem)] leading-[0.88] tracking-[-0.045em] md:mt-10">
              {CARD.name}
            </h3>

            <div className="mt-10 flex flex-col gap-8 border-t border-neutral-900/15 pt-7 md:mt-16 md:flex-row md:items-end md:justify-between">
              <p className="text-[11px] leading-relaxed tracking-[0.14em] text-neutral-600 uppercase md:text-xs">
                {CARD.location.map((line, index) => (
                  <span key={index}>
                    {index > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-medium tracking-[0.14em] uppercase md:text-xs">
                {SOCIAL.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 border-b border-neutral-900/25 pb-1 transition-colors hover:border-neutral-900"
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
              </motion.div>
            </div>
            {reduced ? null : (
              <div aria-hidden="true" className="h-[100svh]" />
            )}
          </div>
        </div>
        </div>
      </motion.div>

      <ImageDialog
        item={lightboxItem}
        onClose={closeLightbox}
        reduced={reduced}
      />
    </section>
  )
}

export default Sobre

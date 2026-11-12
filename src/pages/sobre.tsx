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

/** Manchete do Sobre — linhas mascaradas, sobem uma a uma. */
const HEADLINE = ['Sobre', 'mim.']

/**
 * Trajetória em ordem cronológica. Cada item é um parágrafo; os destaques
 * (datas, empresas, faculdade) ficam em <strong>.
 */
interface StoryBlock {
  body: ReactNode
  image: string
  alt: string
  /** Para que lado o texto vai; a imagem ocupa o lado oposto. */
  side: 'left' | 'right'
  /** Conteúdo do modal da imagem. */
  info: Omit<StoryImageInfo, 'src' | 'alt'>
}

const STORY: StoryBlock[] = [
  {
    side: 'left',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop',
    alt: 'Código aberto em um editor, primeiros experimentos com programação',
    info: {
      meta: 'O começo',
      title: 'O primeiro contato',
      body: 'Antes de ser profissão, programar era curiosidade: abrir um editor, mexer em códigos soltos e descobrir o que dava para construir com eles. Foi ali que a brincadeira virou interesse.',
      tags: ['Início', 'Curiosidade', 'Experimentação'],
    },
    body: (
      <p>
        Minha relação com a programação começou antes mesmo de eu imaginar que
        ela se tornaria minha profissão. O que inicialmente era apenas uma
        brincadeira, explorando códigos e descobrindo o que era possível
        construir com eles, acabou despertando uma paixão que me acompanharia
        nos anos seguintes.
      </p>
    ),
  },
  {
    side: 'right',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop',
    alt: 'Estudante desenvolvendo aplicações web em um notebook',
    info: {
      meta: 'Formação técnica',
      title: 'SENAI',
      body: 'Três anos de formação técnica em desenvolvimento de aplicações web. Foi onde a experimentação ganhou método e a tecnologia passou a ser vista como meio de criar soluções reais.',
      tags: ['SENAI', 'Desenvolvimento web', 'Base técnica'],
    },
    body: (
      <p>
        Essa curiosidade ganhou direção quando ingressei no{' '}
        <strong className="font-medium text-stone-50">SENAI</strong>, onde tive
        meu primeiro contato aprofundado com o desenvolvimento de aplicações
        web. Foram três anos de formação técnica, nos quais transformei
        experimentação em conhecimento e comecei a enxergar a tecnologia não
        apenas como uma ferramenta, mas como um meio de criar soluções e
        transformar ideias em realidade. Ainda no segundo ano do ensino médio,
        comecei minha trajetória como freelancer, conciliando os estudos com
        projetos e experiências profissionais.
      </p>
    ),
  },
  {
    side: 'left',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop',
    alt: 'Tela com código de um sistema corporativo',
    info: {
      meta: '2026 · ACESSO.NET',
      title: 'Sistemas corporativos',
      body: 'Desenvolvimento de sistemas corporativos, arquitetura de software e integração de plataformas — o dia a dia de quem transforma regra de negócio em produto funcionando.',
      tags: ['ACESSO.NET', 'Arquitetura', 'Integrações'],
    },
    body: (
      <p>
        Em fevereiro de 2026, concluí minha formação técnica e, em{' '}
        <strong className="font-medium text-stone-50">2 de março de 2026</strong>,
        iniciei uma nova etapa como Desenvolvedor de Sistemas na{' '}
        <strong className="font-medium text-stone-50">ACESSO.NET</strong>,
        atuando no desenvolvimento de sistemas corporativos, arquitetura de
        software e integração de plataformas.
      </p>
    ),
  },
  {
    side: 'right',
    image:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
    alt: 'Equipe trabalhando em uma startup',
    info: {
      meta: 'Produto próprio',
      title: 'VIVAJU e LPG',
      body: 'Da ideia à estruturação: participação na concepção e no desenvolvimento de startups, levando a experiência de produto para além do ambiente corporativo.',
      tags: ['Startups', 'Produto', 'Empreendedorismo'],
    },
    body: (
      <p>
        Paralelamente à minha trajetória profissional, comecei a transformar
        ideias próprias em iniciativas empresariais, participando da concepção,
        estruturação e desenvolvimento de startups como a{' '}
        <strong className="font-medium text-stone-50">VIVAJU</strong> e a{' '}
        <strong className="font-medium text-stone-50">
          LPG (Link Petróleo e Gás)
        </strong>
        . Também mantenho minha atuação em projetos independentes de
        desenvolvimento, levando essa experiência para além do ambiente
        corporativo.
      </p>
    ),
  },
  {
    side: 'left',
    image:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop',
    alt: 'Rede global de sistemas distribuídos',
    info: {
      meta: 'UNIT · em andamento',
      title: 'Ciência da Computação',
      body: 'Arquitetura de soluções, sistemas distribuídos e aplicações modulares: a base teórica que sustenta o que já faço na prática.',
      tags: ['UNIT', 'Sistemas distribuídos', 'Arquitetura'],
    },
    body: (
      <p>
        Atualmente, curso{' '}
        <strong className="font-medium text-stone-50">
          Ciência da Computação na Universidade Tiradentes (UNIT)
        </strong>{' '}
        e direciono meus estudos e minha atuação para arquitetura de soluções,
        sistemas distribuídos, aplicações modulares e desenvolvimento de
        produtos digitais.
      </p>
    ),
  },
  {
    side: 'right',
    image:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1600&auto=format&fit=crop',
    alt: 'Mesa de trabalho com anotações e ideias',
    info: {
      meta: 'O que continua',
      title: 'A mesma motivação',
      body: 'Descobrir, construir e transformar ideias em algo real. É o que sobrou intacto desde a época em que programar era só uma brincadeira.',
      tags: ['Propósito', 'Construção'],
    },
    body: (
      <p>
        Minha motivação continua sendo a mesma daquela época em que programar
        era apenas uma brincadeira: a vontade de descobrir, construir e
        transformar ideias em algo real.
      </p>
    ),
  },
]

// Traço do modelo (skiper19): o mesmo path orgânico, desenhado conforme o
// scroll. O `pathLength` começa em 0.5 e vai a 1, como no original.
const LINE_PATH =
  'M876.605 394.131C788.982 335.917 696.198 358.139 691.836 416.303C685.453 501.424 853.722 498.43 941.95 409.714C1016.1 335.156 1008.64 186.907 906.167 142.846C807.014 100.212 712.699 198.494 789.049 245.127C889.053 306.207 986.062 116.979 840.548 43.3233C743.932 -5.58141 678.027 57.1682 672.279 112.188C666.53 167.208 712.538 172.943 736.353 163.088C760.167 153.234 764.14 120.924 746.651 93.3868C717.461 47.4252 638.894 77.8642 601.018 116.979C568.164 150.908 557 201.079 576.467 246.924C593.342 286.664 630.24 310.55 671.68 302.614C756.114 286.446 729.747 206.546 681.86 186.442C630.54 164.898 492 209.318 495.026 287.644C496.837 334.494 518.402 366.466 582.455 367.287C680.013 368.538 771.538 299.456 898.634 292.434C1007.02 286.446 1192.67 309.384 1242.36 382.258C1266.99 418.39 1273.65 443.108 1247.75 474.477C1217.32 511.33 1149.4 511.259 1096.84 466.093C1044.29 420.928 1029.14 380.576 1033.97 324.172C1038.31 273.428 1069.55 228.986 1117.2 216.384C1152.2 207.128 1188.29 213.629 1194.45 245.127C1201.49 281.062 1132.22 280.104 1100.44 272.673C1065.32 264.464 1044.22 234.837 1032.77 201.413C1019.29 162.061 1029.71 131.126 1056.44 100.965C1086.19 67.4032 1143.96 54.5526 1175.78 86.1513C1207.02 117.17 1186.81 143.379 1156.22 166.691C1112.57 199.959 1052.57 186.238 999.784 155.164C957.312 130.164 899.171 63.7054 931.284 26.3214C952.068 2.12513 996.288 3.87363 1007.22 43.58C1018.15 83.2749 1003.56 122.644 975.969 163.376C948.377 204.107 907.272 255.122 913.558 321.045C919.727 385.734 990.968 497.068 1063.84 503.35C1111.46 507.456 1166.79 511.984 1175.68 464.527C1191.52 379.956 1101.26 334.985 1030.29 377.017C971.109 412.064 956.297 483.647 953.797 561.655C947.587 755.413 1197.56 941.828 936.039 1140.66C745.771 1285.32 321.926 950.737 134.536 1202.19C-6.68295 1391.68 -53.4837 1655.38 131.935 1760.5C478.381 1956.91 1124.19 1515 1201.28 1997.83C1273.66 2451.23 100.805 1864.7 303.794 2668.89'

const LINKEDIN = 'https://www.linkedin.com/in/alec-vinicius/'
const INSTAGRAM = 'https://www.instagram.com/alecvinicius/'

/** Distância do topo em que o cartão final fica preso no handoff. */
const HANDOFF_TOP = 0.18

interface SobreProps {
  /** Vira true quando o zoom da hero termina e o Sobre começa a aparecer. */
  active?: boolean
}

/** Traço que segue o scroll — cópia fiel do `LinePath` do modelo. */
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

/**
 * Parágrafo que aparece quando o traço chega nele.
 * A posição relativa do bloco dentro do `frame` vira o ponto do scroll em que
 * o texto deve entrar — assim a revelação acompanha a linha, não a viewport.
 */
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
      // Converte a fração vertical no progresso do scroll da seção.
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

  // A "escrita" acompanha o traço chegando no parágrafo. A janela é curta para
  // o texto terminar de aparecer enquanto o bloco ainda está entrando na tela.
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

  // Identidade estável: sem isso, cada render do Sobre cria um `item` novo e
  // o efeito do modal (foco/overflow) reinicia no meio da abertura.
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

  // O traço atravessa manchete, texto e cartão durante o scroll da seção.
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start 85%', 'end 40%'],
  })

  // Textos: ritmo original (a janela de cada parágrafo já é calculada em cima
  // deste valor).
  const drawn = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
    restDelta: 0.0005,
  })

  // Linha: chega ao fim em ~72% do trecho, então ela puxa o scroll em vez de
  // terminar junto com a seção. A resposta do spring também é mais rápida.
  const lineProgress = useTransform(scrollYProgress, [0, 0.72], [0, 1])
  const lineDrawn = useSpring(lineProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.35,
    restDelta: 0.0005,
  })

  // Handoff: o cartão final fica preso enquanto Sobre desliza para a esquerda
  // e Tecnologias entra pela direita — como se fosse um único trilho.
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

      // Quanto a seção de Tecnologias precisa subir para começar exatamente
      // quando o cartão é preso.
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
        // Faz o useScroll de Tecnologias medir a nova posição da seção.
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

  // Quem usa "reduzir movimento" mantém o portal estático (sem progresso).
  // Nesse caso liberamos o conteúdo para não ficar preso no estado inicial.
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
        {/* Wrapper do zoom de tela: tudo aqui dentro cresce junto, como o zoom
            do navegador, em torno do centro da imagem em foco. */}
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
          {/* O traço fica atrás do texto e é desenhado pelo scroll. */}
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
                  {block.body}
                </StoryItem>

                {/* A imagem preenche o lado vazio sem alterar a altura da seção. */}
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

          {/* Cartão final — preso no fim da seção para o handoff lateral. */}
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
              Desenvolvedor de Sistemas
            </p>

            <h3 className="mt-6 text-center font-serif text-[clamp(2.6rem,10.5vw,9rem)] leading-[0.88] tracking-[-0.045em] md:mt-10">
              Alec Vinícius
            </h3>

            <div className="mt-10 flex flex-col gap-8 border-t border-neutral-900/15 pt-7 md:mt-16 md:flex-row md:items-end md:justify-between">
              <p className="text-[11px] leading-relaxed tracking-[0.14em] text-neutral-600 uppercase md:text-xs">
                Brasil · remoto
                <br />
                sistemas corporativos &amp; produtos digitais
              </p>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-medium tracking-[0.14em] uppercase md:text-xs">
                <a
                  href={LINKEDIN}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 border-b border-neutral-900/25 pb-1 transition-colors hover:border-neutral-900"
                >
                  LinkedIn
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                </a>
                <a
                  href={INSTAGRAM}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 border-b border-neutral-900/25 pb-1 transition-colors hover:border-neutral-900"
                >
                  Instagram
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                </a>
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

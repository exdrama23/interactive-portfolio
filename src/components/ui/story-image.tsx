import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { EASE } from './easing'
import { ParallaxImage } from './animations'

export interface StoryImageProps {
  src: string
  alt: string
  title: string
  index: number
  side: 'left' | 'right'
  reduced: boolean
  /** Quando outra imagem está em foco, esta entra no desfoque de fundo. */
  dimmed: boolean
  onOpen: (index: number) => void
  onHover: (
    state: {
      index: number
      stage: number
      origin: { x: number; y: number } | null
    } | null,
  ) => void
  /** Wrapper que recebe o zoom de tela (para calcular a origem). */
  zoomRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Imagem do Sobre. O crescimento vem do zoom da seção (o wrapper inteiro
 * escala), não de um `scale` próprio — assim o efeito é o de um zoom de
 * navegador centrado na imagem.
 *
 *  0 — parada;
 *  1 — zoom discreto na seção;
 *  2 — mais zoom, fundo desfocado e "clique em mim".
 */
export function StoryImage({
  src,
  alt,
  title,
  index,
  side,
  reduced,
  dimmed,
  onOpen,
  onHover,
  zoomRef,
}: StoryImageProps) {
  const [stage, setStage] = useState(0)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  useEffect(() => {
    const list = timers
    return () => {
      list.current.forEach((timer) => window.clearTimeout(timer))
      list.current = []
    }
  }, [])

  // Centro da imagem em % do wrapper — é o ponto que fica parado no zoom.
  const measureOrigin = () => {
    const host = zoomRef.current?.getBoundingClientRect()
    const box = buttonRef.current?.getBoundingClientRect()
    if (!host || !box || !host.width || !host.height) return null
    return {
      x: ((box.left + box.width / 2 - host.left) / host.width) * 100,
      y: ((box.top + box.height / 2 - host.top) / host.height) * 100,
    }
  }

  useEffect(() => {
    onHover(stage === 0 ? null : { index, stage, origin })
  }, [stage, index, origin, onHover])

  useEffect(() => () => onHover(null), [onHover])

  const enter = () => {
    clearTimers()
    // Em `prefers-reduced-motion` o hover não faz zoom nem desfoque; o clique
    // continua abrindo o modal.
    if (reduced) return
    setOrigin(measureOrigin())
    timers.current.push(window.setTimeout(() => setStage(1), 80))
    timers.current.push(window.setTimeout(() => setStage(2), 1150))
  }

  const leave = () => {
    clearTimers()
    setStage(0)
  }

  // Se o scroll tirar a imagem de baixo do cursor, ou o mouse sair da janela,
  // nenhum `mouseleave` dispara — o efeito ficaria "turvo do nada". Aqui o
  // estado é reconciliado com a posição real do ponteiro.
  useEffect(() => {
    if (stage === 0) return
    const check = () => {
      if (buttonRef.current?.matches(':hover')) return
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
      setStage(0)
    }
    const onOut = (event: MouseEvent) => {
      if (!event.relatedTarget) check()
    }
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('mouseout', onOut)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('mouseout', onOut)
    }
  }, [stage])

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, ease: EASE }}
      onClick={() => {
        leave()
        onOpen(index)
      }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      aria-label={`Ampliar imagem: ${title}`}
      {...(dimmed ? { 'data-zoom-dim': '' } : {})}
      className={`group absolute top-1/2 z-20 hidden h-[240px] max-h-full w-[34%] -translate-y-1/2 text-left md:block ${
        side === 'right' ? 'left-0' : 'right-0'
      }`}
    >
      <div
        className={`relative h-full w-full transition-shadow duration-500 ${
          stage === 2
            ? 'shadow-[0_28px_70px_-18px_rgba(0,0,0,0.95)]'
            : ''
        }`}
      >
        <ParallaxImage
          src={src}
          alt={alt}
          distance={22}
          className="h-full w-full rounded-[16px] border border-white/10"
          imgClassName={`transition-[filter,opacity] duration-700 ${
            stage > 0 ? 'opacity-100 grayscale-[35%]' : 'opacity-75 grayscale'
          }`}
        />

        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-[16px] ring-1 transition-all duration-500 ${
            stage === 2 ? 'ring-white/30' : 'ring-white/10'
          }`}
        />

        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent pt-10 pb-4 transition-all duration-500 ${
            stage === 2
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          <span className="rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[10px] font-medium tracking-[0.26em] text-stone-100 uppercase">
            clique em mim
          </span>
        </span>
      </div>
    </motion.button>
  )
}

export default StoryImage

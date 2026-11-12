import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { EASE } from './easing'

export interface StoryImageInfo {
  src: string
  alt: string
  title: string
  body: string
  tags: string[]
  /** Linha curta de contexto (ano, lugar, projeto). */
  meta?: string
}

/** Pede a versão maior da mesma foto para o modal não perder qualidade. */
function hiRes(src: string) {
  return src.replace(/([?&])w=\d+/, '$1w=2400')
}

/**
 * Descrição "digitada" depois que a foto para: cada caractere entra com um
 * atraso proporcional à posição, então textos longos não ficam eternos.
 */
function TypedBody({ text, animate }: { text: string; animate: boolean }) {
  if (!animate) return <>{text}</>

  const chars = Array.from(text)
  return (
    <>
      {chars.map((char, index) => (
        <span
          key={index}
          className="story-char"
          style={{
            animationDelay: `${Math.round(
              130 + (index / Math.max(1, chars.length)) * 600,
            )}ms`,
          }}
        >
          {char}
        </span>
      ))}
    </>
  )
}

/**
 * Modal da imagem.
 *
 * A foto aparece sozinha e centralizada; em seguida é jogada para a esquerda,
 * como no `bento-gallery` do Landingpage. Quando ela termina de deslizar é que
 * o texto entra, com animação própria (título sobe, descrição é "digitada").
 *
 * O painel é `w-fit`: a foto fica no tamanho natural (inteira, sem corte) e a
 * coluna de texto tem a largura do próprio conteúdo.
 *
 * Vai por portal para o `body` porque o header (`z-50`) e a sidebar (`z-40/50`)
 * vivem em contextos de empilhamento acima da seção.
 */
export function ImageDialog({
  item,
  onClose,
  reduced,
}: {
  item: StoryImageInfo | null
  onClose: () => void
  reduced: boolean
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Dimensões naturais da foto que o card já tem em cache. Com elas o painel
  // nasce no tamanho final, então a animação pode começar no primeiro frame
  // (sem esperar o decode mudar a largura no meio da entrada).
  const [natural, setNatural] = useState<{
    for: string
    w: number
    h: number
  } | null>(null)

  useEffect(() => {
    if (!item) return
    const probe = new Image()
    const commit = () =>
      setNatural({
        for: item.src,
        w: probe.naturalWidth,
        h: probe.naturalHeight,
      })
    probe.src = item.src
    if (probe.complete && probe.naturalWidth > 0) {
      commit()
      return
    }
    probe.onload = commit
  }, [item])

  // A versão grande é trocada em segundo plano, quando estiver pronta.
  const [hiResReady, setHiResReady] = useState<{ for: string; url: string } | null>(
    null,
  )

  useEffect(() => {
    if (!item) return
    const full = hiRes(item.src)
    if (full === item.src) return

    let cancelled = false
    const preload = new Image()
    preload.onload = () => {
      if (!cancelled) setHiResReady({ for: item.src, url: full })
    }
    preload.src = full

    return () => {
      cancelled = true
    }
  }, [item])

  const src =
    item && hiResReady?.for === item.src ? hiResReady.url : (item?.src ?? '')
  const dims = item && natural?.for === item.src ? natural : null

  // O texto só entra quando a animação da foto termina de verdade, não por
  // um delay fixo que poderia ser ultrapassado se a imagem demorasse.
  const [textIn, setTextIn] = useState(false)
  useEffect(() => {
    setTextIn(false)
  }, [item])

  // Quanto a foto precisa se deslocar para nascer centralizada: metade da
  // coluna de texto. Escrito direto no nó (sem estado) para um novo render não
  // reiniciar a animação de entrada.
  useLayoutEffect(() => {
    if (!item || !dims) return
    const measure = () => {
      const info = infoRef.current
      const panel = panelRef.current
      if (!info || !panel) return
      const wide = window.matchMedia('(min-width: 768px)').matches
      panel.style.setProperty(
        '--shift',
        wide ? `${Math.round(info.offsetWidth / 2)}px` : '0px',
      )
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [item, dims])

  useEffect(() => {
    if (!item) return
    const previous = document.body.style.overflow
    const trigger = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
      trigger?.focus?.()
    }
  }, [item, onClose])

  // O painel só existe depois que as dimensões da foto chegam.
  useEffect(() => {
    if (item && dims) closeRef.current?.focus()
  }, [item, dims])

  if (typeof document === 'undefined') return null

  const animate = !reduced
  const showText = animate && textIn

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <button
            type="button"
            aria-label="Fechar imagem"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-image-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative"
          >
            {dims && (
            <div
              ref={panelRef}
              className="relative flex max-h-[92svh] w-fit max-w-[96vw] flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black md:flex-row md:rounded-[22px]"
            >
              {/* Foto: tamanho natural, inteira e rente às bordas do painel.
                  É ela que viaja do centro para a esquerda; o painel fica
                  parado. */}
              <div
                className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-black ${
                  animate ? 'story-dialog-photo' : ''
                }`}
                onAnimationEnd={(event) => {
                  if (event.animationName === 'story-dialog-photo') {
                    setTextIn(true)
                  }
                }}
              >
                <img
                  src={src}
                  alt={item.alt}
                  width={dims.w}
                  height={dims.h}
                  className="block h-[34svh] w-full object-contain md:h-auto md:max-h-[88svh] md:w-auto md:max-w-[58vw]"
                />
              </div>

              {/* Texto: largura própria, sem esticar junto com a foto. */}
              <div
                ref={infoRef}
                className="flex min-h-0 w-full flex-col md:w-[420px] md:max-w-[36vw] md:shrink-0"
                style={{ opacity: animate && !textIn ? 0 : 1 }}
              >
                <div className="flex h-full flex-col gap-7 overflow-y-auto p-6 pr-16 md:p-9 md:pr-16">
                  <div>
                    {item.meta && (
                      <p
                        className={`text-[10px] font-medium tracking-[0.24em] text-stone-500 uppercase ${
                          showText ? 'story-dialog-meta' : ''
                        }`}
                      >
                        {item.meta}
                      </p>
                    )}
                    <h3
                      id="story-image-title"
                      className={`mt-3 font-serif text-3xl leading-tight text-stone-50 md:text-4xl ${
                        showText ? 'story-dialog-title' : ''
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <p className="max-w-prose text-[15px] leading-relaxed text-stone-400 md:text-base">
                    <TypedBody text={item.body} animate={showText} />
                  </p>

                  <div
                    className={`mt-auto ${
                      showText ? 'story-dialog-tags' : ''
                    }`}
                  >
                    <ul className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full border border-white/12 px-3 py-1 text-[11px] tracking-[0.08em] text-stone-300"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 border-t border-white/10 pt-4 text-[11px] tracking-[0.14em] text-stone-500 uppercase">
                      Esc para fechar
                    </p>
                  </div>
                </div>
              </div>

              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="absolute top-3 right-3 z-10 rounded-sm border border-white/20 bg-black/60 p-2 text-stone-200 backdrop-blur transition-colors hover:border-white/50 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default ImageDialog


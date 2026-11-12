import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { EASE } from './easing'
import { TECH_CATEGORIES, type TechItem } from './tech-data'

export type { TechCategory, TechItem } from './tech-data'

const GRID_CELLS = 25
const HUB_INDEX = Math.floor(GRID_CELLS / 2)

function BrandIcon({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="font-serif text-base leading-none text-stone-200 sm:text-lg"
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}/white`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-7 w-7 object-contain opacity-80 transition duration-500 group-hover:opacity-100 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] sm:h-9 sm:w-9"
    />
  )
}

function TechIcon({ item }: { item: TechItem }) {
  if (item.slug) return <BrandIcon slug={item.slug} name={item.name} />

  const Icon = item.icon
  if (!Icon) {
    return (
      <span
        aria-hidden="true"
        className="font-serif text-base leading-none text-stone-200 sm:text-lg"
      >
        {item.name.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.25}
      className="h-7 w-7 text-stone-200 opacity-80 transition duration-500 group-hover:text-white group-hover:opacity-100 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] sm:h-9 sm:w-9"
    />
  )
}

interface TechRelayProps {
  items: TechItem[]
  extras: TechItem[]
  className?: string
}

/**
 * Grade "relay" em 3D: a prancha inteira inclina em perspectiva, cada
 * quadrado é um slab com profundidade própria e sobe em direção à câmera
 * no hover. O hub central abre a lista das tecnologias sem logo.
 */
export function TechRelay({ items, extras, className = '' }: TechRelayProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const hubRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const groups = useMemo(
    () =>
      TECH_CATEGORIES.map((category) => ({
        category,
        techs: extras.filter((tech) => tech.category === category),
      })).filter((group) => group.techs.length > 0),
    [extras],
  )

  const close = useCallback(() => {
    setOpen(false)
    hubRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const slots: Array<TechItem | null> = [
    ...items.slice(0, HUB_INDEX),
    null,
    ...items.slice(HUB_INDEX),
  ]

  return (
    <div className={`relative ${className}`}>
      <div className="group/grid relative mx-auto w-full max-w-[620px] [perspective:1500px]">
        {/* piso / halo atrás da prancha */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(255,255,255,0.09),transparent_72%)] blur-2xl"
        />

        <div className="relative [transform:rotateX(9deg)] [transform-style:preserve-3d] transition-transform duration-700 ease-out group-hover/grid:[transform:rotateX(5deg)] md:[transform:rotateX(14deg)] md:group-hover/grid:[transform:rotateX(8deg)]">
          {/* hairlines + halo do hub */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [transform:translateZ(-14px)]"
          >
            <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-colors duration-700 group-hover/grid:via-white/25" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent transition-colors duration-700 group-hover/grid:via-white/25" />
            <div className="absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-3xl" />
          </div>

          <ul className="relative grid grid-cols-5 gap-1.5 [transform-style:preserve-3d] sm:gap-3">
            {slots.map((item, index) => {
              const row = Math.floor(index / 5)
              const col = index % 5
              const ring = Math.abs(row - 2) + Math.abs(col - 2)
              const delay = reduceMotion ? 0 : ring * 0.06

              if (!item) {
                return (
                  <li key="hub" className="[transform-style:preserve-3d]">
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.7, ease: EASE, delay }}
                      className="h-full [transform-style:preserve-3d]"
                    >
                      <button
                        ref={hubRef}
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={`Mais ${extras.length} tecnologias sem logo dedicado`}
                        className="group relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-sm border border-white/40 bg-gradient-to-br from-white/[0.16] via-white/[0.06] to-black/50 shadow-[0_10px_0_-2px_rgba(255,255,255,0.14),0_28px_45px_-18px_rgba(0,0,0,0.95)] transition-[transform,border-color,background-color,box-shadow] duration-500 [transform:translateZ(12px)] hover:border-white/80 hover:shadow-[0_16px_0_-2px_rgba(255,255,255,0.2),0_38px_60px_-20px_rgba(0,0,0,0.95)] hover:[transform:translateZ(40px)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:[transform:translateZ(28px)]"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -inset-3 -z-10 rounded-sm bg-white/10 blur-xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-60"
                        />
                        <Plus
                          aria-hidden="true"
                          strokeWidth={1}
                          className="h-6 w-6 text-white transition-transform duration-500 group-hover:rotate-90 sm:h-8 sm:w-8"
                        />
                        <span className="text-[8px] font-medium tracking-[0.22em] text-stone-200 uppercase sm:text-[9px]">
                          mais
                        </span>
                      </button>
                    </motion.div>
                  </li>
                )
              }

              return (
                <li key={item.name} className="[transform-style:preserve-3d]">
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, ease: EASE, delay }}
                    className="h-full [transform-style:preserve-3d]"
                  >
                    <button
                      type="button"
                      aria-label={item.name}
                      title={item.name}
                      className="group relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-sm border border-white/12 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] shadow-[0_8px_0_-2px_rgba(255,255,255,0.08),0_22px_35px_-20px_rgba(0,0,0,0.95)] transition-[transform,border-color,background-color,box-shadow] duration-500 [transform:translateZ(0)] hover:border-white/50 hover:from-white/[0.14] hover:via-white/[0.06] hover:shadow-[0_14px_0_-2px_rgba(255,255,255,0.12),0_32px_45px_-20px_rgba(0,0,0,0.95)] hover:[transform:translateZ(30px)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:[transform:translateZ(20px)]"
                    >
                      <TechIcon item={item} />
                      <span className="hidden text-[8px] leading-tight tracking-wide text-stone-400 uppercase transition-colors duration-500 group-hover:text-stone-100 sm:block sm:text-[9px]">
                        {item.name}
                      </span>
                    </button>
                  </motion.div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button
              type="button"
              aria-label="Fechar lista de tecnologias"
              tabIndex={-1}
              onClick={close}
              className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tech-extras-title"
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/15 bg-[#080808] p-6 shadow-2xl shadow-black sm:p-9"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.22em] text-stone-500 uppercase">
                    Sem logo dedicado
                  </p>
                  <h3
                    id="tech-extras-title"
                    className="mt-3 font-serif text-3xl leading-tight text-stone-50 sm:text-4xl"
                  >
                    Também fazem parte do dia a dia
                  </h3>
                </div>

                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Fechar"
                  className="rounded-sm border border-white/15 p-2 text-stone-300 transition-colors hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>

              <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-400">
                Essas tecnologias não têm um logo oficial, então ficaram fora da
                grade — cada linha mostra onde elas entram na stack.
              </p>

              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.category}>
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                      {group.category}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {group.techs.map((tech) => (
                        <li
                          key={tech.name}
                          className="flex items-center gap-2 text-[15px] text-stone-200"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1 w-1 shrink-0 rounded-full bg-stone-500"
                          />
                          {tech.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="mt-8 border-t border-white/10 pt-5 text-xs text-stone-500">
                {extras.length} tecnologias listadas aqui · {items.length} na grade
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TechRelay

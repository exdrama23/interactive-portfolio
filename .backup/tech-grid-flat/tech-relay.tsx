import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, X, type LucideIcon } from 'lucide-react'
import { EASE } from './easing'

export type TechCategory =
  | 'Front-end & UI'
  | 'Back-end & APIs'
  | 'Banco de Dados & Cache'
  | 'Cloud & DevOps'
  | 'Ferramentas e Plataformas'
  | 'Conceitos & Especialidades'

export interface TechItem {
  name: string
  /** Slug do Simple Icons (logo branco via CDN). */
  slug?: string
  /** Ícone lucide para tecnologias sem logo dedicado. */
  icon?: LucideIcon
  category: TechCategory
}

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
 * Grade de quadrados no estilo "relay": um hub central de onde saem
 * quatro braços, com hairlines que acendem no hover e entrada em cascata
 * a partir do centro. O hub abre a lista das tecnologias sem logo.
 */
export function TechRelay({ items, extras, className = '' }: TechRelayProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const hubRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const groups = useMemo(() => {
    const order: TechCategory[] = [
      'Front-end & UI',
      'Back-end & APIs',
      'Banco de Dados & Cache',
      'Cloud & DevOps',
      'Ferramentas e Plataformas',
      'Conceitos & Especialidades',
    ]

    return order
      .map((category) => ({
        category,
        techs: extras.filter((tech) => tech.category === category),
      }))
      .filter((group) => group.techs.length > 0)
  }, [extras])

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
      <div className="group/grid relative mx-auto w-full max-w-[600px]">
        {/* hairlines + halo do hub */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-colors duration-700 group-hover/grid:via-white/25" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent transition-colors duration-700 group-hover/grid:via-white/25" />
          <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.06] blur-3xl" />
        </div>

        <ul className="relative grid grid-cols-5 gap-1.5 sm:gap-2.5">
          {slots.map((item, index) => {
            const row = Math.floor(index / 5)
            const col = index % 5
            const ring = Math.abs(row - 2) + Math.abs(col - 2)
            const delay = reduceMotion ? 0 : ring * 0.06

            if (!item) {
              return (
                <li key="hub">
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.7, ease: EASE, delay }}
                  >
                    <button
                      ref={hubRef}
                      type="button"
                      onClick={() => setOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={open}
                      aria-label={`Mais ${extras.length} tecnologias sem logo dedicado`}
                      className="group flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-sm border border-white/30 bg-white/[0.05] transition duration-500 hover:-translate-y-1 hover:border-white/70 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                    >
                      <Plus
                        aria-hidden="true"
                        strokeWidth={1}
                        className="h-6 w-6 text-white transition-transform duration-500 group-hover:rotate-90 sm:h-8 sm:w-8"
                      />
                      <span className="text-[8px] font-medium tracking-[0.22em] text-stone-300 uppercase sm:text-[9px]">
                        mais
                      </span>
                    </button>
                  </motion.div>
                </li>
              )
            }

            return (
              <li key={item.name}>
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, ease: EASE, delay }}
                  className="h-full"
                >
                  <button
                    type="button"
                    aria-label={item.name}
                    title={item.name}
                    className="group flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-sm border border-white/10 bg-white/[0.02] transition duration-500 hover:-translate-y-1 hover:border-white/45 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
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

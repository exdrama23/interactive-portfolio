import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import Relay from './relay'
import { EASE } from './easing'
import { RELAY_HUB, RELAY_RISE_PCT, RELAY_TILES, relayChain } from './relay-tiles'
import { TECH_CATEGORIES, type TechItem } from './tech-data'

/**
 * Ritmo da animação da lib: `parameter('relay')` = 120 ms por salto,
 * 700 ms para subir e 1500 ms para descer. Os ícones usam os mesmos
 * atrasos para ficarem colados no topo dos tiles.
 */
const STEP = 120
const UP = 700
const DOWN = 1500
const OUT = STEP * 1.5

interface Lift {
  on: boolean
  delay: number
  dur: number
}

function BoardIcon({ item }: { item: TechItem }) {
  const [failed, setFailed] = useState(false)

  if (failed || !item.slug) {
    return (
      <span
        aria-hidden="true"
        className="font-serif text-[0.6rem] leading-none text-neutral-900"
      >
        {item.name.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${item.slug}/0a0a0a`}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  )
}

interface TechRelayBoardProps {
  /** Tecnologias com logo que ocupam os 14 tiles. */
  items: readonly TechItem[]
  /** Tecnologias que ficam fora da grade, listadas no hub. */
  rest: readonly TechItem[]
}

export function TechRelayBoard({ items, rest }: TechRelayBoardProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [lifts, setLifts] = useState<Record<number, Lift>>({})
  const hubRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  /* A lib publica a folha acesa em `onRead`; reproduzimos o atraso dos saltos. */
  const handleRead = useCallback((text: string) => {
    setLifts((previous) => {
      const want = new Set(relayChain(text))
      const current = new Set<number>()
      for (const [key, value] of Object.entries(previous)) {
        if (value.on) current.add(Number(key))
      }

      const off = [...current].filter((index) => !want.has(index))
      const top = off.length
        ? Math.max(...off.map((index) => RELAY_TILES[index].dep))
        : 0
      const wait = off.length
        ? (off.length - 1) * OUT * 0.65 + STEP * 0.5
        : 0

      const next: Record<number, Lift> = { ...previous }

      for (const index of want) {
        if (current.has(index)) {
          next[index] = { ...next[index], delay: 0, dur: UP }
        } else {
          next[index] = {
            on: true,
            delay: Math.round(wait + RELAY_TILES[index].dep * STEP),
            dur: UP,
          }
        }
      }

      for (const index of off) {
        next[index] = {
          on: false,
          delay: Math.round((top - RELAY_TILES[index].dep) * OUT),
          dur: DOWN,
        }
      }

      return next
    })
  }, [])

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

  const groups = useMemo(
    () =>
      TECH_CATEGORIES.map((category) => ({
        category,
        techs: rest.filter((tech) => tech.category === category),
      })).filter((group) => group.techs.length > 0),
    [rest],
  )

  return (
    <div className="relative">
      <div className="relative mx-auto w-full max-w-[640px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[70%] -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.1),transparent_72%)] blur-2xl"
        />

        <Relay
          play
          onRead={handleRead}
          className="relative w-full"
          aria-label="Um hub e quatro ramos de quadrados: o caminho até a ponta sob o ponteiro acende salto a salto."
        />

        {/* ícones das tecnologias, presos ao topo de cada tile */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {items.map((item, index) => {
            const tile = RELAY_TILES[index]
            const lift = lifts[index]

            return (
              <div
                key={item.name}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{
                  left: `${tile.x}%`,
                  top: `${tile.y - (lift?.on ? RELAY_RISE_PCT : 0)}%`,
                  width: 'clamp(14px, 4.3%, 26px)',
                  aspectRatio: '1',
                  transitionProperty: 'top',
                  transitionDuration: `${reduceMotion ? 0 : (lift?.dur ?? 0)}ms`,
                  transitionDelay: `${reduceMotion ? 0 : (lift?.delay ?? 0)}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                <BoardIcon item={item} />
              </div>
            )
          })}
        </div>

        <button
          ref={hubRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Ver as ${rest.length} tecnologias que estão fora da grade`}
          className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-neutral-900 transition-[transform,background-color] duration-500 hover:scale-105 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-neutral-900/40 focus-visible:outline-none"
          style={{
            left: `${RELAY_HUB.x}%`,
            top: `${RELAY_HUB.y}%`,
            width: '9%',
            aspectRatio: '1',
          }}
        >
          <Plus
            aria-hidden="true"
            strokeWidth={1.5}
            className="h-[52%] w-[52%] transition-transform duration-500 group-hover:rotate-90"
          />
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] tracking-[0.18em] text-stone-500 uppercase">
        {items.length} na grade · toque no “+” para ver as outras {rest.length}
      </p>

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
              aria-labelledby="tech-board-title"
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/15 bg-[#080808] p-6 shadow-2xl shadow-black sm:p-9"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.22em] text-stone-500 uppercase">
                    Fora da grade
                  </p>
                  <h3
                    id="tech-board-title"
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
                A grade mostra as {items.length} principais. Aqui está o resto da
                stack — com e sem logo oficial — organizada por área.
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
                {rest.length} tecnologias listadas aqui · {items.length} na grade
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TechRelayBoard

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { EASE } from './easing'
import { TECH_CATEGORIES, type TechItem } from './tech-data'

/** viewBox do palco — tudo é posicionado em porcentagem a partir daqui. */
const SIZE = 800
const CX = 400
const CY = 400
const R = 250

/**
 * A linha entra pela esquerda (vinda do Sobre), sobe por fora do círculo e
 * fecha o arco no topo (400,150), no sentido horário.
 */
const LINE_PATH =
  'M0 840 C 50 780 70 680 80 590 C 90 480 85 320 165 210 ' +
  'C 215 140 300 152 400 150 A 250 250 0 1 1 399.9 150'

/** Posição do nome em relação ao nó: fora do círculo, radial. */
function labelStyle(rad: number): CSSProperties {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  if (cos > 0.32) {
    return { left: '100%', top: '50%', marginLeft: 12, transform: 'translateY(-50%)' }
  }
  if (cos < -0.32) {
    return { right: '100%', top: '50%', marginRight: 12, transform: 'translateY(-50%)' }
  }
  return sin < 0
    ? { left: '50%', bottom: '100%', marginBottom: 10, transform: 'translateX(-50%)' }
    : { left: '50%', top: '100%', marginTop: 10, transform: 'translateX(-50%)' }
}

function OrbitIcon({ item }: { item: TechItem }) {
  const [failed, setFailed] = useState(false)
  const Icon = item.icon

  if (Icon) {
    return <Icon aria-hidden="true" strokeWidth={1.4} className="h-[18px] w-[18px] text-stone-300" />
  }

  if (failed || !item.slug) {
    return (
      <span aria-hidden="true" className="font-serif text-[10px] leading-none text-stone-300">
        {item.name.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${item.slug}/d6d3d1`}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-[18px] w-[18px] object-contain"
    />
  )
}

function OrbitNode({
  item,
  index,
  total,
}: {
  item: TechItem
  index: number
  total: number
}) {
  const rad = ((-90 + (index * 360) / total) * Math.PI) / 180
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${((CX + R * Math.cos(rad)) / SIZE) * 100}%`,
        top: `${((CY + R * Math.sin(rad)) / SIZE) * 100}%`,
      }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black shadow-[0_0_0_6px_rgba(0,0,0,0.92)]">
          <OrbitIcon item={item} />
        </div>
        <span
          style={labelStyle(rad)}
          className="absolute hidden whitespace-nowrap font-mono text-[9px] tracking-[0.16em] text-stone-400 uppercase md:block"
        >
          {item.name}
        </span>
      </div>
    </div>
  )
}

function OrbitItem({
  progress,
  item,
  index,
  total,
}: {
  progress: MotionValue<number>
  item: TechItem
  index: number
  total: number
}) {
  const rad = ((-90 + (index * 360) / total) * Math.PI) / 180
  const x = CX + R * Math.cos(rad)
  const y = CY + R * Math.sin(rad)

  // O arco fecha entre 45% e 100% do progresso recebido; cada nó nasce
  // quando a ponta do traço passa pelo ângulo dele.
  const at = 0.42 + (index / total) * 0.56
  const opacity = useTransform(progress, [at, at + 0.05], [0, 1])
  const scale = useTransform(progress, [at, at + 0.07], [0.5, 1])

  return (
    <motion.div
      style={{
        left: `${(x / SIZE) * 100}%`,
        top: `${(y / SIZE) * 100}%`,
        opacity,
        scale,
      }}
      className="absolute z-10"
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black shadow-[0_0_0_6px_rgba(0,0,0,0.92)]">
          <OrbitIcon item={item} />
        </div>
        <span
          style={labelStyle(rad)}
          className="absolute hidden whitespace-nowrap font-mono text-[9px] tracking-[0.16em] text-stone-400 uppercase md:block"
        >
          {item.name}
        </span>
      </div>
    </motion.div>
  )
}

interface TechOrbitProps {
  /** Progresso (0 a 1) que desenha a linha e revela os nós. */
  progress: MotionValue<number>
  /** Tecnologias que ocupam os nós do círculo. */
  items: readonly TechItem[]
  /** Tecnologias que ficam fora do círculo, listadas no hub. */
  rest: readonly TechItem[]
}

export function TechOrbit({ progress, items, rest }: TechOrbitProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const hubRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const dashOffset = useTransform(progress, (value) => 1 - value)
  const hubOpacity = useTransform(progress, [0.35, 0.55], [0, 1])
  const hubScale = useTransform(progress, [0.35, 0.58], [0.4, 1])

  const groups = useMemo(
    () =>
      TECH_CATEGORIES.map((category) => ({
        category,
        techs: rest.filter((tech) => tech.category === category),
      })).filter((group) => group.techs.length > 0),
    [rest],
  )

  const close = () => {
    setOpen(false)
    hubRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const total = items.length

  return (
    <div className="relative w-full pointer-events-auto">
      <div className="relative mx-auto aspect-square w-full max-w-[680px]">
        {reduceMotion ? (
          <>
            <svg
              viewBox="0 0 800 800"
              fill="none"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            >
              <path
                d={LINE_PATH}
                stroke="#d6d3d1"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
              />
            </svg>
            {items.map((item, index) => (
              <OrbitNode key={item.name} item={item} index={index} total={total} />
            ))}
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 800 800"
              fill="none"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            >
              <motion.path
                d={LINE_PATH}
                stroke="#d6d3d1"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ pathLength: progress, strokeDashoffset: dashOffset }}
              />
            </svg>

            {items.map((item, index) => (
              <OrbitItem
                key={item.name}
                progress={progress}
                item={item}
                index={index}
                total={total}
              />
            ))}
          </>
        )}

        <motion.button
          ref={hubRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Ver as ${rest.length} tecnologias que estão fora do círculo`}
          style={reduceMotion ? undefined : { opacity: hubOpacity, scale: hubScale }}
          className="group absolute top-1/2 left-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black text-stone-200 transition-colors duration-500 hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <Plus
            aria-hidden="true"
            strokeWidth={1.25}
            className="h-6 w-6 transition-transform duration-500 group-hover:rotate-90"
          />
        </motion.button>
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
              aria-labelledby="tech-orbit-title"
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/15 bg-[#080808] p-6 shadow-2xl shadow-black sm:p-9"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.22em] text-stone-500 uppercase">
                    Fora do círculo
                  </p>
                  <h3
                    id="tech-orbit-title"
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
                O círculo mostra as {items.length} principais. Aqui está o resto da
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
                {rest.length} tecnologias listadas aqui · {items.length} no círculo
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TechOrbit

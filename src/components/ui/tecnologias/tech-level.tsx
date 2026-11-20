import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { EASE } from '@/components/ui/easing'
import {
  TechLevelContext,
  levelLabel,
  useTechLevel,
  type OpenTechLevel,
} from './tech-level-context'
import type { TechItem } from './tech-data'

export function LevelBar({ level, className = '' }: { level: number; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <div
      className={`h-[3px] w-full overflow-hidden bg-white/10 ${className}`}
      role="presentation"
    >
      <motion.div
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: Math.min(1, Math.max(0, level / 100)) }}
        transition={{ duration: reduceMotion ? 0 : 0.85, ease: EASE }}
        className="h-full w-full origin-left bg-stone-100"
      />
    </div>
  )
}

export function TechNameButton({ tech, className = '' }: { tech: TechItem; className?: string }) {
  const open = useTechLevel()
  return (
    <button
      type="button"
      onClick={() => open(tech)}
      className={`tech-clickable cursor-pointer rounded-sm transition-colors duration-200 hover:text-stone-100 focus-visible:text-stone-100 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:outline-none ${className}`}
    >
      {tech.name}
    </button>
  )
}

export function TechLevelProvider({ children }: { children: ReactNode }) {
  const [tech, setTech] = useState<TechItem | null>(null)
  const reduceMotion = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)

  const open = useCallback<OpenTechLevel>((next) => setTech(next), [])
  const close = useCallback(() => setTech(null), [])
  const value = useMemo(() => open, [open])

  useEffect(() => {
    if (!tech) return
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
  }, [tech, close])

  return (
    <TechLevelContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {tech && (
              <motion.div
                className="fixed inset-0 z-[130] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <button
                  type="button"
                  aria-label="Fechar nível da tecnologia"
                  tabIndex={-1}
                  onClick={close}
                  className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tech-level-title"
                  initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="relative w-full max-w-md overflow-hidden rounded-sm border border-white/15 bg-[#080808] p-6 shadow-2xl shadow-black sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.24em] text-stone-500 uppercase">
                        Nível de uso
                      </p>
                      <h3
                        id="tech-level-title"
                        className="mt-3 font-serif text-2xl leading-tight text-stone-50 sm:text-3xl"
                      >
                        {tech.name}
                      </h3>
                      <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                        {tech.category}
                      </p>
                    </div>

                    <button
                      ref={closeRef}
                      type="button"
                      onClick={close}
                      aria-label="Fechar"
                      className="tech-clickable shrink-0 cursor-pointer rounded-sm border border-white/15 p-2 text-stone-300 transition-colors hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                    >
                      <X aria-hidden="true" size={18} />
                    </button>
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-4">
                    <span className="font-serif text-6xl leading-none text-stone-50">
                      {tech.level}
                      <span className="text-3xl text-stone-500">%</span>
                    </span>
                    <span className="pb-1 font-mono text-[10px] tracking-[0.22em] text-stone-400 uppercase">
                      {levelLabel(tech.level)}
                    </span>
                  </div>

                  <div className="mt-5">
                    <LevelBar level={tech.level} />
                    <div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.18em] text-stone-600 uppercase">
                      <span>base</span>
                      <span>referência</span>
                    </div>
                  </div>

                  <p className="mt-7 border-t border-white/10 pt-4 text-xs leading-relaxed text-stone-500">
                    Estimativa a partir dos repositórios públicos — linguagens, dependências e uso
                    real nos projetos.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </TechLevelContext.Provider>
  )
}

export default TechLevelProvider

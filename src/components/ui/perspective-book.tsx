import * as React from 'react'
import { createPortal } from 'react-dom'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Livro em miniatura (capa 3D) que abre um leitor em tela cheia.
 *
 * O leitor é carregado só no clique (`React.lazy`), então a biblioteca de
 * folhear não entra no bundle inicial nem atrasa a introdução.
 */

export interface BookPage {
  id: string
  meta?: string
  title?: string
  content: React.ReactNode
  tags?: string[]
}

export interface BookCover {
  title: string
  subtitle: string
  author: string
  kicker: string
}

interface PerspectiveBookProps {
  cover: BookCover
  pages?: BookPage[]
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: { width: '132px', spine: '108px' },
  default: { width: '168px', spine: '144px' },
  lg: { width: '240px', spine: '212px' },
} as const

const BookReader = React.lazy(() => import('./perspective-book-reader'))

export function PerspectiveBook({
  cover,
  pages = [],
  size = 'default',
  className = '',
}: PerspectiveBookProps) {
  const [open, setOpen] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const dims = SIZE_MAP[size]

  const handleOpen = React.useCallback(() => {
    setLoaded(true)
    setOpen(true)
  }, [])

  const handleClose = React.useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Abrir o livro ${cover.title}`}
        className={cn(
          'group z-10 h-min w-min cursor-pointer [perspective:900px] select-none',
          'rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-100/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black',
          className,
        )}
      >
        <div
          style={{ width: dims.width, borderRadius: '6px 4px 4px 6px' }}
          className="relative aspect-[49/60] [transform-style:preserve-3d] [transform:rotateY(0deg)] transition-transform duration-300 ease-out group-hover:-translate-x-1 group-hover:scale-[1.05] group-hover:[transform:rotateY(-20deg)] group-focus-visible:-translate-x-1 group-focus-visible:scale-[1.05] group-focus-visible:[transform:rotateY(-20deg)]"
        >
          {/* Capa */}
          <div
            className="absolute inset-y-0 left-0 flex size-full flex-col overflow-hidden bg-[#0e0e11] p-[11%] text-stone-100 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-white/12 after:shadow-[0_2px_4px_#00000040,0_12px_24px_#00000059,inset_0_-1px_#00000059,inset_0_2px_2px_#ffffff12,inset_4px_0_4px_#00000040] after:content-['']"
            style={{ transform: 'translateZ(22px)', borderRadius: '6px 4px 4px 6px' }}
          >
            {/* Lombada */}
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 h-full opacity-60"
              style={{
                minWidth: '9%',
                background:
                  'linear-gradient(90deg, hsla(0,0%,100%,0), hsla(0,0%,100%,.22) 30%, hsla(0,0%,100%,0) 52%, rgba(0,0,0,.55) 76%, rgba(0,0,0,.15) 88%, transparent)',
              }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between pl-1">
              <div>
                <span className="font-mono text-[7px] tracking-[0.22em] text-stone-500 uppercase">
                  {cover.kicker}
                </span>
                <div
                  className="mt-[14%] font-serif leading-[1.02] tracking-[-0.02em] text-stone-50"
                  style={{ fontSize: size === 'sm' ? 14 : size === 'lg' ? 22 : 17 }}
                >
                  {cover.title}
                </div>
                <div className="mt-3 h-px w-8 bg-stone-500/60" />
                <p className="mt-2.5 text-[8px] leading-[1.5] text-stone-400">
                  {cover.subtitle}
                </p>
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="font-mono text-[7px] tracking-[0.14em] text-stone-400 uppercase">
                  {cover.author}
                </span>
                <Maximize2 className="h-2.5 w-2.5 text-stone-500 transition-colors group-hover:text-stone-200" />
              </div>
            </div>
          </div>

          {/* Lombada 3D */}
          <div
            aria-hidden="true"
            className="absolute top-[3px] bottom-[3px] left-0 bg-[linear-gradient(90deg,#2a2a2e_0%,#0000_80%),linear-gradient(#151517,#0b0b0d)]"
            style={{
              width: '40px',
              transform: `translateX(${dims.spine}) rotateY(90deg)`,
            }}
          />

          {/* Miolo / contracapa */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 size-full bg-[#0b0b0d]"
            style={{ transform: 'translateZ(-22px)', borderRadius: '6px 4px 4px 6px' }}
          />
        </div>

        <span className="mt-4 block font-mono text-[9px] tracking-[0.2em] text-stone-500 uppercase transition-colors group-hover:text-stone-200">
          Ler o livro ↗
        </span>
      </button>

      {loaded
        ? createPortal(
            <React.Suspense fallback={null}>
              {open ? (
                <BookReader
                  cover={cover}
                  pages={pages}
                  onClose={handleClose}
                />
              ) : null}
            </React.Suspense>,
            document.body,
          )
        : null}
    </>
  )
}

export default PerspectiveBook

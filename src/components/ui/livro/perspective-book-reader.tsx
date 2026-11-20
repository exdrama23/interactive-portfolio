import * as React from 'react'
import HTMLFlipBook from 'react-pageflip'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Minus,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react'
import type { BookCover, BookPage } from './perspective-book'


type Theme = 'sepia' | 'light' | 'dark'

const THEMES: Record<
  Theme,
  { paper: string; ink: string; muted: string; line: string; label: string }
> = {
  sepia: {
    paper: '#f5eddc',
    ink: '#2a241c',
    muted: '#8a7c66',
    line: 'rgba(42, 36, 28, 0.16)',
    label: 'Sépia',
  },
  light: {
    paper: '#fbfaf6',
    ink: '#161616',
    muted: '#7a7a72',
    line: 'rgba(22, 22, 22, 0.14)',
    label: 'Claro',
  },
  dark: {
    paper: '#141419',
    ink: '#e9e6df',
    muted: '#8f8b84',
    line: 'rgba(233, 230, 223, 0.16)',
    label: 'Escuro',
  },
}

const THEME_ORDER: Theme[] = ['sepia', 'light', 'dark']
const MIN_FONT = 14
const MAX_FONT = 23

interface BookReaderProps {
  cover: BookCover
  pages: BookPage[]
  onClose: () => void
}

export default function BookReader({ cover, pages, onClose }: BookReaderProps) {
  const bookRef = React.useRef<any>(null)
  const [page, setPage] = React.useState(0)
  const [font, setFont] = React.useState(15)
  const [theme, setTheme] = React.useState<Theme>('sepia')
  const [portrait, setPortrait] = React.useState(false)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  const total = pages.length
  const t = THEMES[theme]

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  React.useEffect(() => {
    const html = document.documentElement
    const prev = html.classList.contains('no-scroll')
    html.classList.add('no-scroll')
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      if (!prev) html.classList.remove('no-scroll')
      previous?.focus?.()
    }
  }, [])

  const flip = React.useCallback((dir: 1 | -1) => {
    const api = bookRef.current?.pageFlip?.()
    if (!api) return
    if (dir === 1) api.flipNext()
    else api.flipPrev()
  }, [])

  const cycleTheme = React.useCallback(() => {
    setTheme((current) => {
      const i = THEME_ORDER.indexOf(current)
      return THEME_ORDER[(i + 1) % THEME_ORDER.length]
    })
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') flip(1)
      else if (e.key === 'ArrowLeft') flip(-1)
      else if ((e.key === '+' || e.key === '=') && !e.metaKey) {
        setFont((f) => Math.min(MAX_FONT, f + 1))
      } else if (e.key === '-' && !e.metaKey) {
        setFont((f) => Math.max(MIN_FONT, f - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, onClose])

  const pageLabel =
    page >= 1 && page <= total
      ? `Página ${page} de ${total}`
      : page === 0
        ? 'Capa'
        : 'Fim'

  const settings = {
    startPage: 0,
    size: 'stretch' as const,
    width: 420,
    height: 600,
    minWidth: 260,
    maxWidth: 520,
    minHeight: 360,
    maxHeight: 780,
    drawShadow: true,
    flippingTime: 650,
    usePortrait: portrait,
    startZIndex: 0,
    autoSize: true,
    maxShadowOpacity: 0.35,
    showCover: true,
    mobileScrollSupport: true,
    clickEventForward: true,
    useMouseEvents: true,
    swipeDistance: 28,
    showPageCorners: true,
    disableFlipByClick: false,
  }

  const decoFont = { fontFamily: 'var(--font-serif)' }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Livro: ${cover.title}`}
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-stone-200 md:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-[15px] leading-tight text-stone-50 md:text-base">
            {cover.title}
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.18em] text-stone-500 uppercase">
            {cover.author} · {cover.kicker}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex items-center rounded-full border border-white/15 bg-white/[0.06] p-0.5">
            <button
              type="button"
              onClick={() => setFont((f) => Math.max(MIN_FONT, f - 1))}
              disabled={font <= MIN_FONT}
              aria-label="Diminuir o texto"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-mono text-[10px] text-stone-400">
              {font}
            </span>
            <button
              type="button"
              onClick={() => setFont((f) => Math.min(MAX_FONT, f + 1))}
              disabled={font >= MAX_FONT}
              aria-label="Aumentar o texto"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Tema: ${t.label}. Trocar tema`}
            title={`Tema: ${t.label}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : theme === 'sepia' ? (
              <BookOpen className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar livro"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-3 md:px-6">
        <button
          type="button"
          onClick={() => flip(-1)}
          aria-label="Página anterior"
          className="absolute left-1 z-20 hidden h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 md:grid"
          disabled={page <= 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative h-full w-full max-w-[1120px]">
          <HTMLFlipBook
            ref={bookRef}
            className="mx-auto"
            style={{}}
            onFlip={(e: { data: number }) => setPage(e.data)}
            onInit={(e: { data: { page: number } }) => setPage(e.data.page)}
            {...settings}
          >
            <div className="relative overflow-hidden">
              <div
                className="absolute inset-0 flex flex-col justify-between p-7 ring-1 ring-white/10 ring-inset md:p-9"
                style={{
                  background:
                    'linear-gradient(160deg, #1b1b20 0%, #111113 58%, #0b0b0d 100%)',
                  color: '#ece9e3',
                }}
              >
                <div>
                  <span className="font-mono text-[9px] tracking-[0.26em] text-stone-500 uppercase">
                    {cover.kicker}
                  </span>
                  <div className="mt-8 h-px w-12 bg-stone-500/50" />
                  <h1
                    className="mt-7 text-[clamp(1.7rem,2.2vw,2.6rem)] leading-[1.02] tracking-[-0.02em] text-stone-50"
                    style={decoFont}
                  >
                    {cover.title}
                  </h1>
                  <p className="mt-5 max-w-[24ch] text-[12.5px] leading-[1.6] text-stone-400">
                    {cover.subtitle}
                  </p>
                </div>
                <div className="border-t border-white/15 pt-4">
                  <p className="font-mono text-[9px] tracking-[0.18em] text-stone-400 uppercase">
                    {cover.author}
                  </p>
                  <p className="mt-1 font-mono text-[8px] tracking-[0.16em] text-stone-600 uppercase">
                    Edição pessoal · 2026
                  </p>
                </div>
              </div>
            </div>

            {pages.map((p, i) => (
              <div
                key={p.id}
                className="page relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 flex flex-col px-[9%] py-[8%]"
                  style={{ background: t.paper, color: t.ink }}
                >
                  <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    {p.meta ? (
                      <p
                        className="font-mono text-[9px] tracking-[0.22em] uppercase"
                        style={{ color: t.muted }}
                      >
                        {p.meta}
                      </p>
                    ) : null}
                    {p.title ? (
                      <h2
                        className="mt-3 text-[clamp(1.35rem,1.8vw,2rem)] leading-[1.1] tracking-[-0.015em] text-balance"
                        style={decoFont}
                      >
                        {p.title}
                      </h2>
                    ) : null}
                    <div
                      className="mt-4 space-y-3 leading-[1.6]"
                      style={{ fontSize: font, fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {p.content}
                    </div>
                    {p.tags && p.tags.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {p.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] uppercase"
                            style={{ borderColor: t.line, color: t.muted }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="mt-4 flex shrink-0 items-center justify-between border-t pt-3 font-mono text-[9px] tracking-[0.16em] uppercase"
                    style={{ borderColor: t.line, color: t.muted }}
                  >
                    <span className="truncate">{cover.title}</span>
                    <span>
                      {String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="relative overflow-hidden">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                style={{ background: '#111113', color: '#ece9e3' }}
              >
                <span className="font-mono text-[9px] tracking-[0.26em] text-stone-500 uppercase">
                  Fim
                </span>
                <p
                  className="mt-6 max-w-[26ch] text-[clamp(1.1rem,1.6vw,1.6rem)] leading-[1.35] text-stone-200"
                  style={decoFont}
                >
                  “Toda ideia começa como curiosidade.”
                </p>
                <p className="mt-4 font-mono text-[9px] tracking-[0.18em] text-stone-500 uppercase">
                  {cover.author}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-9 rounded-full border border-white/25 px-5 py-2 font-mono text-[10px] tracking-[0.16em] text-stone-200 uppercase transition-colors hover:border-white/60 hover:text-white"
                >
                  Fechar livro
                </button>
              </div>
            </div>
          </HTMLFlipBook>
        </div>

        <button
          type="button"
          onClick={() => flip(1)}
          aria-label="Próxima página"
          className="absolute right-1 z-20 hidden h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 md:grid"
          disabled={page >= total + 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-2.5 font-mono text-[9px] tracking-[0.18em] text-stone-500 uppercase md:px-6">
        <span aria-live="polite">{pageLabel}</span>
        <span className="hidden md:inline">← → folhear · + − texto · esc fechar</span>
      </footer>

      <div className="flex items-center justify-center gap-6 border-t border-white/10 py-2 md:hidden">
        <button
          type="button"
          onClick={() => flip(-1)}
          disabled={page <= 0}
          aria-label="Página anterior"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-stone-300 disabled:opacity-25"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-mono text-[9px] tracking-[0.18em] text-stone-500 uppercase">
          {pageLabel}
        </span>
        <button
          type="button"
          onClick={() => flip(1)}
          disabled={page >= total + 1}
          aria-label="Próxima página"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-stone-300 disabled:opacity-25"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

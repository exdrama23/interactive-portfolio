// ---------------------------------------------------------------------------
// Portão de transição de ROTA.
//
// Uso: envolva o app com <RouteTransitionProvider> (dentro do BrowserRouter).
// A tela de carregamento NÃO aparece na primeira carga nem na introdução; ela
// só entra em cena quando a rota muda.
//
// Trocar de rota com transição:
//   const { transitionTo } = useRouteTransition()
//   transitionTo('/projetos')
//
// Links internos (<a href="/x">, <Link to="/x">) são interceptados sozinhos.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import VinylHalftonePreloader from './vinyl-halftone-preloader'
import { LOADING_DEFAULTS, ROCK_TRACK_ORDER, type RockTrackId } from './rock-tracks'
import { sectionScrollTop } from '../../lib/section-scroll'
import {
  RouteTransitionContext,
  hashFromTarget,
  sectionFromPath,
  sectionFromTarget,
  type RouteTransitionOptions,
} from './route-transition-context'

interface GateState {
  key: number
  section: string
  track: RockTrackId
  durationMs: number
  target: string | null
  onMid?: () => void
  onComplete?: () => void
}

export interface RouteTransitionProviderProps {
  children: ReactNode
  /** Seção inicial (não dispara transição). */
  initialSection?: string
  /** Faixa inicial (não dispara transição). */
  initialTrack?: RockTrackId
  /** Duração padrão da carga simulada. */
  durationMs?: number
}

export function RouteTransitionProvider({
  children,
  initialSection,
  initialTrack = 'sharks',
  durationMs = LOADING_DEFAULTS.durationMs,
}: RouteTransitionProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [gate, setGate] = useState<GateState | null>(null)
  const [activeSection, setActiveSection] = useState(
    () => initialSection ?? sectionFromPath(location.pathname),
  )
  const [activeTrack, setActiveTrack] = useState<RockTrackId>(initialTrack)

  // Única fonte de verdade do portão em andamento (fora do render).
  const gateRef = useRef<GateState | null>(null)
  const trackIdx = useRef(Math.max(0, ROCK_TRACK_ORDER.indexOf(initialTrack)))
  const seq = useRef(0)

  const open = useCallback(
    (target: string | null, options?: RouteTransitionOptions) => {
      if (gateRef.current) return
      trackIdx.current = (trackIdx.current + 1) % ROCK_TRACK_ORDER.length
      const track = options?.track ?? ROCK_TRACK_ORDER[trackIdx.current]
      const section =
        options?.sectionName ??
        (target ? sectionFromTarget(target) : activeSection)
      seq.current += 1
      const next: GateState = {
        key: seq.current,
        section: section.toUpperCase(),
        track,
        durationMs: options?.durationMs ?? durationMs,
        target,
        onMid: options?.onMidTransition,
        onComplete: options?.onComplete,
      }
      gateRef.current = next
      setGate(next)
      setActiveTrack(track)
    },
    [activeSection, durationMs],
  )

  const transitionTo = useCallback(
    (to: string, options?: RouteTransitionOptions) => {
      if (!to) return
      if (to === location.pathname + location.search + location.hash) return
      open(to, options)
    },
    [location.pathname, location.search, location.hash, open],
  )

  const playLoadingGate = useCallback(
    (options?: RouteTransitionOptions) => open(null, options),
    [open],
  )

  const handleMid = useCallback(() => {
    const g = gateRef.current
    if (!g) return
    setActiveSection(g.section)
    if (g.target) {
      const hash = hashFromTarget(g.target)
      navigate(g.target)
      if (hash) {
        // O scroll fica travado durante o portão; libera e pula para a âncora
        // enquanto a tela ainda está 100% coberta.
        document.documentElement.classList.remove('no-scroll')
        const top = sectionScrollTop(hash.slice(1))
        if (top !== null) {
          window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
        }
      } else {
        window.scrollTo(0, 0)
      }
    }
    g.onMid?.()
  }, [navigate])

  const handleDone = useCallback(() => {
    const g = gateRef.current
    gateRef.current = null
    setGate(null)
    g?.onComplete?.()
  }, [])

  // Intercepta cliques em links internos (a href="/x" e <Link to="/x">).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const anchor = el?.closest?.('a') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (anchor.getAttribute('rel')?.includes('external')) return
      const href = anchor.getAttribute('href')
      if (!href || /^(mailto|tel|javascript):/i.test(href)) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const here = window.location
      const samePath = url.pathname === here.pathname && url.search === here.search
      // Páginas de estúdio marcadas com data-no-transition trocam de rota sem
      // a tela de carregamento do site, que aqui só parece um piscar. Precisa
      // vir antes do retorno de "mesma rota" para não recarregar a página
      // inteira quando o link ativo é clicado.
      if (anchor.hasAttribute('data-no-transition')) {
        e.preventDefault()
        if (samePath && url.hash === here.hash) return
        if (samePath && url.hash) {
          const id = decodeURIComponent(url.hash.slice(1))
          document.getElementById(id)?.scrollIntoView()
          return
        }
        navigate(url.pathname + url.search + url.hash)
        return
      }
      if (samePath && url.hash === here.hash) return
      // Âncora sem seção correspondente na página: deixa o comportamento nativo.
      if (samePath && url.hash) {
        let id = url.hash.slice(1)
        try {
          id = decodeURIComponent(id)
        } catch {
          /* id inválido */
        }
        if (!document.getElementById(id)) return
      }
      e.preventDefault()
      // Âncora na mesma página (#sobre) vira só "#sobre"; rota vira o caminho.
      const to = (samePath ? '' : url.pathname) + url.search + url.hash
      transitionTo(to)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [transitionTo, navigate])

  // Trava o scroll enquanto o portão está de pé.
  useEffect(() => {
    if (!gate) return
    const html = document.documentElement
    html.classList.add('no-scroll')
    return () => html.classList.remove('no-scroll')
  }, [gate])

  return (
    <RouteTransitionContext.Provider
      value={{ activeSection, activeTrack, isTransitioning: !!gate, transitionTo, playLoadingGate }}
    >
      {children}

      {gate ? (
        <div className="fixed inset-0 z-[140]">
          <VinylHalftonePreloader
            key={gate.key}
            burnIn
            height="100%"
            enter="auto"
            durationMs={gate.durationMs}
            sectionName={gate.section}
            track={gate.track}
            onMidTransition={handleMid}
            onComplete={handleDone}
          />
        </div>
      ) : null}
    </RouteTransitionContext.Provider>
  )
}

export default RouteTransitionProvider

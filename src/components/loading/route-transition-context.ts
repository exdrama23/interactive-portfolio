// ---------------------------------------------------------------------------
// Contexto + hook do portão de transição de rota.
// Sem componentes aqui: mantém o Fast Refresh estável para o provider.
// ---------------------------------------------------------------------------

import { createContext, useContext } from 'react'
import type { RockTrackId } from './rock-tracks'

export interface RouteTransitionOptions {
  /** Vocalista/faixa da vez. */
  track?: RockTrackId
  /** Duração da carga simulada (ms). */
  durationMs?: number
  /** Nome exibido no rodapé. Padrão: derivado da rota. */
  sectionName?: string
  /** Disparado quando a tinta cobre a tela (antes da troca). */
  onMidTransition?: () => void
  /** Disparado quando a transição termina. */
  onComplete?: () => void
}

export interface RouteTransitionContextValue {
  activeSection: string
  activeTrack: RockTrackId
  isTransitioning: boolean
  /** Navega para `to` com o portão de carregamento. */
  transitionTo: (to: string, options?: RouteTransitionOptions) => void
  /** Só toca o portão (sem navegar), útil para variações/anchor. */
  playLoadingGate: (options?: RouteTransitionOptions) => void
}

export const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null)

/** Nome de seção a partir da rota: `/projetos` → `PROJETOS`. */
export function sectionFromPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '')
  if (!clean) return 'INÍCIO'
  const last = clean.split('/').filter(Boolean).pop() || 'início'
  return decodeURIComponent(last)
    .replace(/[-_]+/g, ' ')
    .toUpperCase()
}

/** Rótulos bonitos para as âncoras do menu (#sobre → SOBRE MIM). */
const HASH_LABELS: Record<string, string> = {
  inicio: 'INÍCIO',
  sobre: 'SOBRE MIM',
  skills: 'HARD SKILLS',
  formacao: 'FORMAÇÃO',
  certificacoes: 'CERTIFICAÇÕES',
  projetos: 'PROJETOS',
  contato: 'CONTATO',
}

/**
 * Nome da seção de destino a partir do alvo da navegação.
 * Aceita rota (`/projetos`), rota com âncora (`/#projetos`) e âncora pura (`#sobre`).
 */
export function sectionFromTarget(target: string): string {
  const hashAt = target.indexOf('#')
  const hash = hashAt >= 0 ? target.slice(hashAt + 1) : ''
  if (hash) {
    const key = decodeURIComponent(hash).replace(/[-_\s]+/g, '').toLowerCase()
    if (HASH_LABELS[key]) return HASH_LABELS[key]
    const label = decodeURIComponent(hash).replace(/[-_]+/g, ' ').toUpperCase()
    if (label) return label
  }
  const path = target.split(/[?#]/)[0]
  return path ? sectionFromPath(path) : 'INÍCIO'
}

/** Âncora do alvo (`/#sobre` ou `#sobre` → `#sobre`), ou null. */
export function hashFromTarget(target: string): string | null {
  const hashAt = target.indexOf('#')
  if (hashAt < 0) return null
  const hash = target.slice(hashAt)
  return hash.length > 1 ? hash : null
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionContext)
  if (!ctx) {
    throw new Error('useRouteTransition precisa estar dentro de <RouteTransitionProvider>')
  }
  return ctx
}

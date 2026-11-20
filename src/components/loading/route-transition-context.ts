
import { createContext, useContext } from 'react'
import type { RockTrackId } from './rock-tracks'

export interface RouteTransitionOptions {
  track?: RockTrackId
  durationMs?: number
  sectionName?: string
  onMidTransition?: () => void
  onComplete?: () => void
}

export interface RouteTransitionContextValue {
  activeSection: string
  activeTrack: RockTrackId
  isTransitioning: boolean
  transitionTo: (to: string, options?: RouteTransitionOptions) => void
  playLoadingGate: (options?: RouteTransitionOptions) => void
}

export const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null)

export function sectionFromPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '')
  if (!clean) return 'INÍCIO'
  const last = clean.split('/').filter(Boolean).pop() || 'início'
  return decodeURIComponent(last)
    .replace(/[-_]+/g, ' ')
    .toUpperCase()
}

const HASH_LABELS: Record<string, string> = {
  inicio: 'INÍCIO',
  sobre: 'SOBRE MIM',
  skills: 'HARD SKILLS',
  formacao: 'FORMAÇÃO',
  certificacoes: 'CERTIFICAÇÕES',
  projetos: 'PROJETOS',
  contato: 'CONTATO',
}

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

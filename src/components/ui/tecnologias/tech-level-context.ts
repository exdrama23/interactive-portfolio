import { createContext, useContext } from 'react'
import type { TechItem } from './tech-data'

export type OpenTechLevel = (tech: TechItem) => void

export const TechLevelContext = createContext<OpenTechLevel | null>(null)

const NOOP: OpenTechLevel = () => {}

export function useTechLevel() {
  return useContext(TechLevelContext) ?? NOOP
}

export function levelLabel(level: number) {
  if (level >= 90) return 'domínio'
  if (level >= 80) return 'avançado'
  if (level >= 70) return 'sólido'
  if (level >= 60) return 'intermediário'
  return 'em evolução'
}

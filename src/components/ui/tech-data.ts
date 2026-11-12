import type { LucideIcon } from 'lucide-react'

export type TechCategory =
  | 'Front-end & UI'
  | 'Back-end & APIs'
  | 'Banco de Dados & Cache'
  | 'Cloud & DevOps'
  | 'Ferramentas e Plataformas'
  | 'Conceitos & Especialidades'

export interface TechItem {
  name: string
  /** Slug do Simple Icons (logo via CDN). */
  slug?: string
  /** Ícone lucide para tecnologias sem logo dedicado. */
  icon?: LucideIcon
  category: TechCategory
}

export const TECH_CATEGORIES: readonly TechCategory[] = [
  'Front-end & UI',
  'Back-end & APIs',
  'Banco de Dados & Cache',
  'Cloud & DevOps',
  'Ferramentas e Plataformas',
  'Conceitos & Especialidades',
]

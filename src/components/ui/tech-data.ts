import type { LucideIcon } from 'lucide-react'
import tecnologiasData from '../../data/tecnologias.json'

export type TechCategory =
  | 'Front-end & UI'
  | 'Back-end & APIs'
  | 'Banco de Dados & Cache'
  | 'Cloud & DevOps'
  | 'Ferramentas e Plataformas'
  | 'Conceitos & Especialidades'

export interface TechItem {
  name: string
  slug?: string
  icon?: LucideIcon
  category: TechCategory
}

const DEFAULT_CATEGORIES: readonly TechCategory[] = [
  'Front-end & UI',
  'Back-end & APIs',
  'Banco de Dados & Cache',
  'Cloud & DevOps',
  'Ferramentas e Plataformas',
  'Conceitos & Especialidades',
]

export const TECH_CATEGORIES: readonly TechCategory[] =
  Array.isArray(tecnologiasData.categories) && tecnologiasData.categories.length > 0
    ? (tecnologiasData.categories as unknown as readonly TechCategory[])
    : DEFAULT_CATEGORIES

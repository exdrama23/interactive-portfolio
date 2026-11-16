/**
 * Junta classes condicionais sem duplicar espaços.
 * Mantido deliberadamente pequeno: o site não usa `tailwind-merge`, então um
 * simples filtro resolve os casos deste projeto (classes base + extras).
 */
export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ')
}

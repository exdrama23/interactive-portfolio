
export function sectionLayoutTop(el: HTMLElement): number {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'sticky') {
      const host = node.parentElement
      if (host) {
        return Math.max(0, Math.round(host.getBoundingClientRect().top + window.scrollY))
      }
      break
    }
  }

  let top = 0
  let node: HTMLElement | null = el
  while (node) {
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return top
}

const PROJETOS_REST = 0.52

export function sectionScrollTop(id: string): number | null {
  const el = document.getElementById(id)
  if (!el) return null

  const top = sectionLayoutTop(el)
  if (id === 'projetos') {
    const base = el.getBoundingClientRect().top + window.scrollY
    const run = Math.max(0, el.offsetHeight - window.innerHeight)
    return Math.max(0, Math.round(base + run * PROJETOS_REST))
  }

  return Math.max(0, top)
}

export function scrollToSection(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const top = sectionScrollTop(id)
  if (top === null) return false
  window.scrollTo({ top, behavior })
  return true
}

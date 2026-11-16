// ---------------------------------------------------------------------------
// Destino de scroll das âncoras do menu.
//
// Algumas seções ocupam mais de uma tela e animam durante o percurso, então o
// topo do elemento nem sempre é o ponto em que a seção "repousa" para quem
// clica no menu:
//
//   • #projetos começa com a janela fechada sobre a Formação — mirar no topo
//     fazia o clique cair na seção anterior.
//   • #formacao tem um transform de entrada (rotação), então o
//     getBoundingClientRect() fica deslocado; o topo de layout é o correto.
//
// Sem componentes: usado pelo portão de rota e pela própria Formação.
// ---------------------------------------------------------------------------

/** Topo do elemento no documento, imune a transforms/animações. */
export function sectionLayoutTop(el: HTMLElement): number {
  // Um ancestral `position: sticky` (a Formação fica presa durante a abertura
  // de Projetos) tem o `offsetTop` deslocado enquanto está preso. Nesse caso o
  // topo estável é o do bloco que contém o sticky — voltar para ele é o que
  // faz a seção parar no lugar certo, e não ~900px abaixo.
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

/**
 * Progresso do scroll da seção de Projetos em que a janela já terminou de
 * abrir e o palco do carrossel repousa. Mesmo valor de `WINDOW_OPEN_END`
 * (0.5) em `projetos.tsx`, com uma folga para cruzar o portão de entrada.
 */
const PROJETOS_REST = 0.52

/** Posição de scroll para a âncora `#id`, ou null se a seção não existe. */
export function sectionScrollTop(id: string): number | null {
  const el = document.getElementById(id)
  if (!el) return null

  const top = sectionLayoutTop(el)
  if (id === 'projetos') {
    // A seção tem 300svh; o trecho animado (janela subindo/abrindo) vai do
    // topo dela até `altura - viewport`. A seção não tem transform, então o
    // rect é confiável aqui.
    const base = el.getBoundingClientRect().top + window.scrollY
    const run = Math.max(0, el.offsetHeight - window.innerHeight)
    return Math.max(0, Math.round(base + run * PROJETOS_REST))
  }

  return Math.max(0, top)
}

/** Rola até a âncora. Retorna false quando o elemento não existe. */
export function scrollToSection(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const top = sectionScrollTop(id)
  if (top === null) return false
  window.scrollTo({ top, behavior })
  return true
}

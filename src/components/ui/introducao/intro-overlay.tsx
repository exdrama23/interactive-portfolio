// ---------------------------------------------------------------------------
// Montagem da introdução na home.
// Ela é uma CAPA fixa em cima da página real: enquanto roda, o site continua
// montado por baixo (para o fade final cair direto no conteúdo de verdade).
// Para editar o design da animação, mexa em camera.ts / pixel-scene.tsx /
// preloader.css — este arquivo só cuida de onde e como ela aparece.
// ---------------------------------------------------------------------------

import * as React from "react"
import PixelWorldPreloader from "./pixel-world-preloader"

export interface IntroOverlayProps {
  /** Chamado quando a animação termina ou o visitante clica em "Pular Intro". */
  onComplete: () => void
  /** Chamado quando o fade final começa — hora de montar a home por baixo. */
  onRevealStart?: () => void
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function IntroOverlay({ onComplete, onRevealStart }: IntroOverlayProps) {
  const [skipped] = React.useState(prefersReducedMotion)

  const finish = React.useCallback(() => {
    // Garante que a home comece do topo quando a intro sai de cena.
    window.scrollTo(0, 0)
    onComplete()
  }, [onComplete])

  React.useEffect(() => {
    if (skipped) return
    const html = document.documentElement
    // Enquanto a intro está de pé, a home é montada já no estado final: o
    // cruzamento não pode mostrar o hero "digitando" a própria entrada.
    html.classList.add("no-scroll", "intro-handoff")
    window.scrollTo(0, 0)
    return () => html.classList.remove("no-scroll", "intro-handoff")
  }, [skipped])

  if (skipped) return null

  return (
    <div className="fixed inset-0 z-[120]" aria-label="Introdução do portfólio">
      <PixelWorldPreloader
        className="pw-cover"
        height="100%"
        onComplete={finish}
        onRevealStart={onRevealStart}
        children={<></>}
      />
    </div>
  )
}

export default IntroOverlay

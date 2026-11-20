
import * as React from "react"
import PixelWorldPreloader from "./pixel-world-preloader"

export interface IntroOverlayProps {
  onComplete: () => void
  onRevealStart?: () => void
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function IntroOverlay({ onComplete, onRevealStart }: IntroOverlayProps) {
  const [skipped] = React.useState(prefersReducedMotion)

  const finish = React.useCallback(() => {
    window.scrollTo(0, 0)
    onComplete()
  }, [onComplete])

  React.useEffect(() => {
    if (skipped) return
    const html = document.documentElement
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

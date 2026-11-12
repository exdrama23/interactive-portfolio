import { useEffect, useRef, useState } from 'react'
import GlyphPortal from './ui/glyph-portal'
import ParticleText from './ParticleText'
import HeroCollage from './ui/hero-collage'
import { Sobre } from '../pages/sobre'

// A palavra-ânima da hero. O modelo (Skeleton Key) entra como colagem ao redor
// dela — sem a chave e sem a fechadura.
const HERO_WORD = 'Bem-vindo ao meu mundo'

// Em qual ponto do scroll o Sobre começa a subir (0 a 1).
// O zoom termina em 0.78; 0.64 faz o Sobre já começar a entrar enquanto a
// câmera termina de atravessar a letra (sem trecho morto de preto).
const ABOUT_REVEAL_AT = 0.64

/**
 * Hero com o texto centralizado que "entra" na letra conforme o scroll.
 * A superficie de pontos fica fixa atras do texto durante a transicao e,
 * ao final, a secao Sobre e revelada por cima do preto.
 */
export function HeroPortal() {
  const [aboutVisible, setAboutVisible] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const aboutRevealedRef = useRef(aboutVisible)

  // O GlyphPortal congela a face na montagem; espere as fontes da colagem
  // carregarem para medir a palavra já com a Fleur De Leah.
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let live = true
    let tries = 0
    let timer = 0
    const face = '400 100px "Fleur De Leah"'
    // O GlyphPortal congela a face na montagem. Só monte quando o check
    // confirmar que a Fleur De Leah está realmente disponível.
    const verify = () => {
      if (!live) return
      const done = () => {
        if (!live) return
        let ok = false
        try {
          ok = document.fonts.check(face, HERO_WORD)
        } catch {
          ok = false
        }
        if (ok || tries > 40) {
          setFontsReady(true)
          return
        }
        tries += 1
        timer = window.setTimeout(verify, 120)
      }
      if (document.fonts?.load) {
        document.fonts.load(face, HERO_WORD).then(done).catch(done)
      } else {
        setFontsReady(true)
      }
    }
    verify()
    const bail = window.setTimeout(() => {
      if (live) setFontsReady(true)
    }, 4000)
    return () => {
      live = false
      window.clearTimeout(timer)
      window.clearTimeout(bail)
    }
  }, [])

  const handleProgress = (progress: number) => {
    if (!aboutRevealedRef.current && progress >= ABOUT_REVEAL_AT) {
      aboutRevealedRef.current = true
      setAboutVisible(true)
    }
  }

  return (
    <div id="inicio" className="relative">
      <div aria-hidden="true" className="sticky top-0 z-0 h-[100svh]">
        <ParticleText fill />
      </div>

      <div className="relative z-10 -mt-[100svh]">
        {fontsReady ? (
          <GlyphPortal
            word={HERO_WORD}
            className="hero-glyph"
            scrollLength={2.4}
            interactive={false}
            annotations={false}
            enterLabel="Ir para Sobre"
            fontFamily={'"Fleur De Leah", "Playfair Display", Georgia, serif'}
            fontWeight={400}
            front={<HeroCollage active={fontsReady} />}
            onProgress={handleProgress}
            style={{
              '--gp-paper': 'transparent',
              '--gp-ink': '#000000',
              '--gp-field': '#000000',
              '--gp-foreground': '#ffffff',
            }}
          >
            <Sobre active={aboutVisible} />
          </GlyphPortal>
        ) : null}
      </div>
    </div>
  )
}

export default HeroPortal

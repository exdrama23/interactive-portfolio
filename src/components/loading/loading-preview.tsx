// ---------------------------------------------------------------------------
// Preview manual da tela de carregamento de rota (só em desenvolvimento).
//
// Abra http://localhost:5173/__loading-preview
//   ?track=sharks | vermilion | what_ive_done | eu_protesto
//   ?section=PROJETOS (nome exibido no rodapé)
//   ?enter=click  (segura no 100% até você clicar)
//   ?loop=1       (repete para sempre)
// ---------------------------------------------------------------------------

import { useSearchParams } from 'react-router-dom'
import VinylHalftonePreloader from './vinyl-halftone-preloader'
import { ROCK_TRACKS, type RockTrackId } from './rock-tracks'

export function LoadingPreview() {
  const [params] = useSearchParams()
  const rawTrack = params.get('track') ?? ''
  const track = (rawTrack in ROCK_TRACKS ? rawTrack : 'sharks') as RockTrackId
  const section = params.get('section') || 'PROJETOS'
  const enter = params.get('enter') === 'click' ? 'click' : 'auto'
  const loop = params.get('loop') === '1'

  return (
    <VinylHalftonePreloader
      burnIn
      loop={loop}
      enter={enter}
      track={track}
      sectionName={section}
      onComplete={() => undefined}
    />
  )
}

export default LoadingPreview

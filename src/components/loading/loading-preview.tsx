
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

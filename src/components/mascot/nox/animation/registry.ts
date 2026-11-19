// O JSON e a fonte de verdade dos clipes. O animador nao conhece nomes de
// animacao, so recebe o clipe; quem escolhe o clipe e a camada de comportamento.

import data from '../assets/animations/nox-animations.json'
import type { AnimationsFile, AnimationClip } from './types'

export const NOX_ANIMATIONS = data as unknown as AnimationsFile

export function getAnimation(name: string): AnimationClip {
  const clip = NOX_ANIMATIONS.animations[name]
  if (!clip) throw new Error(`animacao desconhecida: ${name}`)
  return clip
}

// Clipe vazio nao entra em cena: o chamador cai no fallback em vez de piscar.
export function isPlayable(name: string): boolean {
  return (NOX_ANIMATIONS.animations[name]?.frames.length ?? 0) > 0
}

import type { AnimationClip, FrameRect } from './types'

// Reproducao por tempo, nao por indice de quadro. Assim um clipe roda igual em
// 60 Hz e 144 Hz e uma duracao por quadro nao vira um segundo clipe.
export class SpriteAnimator {
  private clip: AnimationClip | null = null
  private frameIndex = 0
  private elapsed = 0
  private finished = false
  private listener: ((name: string) => void) | null = null

  // Eventos de quadro (som, fala, mudanca de estado) sao consumidos pela camada
  // de comportamento. O animador nao sabe o que cada nome significa.
  onEvent(listener: ((name: string) => void) | null) {
    this.listener = listener
  }

  play(clip: AnimationClip, restart = true) {
    if (this.clip === clip && !restart) return
    this.clip = clip
    this.frameIndex = 0
    this.elapsed = 0
    this.finished = clip.frames.length === 0
    this.emit()
  }

  update(deltaMs: number) {
    const clip = this.clip
    if (!clip || this.finished || clip.frames.length === 0) return

    this.elapsed += Math.max(0, deltaMs)
    // Teto de iteracoes para um duration 0 ou um delta gigante nao travar o loop.
    for (let guard = 0; guard < 64; guard++) {
      const frame = clip.frames[this.frameIndex]
      if (this.elapsed < durationOf(frame, clip)) return

      this.elapsed -= durationOf(frame, clip)
      if (this.frameIndex + 1 < clip.frames.length) {
        this.frameIndex += 1
        this.emit()
        continue
      }
      if (clip.loop) {
        this.frameIndex = 0
        this.emit()
        continue
      }
      this.frameIndex = clip.frames.length - 1
      this.elapsed = 0
      this.finished = true
      return
    }
  }

  get frame(): FrameRect | null {
    return this.clip?.frames[this.frameIndex] ?? null
  }

  get index() {
    return this.frameIndex
  }

  get done() {
    return this.finished
  }

  get clipName() {
    return this.clip
  }

  private emit() {
    const events = this.clip?.events
    if (!events || !this.listener) return
    for (const event of events) {
      if (event.frame === this.frameIndex) this.listener(event.name)
    }
  }
}

function durationOf(frame: FrameRect, clip: AnimationClip) {
  if (frame.duration !== undefined) return Math.max(16, frame.duration)
  return clip.fps && clip.fps > 0 ? 1000 / clip.fps : 1000
}

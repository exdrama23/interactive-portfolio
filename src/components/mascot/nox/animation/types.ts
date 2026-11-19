export type ClipStatus = 'ready' | 'provisional' | 'pending'

export interface FrameRect {
  x: number
  y: number
  w: number
  h: number
  duration?: number
  offsetX?: number
  offsetY?: number
}

export interface AnimationEvent {
  frame: number
  name: string
}

export interface AnimationClip {
  fps?: number
  loop?: boolean
  status?: ClipStatus
  note?: string
  /** Ancora propria para clipes aereos; sem isso vale a ancora do meta. */
  anchor?: { x: number; y: number }
  frames: FrameRect[]
  events?: AnimationEvent[]
}

export interface SpriteMeta {
  name: string
  atlas: string
  frameWidth: number
  frameHeight: number
  anchor: { x: number; y: number }
  native: { width: number; height: number; x: number; y: number }
  source: string
  grid: number
  scale: number
}

export interface AnimationsFile {
  meta: SpriteMeta
  animations: Record<string, AnimationClip>
}

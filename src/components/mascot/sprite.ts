export type MascotClipName =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'land'
  | 'wave'
  | 'pull'
  | 'sit'
  | 'sleep'
  | 'yawn'
  | 'point'
  | 'celebrate'
  | 'scratch'
  | 'leap'
  | 'fall'

export interface MascotClip {
  start: number
  count: number
  fps: number
  loop: boolean
}

export interface MascotSheet {
  image: CanvasImageSource
  frameW: number
  frameH: number
  clips: Record<MascotClipName, MascotClip>
}

const FRAME_W = 12
const FRAME_H = 16

const C = {
  outline: '#141414',
  hair: '#26262b',
  skin: '#f0c08a',
  shirt: '#2f6fde',
  shirtDark: '#2557b0',
  pants: '#23283a',
  shoe: '#f4f4f4',
}

interface Pose {
  bob?: number
  legLift?: boolean
  armSwing?: -1 | 0 | 1
  armUp?: boolean
  armOut?: boolean
  armsUp?: boolean
  blink?: boolean
  mouth?: boolean
  sit?: boolean
  scratch?: boolean
}

function drawPose(ctx: CanvasRenderingContext2D, ox: number, pose: Pose) {
  const bob = pose.bob ?? 0
  const y = (value: number) => value + bob

  const px = (x: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(ox + x, py, w, h)
  }

  if (pose.sit) {
    px(2, y(13), 8, 2, C.pants)
    px(1, y(15), 2, 1, C.shoe)
    px(9, y(15), 2, 1, C.shoe)
  } else {
    px(3, y(12), 2, 3, C.pants)
    px(7, y(12), 2, 3, C.pants)
    if (pose.legLift) {
      px(3, y(14), 2, 1, C.shoe)
      px(7, y(15), 2, 1, C.shoe)
    } else {
      px(3, y(15), 2, 1, C.shoe)
      px(7, y(14), 2, 1, C.shoe)
    }
  }

  const armY = y(8) + (pose.armSwing ?? 0)
  if (!pose.armsUp) {
    px(2, armY, 1, 3, C.shirt)
    px(9, armY, 1, 3, C.shirt)
    px(2, armY + 3, 1, 1, C.skin)
    px(9, armY + 3, 1, 1, C.skin)
  }

  px(3, y(7), 6, 5, C.shirt)
  px(3, y(11), 6, 1, C.shirtDark)

  px(2, y(1), 8, 6, C.outline)
  px(3, y(2), 6, 4, C.skin)
  px(2, y(1), 8, 1, C.hair)
  px(2, y(2), 2, 1, C.hair)
  px(8, y(2), 2, 1, C.hair)

  if (pose.blink) {
    px(4, y(4), 1, 1, C.outline)
    px(7, y(4), 1, 1, C.outline)
  } else {
    px(4, y(3), 1, 2, C.outline)
    px(7, y(3), 1, 2, C.outline)
  }

  if (pose.mouth) {
    px(5, y(5), 2, 1, C.outline)
  }

  if (pose.armUp) {
    px(9, y(4), 1, 4, C.shirt)
    px(9, y(3), 1, 1, C.skin)
  }

  if (pose.armOut) {
    px(9, y(8), 2, 1, C.shirt)
    px(11, y(7), 1, 2, C.skin)
  }

  if (pose.armsUp) {
    px(1, y(4), 1, 5, C.shirt)
    px(10, y(4), 1, 5, C.shirt)
    px(1, y(3), 1, 1, C.skin)
    px(10, y(3), 1, 1, C.skin)
  }

  if (pose.scratch) {
    px(9, y(4), 1, 2, C.skin)
    px(8, y(6), 1, 1, C.skin)
  }
}

const FRAMES: Pose[] = [
  {},
  { blink: true },
  { legLift: true, armSwing: 1 },
  { armSwing: 0 },
  { legLift: true, armSwing: -1 },
  { armSwing: 0 },
  { armUp: true, bob: -1 },
  { bob: 1, armSwing: -1 },
  { armUp: true },
  { armUp: true, blink: true },
  { armOut: true },
  { armOut: true, bob: 1 },
  { sit: true },
  { sit: true, blink: true },
  { sit: true, blink: true, bob: 1 },
  { sit: true, blink: true, bob: 2 },
  { armUp: true, mouth: true, bob: -1 },
  { armUp: true, mouth: true },
  { armOut: true },
  { armOut: true, bob: -1 },
  { armsUp: true, bob: -1 },
  { armsUp: true },
  { scratch: true },
  { scratch: true, blink: true },
  { armUp: true, legLift: true, bob: -2 },
  { armOut: true, legLift: true },
]

export function createPlaceholderSheet(): MascotSheet {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * FRAMES.length
  canvas.height = FRAME_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  FRAMES.forEach((pose, index) => drawPose(ctx, index * FRAME_W, pose))

  return {
    image: canvas,
    frameW: FRAME_W,
    frameH: FRAME_H,
    clips: {
      idle: { start: 0, count: 2, fps: 3, loop: true },
      walk: { start: 2, count: 4, fps: 9, loop: true },
      jump: { start: 6, count: 1, fps: 1, loop: false },
      land: { start: 7, count: 1, fps: 1, loop: false },
      wave: { start: 8, count: 2, fps: 5, loop: true },
      pull: { start: 10, count: 2, fps: 8, loop: true },
      sit: { start: 12, count: 2, fps: 2, loop: true },
      sleep: { start: 14, count: 2, fps: 1.2, loop: true },
      yawn: { start: 16, count: 2, fps: 4, loop: true },
      point: { start: 18, count: 2, fps: 5, loop: true },
      celebrate: { start: 20, count: 2, fps: 7, loop: true },
      scratch: { start: 22, count: 2, fps: 3, loop: true },
      leap: { start: 24, count: 1, fps: 1, loop: false },
      fall: { start: 25, count: 1, fps: 1, loop: false },
    },
  }
}

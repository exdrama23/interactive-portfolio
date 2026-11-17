// Folha de sprites do Nox.
//
// As poses vêm em texto de `sprite-art.ts` (30x28, um caractere por pixel). O
// gato sentado foi desenhado de frente e a caminhada de perfil, então o sheet
// guarda os dois: o site senta de frente e anda de lado, como na referência.
//
// Piscada apaga os pixels do olho e desenha uma linha de 2x1. Boca aberta
// acrescenta uma linha escura embaixo do focinho. Nada disso altera os quadros
// originais, então a arte base fica intacta.

import {
  CAT_H,
  CAT_W,
  NOX_PAL,
  POSE_SIT,
  POSE_STAND_1,
  POSE_STAND_2,
  POSE_STAND_3,
  POSE_WALK,
  type CatPose,
} from './sprite-art'

export type MascotClipName =
  | 'idle'
  | 'walk'
  | 'trot'
  | 'jump'
  | 'fall'
  | 'land'
  | 'hover'
  | 'sit'
  | 'sleep'
  | 'wake'
  | 'paw'
  | 'complain'
  | 'scared'
  | 'held'
  | 'dragged'
  | 'celebrate'
  // Nomes antigos que o Mascot.tsx ainda usa.
  | 'wave'
  | 'pull'
  | 'yawn'
  | 'point'
  | 'scratch'
  | 'leap'
  // Transições de postura entre sentado e em pé.
  | 'standup'
  | 'sitdown'

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

const EYE = '#141211'
const GLEAM = '#f6ecd9'
const OUTLINE = '#171514'
const SHADOW = '#d5b48b'

interface Frame extends CatPose {
  blink?: boolean
  mouth?: boolean
  noShadow?: boolean
  dx?: number
  dy?: number
}

const FRAMES: Frame[] = []
const at: Record<string, number> = {}

const add = (key: string, frame: Frame) => {
  at[key] = FRAMES.length
  FRAMES.push(frame)
}

const shade = (pose: CatPose): Frame => ({ ...pose })

// Sentado de frente: parado, piscando e falando.
add('sit', shade(POSE_SIT))
add('sitBlink', { ...POSE_SIT, blink: true })
add('sitMouth', { ...POSE_SIT, mouth: true })
add('sitMouthL', { ...POSE_SIT, mouth: true, dx: -1 })
add('sitMouthR', { ...POSE_SIT, mouth: true, dx: 1 })
add('sitL', { ...POSE_SIT, dx: -1 })
add('sitR', { ...POSE_SIT, dx: 1 })
add('sleep', { ...POSE_SIT, blink: true, dy: 1 })

// Levantar e sentar usam os quadros intermediários da própria arte.
add('down1', shade(POSE_STAND_1))
add('down2', shade(POSE_STAND_2))
add('stand', shade(POSE_STAND_3))

// Caminhada: os 6 quadros do ciclo, sem a sombra quando está no ar.
POSE_WALK.forEach((pose, index) => add(`walk${index}`, shade(pose)))
add('air', { ...POSE_STAND_3, noShadow: true })
add('airHigh', { ...POSE_STAND_3, noShadow: true, dy: -1 })
add('airHighMouth', { ...POSE_STAND_3, noShadow: true, dy: -1, mouth: true })

// Blocos contíguos. Cada clipe lê quadros seguidos na folha, então as
// sequências que precisam de ordem própria ficam agrupadas no fim.
add('idle0', shade(POSE_STAND_3))
add('idle1', shade(POSE_STAND_3))
add('idle2', { ...POSE_STAND_3, blink: true })
add('idle3', shade(POSE_STAND_3))

add('rise0', shade(POSE_SIT))
add('rise1', shade(POSE_STAND_1))
add('rise2', shade(POSE_STAND_2))
add('rise3', shade(POSE_STAND_3))

add('settle0', shade(POSE_STAND_3))
add('settle1', shade(POSE_STAND_2))
add('settle2', shade(POSE_STAND_1))
add('settle3', shade(POSE_SIT))

const PAL = new Map(NOX_PAL.map((color, index) => ['123456789abcdef'[index], color]))

function drawPose(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  x: number,
  y: number,
  cell: number,
) {
  const { px, headX, headY } = frame
  const dx = x + (frame.dx ?? 0)
  const dy = y + (frame.dy ?? 0)

  for (let row = 0; row < CAT_H; row++) {
    for (let col = 0; col < CAT_W; col++) {
      const char = px[row * CAT_W + col]
      if (char === '.') continue
      const color = PAL.get(char)
      if (!color) continue
      if (frame.noShadow && color === SHADOW) continue
      if (frame.blink && (color === EYE || color === GLEAM)) continue
      // A sombra do chão é bege no SVG original, feita para fundo creme. No
      // site o gato passa por seções claras e escuras, então vira um preto
      // translúcido, que funciona nos dois fundos.
      ctx.fillStyle = color === SHADOW ? 'rgba(0, 0, 0, 0.22)' : color
      ctx.fillRect(dx + col, dy + row, cell, cell)
    }
  }

  if (frame.blink) {
    ctx.fillStyle = OUTLINE
    ctx.fillRect(dx + headX + 6, dy + headY + 9, 2, 1)
    ctx.fillRect(dx + headX + 12, dy + headY + 9, 2, 1)
  }

  if (frame.mouth) {
    ctx.fillStyle = OUTLINE
    ctx.fillRect(dx + headX + 9, dy + headY + 12, 2, 1)
  }
}

export function createMascotSheet(): MascotSheet {
  const canvas = document.createElement('canvas')
  canvas.width = CAT_W * FRAMES.length
  canvas.height = CAT_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  FRAMES.forEach((frame, index) => drawPose(ctx, frame, index * CAT_W, 0, 1))

  return {
    image: canvas,
    frameW: CAT_W,
    frameH: CAT_H,
    clips: {
      idle: { start: at.idle0, count: 4, fps: 3, loop: true },
      walk: { start: at.walk0, count: 6, fps: 8, loop: true },
      trot: { start: at.walk0, count: 6, fps: 13, loop: true },
      jump: { start: at.air, count: 1, fps: 1, loop: false },
      fall: { start: at.air, count: 1, fps: 1, loop: false },
      land: { start: at.down2, count: 1, fps: 1, loop: false },
      hover: { start: at.air, count: 2, fps: 4, loop: true },
      sit: { start: at.sit, count: 2, fps: 1.6, loop: true },
      sleep: { start: at.sleep, count: 2, fps: 0.9, loop: true },
      wake: { start: at.rise0, count: 4, fps: 9, loop: false },
      paw: { start: at.sitL, count: 2, fps: 4, loop: true },
      complain: { start: at.sitMouthL, count: 2, fps: 6, loop: true },
      scared: { start: at.air, count: 1, fps: 1, loop: true },
      held: { start: at.sit, count: 2, fps: 3, loop: true },
      dragged: { start: at.sitL, count: 2, fps: 7, loop: true },
      celebrate: { start: at.airHigh, count: 2, fps: 6, loop: true },
      wave: { start: at.sitL, count: 2, fps: 5, loop: true },
      pull: { start: at.sitR, count: 2, fps: 4, loop: true },
      yawn: { start: at.rise0, count: 4, fps: 9, loop: false },
      point: { start: at.idle0, count: 4, fps: 3, loop: true },
      scratch: { start: at.sitMouthL, count: 2, fps: 6, loop: true },
      leap: { start: at.air, count: 1, fps: 1, loop: false },
      standup: { start: at.rise0, count: 4, fps: 10, loop: false },
      sitdown: { start: at.settle0, count: 4, fps: 10, loop: false },
    },
  }
}

export const createPlaceholderSheet = createMascotSheet

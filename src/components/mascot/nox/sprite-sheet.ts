import atlasUrl from './assets/atlas/nox-atlas.png'
import referenceUrl from './assets/reference/nox-raw-43x55.png'
import { NOX_ANIMATIONS } from './animation/registry'
import type { FrameRect, SpriteMeta } from './animation/types'

export interface NoxSheet {
  image: HTMLImageElement
  meta: SpriteMeta
}

function load(url: string, label: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`falha ao carregar ${label}`))
    image.src = url
  })
}

export async function loadNoxAssets() {
  const [image, reference] = await Promise.all([
    load(atlasUrl, 'o atlas do Nox'),
    load(referenceUrl, 'a referencia crua'),
  ])
  return { sheet: { image, meta: NOX_ANIMATIONS.meta } satisfies NoxSheet, reference }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: NoxSheet,
  frame: FrameRect,
  scale: number,
) {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    sheet.image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    0,
    0,
    frame.w * scale,
    frame.h * scale,
  )
}

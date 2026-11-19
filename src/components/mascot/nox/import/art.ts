// Preparo das imagens do importador do Nox.
//
// O corte acontece em coordenadas inteiras da origem. A composicao copia os
// pixels 1:1 quando a arte cabe no canvas do clipe; quando nao cabe, aplica um
// divisor inteiro com amostragem nearest, nunca ampliando nem interpolando.

import { readImage } from '../../studio/import-art'

export type BackgroundMode = 'keep' | 'components' | 'global'

export interface BackgroundOptions {
  mode: BackgroundMode
  colors: Rgb[]
  tolerance: number
}

export interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Band {
  x0: number
  x1: number
}

export interface ComposeOptions {
  width: number
  height: number
  anchorX: number
  anchorY: number
  /** So vale para clipes aereos: mantem a subida do corpo entre os quadros. */
  preserveVertical: boolean
  /** Linha de referencia exclusiva (o ultimo pixel do pe fica em baseline - 1). */
  baseline: number
  /** Divisor inteiro da arte (1 = 1:1). So reduz, nunca amplia. */
  divisor: number
}

export interface ComposedFrame {
  data: ImageData | null
  empty: boolean
  clipped: boolean
  top: number
  bottom: number
}

const CONTENT_ALPHA = 8

export function loadImageData(file: File) {
  return readImage(file)
}

export function cloneImageData(data: ImageData) {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
}

function channelDistance(px: Uint8ClampedArray, offset: number, color: Rgb) {
  return Math.max(
    Math.abs(px[offset] - color.r),
    Math.abs(px[offset + 1] - color.g),
    Math.abs(px[offset + 2] - color.b),
  )
}

// Os quatro cantos mandam mais que o primeiro pixel: num PNG com alpha o canto
// e transparente e o primeiro pixel colorido seria o contorno do gato.
export function cornerColor(data: ImageData): Rgb {
  const px = data.data
  const width = data.width
  const height = data.height
  const points = [
    (0 * width + 0) * 4,
    (0 * width + width - 1) * 4,
    ((height - 1) * width + 0) * 4,
    ((height - 1) * width + width - 1) * 4,
  ]

  let r = 0
  let g = 0
  let b = 0
  let a = 0
  for (const offset of points) {
    r += px[offset]
    g += px[offset + 1]
    b += px[offset + 2]
    a += px[offset + 3]
  }

  const count = points.length
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    a: Math.round(a / count),
  }
}

export interface BackgroundSuggestion {
  mode: BackgroundMode
  colors: Rgb[]
}

// A cor dominante nao e o canto: num sheet com moldura preta o canto e a
// moldura e o fundo real (branco) fica preso dentro dela. Por isso a sugestao
// junta a cor dominante com a do canto e deixa as duas removiveis.
export function dominantColor(data: ImageData): Rgb | null {
  const px = data.data
  const stepX = Math.max(1, Math.ceil(data.width / 512))
  const stepY = Math.max(1, Math.ceil(data.height / 512))
  const bins = new Map<number, { count: number; r: number; g: number; b: number; a: number }>()

  for (let y = 0; y < data.height; y += stepY) {
    for (let x = 0; x < data.width; x += stepX) {
      const offset = (y * data.width + x) * 4
      if (px[offset + 3] < 250) continue
      const key =
        ((px[offset] >> 3) << 10) | ((px[offset + 1] >> 3) << 5) | (px[offset + 2] >> 3)
      let bin = bins.get(key)
      if (!bin) {
        bin = { count: 0, r: 0, g: 0, b: 0, a: 0 }
        bins.set(key, bin)
      }
      bin.count++
      bin.r += px[offset]
      bin.g += px[offset + 1]
      bin.b += px[offset + 2]
      bin.a += px[offset + 3]
    }
  }

  let best: { count: number; r: number; g: number; b: number; a: number } | null = null
  for (const bin of bins.values()) {
    if (!best || bin.count > best.count) best = bin
  }
  if (!best) return null
  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
    a: Math.round(best.a / best.count),
  }
}

export function colorDistance(a: Rgb, b: Rgb) {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
}

export function suggestBackground(data: ImageData): BackgroundSuggestion {
  const corner = cornerColor(data)
  const px = data.data

  let transparent = 0
  let samples = 0
  for (let offset = 3; offset < px.length; offset += 16) {
    samples++
    if (px[offset] < 16) transparent++
  }

  // PNG com alpha de verdade nao tem fundo para remover, so anti-serrao na
  // borda. A fracao de transparencia separa os dois casos.
  if (corner.a < 250 || (samples > 0 && transparent / samples > 0.01)) {
    return { mode: 'keep', colors: [] }
  }

  const colors: Rgb[] = []
  const dominant = dominantColor(data)
  if (dominant) colors.push(dominant)
  if (!colors.some((color) => colorDistance(color, corner) <= 24)) colors.push(corner)

  return { mode: colors.length ? 'components' : 'keep', colors: colors.slice(0, 3) }
}

export function rgbHex(color: Rgb) {
  const to = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
  return `#${to(color.r)}${to(color.g)}${to(color.b)}`
}

function matchColor(px: Uint8ClampedArray, offset: number, colors: Rgb[], tolerance: number) {
  for (const color of colors) {
    if (channelDistance(px, offset, color) <= tolerance) return true
  }
  return false
}

const MIN_COMPONENT_AREA = 1024
const COMPONENT_AREA_RATIO = 0.005

// Remove a cor escolhida por componente: some o fundo grande (mesmo que a
// moldura o separe da borda) e ficam os detalhes pequenos, como o brilho do
// olho. Componente que encosta na borda sempre sai.
function removeComponents(data: ImageData, colors: Rgb[], tolerance: number) {
  const out = cloneImageData(data)
  const { width, height } = out
  const total = width * height
  const px = out.data
  const visited = new Uint8Array(total)
  const stack = new Int32Array(total)
  const minArea = Math.max(MIN_COMPONENT_AREA, Math.round(total * COMPONENT_AREA_RATIO))

  for (const color of colors) {
    let top = 0

    const push = (index: number) => {
      if (visited[index]) return
      const offset = index * 4
      if (px[offset + 3] === 0) {
        visited[index] = 1
        return
      }
      if (channelDistance(px, offset, color) > tolerance) return
      visited[index] = 1
      stack[top++] = index
    }

    for (let start = 0; start < total; start++) {
      if (visited[start]) continue
      const offset = start * 4
      if (px[offset + 3] === 0) {
        visited[start] = 1
        continue
      }
      if (channelDistance(px, offset, color) > tolerance) continue

      top = 0
      visited[start] = 1
      stack[top++] = start
      const members: number[] = []
      let touchesBorder = false

      while (top > 0) {
        const index = stack[--top]
        members.push(index)
        const x = index % width
        const y = (index - x) / width
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true
        if (x > 0) push(index - 1)
        if (x < width - 1) push(index + 1)
        if (y > 0) push(index - width)
        if (y < height - 1) push(index + width)
      }

      if (touchesBorder || members.length >= minArea) {
        for (const index of members) px[index * 4 + 3] = 0
      }
    }
  }

  return out
}

// A compressao deixa uma linha fina de pixels intermediarios em volta da
// moldura, que nao e branca nem preta o bastante para sair junto. Linhas
// compridas e vazadas (moldura) e riscos de 1-2 px saem aqui; o gato tem
// preenchimento, entao nao se encaixa nesses casos.
function removeFrameLines(out: ImageData) {
  const { width, height } = out
  const px = out.data
  const total = width * height
  const visited = new Uint8Array(total)
  const stack = new Int32Array(total)
  const longSide = Math.max(width, height)
  let top = 0

  const push = (index: number) => {
    if (visited[index]) return
    if (px[index * 4 + 3] === 0) {
      visited[index] = 1
      return
    }
    visited[index] = 1
    stack[top++] = index
  }

  for (let start = 0; start < total; start++) {
    if (visited[start]) continue
    if (px[start * 4 + 3] === 0) {
      visited[start] = 1
      continue
    }

    top = 0
    visited[start] = 1
    stack[top++] = start
    const members: number[] = []
    let minX = width
    let maxX = -1
    let minY = height
    let maxY = -1

    while (top > 0) {
      const index = stack[--top]
      members.push(index)
      const x = index % width
      const y = (index - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0) push(index - 1)
      if (x < width - 1) push(index + 1)
      if (y > 0) push(index - width)
      if (y < height - 1) push(index + width)
    }

    const boxWidth = maxX - minX + 1
    const boxHeight = maxY - minY + 1
    const tall = boxHeight >= height * 0.5
    const wide = boxWidth >= width * 0.5

    let r = 0
    let g = 0
    let b = 0
    for (const index of members) {
      const offset = index * 4
      r += px[offset]
      g += px[offset + 1]
      b += px[offset + 2]
    }
    r /= members.length
    g /= members.length
    b /= members.length
    const spread = Math.max(r, g, b) - Math.min(r, g, b)
    const luma = (r + g + b) / 3
    // Sobra de anti-serrao entre a moldura preta e o fundo branco: cinza claro
    // e fino. Nao e arte, entao sai mesmo em pedacos curtos.
    const halo = (boxWidth <= 2 || boxHeight <= 2) && spread <= 30 && luma >= 150

    const line =
      halo ||
      (boxWidth <= 2 && tall) ||
      (boxHeight <= 2 && wide) ||
      (boxWidth <= 2 && boxHeight >= 24) ||
      (boxHeight <= 2 && boxWidth >= 24) ||
      (boxWidth >= longSide * 0.1 &&
        boxHeight >= height * 0.5 &&
        members.length / (boxWidth * boxHeight) < 0.08)

    if (line) {
      for (const index of members) px[index * 4 + 3] = 0
    }
  }
}

export function removeBackground(data: ImageData, options: BackgroundOptions) {
  const { mode, colors, tolerance } = options
  if (mode === 'keep' || colors.length === 0) return cloneImageData(data)

  if (mode === 'global') {
    const out = cloneImageData(data)
    const px = out.data
    for (let offset = 0; offset < px.length; offset += 4) {
      if (px[offset + 3] === 0) continue
      if (matchColor(px, offset, colors, tolerance)) px[offset + 3] = 0
    }
    return out
  }

  const out = removeComponents(data, colors, tolerance)
  removeFrameLines(out)
  return out
}

// Uma coluna vazia separa os quadros. O gap junta pedacos do mesmo desenho que
// tenham um vao interno (a cauda longe do corpo, por exemplo).
export function findBands(data: ImageData, gap: number, minWidth: number): Band[] {
  const { width, height } = data
  const px = data.data
  const columns = new Uint8Array(width)

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (px[(y * width + x) * 4 + 3] >= CONTENT_ALPHA) {
        columns[x] = 1
        break
      }
    }
  }

  const raw: Band[] = []
  let start = -1
  for (let x = 0; x <= width; x++) {
    const filled = x < width && columns[x] === 1
    if (filled && start < 0) start = x
    if (!filled && start >= 0) {
      raw.push({ x0: start, x1: x })
      start = -1
    }
  }

  const merged: Band[] = []
  for (const band of raw) {
    const last = merged[merged.length - 1]
    if (last && band.x0 - last.x1 <= gap) last.x1 = band.x1
    else merged.push({ ...band })
  }

  return merged.filter((band) => band.x1 - band.x0 >= minWidth)
}

export function bandsFromCuts(cuts: number[], width: number): Band[] {
  const clean = [...new Set(cuts.filter((value) => value >= 0 && value <= width))].sort((a, b) => a - b)
  if (clean.length < 2 || clean[0] !== 0) clean.unshift(0)
  if (clean[clean.length - 1] !== width) clean.push(width)

  const bands: Band[] = []
  for (let index = 0; index < clean.length - 1; index++) {
    if (clean[index + 1] > clean[index]) {
      bands.push({ x0: clean[index], x1: clean[index + 1] })
    }
  }
  return bands
}

export function autoCuts(data: ImageData, gap: number, minWidth: number) {
  const width = data.width
  const bands = findBands(data, gap, minWidth)
  if (!bands.length) return [0, width]

  const cuts = [0]
  for (let index = 1; index < bands.length; index++) {
    cuts.push(Math.floor((bands[index - 1].x1 + bands[index].x0) / 2))
  }
  cuts.push(width)
  return cuts
}

export function contentBox(data: ImageData, x0: number, x1: number): Box | null {
  const { width, height } = data
  const px = data.data
  const left = Math.max(0, Math.floor(x0))
  const right = Math.min(width, Math.ceil(x1))
  let minX = right
  let maxX = left
  let minY = height
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = left; x < right; x++) {
      if (px[(y * width + x) * 4 + 3] < CONTENT_ALPHA) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxY < 0) return null
  return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 }
}

// Copia o conteúdo do segmento para o canvas do clipe. O eixo X e centralizado
// na ancora; o eixo Y encosta a base de cada quadro na linha dos pes, ou, nos
// clipes aereos, preserva a altura relativa de todos os quadros. O divisor
// reduz a arte por amostragem nearest (nunca amplia).
export function composeFrame(
  source: ImageData,
  x0: number,
  x1: number,
  options: ComposeOptions,
): ComposedFrame {
  const box = contentBox(source, x0, x1)
  if (!box) return { data: null, empty: true, clipped: false, top: 0, bottom: -1 }

  const { width, height } = options
  const divisor = Math.max(1, Math.round(options.divisor))
  const out = new ImageData(width, height)
  const src = source.data
  const dest = out.data
  const srcWidth = source.width

  const boxWidth = box.x1 - box.x0
  const boxHeight = box.y1 - box.y0
  const targetWidth = Math.max(1, Math.ceil(boxWidth / divisor))
  const targetHeight = Math.max(1, Math.ceil(boxHeight / divisor))

  const dx = options.anchorX - Math.floor(targetWidth / 2)
  const dy = options.preserveVertical
    ? options.anchorY - Math.round((options.baseline - box.y0) / divisor)
    : options.anchorY - targetHeight

  const sampleX = Math.floor(divisor / 2)
  const sampleY = Math.floor(divisor / 2)

  let top = height
  let bottom = -1
  let clipped = false

  for (let ty = 0; ty < targetHeight; ty++) {
    const sy = box.y0 + Math.min(boxHeight - 1, ty * divisor + sampleY)
    const targetY = ty + dy
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx = box.x0 + Math.min(boxWidth - 1, tx * divisor + sampleX)
      const sourceOffset = (sy * srcWidth + sx) * 4
      const alpha = src[sourceOffset + 3]
      if (alpha === 0) continue
      const targetX = tx + dx
      if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        if (alpha >= CONTENT_ALPHA) clipped = true
        continue
      }
      const targetOffset = (targetY * width + targetX) * 4
      dest[targetOffset] = src[sourceOffset]
      dest[targetOffset + 1] = src[sourceOffset + 1]
      dest[targetOffset + 2] = src[sourceOffset + 2]
      dest[targetOffset + 3] = alpha
      if (targetY < top) top = targetY
      if (targetY > bottom) bottom = targetY
    }
  }

  if (bottom < 0) return { data: null, empty: true, clipped, top: 0, bottom: -1 }
  return { data: out, empty: false, clipped, top, bottom }
}

// Menor divisor inteiro que faz todos os quadros caberem no canvas. Como so
// divide, arte que ja cabe fica em 1:1.
export function fitDivisor(boxes: (Box | null)[], width: number, height: number, padding = 4) {
  let maxWidth = 0
  let maxHeight = 0
  for (const box of boxes) {
    if (!box) continue
    maxWidth = Math.max(maxWidth, box.x1 - box.x0)
    maxHeight = Math.max(maxHeight, box.y1 - box.y0)
  }
  if (!maxWidth || !maxHeight) return 1

  const limitWidth = Math.max(1, width - padding * 2)
  const limitHeight = Math.max(1, height - padding * 2)
  let divisor = 1
  while (
    (maxWidth / divisor > limitWidth || maxHeight / divisor > limitHeight) &&
    divisor < 64
  ) {
    divisor++
  }
  return divisor
}

export function imageDataToCanvas(data: ImageData) {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  const context = canvas.getContext('2d')
  if (context) context.putImageData(data, 0, 0)
  return canvas
}

// Ponto de menor projeção dentro da faixa: o corte manual cai no vazio entre
// duas poses em vez de atravessar uma pata.
export function quietestColumn(data: ImageData, band: Band) {
  const inner = Math.max(4, Math.floor((band.x1 - band.x0) / 10))
  const start = band.x0 + inner
  const end = band.x1 - inner
  if (end <= start) return Math.floor((band.x0 + band.x1) / 2)

  const px = data.data
  let best = start
  let bestCount = Infinity
  for (let x = start; x < end; x++) {
    let count = 0
    for (let y = 0; y < data.height; y++) {
      if (px[(y * data.width + x) * 4 + 3] >= CONTENT_ALPHA) count++
    }
    if (count < bestCount) {
      bestCount = count
      best = x
    }
    if (bestCount === 0) break
  }
  return best
}

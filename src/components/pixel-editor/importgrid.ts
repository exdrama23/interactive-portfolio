// Deteccao da grade de uma imagem importada.
//
// Quando a arte foi ampliada em blocos (cada pixel virou um quadrado), as
// bordas de cor se repetem a cada `cell` colunas e linhas. A deteccao mede a
// forca das bordas em cada coluna e procura o passo que cai sempre nelas.
//
// A reducao usa a cor dominante do bloco, nao a media: arte de pixel tem cor
// chapada e media transformaria contorno em cinza.

import type { Raster } from './model'

export interface Grid {
  cell: number
  offsetX: number
  offsetY: number
  score: number
}

const OPAQUE = 32

function columnEdges(image: Raster) {
  const { width, height, data } = image
  const edges = new Float32Array(width)
  for (let x = 1; x < width; x++) {
    let hits = 0
    let total = 0
    for (let y = 0; y < height; y++) {
      const a = (y * width + x - 1) * 4
      const b = (y * width + x) * 4
      if (data[a + 3] < OPAQUE || data[b + 3] < OPAQUE) continue
      total++
      if (data[a] !== data[b] || data[a + 1] !== data[b + 1] || data[a + 2] !== data[b + 2]) hits++
    }
    edges[x] = total ? hits / total : 0
  }
  return edges
}

function rowEdges(image: Raster) {
  const { width, height, data } = image
  const edges = new Float32Array(height)
  for (let y = 1; y < height; y++) {
    let hits = 0
    let total = 0
    for (let x = 0; x < width; x++) {
      const a = ((y - 1) * width + x) * 4
      const b = (y * width + x) * 4
      if (data[a + 3] < OPAQUE || data[b + 3] < OPAQUE) continue
      total++
      if (data[a] !== data[b] || data[a + 1] !== data[b + 1] || data[a + 2] !== data[b + 2]) hits++
    }
    edges[y] = total ? hits / total : 0
  }
  return edges
}

// Melhor passo e fase para um eixo. O limite de 2% faz a subdivisao vencer
// quando 8 e 16 empatam: o bloco menor continua exato e nao perde detalhe.
function bestStep(edges: Float32Array, limit: number) {
  let total = 0
  for (let i = 1; i < edges.length; i++) total += edges[i]

  let best = { cell: 1, offset: 0, score: 0 }
  const scored: { cell: number; offset: number; score: number }[] = []
  const maxCell = Math.max(2, Math.min(256, Math.floor(limit / 2)))

  for (let cell = 2; cell <= maxCell; cell++) {
    let cellBest = { cell, offset: 0, score: -1 }
    for (let offset = 0; offset < cell; offset++) {
      let boundary = 0
      let count = 0
      for (let x = offset; x < edges.length; x += cell) {
        if (x < 1) continue
        boundary += edges[x]
        count++
      }
      if (!count) continue
      const inside = (total - boundary) / Math.max(1, edges.length - 1 - count)
      // A cobertura pesa: um passo que pula metade das bordas nao pode empatar
      // com o passo que pega todas, mesmo que a media das bordas seja alta.
      const score = (boundary / total) * (boundary / count) - inside
      if (score > cellBest.score) cellBest = { cell, offset, score }
    }
    if (cellBest.score > 0) scored.push(cellBest)
  }

  for (const item of scored) if (item.score > best.score) best = item
  const winner = scored.find((item) => item.score >= best.score * 0.98 && best.score > 0.02)
  return winner ?? best
}

export function detectGrid(image: Raster): Grid {
  const limit = Math.min(image.width, image.height)
  if (limit < 8) return { cell: 1, offsetX: 0, offsetY: 0, score: 0 }
  const columns = bestStep(columnEdges(image), image.width)
  const rows = bestStep(rowEdges(image), image.height)
  return {
    cell: Math.max(1, Math.round((columns.cell + rows.cell) / 2)),
    offsetX: columns.offset,
    offsetY: rows.offset,
    score: (columns.score + rows.score) / 2,
  }
}

// Fundo transparente: inunda a partir dos cantos e apaga o que estiver dentro
// da tolerancia. Cada canto e testado porque a imagem pode ter fundo chapado
// com um objeto encostando em um deles.
export function removeBackground(image: Raster, tolerance: number) {
  const { width, height, data } = image
  const out = data.slice()
  const result = { width, height, data: out }
  if (tolerance < 0) return result

  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  for (const [cx, cy] of corners) {
    const start = cy * width + cx
    if (seen[start]) continue
    const o = start * 4
    if (out[o + 3] < OPAQUE) continue
    stack.push(start)
    while (stack.length) {
      const index = stack.pop()!
      if (seen[index]) continue
      seen[index] = 1
      const p = index * 4
      if (out[p + 3] < OPAQUE) continue
      if (!within(out, p, o, tolerance)) continue
      out[p + 3] = 0
      const x = index % width
      if (x > 0) stack.push(index - 1)
      if (x < width - 1) stack.push(index + 1)
      if (index >= width) stack.push(index - width)
      if (index + width < width * height) stack.push(index + width)
    }
  }

  return result
}

function within(data: Uint8ClampedArray, a: number, b: number, tolerance: number) {
  const dr = Math.abs(data[a] - data[b])
  const dg = Math.abs(data[a + 1] - data[b + 1])
  const db = Math.abs(data[a + 2] - data[b + 2])
  return Math.max(dr, dg, db) <= tolerance
}

export interface Block {
  width: number
  height: number
  data: Uint32Array
}

// Reduz sem ampliar, por vizinho mais proximo. Serve para encaixar a arte ja
// reduzida num documento menor sem suavizar de novo.
export function fitBlocks(block: Block, maxWidth: number, maxHeight: number): Block {
  const scale = Math.min(1, maxWidth / block.width, maxHeight / block.height)
  const width = Math.max(1, Math.round(block.width * scale))
  const height = Math.max(1, Math.round(block.height * scale))
  if (width === block.width && height === block.height) return block
  const data = new Uint32Array(width * height)
  for (let y = 0; y < height; y++) {
    const sy = Math.min(block.height - 1, Math.floor((y * block.height) / height))
    for (let x = 0; x < width; x++) {
      const sx = Math.min(block.width - 1, Math.floor((x * block.width) / width))
      data[y * width + x] = block.data[sy * block.width + sx]
    }
  }
  return { width, height, data }
}

// Reduz cada bloco da grade a um pixel, pela cor dominante. Bloco vazio fica
// transparente.
export function sampleBlocks(image: Raster, cell: number, offsetX: number, offsetY: number): Block {
  const size = Math.max(1, Math.round(Number.isFinite(cell) ? cell : 1))
  const ox = Number.isFinite(offsetX) ? Math.round(offsetX) : 0
  const oy = Number.isFinite(offsetY) ? Math.round(offsetY) : 0
  const sourceWidth = Number.isFinite(image.width) && image.width > 0 ? image.width : 0
  const sourceHeight = Number.isFinite(image.height) && image.height > 0 ? image.height : 0
  const width = Math.max(1, Math.floor((sourceWidth - ox) / size))
  const height = Math.max(1, Math.floor((sourceHeight - oy) / size))
  const data = new Uint32Array(width * height)
  const { data: source } = image

  for (let by = 0; by < height; by++) {
    for (let bx = 0; bx < width; bx++) {
      const counts = new Map<number, number>()
      for (let y = 0; y < size; y++) {
        const sy = oy + by * size + y
        if (sy < 0 || sy >= sourceHeight) continue
        for (let x = 0; x < size; x++) {
          const sx = ox + bx * size + x
          if (sx < 0 || sx >= sourceWidth) continue
          const o = (sy * sourceWidth + sx) * 4
          if (source[o + 3] < OPAQUE) continue
          const value =
            ((source[o + 3] << 24) | (source[o + 2] << 16) | (source[o + 1] << 8) | source[o]) >>> 0
          counts.set(value, (counts.get(value) ?? 0) + 1)
        }
      }
      if (!counts.size) continue
      let best = 0
      let bestCount = 0
      for (const [value, count] of counts) {
        if (count > bestCount) {
          best = value
          bestCount = count
        }
      }
      data[by * width + bx] = best
    }
  }

  return { width, height, data }
}

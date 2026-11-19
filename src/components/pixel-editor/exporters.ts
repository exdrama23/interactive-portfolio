// Saídas do editor: PNG nativo, SVG vetorial, projeto em JSON e a conversão
// para a grade do Nox.
//
// O SVG sai com um retângulo por trecho de cor igual na mesma linha, não um por
// pixel: num desenho de 512 px isso é a diferença entre 40 mil nós e alguns
// milhares.

import { NOX_PAL } from '../mascot/sprite-art'
import {
  composite,
  contentBox,
  createDoc,
  createLayer,
  hexOf,
  type Doc,
  type Layer,
} from './model'

export function spriteCanvas(doc: Doc) {
  const canvas = document.createElement('canvas')
  canvas.width = doc.width
  canvas.height = doc.height
  const context = canvas.getContext('2d')
  if (context) context.putImageData(composite(doc), 0, 0)
  return canvas
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function exportPng(doc: Doc, name: string) {
  spriteCanvas(doc).toBlob((blob) => blob && download(blob, `${name}.png`))
}

export function svgOf(doc: Doc) {
  const image = composite(doc)
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}" shape-rendering="crispEdges">`,
  ]

  for (let y = 0; y < doc.height; y++) {
    let x = 0
    while (x < doc.width) {
      const o = (y * doc.width + x) * 4
      if (image.data[o + 3] < 32) {
        x++
        continue
      }
      const value = (image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2]
      let run = 1
      while (x + run < doc.width) {
        const n = (y * doc.width + x + run) * 4
        if (image.data[n + 3] < 32) break
        const next = (image.data[n] << 16) | (image.data[n + 1] << 8) | image.data[n + 2]
        if (next !== value) break
        run++
      }
      parts.push(
        `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${hexOf(value)}"/>`,
      )
      x += run
    }
  }

  parts.push('</svg>')
  return parts.join('')
}

export function exportSvg(doc: Doc, name: string) {
  download(new Blob([svgOf(doc)], { type: 'image/svg+xml' }), `${name}.svg`)
}

export interface ProjectFile {
  version: 1
  name: string
  width: number
  height: number
  layers: {
    name: string
    visible: boolean
    locked: boolean
    opacity: number
    blend: Layer['blend']
    reference?: boolean
    data: string
  }[]
  favorites: string[]
}

export function projectOf(doc: Doc, name: string): ProjectFile {
  return {
    version: 1,
    name,
    width: doc.width,
    height: doc.height,
    favorites: doc.favorites,
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blend: layer.blend,
      reference: layer.reference ?? false,
      data: bytesToBase64(new Uint8Array(layer.data.buffer, layer.data.byteOffset, layer.data.byteLength)),
    })),
  }
}

export function docOfProject(project: ProjectFile): Doc {
  const doc = createDoc(project.width, project.height)
  return {
    ...doc,
    favorites: project.favorites ?? doc.favorites,
    layers: project.layers.map((layer) => {
      const created = createLayer(project.width, project.height, layer.name)
      const bytes = base64ToBytes(layer.data)
      const data = new Uint32Array(project.width * project.height)
      data.set(new Uint32Array(bytes.buffer, 0, Math.min(data.length, bytes.byteLength / 4)))
      return {
        ...created,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blend: layer.blend,
        reference: layer.reference ?? false,
        data,
      }
    }),
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(text: string) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Converte a composição para a grade 30x28 do Nox: encolhe se não couber,
// centraliza e alinha pelo pé, que é como o gato fica no chão.
export const NOX_W = 30
export const NOX_H = 28

export function noxRows(doc: Doc) {
  const image = composite(doc)
  const rows = Array.from({ length: NOX_H }, () => Array<string>(NOX_W).fill('.'))
  const palette = NOX_PAL.map((hex) => Number.parseInt(hex.slice(1), 16))

  // Documento que ja cabe no quadro passa inteiro, pixel a pixel. Recortar e
  // recentralizar aqui moveria a arte que o usuario desenhou na propria grade.
  if (doc.width <= NOX_W && doc.height <= NOX_H) {
    for (let y = 0; y < doc.height; y++) {
      for (let x = 0; x < doc.width; x++) {
        const o = (y * image.width + x) * 4
        if (image.data[o + 3] < 32) continue
        const value = (image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2]
        rows[y][x] = charFor(value, palette)
      }
    }
    return rows.map((row) => row.join(''))
  }

  const box = contentBox(image)
  if (!box) return rows.map((row) => row.join(''))

  const scale = Math.min(1, NOX_W / box.w, NOX_H / box.h)
  const w = Math.max(1, Math.round(box.w * scale))
  const h = Math.max(1, Math.round(box.h * scale))
  const left = Math.floor((NOX_W - w) / 2)
  const top = NOX_H - h

  // Cada pixel da origem cai numa celula do destino. Antes de contar, o pixel
  // ja vira indice da paleta: o bege da borda suavizada nao se parece com pelo,
  // mas contado cru ele vencia a celula de borda.
  const buckets = new Map<number, Map<number, number>>()
  const totals = new Map<number, number>()
  for (let y = box.y; y < box.y + box.h; y++) {
    const dy = Math.min(h - 1, Math.floor(((y - box.y) * h) / box.h))
    for (let x = box.x; x < box.x + box.w; x++) {
      const dx = Math.min(w - 1, Math.floor(((x - box.x) * w) / box.w))
      const cell = dy * w + dx
      totals.set(cell, (totals.get(cell) ?? 0) + 1)
      const o = (y * image.width + x) * 4
      if (image.data[o + 3] < 32) continue
      const value = (image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2]
      const index = nearestIndex(value, palette)
      let counts = buckets.get(cell)
      if (!counts) buckets.set(cell, (counts = new Map()))
      counts.set(index, (counts.get(index) ?? 0) + 1)
    }
  }

  const cells = new Array<number>(w * h).fill(-1)
  const coverage = new Map<number, number>()
  for (const [cell, counts] of buckets) {
    const total = totals.get(cell) ?? 0
    const cover = total ? opaqueCount(counts) / total : 0
    coverage.set(cell, cover)
    // Celula quase vazia e so a borda suavizada do desenho. Pintar ali deixa um
    // halo claro em volta da silhueta, e era o que sujava a reducao.
    if (cover < 0.25) continue

    let best = 0
    let bestCount = -1
    for (const [index, count] of counts) {
      if (count > bestCount) {
        bestCount = count
        best = index
      }
    }

    // Tom escuro com area parecida fica com a celula: e o que separa o contorno
    // e as sombras do corpo em vez de achatar tudo no tom dominante.
    let darkest = -1
    const opaque = opaqueCount(counts)
    for (const [index, count] of counts) {
      if (count < opaque * 0.4) continue
      if (luminance(palette[index]) < luminance(palette[best]) - 10) darkest = index
    }
    if (darkest >= 0) best = darkest
    cells[cell] = best
  }

  // Brilho pequeno e claro (olho) so vence em celula cheia e cercada de desenho.
  for (const [cell, counts] of buckets) {
    const best = cells[cell]
    if (best < 0 || (coverage.get(cell) ?? 0) < 0.9) continue
    if (luminance(palette[best]) >= 100 || !interior(cell, w, h, cells)) continue
    let glint = -1
    let glintCount = 0
    for (const [index, count] of counts) {
      if (count < 3 || luminance(palette[index]) < 210) continue
      if (count > glintCount) {
        glintCount = count
        glint = index
      }
    }
    if (glint >= 0) cells[cell] = glint
  }

  // Contorno de um pixel na borda da silhueta. Sem ele a reducao fica chapada e
  // o gato se mistura com o fundo escuro do site.
  let outline = 0
  for (let index = 1; index < palette.length; index++) {
    if (luminance(palette[index]) < luminance(palette[outline])) outline = index
  }
  for (let cell = 0; cell < cells.length; cell++) {
    const best = cells[cell]
    if (best < 0 || luminance(palette[best]) <= 45) continue
    if (isEdge(cell, w, h, cells)) cells[cell] = outline
  }

  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] < 0) continue
    rows[top + Math.floor(cell / w)][left + (cell % w)] = CHARS[cells[cell]]
  }

  return rows.map((row) => row.join(''))
}

function interior(cell: number, width: number, height: number, cells: number[]) {
  const x = cell % width
  const y = Math.floor(cell / width)
  if (x === 0 || x === width - 1 || y === 0 || y === height - 1) return false
  return cells[cell - 1] >= 0 && cells[cell + 1] >= 0 && cells[cell - width] >= 0 && cells[cell + width] >= 0
}

function isEdge(cell: number, width: number, height: number, cells: number[]) {
  const x = cell % width
  const y = Math.floor(cell / width)
  return (
    (x > 0 && cells[cell - 1] < 0) ||
    (x < width - 1 && cells[cell + 1] < 0) ||
    (y > 0 && cells[cell - width] < 0) ||
    (y < height - 1 && cells[cell + width] < 0)
  )
}

function luminance(value: number) {
  return 0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)
}

function opaqueCount(counts: Map<number, number>) {
  let total = 0
  for (const count of counts.values()) total += count
  return total
}

const CHARS = '123456789abcdef'

function nearestIndex(value: number, palette: number[]) {
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < palette.length; i++) {
    const pr = (palette[i] >> 16) & 255
    const pg = (palette[i] >> 8) & 255
    const pb = palette[i] & 255
    const dr = r - pr
    const dg = g - pg
    const db = b - pb
    const distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

function charFor(value: number, palette: number[]) {
  return CHARS[nearestIndex(value, palette)] ?? '.'
}

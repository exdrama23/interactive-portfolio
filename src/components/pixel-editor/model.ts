// Documento do editor de pixel art.
//
// Cada camada guarda os pixels num Uint32Array (RGBA empacotado), então uma
// imagem de 512x512 custa 1 MB por camada em vez de 4. A composição é feita na
// hora de desenhar, nunca guardada: mudar a opacidade de uma camada é só mudar
// um número.

export type Blend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'difference'

export const BLENDS: Blend[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'difference',
]

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blend: Blend
  data: Uint32Array
  // Camada de referencia: aparece no editor para servir de base, mas fica de
  // fora de composite() por padrao, entao nao vaza para exportacao nem para o Nox.
  reference?: boolean
}

export interface Doc {
  width: number
  height: number
  layers: Layer[]
  active: number
  favorites: string[]
}

let counter = 0
const nextId = () => `layer-${++counter}`

export function createLayer(width: number, height: number, name: string): Layer {
  return {
    id: nextId(),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blend: 'normal',
    data: new Uint32Array(width * height),
  }
}

export function createDoc(width: number, height: number): Doc {
  return {
    width,
    height,
    layers: [createLayer(width, height, 'camada 1')],
    active: 0,
    favorites: ['#171514', '#282623', '#33302c', '#3f3b37', '#845446', '#bd7a67', '#f6ecd9'],
  }
}

export function cloneDoc(doc: Doc): Doc {
  return {
    width: doc.width,
    height: doc.height,
    active: doc.active,
    favorites: [...doc.favorites],
    layers: doc.layers.map((layer) => ({ ...layer, data: layer.data.slice() })),
  }
}

export function cloneLayers(doc: Doc): Layer[] {
  return doc.layers.map((layer) => ({ ...layer, data: layer.data.slice() }))
}

// RGBA empacotado com o byte de menor peso no vermelho combina com a ordem de
// bytes do ImageData em máquina little-endian, então dá para ler e escrever os
// dois jeitos no mesmo buffer.
export function packRgb(r: number, g: number, b: number, a = 255) {
  return (((a << 24) | (b << 16) | (g << 8) | r) >>> 0)
}

export function packHex(hex: string, alpha = 255) {
  const value = Number.parseInt(hex.slice(1), 16)
  return packRgb((value >> 16) & 255, (value >> 8) & 255, value & 255, alpha)
}

export function hexOf(value: number) {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(value & 255)}${to((value >>> 8) & 255)}${to((value >>> 16) & 255)}`
}

export function alphaOf(value: number) {
  return value >>> 24
}

function blendChannel(mode: Blend, src: number, dst: number) {
  switch (mode) {
    case 'multiply':
      return (src * dst) / 255
    case 'screen':
      return 255 - ((255 - src) * (255 - dst)) / 255
    case 'overlay':
      return dst < 128 ? (2 * src * dst) / 255 : 255 - (2 * (255 - src) * (255 - dst)) / 255
    case 'darken':
      return Math.min(src, dst)
    case 'lighten':
      return Math.max(src, dst)
    case 'difference':
      return Math.abs(src - dst)
    default:
      return src
  }
}

export function composite(doc: Doc, includeReference = false): ImageData {
  const image = new ImageData(doc.width, doc.height)
  const out = image.data

  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue
    if (layer.reference && !includeReference) continue
    const data = layer.data
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      if (!value) continue
      const sa = ((value >>> 24) / 255) * layer.opacity
      if (sa <= 0) continue

      const o = i * 4
      const da = out[o + 3] / 255
      const sr = value & 255
      const sg = (value >>> 8) & 255
      const sb = (value >>> 16) & 255
      const dr = out[o]
      const dg = out[o + 1]
      const db = out[o + 2]

      const br = da > 0 ? blendChannel(layer.blend, sr, dr) : sr
      const bg = da > 0 ? blendChannel(layer.blend, sg, dg) : sg
      const bb = da > 0 ? blendChannel(layer.blend, sb, db) : sb
      const oa = sa + da * (1 - sa)
      if (oa <= 0) continue

      out[o] = (br * sa + dr * da * (1 - sa)) / oa
      out[o + 1] = (bg * sa + dg * da * (1 - sa)) / oa
      out[o + 2] = (bb * sa + db * da * (1 - sa)) / oa
      out[o + 3] = oa * 255
    }
  }

  return image
}

export function contentBox(image: ImageData) {
  let x0 = image.width
  let y0 = image.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = image.data[(y * image.width + x) * 4 + 3]
      if (alpha < 32) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export function resizeDoc(doc: Doc, width: number, height: number): Doc {
  const layers = doc.layers.map((layer) => {
    const data = new Uint32Array(width * height)
    for (let y = 0; y < height; y++) {
      const sy = Math.min(doc.height - 1, Math.floor((y * doc.height) / height))
      for (let x = 0; x < width; x++) {
        const sx = Math.min(doc.width - 1, Math.floor((x * doc.width) / width))
        data[y * width + x] = layer.data[sy * doc.width + sx]
      }
    }
    return { ...layer, data }
  })
  return { ...doc, width, height, layers }
}

export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

// Encaixa uma imagem dentro de um limite sem esticar e devolve o bloco já
// reduzido. Reduzir nunca aumenta: arte pequena entra no tamanho original.
export function imageBlock(image: Raster, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const data = new Uint32Array(width * height)

  // Cada pixel de destino é a média da área que ele cobre na origem. Numa
  // redução inteira isso devolve a cor exata do bloco, sem suavizar.
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * image.height) / height)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * image.width) / width)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width))
      data[y * width + x] = boxColor(image.data, image.width, x0, y0, x1, y1)
    }
  }

  return { width, height, data }
}

// Média ponderada pelo alfa, para as bordas transparentes não escurecerem o
// resultado com o preto que está atrás delas.
function boxColor(data: Uint8ClampedArray, width: number, x0: number, y0: number, x1: number, y1: number) {
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * width + x) * 4
      const alpha = data[o + 3]
      r += data[o] * alpha
      g += data[o + 1] * alpha
      b += data[o + 2] * alpha
      a += alpha
      n++
    }
  }
  if (!n || a < 8) return 0
  return (
    ((Math.round(a / n) << 24) |
      (Math.round(b / a) << 16) |
      (Math.round(g / a) << 8) |
      Math.round(r / a)) >>>
    0
  )
}

export function lineCells(x0: number, y0: number, x1: number, y1: number) {
  const cells: [number, number][] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    cells.push([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
  return cells
}

export function floodFill(
  data: Uint32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: number,
  tolerance = 0,
) {
  const start = data[y * width + x]
  if (start === color) return false
  const stack = [y * width + x]
  while (stack.length) {
    const index = stack.pop()!
    if (!closeColor(data[index], start, tolerance)) continue
    data[index] = color
    const cx = index % width
    if (cx > 0) stack.push(index - 1)
    if (cx < width - 1) stack.push(index + 1)
    if (index >= width) stack.push(index - width)
    if (index + width < width * height) stack.push(index + width)
  }
  return true
}

// Tolerancia em canais: 0 exige a cor exata, 255 aceita qualquer coisa. O alfa
// entra na conta para o balde nao atravessar uma borda semitransparente.
function closeColor(value: number, target: number, tolerance: number) {
  if (tolerance <= 0) return value === target
  const dr = Math.abs((value & 255) - (target & 255))
  const dg = Math.abs(((value >>> 8) & 255) - ((target >>> 8) & 255))
  const db = Math.abs(((value >>> 16) & 255) - ((target >>> 16) & 255))
  const da = Math.abs((value >>> 24) - (target >>> 24))
  return Math.max(dr, dg, db, da) <= tolerance
}

export function eraseConnected(
  data: Uint32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  tolerance = 0,
) {
  return floodFill(data, width, height, x, y, 0, tolerance)
}

// Troca uma cor no arquivo inteiro, nao so no trecho conectado. Tolerancia 0
// pega so o tom exato, que e o caso de limpar uma cor chapada.
export function replaceColor(data: Uint32Array, from: number, to: number, tolerance = 0) {
  let count = 0
  for (let i = 0; i < data.length; i++) {
    if (!closeColor(data[i], from, tolerance)) continue
    data[i] = to
    count++
  }
  return count
}

export function nearestColor(value: number, palette: number[]) {
  const r = value & 255
  const g = (value >>> 8) & 255
  const b = (value >>> 16) & 255
  let best = value
  let bestDistance = Infinity
  for (const candidate of palette) {
    const dr = r - (candidate & 255)
    const dg = g - ((candidate >>> 8) & 255)
    const db = b - ((candidate >>> 16) & 255)
    const distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

export function quantize(data: Uint32Array, palette: number[]) {
  let count = 0
  for (let i = 0; i < data.length; i++) {
    if (!data[i]) continue
    const next = nearestColor(data[i], palette)
    if (next !== data[i]) {
      data[i] = next
      count++
    }
  }
  return count
}

// As N cores mais frequentes da imagem, sem contar transparente. Serve para
// quantizar mantendo a paleta que a propria arte ja usa.
export function topColors(image: ImageData, limit: number) {
  const counts = new Map<number, number>()
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue
    const value = packRgb(data[i], data[i + 1], data[i + 2])
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([value]) => value)
}

// Amplia o canvas mantendo o desenho existente inteiro, centralizado. Serve
// para importar uma arte maior sem cortar os pixels que já estavam ali.
export function expandDoc(doc: Doc, width: number, height: number): Doc {
  const left = Math.floor((width - doc.width) / 2)
  const top = Math.floor((height - doc.height) / 2)
  const layers = doc.layers.map((layer) => {
    const data = new Uint32Array(width * height)
    for (let y = 0; y < doc.height; y++) {
      for (let x = 0; x < doc.width; x++) {
        data[(top + y) * width + left + x] = layer.data[y * doc.width + x]
      }
    }
    return { ...layer, data }
  })
  return { ...doc, width, height, layers }
}

export function cropDoc(doc: Doc, box: { x: number; y: number; w: number; h: number }): Doc {
  const layers = doc.layers.map((layer) => {
    const data = new Uint32Array(box.w * box.h)
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        data[y * box.w + x] = layer.data[(box.y + y) * doc.width + box.x + x]
      }
    }
    return { ...layer, data }
  })
  return { ...doc, width: box.w, height: box.h, layers }
}

export function uniqueColors(image: ImageData) {
  const seen = new Set<number>()
  const colors: string[] = []
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue
    const value = packRgb(data[i], data[i + 1], data[i + 2])
    if (seen.has(value)) continue
    seen.add(value)
    colors.push(hexOf(value))
    if (colors.length > 48) break
  }
  return colors
}

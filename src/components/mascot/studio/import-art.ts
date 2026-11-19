// Leitura de imagem para a grade do Nox.
//
// O studio só entende texto (um caractere por célula), então uma imagem de fora
// passa por três passos: achar o tamanho da célula, cortar os quadros e trazer
// cada célula para a paleta.
//
// Só o primeiro passo pode errar, e é o único que não tem resposta exata quando
// o arquivo veio reescalonado. Por isso ele devolve o encaixe para o preview em
// vez de aplicar direto: quem decide é quem está olhando.

export interface Fit {
  cell: number
  offsetX: number
  offsetY: number
}

export interface Cells {
  columns: number
  rows: number
  cell: (string | null)[][]
}

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

const MIN_CELL = 3
const MAX_CELL = 40
const GOLDEN = 0.6180339887498949

type Region = { x0: number; y0: number; x1: number; y1: number }

function measure(data: ImageData, fit: Fit) {
  return {
    columns: Math.max(0, Math.floor((data.width - fit.offsetX) / fit.cell)),
    rows: Math.max(0, Math.floor((data.height - fit.offsetY) / fit.cell)),
  }
}

// O encaixe é bom quando cada célula é de uma cor só. Uma célula atravessada
// por uma borda tem desvio alto, então o desvio médio dentro das células serve
// de nota: 1 é grade perfeita, 0 é ruído.
export function scoreFit(data: ImageData, fit: Fit, samples = 320, region?: Region): number {
  const { columns, rows } = measure(data, fit)
  if (columns < 1 || rows < 1 || fit.cell < 1) return 0

  const total = columns * rows
  const px = data.data
  const count = Math.min(samples, total)
  let dev = 0
  let seen = 0

  for (let i = 0; i < count; i++) {
    const index = Math.floor(((i * GOLDEN) % 1) * total)
    const cx = index % columns
    const cy = Math.floor(index / columns)

    let x0 = Math.ceil(fit.offsetX + cx * fit.cell)
    let x1 = Math.floor(fit.offsetX + (cx + 1) * fit.cell)
    let y0 = Math.ceil(fit.offsetY + cy * fit.cell)
    let y1 = Math.floor(fit.offsetY + (cy + 1) * fit.cell)
    if (region) {
      x0 = Math.max(x0, region.x0)
      x1 = Math.min(x1, region.x1)
      y0 = Math.max(y0, region.y0)
      y1 = Math.min(y1, region.y1)
    }
    if (x1 - x0 < 2 || y1 - y0 < 2) continue

    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = (y * data.width + x) * 4
        if (px[o + 3] < 32) continue
        r += px[o]
        g += px[o + 1]
        b += px[o + 2]
        n++
      }
    }
    if (n < 4) continue
    r /= n
    g /= n
    b /= n

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = (y * data.width + x) * 4
        if (px[o + 3] < 32) continue
        dev += Math.abs(px[o] - r) + Math.abs(px[o + 1] - g) + Math.abs(px[o + 2] - b)
      }
    }
    seen += n * 3
  }

  return seen ? 1 - dev / (seen * 255) : 0
}

// A nota por cor dentro da célula não serve para achar o tamanho: numa foto
// suave ela prefere células pequenas, que sempre parecem mais lisas. O sinal
// que não engana é a borda. Numa grade de verdade, toda borda do desenho cai
// no mesmo ponto de cada célula, então o perfil de gradiente por coluna e por
// linha se dobra exatamente no tamanho da célula.
type Profile = { px: Float64Array; py: Float64Array; energy: Float32Array | null }

const EDGE_MIN = 30
const MAX_ENERGY_CELLS = 16_000_000

function edgeProfile(data: ImageData): Profile {
  const { width, height } = data
  const d = data.data
  const px = new Float64Array(width)
  const py = new Float64Array(height)
  const energy =
    width * height <= MAX_ENERGY_CELLS ? new Float32Array(width * height) : null
  const lum = (o: number) => d[o] * 2 + d[o + 1] * 3 + d[o + 2]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const o = (y * width + x) * 4
      const gx = Math.abs(lum(o + 4) - lum(o - 4))
      const gy = Math.abs(lum(o + width * 4) - lum(o - width * 4))
      if (gx > EDGE_MIN) px[x] += gx
      if (gy > EDGE_MIN) py[y] += gy
      if (energy) energy[y * width + x] = gx + gy
    }
  }

  return { px, py, energy }
}

// Dobra o perfil no passo da célula e mede duas coisas: precisão (quanta borda
// caiu em cima da grade) e cobertura (quanta borda da imagem a grade visitou).
// Só as duas juntas separam a célula real do dobro dela: o dobro acerta em
// cheio a precisão, mas perde metade das bordas. Célula menor que a real perde
// na precisão, porque cai no meio de áreas lisas.
function foldProfile(profile: Float64Array, cell: number) {
  const n = profile.length
  let total = 0
  for (let i = 0; i < n; i++) total += profile[i]
  if (total <= 0) return { score: 0, offset: 0 }
  const mean = total / n

  let best = { score: 0, offset: 0 }
  for (let off = 0; off < cell; off += 0.25) {
    let sum = 0
    let count = 0
    for (let pos = off; pos < n; pos += cell) {
      const i = Math.round(pos)
      if (i < 1 || i >= n - 1) continue
      sum += profile[i]
      count++
    }
    if (!count) continue
    const precision = sum / count / mean
    const recall = sum / total
    const score = precision * recall
    if (score > best.score) best = { score, offset: off }
  }

  return best
}

// Erro de reconstrução só onde a imagem tem borda. Numa célula certa a borda
// fica no limite e a célula continua de uma cor só. Numa célula errada a borda
// cai dentro dela e a média vira uma cor que não existe no desenho, então o
// erro sobe justamente onde importa. É isso que separa duas células que a
// dobra acha quase empatadas.
function edgeQuality(data: ImageData, fit: Fit, energy: Float32Array) {
  const { columns, rows } = measure(data, fit)
  const px = data.data
  let weighted = 0
  let weights = 0

  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.ceil(fit.offsetY + cy * fit.cell)
    const y1 = Math.floor(fit.offsetY + (cy + 1) * fit.cell)
    if (y1 - y0 < 2) continue
    for (let cx = 0; cx < columns; cx++) {
      const x0 = Math.ceil(fit.offsetX + cx * fit.cell)
      const x1 = Math.floor(fit.offsetX + (cx + 1) * fit.cell)
      const n = (x1 - x0) * (y1 - y0)
      if (x1 - x0 < 2 || n < 4) continue

      let edge = 0
      let r = 0
      let g = 0
      let b = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * data.width + x) * 4
          edge += energy[y * data.width + x]
          r += px[o]
          g += px[o + 1]
          b += px[o + 2]
        }
      }
      if (edge / n < 1.5) continue
      r /= n
      g /= n
      b /= n

      let dev = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * data.width + x) * 4
          dev += Math.abs(px[o] - r) + Math.abs(px[o + 1] - g) + Math.abs(px[o + 2] - b)
        }
      }
      weighted += (dev / (n * 765)) * edge
      weights += edge
    }
  }

  return weights ? 1 - weighted / weights : 0
}

const CELL_STEP = 0.05
const COARSE_CELLS = [4, 5, 6, 7, 8, 10, 12, 15, 20, 28, 40]

// Escala vem do fold, mas a fase vem da nota por cor: o fold acha o passo
// certo e tropeça no deslocamento, porque ele mede a imagem inteira e a borda
// do arquivo pesa tanto quanto a do desenho.
function refinePhase(data: ImageData, cell: number, start: Fit, fine: boolean) {
  const wrap = (value: number) => ((value % cell) + cell) % cell
  const step = Math.max(0.05, cell / 32)
  // Célula grande tem muita área: 600 amostras dela custam mais que a imagem
  // inteira. O teto mantém a conta parecida para qualquer tamanho de célula.
  const cap = Math.max(16, Math.floor(60000 / (cell * cell)))
  const samples = Math.min(fine ? 240 : 120, cap)
  let best = start
  let bestScore = scoreFit(data, best, samples)

  for (let i = 0; i < 32; i++) {
    const candidate = { ...best, offsetX: wrap(i * step) }
    const score = scoreFit(data, candidate, samples)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  for (let i = 0; i < 32; i++) {
    const candidate = { ...best, offsetY: wrap(i * step) }
    const score = scoreFit(data, candidate, samples)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  if (!fine) return { fit: best, score: bestScore }

  const fineStep = step / 8
  const dense = Math.min(600, cap)
  bestScore = scoreFit(data, best, dense)
  for (let ix = -4; ix <= 4; ix++) {
    for (let iy = -4; iy <= 4; iy++) {
      const candidate = {
        cell,
        offsetX: wrap(best.offsetX + ix * fineStep),
        offsetY: wrap(best.offsetY + iy * fineStep),
      }
      const score = scoreFit(data, candidate, dense)
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
  }

  return { fit: best, score: bestScore }
}

export function detectFit(data: ImageData): { fit: Fit; score: number } {
  // Arte já no tamanho real não tem repetição para medir: a célula é 1 e ponto.
  if (data.width <= 64 && data.height <= 64) {
    const fit = { cell: 1, offsetX: 0, offsetY: 0 }
    return { fit, score: scoreFit(data, fit) }
  }

  const profile = edgeProfile(data)
  const max = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.min(data.width, data.height) / 3))

  const ranked: { cell: number; score: number; offsetX: number; offsetY: number }[] = []
  for (let i = 0; i * CELL_STEP + MIN_CELL <= max; i++) {
    const cell = MIN_CELL + i * CELL_STEP
    const fx = foldProfile(profile.px, cell)
    const fy = foldProfile(profile.py, cell)
    if (!fx.score || !fy.score) continue
    ranked.push({ cell, score: fx.score * fy.score, offsetX: fx.offset, offsetY: fy.offset })
  }

  if (!ranked.length) {
    const fit = { cell: 1, offsetX: 0, offsetY: 0 }
    return { fit, score: scoreFit(data, fit) }
  }

  ranked.sort((a, b) => b.score - a.score)

  // A dobra é generosa: deixamos passar tudo que chega perto dela e a decisão
  // final fica com o erro de reconstrução nas bordas, que não erra de escala.
  const cut = ranked[0].score * 0.45
  const shortlist = ranked.filter((item) => item.score >= cut).slice(0, 8)

  // Imagem muito desfocada some com o sinal da dobra e ela só enxerga células
  // minúsculas. Por isso entram também células grandes de uma lista fixa: se
  // uma delas reconstrói as bordas tão bem quanto a pequena, a pequena era só
  // um pedaço dela.
  const coarse = COARSE_CELLS.filter((cell) => cell <= max).map((cell) => ({
    cell,
    score: 0,
    offsetX: 0,
    offsetY: 0,
  }))

  const graded = [...shortlist, ...coarse].map((item) => {
    const cell = snapCell(item.cell)
    const phase = refinePhase(data, cell, { cell, offsetX: item.offsetX, offsetY: item.offsetY }, false)
    const quality = profile.energy ? edgeQuality(data, phase.fit, profile.energy) : phase.score
    return { fit: phase.fit, quality, phaseScore: phase.score }
  })

  // A dobra já acerta a célula em arte limpa, então o erro de borda só manda
  // quando a diferença é clara. Sem essa margem, um desvio de meio pixel numa
  // arte de escala inteira derrubava a transcrição exata.
  const folded = graded[0]
  const ordered = [...graded].sort((a, b) => b.quality - a.quality)
  let chosen = ordered[0].quality > folded.quality * 1.01 ? ordered[0] : folded

  // Se uma célula pelo menos uma vez e meia maior reconstrói as bordas quase
  // igual, ela é a real e a menor é só uma subdivisão dela.
  const doubles = graded.filter(
    (item) => item.fit.cell >= chosen.fit.cell * 1.5 && item.quality >= chosen.quality * 0.98,
  )
  if (doubles.length) chosen = doubles.reduce((a, b) => (b.fit.cell > a.fit.cell ? b : a), chosen)

  const polished = refinePhase(data, chosen.fit.cell, chosen.fit, true)
  return { fit: normalize(polished.fit), score: polished.score }
}

// Arte reescalonada em escala inteira erra a célula por um fio de ponto
// flutuante. Esse fio basta para `floor` perder a última coluna da imagem.
function snapCell(cell: number) {
  const half = Math.round(cell * 2) / 2
  return Math.abs(cell - half) < 0.02 ? half : cell
}

// A nota só enxerga a fase da grade, não onde ela começa. Sem trazer o
// deslocamento para dentro da primeira célula, o encaixe pode começar uma
// célula adiante e cortar a borda esquerda ou o topo da figura.
function normalize(fit: Fit): Fit {
  const wrap = (value: number, cell: number) => ((value % cell) + cell) % cell
  return { cell: fit.cell, offsetX: wrap(fit.offsetX, fit.cell), offsetY: wrap(fit.offsetY, fit.cell) }
}

export function cellsFrom(data: ImageData, fit: Fit): Cells {
  const { columns, rows } = measure(data, fit)
  const px = data.data
  const cell: (string | null)[][] = []

  for (let cy = 0; cy < rows; cy++) {
    const line: (string | null)[] = []
    for (let cx = 0; cx < columns; cx++) {
      const x0 = Math.ceil(fit.offsetX + cx * fit.cell)
      const x1 = Math.floor(fit.offsetX + (cx + 1) * fit.cell)
      const y0 = Math.ceil(fit.offsetY + cy * fit.cell)
      const y1 = Math.floor(fit.offsetY + (cy + 1) * fit.cell)
      if (x1 - x0 < 1 || y1 - y0 < 1) {
        line.push(null)
        continue
      }
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * data.width + x) * 4
          r += px[o]
          g += px[o + 1]
          b += px[o + 2]
          a += px[o + 3]
          n++
        }
      }
      if (!n || a / n < 32) {
        line.push(null)
        continue
      }
      line.push(hex(r / n, g / n, b / n))
    }
    cell.push(line)
  }

  return { columns, rows, cell }
}

function hex(r: number, g: number, b: number) {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

// Só os quatro cantos contam. Cair para o primeiro pixel que aparecer seria
// pior: num quadro com fundo transparente isso viraria o contorno do gato, e o
// importador comeria a silhueta inteira.
export function cornerColor(cells: Cells): string | null {
  const last = cells.rows - 1
  const right = cells.columns - 1
  const corners = [
    cells.cell[0]?.[0],
    cells.cell[0]?.[right],
    cells.cell[last]?.[0],
    cells.cell[last]?.[right],
  ]

  const counts = new Map<string, number>()
  for (const value of corners) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

// Fundo vem de imagem convertida, então nem sempre é uma cor só: o mesmo bege
// pode sair em três tons vizinhos e aí nenhuma coluna pareceria vazia.
function isEmpty(value: string | null, background: string | null) {
  if (value === null) return true
  if (background === null) return false
  return colorDistance(value, background) < 24
}

// Quadros ficam separados por colunas e linhas inteiras na cor de fundo. Isso
// vale para folha rígida e para folha solta, então não precisa saber o formato.
export function splitFrames(cells: Cells, background: string | null): Frame[] {
  const empty = (value: string | null) => isEmpty(value, background)
  const columnEmpty = (x: number) => cells.cell.every((line) => empty(line[x]))
  const rowEmpty = (y: number, x0: number, x1: number) => cells.cell[y].slice(x0, x1).every(empty)

  const bands: [number, number][] = []
  let start = -1
  for (let x = 0; x <= cells.columns; x++) {
    const filled = x < cells.columns && !columnEmpty(x)
    if (filled && start < 0) start = x
    if (!filled && start >= 0) {
      bands.push([start, x])
      start = -1
    }
  }

  const frames: Frame[] = []
  for (const [x0, x1] of bands) {
    let y0 = -1
    for (let y = 0; y <= cells.rows; y++) {
      const filled = y < cells.rows && !rowEmpty(y, x0, x1)
      if (filled && y0 < 0) y0 = y
      if (!filled && y0 >= 0) {
        frames.push({ x: x0, y: y0, w: x1 - x0, h: y - y0 })
        y0 = -1
      }
    }
  }

  return frames
}

// Quadro grande demais para a grade é reduzido proporcionalmente, não cortado:
// cortar tirava o pé do gato, que é justamente o pedaço que encosta no chão.
export function frameRows(
  cells: Cells,
  frame: Frame,
  width: number,
  height: number,
  background: string | null,
): (string | null)[][] {
  const empty = (value: string | null) => isEmpty(value, background)
  let x0 = frame.x + frame.w
  let x1 = frame.x - 1
  let y0 = frame.y + frame.h
  let y1 = frame.y - 1
  for (let y = frame.y; y < frame.y + frame.h; y++) {
    for (let x = frame.x; x < frame.x + frame.w; x++) {
      if (empty(cells.cell[y][x])) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < x0) return []

  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const scale = Math.min(1, width / w, height / h)
  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))
  const left = Math.max(0, Math.floor((width - outW) / 2))
  const top = Math.max(0, height - outH)
  const out: (string | null)[][] = Array.from({ length: height }, () => Array<string | null>(width).fill(null))

  for (let y = 0; y < outH; y++) {
    const sy = y0 + Math.min(h - 1, Math.floor((y * h) / outH))
    for (let x = 0; x < outW; x++) {
      const sx = x0 + Math.min(w - 1, Math.floor((x * w) / outW))
      if (top + y >= height || left + x >= width) continue
      out[top + y][left + x] = cells.cell[sy][sx]
    }
  }

  return out
}

export interface Quantized {
  rows: string[]
  misses: { color: string; count: number; near: string }[]
}

// Cada célula vai para o tom mais próximo da paleta. O que ficou longe de tudo
// não é silenciado: volta na lista para você ver o que a paleta não cobre.
export function quantize(rows: (string | null)[][], palette: string[]): Quantized {
  const misses = new Map<string, number>()
  const out = rows.map((line) =>
    line
      .map((value) => {
        if (!value) return '.'
        let best = 0
        let bestDistance = Infinity
        for (let i = 0; i < palette.length; i++) {
          const distance = colorDistance(value, palette[i])
          if (distance < bestDistance) {
            bestDistance = distance
            best = i
          }
        }
        if (bestDistance > 42) misses.set(value, (misses.get(value) ?? 0) + 1)
        return CHAR_INDEX[best] ?? '.'
      })
      .join(''),
  )

  return {
    rows: out,
    misses: [...misses.entries()]
      .map(([color, count]) => ({ color, count, near: palette[nearest(color, palette)] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  }
}

function nearest(color: string, palette: string[]) {
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < palette.length; i++) {
    const distance = colorDistance(color, palette[i])
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

const CHAR_INDEX = '123456789abcdef'

function channels(color: string) {
  const value = Number.parseInt(color.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

// Peso maior no verde porque o olho distingue verde muito mais que azul.
function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  const dr = ar - br
  const dg = ag - bg
  const db = ab - bb
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
}

export async function readImage(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) throw new Error('imagem sem tamanho')
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('sem canvas 2d')
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

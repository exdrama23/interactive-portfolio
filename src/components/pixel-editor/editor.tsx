// Editor de pixel art. Rota só de desenvolvimento.
//
// O documento fica em `model.ts`, as saídas em `exporters.ts`. Aqui é só a
// parte interativa: ferramentas, histórico, zoom e painéis.
//
// O desenho mexe direto no `Uint32Array` da camada ativa e pede uma nova
// composição. Copiar todas as camadas a cada pixel inviabilizaria um desenho de
// 512 px, então o histórico guarda só a camada que mudou.

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { readImage } from '../mascot/studio/import-art'
import { parseArt, writeArt } from '../mascot/studio/format'
import { StudioNav } from '../mascot/studio-nav'
import {
  BLENDS,
  cloneDoc,
  composite,
  contentBox,
  createDoc,
  createLayer,
  cropDoc,
  eraseConnected,
  expandDoc,
  floodFill,
  hexOf,
  lineCells,
  packHex,
  quantize,
  replaceColor,
  resizeDoc,
  topColors,
  uniqueColors,
  type Blend,
  type Doc,
} from './model'
import {
  detectGrid,
  fitBlocks,
  removeBackground,
  sampleBlocks,
  type Block,
} from './importgrid'
import {
  download,
  docOfProject,
  exportPng,
  exportSvg,
  NOX_H,
  NOX_W,
  noxRows,
  projectOf,
  type ProjectFile,
} from './exporters'
import { NOX_PAL } from '../mascot/sprite-art'
import {
  clearFrameBridge,
  clearFrameDraft,
  decodeLayer,
  encodeLayer,
  FRAME_DRAFT_KEY,
  readFrameBridge,
  writeFrameBridge,
  type FrameBridge,
} from './frame-bridge'

type Tool = 'pencil' | 'eraser' | 'fill' | 'pick' | 'pan' | 'move' | 'select'

const TOOLS: [Tool, string, string][] = [
  ['pencil', 'lápis', 'B'],
  ['eraser', 'borracha', 'E'],
  ['fill', 'balde', 'G'],
  ['pick', 'conta-gotas', 'I'],
  ['select', 'seleção', 'S'],
  ['pan', 'mover vista', 'espaço'],
  ['move', 'mover camada', 'M'],
]

const AUTOSAVE = 'nox-pixel-editor'
const MAX_CELLS = 1024

type Entry =
  | { kind: 'pixels'; label: string; index: number; before: Uint32Array; after: Uint32Array }
  | { kind: 'doc'; label: string; before: Doc; after: Doc }

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface ImportState {
  image: ImageData
  name: string
  cell: number
  offsetX: number
  offsetY: number
  tolerance: number
  removeBg: boolean
  asReference: boolean
  detected: number
  /** Traz cada pixel do arquivo como um pixel do editor, sem reduzir. */
  exact: boolean
}

const entryBytes = (entry: Entry) =>
  entry.kind === 'pixels' ? entry.before.byteLength + entry.after.byteLength : 0

export function PixelEditor() {
  // Quando os quadros vem do importador do Nox, entram como uma camada por
  // quadro e o autosave normal fica desligado para nao sobrescrever o projeto
  // que o usuario ja tinha no editor.
  const [frameBridge, setFrameBridge] = useState<FrameBridge | null>(() => readFrameBridge())
  const [doc, setDoc] = useState<Doc>(() => {
    if (!frameBridge) return loadDoc()
    return readFrameDraft(frameBridge.clip) ?? docFromBridge(frameBridge)
  })
  const [revision, setRevision] = useState(0)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#171514')
  const [zoom, setZoom] = useState(8)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [grid, setGrid] = useState(true)
  const [name, setName] = useState(() => localStorage.getItem(`${AUTOSAVE}-name`) ?? 'nox')
  const [status, setStatus] = useState('')
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [guide, setGuide] = useState(false)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [tolerance, setTolerance] = useState(16)
  const [quantizeNox, setQuantizeNox] = useState(true)
  const [quantizeCount, setQuantizeCount] = useState(16)
  const [replaceFrom, setReplaceFrom] = useState('#ffffff')
  const [replaceTo, setReplaceTo] = useState('#171514')
  const [replaceAll, setReplaceAll] = useState(false)
  const [importState, setImportState] = useState<ImportState | null>(null)

  const docRef = useRef(doc)
  docRef.current = doc
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const viewRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const spriteRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<ImageData | null>(null)
  const strokeRef = useRef<{ index: number; before: Uint32Array; last: [number, number] } | null>(null)
  const moveRef = useRef<{ index: number; from: [number, number]; data: Uint32Array } | null>(null)
  const panRef = useRef<{ start: [number, number]; pan: { x: number; y: number } } | null>(null)
  const lastPaintRef = useRef<[number, number] | null>(null)
  const spaceRef = useRef(false)
  const importRef = useRef<HTMLCanvasElement | null>(null)
  const selRectRef = useRef<{ start: [number, number] } | null>(null)
  const lastCellRef = useRef<[number, number]>([0, 0])
  const selMoveRef = useRef<{
    index: number
    before: Uint32Array
    block: Block
    from: [number, number]
    rect: Rect
  } | null>(null)
  const past = useRef<Entry[]>([])
  const future = useRef<Entry[]>([])
  const pastBytes = useRef(0)
  const [, setHistoryTick] = useState(0)

  const bump = () => setRevision((value) => value + 1)

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // A vista inclui a camada de referencia; a exportacao e o envio ao Nox usam
    // composite(doc) sem ela.
    const image = composite(doc, true)
    imageRef.current = image
    let canvas = spriteRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      spriteRef.current = canvas
    }
    canvas.width = doc.width
    canvas.height = doc.height
    canvas.getContext('2d')?.putImageData(image, 0, 0)
  }, [doc, revision])

  const fitTo = (width: number, height: number, max = 64) => {
    if (!size.w || !size.h) return
    const factor = Math.min((size.w - 48) / width, (size.h - 48) / height)
    const next = Math.max(0.25, Math.min(max, factor < 1 ? factor : Math.floor(factor)))
    setZoom(next)
    setPan({ x: (size.w - width * next) / 2, y: (size.h - height * next) / 2 })
  }

  const fitView = () => fitTo(doc.width, doc.height)

  useEffect(() => {
    if (size.w && size.h && zoom === 8 && pan.x === 40) fitView()
    // Só no primeiro tamanho medido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h])

  useEffect(() => {
    const canvas = viewRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const width = Math.max(1, Math.round(size.w * dpr))
    const height = Math.max(1, Math.round(size.h * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, size.w, size.h)

    const w = doc.width * zoom
    const h = doc.height * zoom
    context.save()
    context.beginPath()
    context.rect(pan.x, pan.y, w, h)
    context.clip()

    const cell = Math.max(4, Math.round(8 * dpr) / dpr)
    context.fillStyle = '#2a2a32'
    context.fillRect(pan.x, pan.y, w, h)
    context.fillStyle = '#232329'
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        if ((Math.round(x / cell) + Math.round(y / cell)) % 2) continue
        context.fillRect(pan.x + x, pan.y + y, cell, cell)
      }
    }

    const sprite = spriteRef.current
    if (sprite) {
      context.imageSmoothingEnabled = false
      context.drawImage(sprite, pan.x, pan.y, w, h)
    }

    if (grid && zoom >= 6) {
      context.strokeStyle = 'rgba(255,255,255,0.09)'
      context.lineWidth = 1
      context.beginPath()
      for (let x = 1; x < doc.width; x++) {
        context.moveTo(pan.x + x * zoom + 0.5, pan.y)
        context.lineTo(pan.x + x * zoom + 0.5, pan.y + h)
      }
      for (let y = 1; y < doc.height; y++) {
        context.moveTo(pan.x, pan.y + y * zoom + 0.5)
        context.lineTo(pan.x + w, pan.y + y * zoom + 0.5)
      }
      context.stroke()
    }

    context.restore()

    if (guide) {
      const gw = NOX_W * zoom
      const gh = NOX_H * zoom
      const gx = pan.x + (w - gw) / 2
      const gy = pan.y + h - gh
      if (zoom >= 3) {
        context.strokeStyle = 'rgba(251,191,36,0.16)'
        context.lineWidth = 1
        context.beginPath()
        for (let x = 1; x < NOX_W; x++) {
          context.moveTo(gx + x * zoom + 0.5, gy)
          context.lineTo(gx + x * zoom + 0.5, gy + gh)
        }
        for (let y = 1; y < NOX_H; y++) {
          context.moveTo(gx, gy + y * zoom + 0.5)
          context.lineTo(gx + gw, gy + y * zoom + 0.5)
        }
        context.stroke()
      }
      context.strokeStyle = 'rgba(251,191,36,0.9)'
      context.lineWidth = 1
      context.setLineDash([4, 3])
      context.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1)
      context.setLineDash([])
    }

    if (selection) {
      const sx = pan.x + selection.x * zoom
      const sy = pan.y + selection.y * zoom
      context.strokeStyle = '#000'
      context.lineWidth = 2
      context.strokeRect(sx, sy, selection.w * zoom, selection.h * zoom)
      context.strokeStyle = '#fbbf24'
      context.lineWidth = 1
      context.setLineDash([4, 3])
      context.strokeRect(sx + 0.5, sy + 0.5, selection.w * zoom - 1, selection.h * zoom - 1)
      context.setLineDash([])
    }

    context.strokeStyle = 'rgba(255,255,255,0.25)'
    context.lineWidth = 1
    context.strokeRect(pan.x + 0.5, pan.y + 0.5, w - 1, h - 1)
  }, [doc, revision, zoom, pan, grid, size, guide, selection])

  useEffect(() => {
    const canvas = viewRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = event.clientX - rect.left
      const my = event.clientY - rect.top
      const current = zoomRef.current
      const next = Math.max(0.25, Math.min(64, current * (event.deltaY < 0 ? 1.2 : 1 / 1.2)))
      setPan((p) => ({
        x: mx - ((mx - p.x) * next) / current,
        y: my - ((my - p.y) * next) / current,
      }))
      setZoom(next)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const pushHistory = (entry: Entry) => {
    past.current.push(entry)
    pastBytes.current += entryBytes(entry)
    while (pastBytes.current > 48 * 1024 * 1024 && past.current.length > 1) {
      const dropped = past.current.shift()
      if (dropped) pastBytes.current -= entryBytes(dropped)
    }
    future.current = []
    setHistoryTick((value) => value + 1)
  }

  const transact = (label: string, mutate: (draft: Doc) => void) => {
    const live = docRef.current
    const before = cloneDoc(live)
    const after = cloneDoc(live)
    mutate(after)
    after.active = Math.max(0, Math.min(after.layers.length - 1, after.active))
    pushHistory({ kind: 'doc', label, before, after })
    setDoc(after)
  }

  const undo = () => {
    const entry = past.current.pop()
    if (!entry) return
    future.current.push(entry)
    setHistoryTick((value) => value + 1)
    if (entry.kind === 'pixels') {
      docRef.current.layers[entry.index]?.data.set(entry.before)
      bump()
    } else {
      setDoc(cloneDoc(entry.before))
    }
  }

  const redo = () => {
    const entry = future.current.pop()
    if (!entry) return
    past.current.push(entry)
    setHistoryTick((value) => value + 1)
    if (entry.kind === 'pixels') {
      docRef.current.layers[entry.index]?.data.set(entry.after)
      bump()
    } else {
      setDoc(cloneDoc(entry.after))
    }
  }

  const cellAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [
      Math.floor((event.clientX - rect.left - pan.x) / zoom),
      Math.floor((event.clientY - rect.top - pan.y) / zoom),
    ] as [number, number]
  }

  const activeLayer = () => {
    const layer = docRef.current.layers[docRef.current.active]
    return layer && !layer.locked ? layer : null
  }

  const paintAt = (x: number, y: number, erase: boolean) => {
    const layer = activeLayer()
    if (!layer) return
    const { width, height } = docRef.current
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const index = y * width + x
    const next = erase ? 0 : packHex(color)
    if (layer.data[index] === next) return
    layer.data[index] = next
    bump()
  }

  const beginStroke = (x: number, y: number) => {
    const layer = activeLayer()
    if (!layer) return false
    strokeRef.current = { index: docRef.current.active, before: layer.data.slice(), last: [x, y] }
    return true
  }

  const endStroke = () => {
    const stroke = strokeRef.current
    strokeRef.current = null
    if (!stroke) return
    lastPaintRef.current = stroke.last
    const layer = docRef.current.layers[stroke.index]
    if (!layer) return
    pushHistory({
      kind: 'pixels',
      label: 'traço',
      index: stroke.index,
      before: stroke.before,
      after: layer.data.slice(),
    })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const [x, y] = cellAt(event)

    if (tool === 'pan' || spaceRef.current || event.button === 1) {
      panRef.current = { start: [event.clientX, event.clientY], pan }
      return
    }

    if (tool === 'pick') {
      pickAt(x, y)
      return
    }

    if (tool === 'move') {
      const layer = activeLayer()
      if (!layer) return
      moveRef.current = { index: docRef.current.active, from: [x, y], data: layer.data.slice() }
      return
    }

    if (tool === 'select') {
      const layer = activeLayer()
      if (!layer) return
      if (selection && insideRect(selection, x, y)) {
        lastCellRef.current = [x, y]
        selMoveRef.current = {
          index: docRef.current.active,
          before: layer.data.slice(),
          block: extractBlock(layer.data, docRef.current.width, selection),
          from: [x, y],
          rect: selection,
        }
        return
      }
      selRectRef.current = { start: [x, y] }
      setSelection(null)
      return
    }

    if (tool === 'fill') {
      const layer = activeLayer()
      if (!layer) return
      if (event.altKey) {
        pickAt(x, y)
        return
      }
      const before = layer.data.slice()
      if (floodFill(layer.data, docRef.current.width, docRef.current.height, x, y, packHex(color), tolerance)) {
        pushHistory({
          kind: 'pixels',
          label: 'balde',
          index: docRef.current.active,
          before,
          after: layer.data.slice(),
        })
        bump()
      }
      return
    }

    if (event.altKey) {
      if (tool === 'eraser') {
        const layer = activeLayer()
        if (!layer) return
        const before = layer.data.slice()
        eraseConnected(layer.data, docRef.current.width, docRef.current.height, x, y, tolerance)
        pushHistory({
          kind: 'pixels',
          label: 'apagar cor',
          index: docRef.current.active,
          before,
          after: layer.data.slice(),
        })
        bump()
        return
      }
      pickAt(x, y)
      return
    }

    if (!beginStroke(x, y)) return
    if (tool === 'pencil' && event.shiftKey && lastPaintRef.current) {
      const [fromX, fromY] = lastPaintRef.current
      for (const [cx, cy] of lineCells(fromX, fromY, x, y)) paintAt(cx, cy, false)
      if (strokeRef.current) strokeRef.current.last = [x, y]
      return
    }
    paintAt(x, y, tool === 'eraser')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      setPan({
        x: panRef.current.pan.x + event.clientX - panRef.current.start[0],
        y: panRef.current.pan.y + event.clientY - panRef.current.start[1],
      })
      return
    }

    if (moveRef.current) {
      const [cx, cy] = cellAt(event)
      const dx = cx - moveRef.current.from[0]
      const dy = cy - moveRef.current.from[1]
      const layer = docRef.current.layers[moveRef.current.index]
      if (!layer) return
      const { width, height } = docRef.current
      const data = new Uint32Array(width * height)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = moveRef.current.data[y * width + x]
          if (!value) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          data[ny * width + nx] = value
        }
      }
      layer.data = data
      bump()
      return
    }

    if (tool === 'select') {
      const movement = selMoveRef.current
      if (movement) {
        const [cx, cy] = cellAt(event)
        lastCellRef.current = [cx, cy]
        const dx = cx - movement.from[0]
        const dy = cy - movement.from[1]
        const { width, height } = docRef.current
        const layer = docRef.current.layers[movement.index]
        if (!layer) return
        const data = movement.before.slice()
        for (let y = 0; y < movement.rect.h; y++) {
          for (let x = 0; x < movement.rect.w; x++) {
            data[(movement.rect.y + y) * width + movement.rect.x + x] = 0
          }
        }
        stampBlock(data, width, height, movement.block, movement.rect.x + dx, movement.rect.y + dy)
        layer.data = data
        bump()
        return
      }
      if (selRectRef.current) {
        const [cx, cy] = cellAt(event)
        setSelection(clampRect(selRectRef.current.start, [cx, cy], docRef.current.width, docRef.current.height))
      }
      return
    }

    const stroke = strokeRef.current
    if (!stroke) return
    const [x, y] = cellAt(event)
    const line = lineCells(stroke.last[0], stroke.last[1], x, y)
    for (const [cx, cy] of line) paintAt(cx, cy, tool === 'eraser')
    stroke.last = [x, y]
  }

  const onPointerUp = () => {
    panRef.current = null
    if (selMoveRef.current) {
      const movement = selMoveRef.current
      selMoveRef.current = null
      const layer = docRef.current.layers[movement.index]
      if (layer) {
        pushHistory({
          kind: 'pixels',
          label: 'mover seleção',
          index: movement.index,
          before: movement.before,
          after: layer.data.slice(),
        })
        const [cx, cy] = lastCellRef.current
        const dx = cx - movement.from[0]
        const dy = cy - movement.from[1]
        const moved = clampRect(
          [movement.rect.x + dx, movement.rect.y + dy],
          [movement.rect.x + dx + movement.rect.w - 1, movement.rect.y + dy + movement.rect.h - 1],
          docRef.current.width,
          docRef.current.height,
        )
        setSelection(moved)
      }
      return
    }
    selRectRef.current = null
    if (moveRef.current) {
      const moved = moveRef.current
      moveRef.current = null
      const layer = docRef.current.layers[moved.index]
      if (layer) {
        pushHistory({
          kind: 'pixels',
          label: 'mover camada',
          index: moved.index,
          before: moved.data,
          after: layer.data.slice(),
        })
      }
      return
    }
    endStroke()
  }

  const pickAt = (x: number, y: number) => {
    const image = imageRef.current
    if (!image || x < 0 || y < 0 || x >= image.width || y >= image.height) return
    const o = (y * image.width + x) * 4
    if (image.data[o + 3] < 32) return
    setColor(hexOf((image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2]))
  }

  const colors = useMemo(() => {
    const found = uniqueColors(composite(doc))
    const merged = [...doc.favorites, ...found]
    return merged.filter((value, index) => merged.indexOf(value) === index).slice(0, 48)
    // A `revision` entra de proposito: o traco mexe no Uint32Array da camada
    // sem trocar a identidade do doc, e sem ela a paleta nao atualiza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, revision])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      const key = event.key.toLowerCase()
      if (key === 'escape') {
        setSelection(null)
        setImportState(null)
        return
      }
      if ((key === 'delete' || key === 'backspace') && selection) {
        event.preventDefault()
        clearSelection()
        return
      }
      if (key === ' ') {
        spaceRef.current = true
        event.preventDefault()
      } else if (key === 'b') setTool('pencil')
      else if (key === 'e') setTool('eraser')
      else if (key === 'g') setTool('fill')
      else if (key === 'i') setTool('pick')
      else if (key === 'm') setTool('move')
      else if (key === 's') setTool('select')
      else if (key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        redo()
      } else if (key === '+' || key === '=') setZoom((value) => Math.min(64, value * 1.25))
      else if (key === '-') setZoom((value) => Math.max(0.25, value / 1.25))
      else if (key === '0') setZoom(1)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') spaceRef.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  useEffect(() => {
    localStorage.setItem(`${AUTOSAVE}-name`, name)
  }, [name])

  useEffect(() => {
    if (frameBridge) return
    const cells = doc.width * doc.height * doc.layers.length
    if (cells > 2_000_000) return
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE, JSON.stringify(projectOf(doc, name)))
      } catch {
        setStatus('não deu para salvar no navegador, o desenho é grande demais')
      }
    }, 600)
    return () => window.clearTimeout(timer)
  }, [doc, revision, name, frameBridge])

  // Rascunho dos quadros em separado: o autosave normal fica intocado e o
  // reload reabre a edicao exatamente como estava, sem banco.
  useEffect(() => {
    if (!frameBridge) return
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          FRAME_DRAFT_KEY,
          JSON.stringify({ clip: frameBridge.clip, project: projectOf(doc, name) }),
        )
      } catch {
        setStatus('não deu para guardar o rascunho dos quadros; use "baixar quadros 1:1"')
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [doc, revision, name, frameBridge])

  const resize = (width: number, height: number) => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4 || width > MAX_CELLS || height > MAX_CELLS) {
      setStatus(`tamanho entre 4 e ${MAX_CELLS}`)
      return
    }
    if (width === doc.width && height === doc.height) return
    transact('redimensionar', (draft) => {
      const resized = resizeDoc(draft, width, height)
      draft.width = resized.width
      draft.height = resized.height
      draft.layers = resized.layers
    })
  }

  const openProject = async (file: File) => {
    try {
      const project = JSON.parse(await file.text()) as ProjectFile
      if (!project.layers || !project.width) throw new Error('arquivo não é um projeto')
      past.current = []
      future.current = []
      pastBytes.current = 0
      setDoc(docOfProject(project))
      setName(project.name ?? 'sem nome')
      setStatus('projeto aberto')
    } catch (error) {
      setStatus(`não abriu: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const frameIndices = useMemo(
    () =>
      doc.layers
        .map((layer, index) => ({ layer, index }))
        .filter(({ layer }) => isFrameLayer(layer)),
    [doc.layers],
  )

  const selectFrame = (index: number) => {
    const neighbor = doc.layers[index]
    if (!neighbor) return
    setDoc((current) => ({
      ...current,
      active: index,
      layers: current.layers.map((layer, i) => {
        if (!isFrameLayer(layer)) return layer
        return { ...layer, visible: i === index }
      }),
    }))
    setStatus(`editando ${neighbor.name}`)
  }

  // Clicar numa camada também manda na vista. Num quadro, mostra aquele quadro;
  // numa camada solta, ela vira um quadro para não existir camada invisível
  // enquanto a animação está aberta.
  const selectLayer = (index: number) => {
    const layer = docRef.current.layers[index]
    if (!layer) return
    if (!frameBridge || layer.reference) {
      setDoc((current) => ({ ...current, active: index }))
      return
    }
    if (isFrameLayer(layer)) {
      selectFrame(index)
      return
    }
    const name = nextFrameName(docRef.current.layers.filter((_, i) => i !== index))
    transact('camada como quadro', (draft) => {
      const target = draft.layers[index]
      if (!target) return
      target.name = name
      target.visible = true
      for (const other of draft.layers) {
        if (other !== target && isFrameLayer(other)) other.visible = false
      }
      draft.active = index
    })
    setStatus(`${name} criado a partir da camada`)
  }

  const exportFramePngs = () => {
    if (!frameBridge) return
    const current = docRef.current
    const frames = current.layers.filter(isFrameLayer)
    if (!frames.length) return
    frames.forEach((layer, index) => {
      layerCanvas(current.width, current.height, layer.data).toBlob(
        (blob) => blob && download(blob, `${frameBridge.clip}-${index + 1}.png`),
      )
    })
    setStatus(`${frames.length} quadro(s) baixados em ${current.width}x${current.height}, sem reduzir`)
  }

  const sendFramesBack = () => {
    if (!frameBridge) return
    const current = docRef.current
    const frames = current.layers
      .filter(isFrameLayer)
      .map((layer) => encodeLayer(current.width, current.height, layer.data))
    if (!frames.length) {
      setStatus('nenhum quadro para devolver')
      return
    }
    if (!writeFrameBridge({ ...frameBridge, name, frames })) {
      setStatus('os quadros não couberam no navegador; exporte o projeto como png')
      return
    }
    clearFrameDraft()
    window.location.assign('/__nox-import?nox=editor')
  }

  const leaveFrames = () => {
    clearFrameBridge()
    clearFrameDraft()
    setFrameBridge(null)
    setDoc(loadDoc())
    const previous = localStorage.getItem(`${AUTOSAVE}-name`)
    if (previous) setName(previous)
    setStatus('quadros descartados; projeto anterior aberto')
  }

  const importPreview = useMemo(() => {
    if (!importState) return null
    const cleaned = importState.removeBg
      ? removeBackground(importState.image, importState.tolerance)
      : importState.image
    if (importState.exact) return sampleBlocks(cleaned, 1, 0, 0)
    return sampleBlocks(cleaned, importState.cell, importState.offsetX, importState.offsetY)
  }, [importState])

  const importEmpty = !importPreview || !importPreview.data.some((value) => value !== 0)

  useEffect(() => {
    const canvas = importRef.current
    if (!canvas || !importPreview) return
    const { width, height, data } = importPreview
    if (!(width > 0) || !(height > 0)) return
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    // Montar o ImageData pixel a pixel evita depender da ordem de bytes do
    // buffer do Uint32Array, que era onde a previa quebrava.
    const image = context.createImageData(width, height)
    const bytes = image.data
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const o = i * 4
      bytes[o] = value & 255
      bytes[o + 1] = (value >>> 8) & 255
      bytes[o + 2] = (value >>> 16) & 255
      bytes[o + 3] = value >>> 24
    }
    context.putImageData(image, 0, 0)
  }, [importPreview])

  const openImport = async (file: File) => {
    try {
      const image = await readImage(file)
      const grid = detectGrid(image)
      setImportState({
        image,
        name: file.name.replace(/\.[^.]+$/, ''),
        cell: grid.cell,
        offsetX: grid.offsetX,
        offsetY: grid.offsetY,
        tolerance: 24,
        removeBg: true,
        asReference: false,
        detected: grid.cell,
        // Arte que já cabe no canvas entra 1:1 por padrão: reimportar um PNG
        // exportado daqui não pode ser reduzido de novo.
        exact: image.width <= MAX_CELLS && image.height <= MAX_CELLS,
      })
    } catch (error) {
      setStatus(`não abriu: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const applyImport = () => {
    if (!importState || !importPreview) return
    if (importEmpty) {
      setStatus('a prévia ficou vazia, mexa no bloco, nos offsets ou no fundo transparente')
      return
    }
    let final = { w: docRef.current.width, h: docRef.current.height }
    let note = ''
    let grownNote = ''
    transact('importar imagem', (draft) => {
      const empty = isEmpty(draft)
      const exact = Boolean(importState!.exact)
      let target = importPreview!
      if (empty) {
        // Tela vazia aceita o tamanho da arte reduzida, sem reamostrar de novo.
        target = exact ? target : fitBlocks(target, MAX_CELLS, MAX_CELLS)
        draft.width = target.width
        draft.height = target.height
        draft.layers = []
        draft.active = 0
      } else if (exact) {
        // Arte 1:1 não pode ser cortada nem reduzida. Se ela não cabe no
        // canvas atual, o canvas cresce e o desenho antigo fica centralizado.
        if (target.width > draft.width || target.height > draft.height) {
          const grown = expandDoc(draft, Math.max(draft.width, target.width), Math.max(draft.height, target.height))
          draft.width = grown.width
          draft.height = grown.height
          draft.layers = grown.layers
          grownNote = `canvas ampliado para ${draft.width}x${draft.height}`
        }
      } else {
        target = fitBlocks(target, draft.width, draft.height)
      }

      const layer = createLayer(draft.width, draft.height, importState!.name.slice(0, 18) || 'imagem')
      const left = Math.floor((draft.width - target.width) / 2)
      const top = Math.floor((draft.height - target.height) / 2)
      stampBlock(layer.data, draft.width, draft.height, target, left, top)
      if (importState!.asReference) {
        layer.reference = true
        layer.locked = true
        layer.opacity = 0.6
      }
      // No modo de quadros, uma arte do tamanho do quadro entra como quadro
      // novo: aparece na lista, na vista e volta para o importador no envio.
      // Camada solta ficava invisível na animação e era descartada no envio.
      const asFrame =
        Boolean(frameBridge) &&
        !layer.reference &&
        target.width === draft.width &&
        target.height === draft.height
      if (asFrame) {
        layer.name = nextFrameName(draft.layers)
        for (const other of draft.layers) {
          if (isFrameLayer(other)) other.visible = false
        }
      }
      draft.layers.push(layer)
      draft.active = draft.layers.length - 1
      final = { w: draft.width, h: draft.height }
      note = empty
        ? `canvas ${draft.width}x${draft.height}, arte ${target.width}x${target.height}`
        : `${grownNote ? `${grownNote}, ` : ''}arte ${target.width}x${target.height} ${
            asFrame ? `no ${layer.name}` : 'numa camada nova'
          }`
    })
    // Arte 1:1 entra no tamanho real: ampliar aqui só faz o desenho parecer
    // maior do que o PNG exportado. Quem quiser aproximar usa o + ou o ajustar.
    fitTo(final.w, final.h, importState!.exact ? 1 : 4)
    setImportState(null)
    setStatus(`importada: ${note}`)
  }

  const quantizeNow = () => {
    const palette = quantizeNox
      ? NOX_PAL.map((hex) => packHex(hex))
      : topColors(composite(docRef.current), quantizeCount)
    transact('quantizar', (draft) => {
      const layer = draft.layers[draft.active]
      if (layer) quantize(layer.data, palette)
    })
    setStatus(`quantizado em ${palette.length} cores`)
  }

  const replaceNow = () => {
    const from = packHex(replaceFrom)
    const to = packHex(replaceTo)
    transact('trocar cor', (draft) => {
      const targets = replaceAll ? draft.layers : [draft.layers[draft.active]]
      for (const layer of targets) if (layer) replaceColor(layer.data, from, to, tolerance)
    })
    setStatus(`cor ${replaceFrom} trocada por ${replaceTo}`)
  }

  const cropToContent = () => {
    const box = contentBox(composite(docRef.current))
    if (!box) {
      setStatus('nada desenhado para ajustar')
      return
    }
    if (box.x === 0 && box.y === 0 && box.w === doc.width && box.h === doc.height) return
    transact('ajustar canvas', (draft) => {
      const cropped = cropDoc(draft, box)
      draft.width = cropped.width
      draft.height = cropped.height
      draft.layers = cropped.layers
    })
    fitTo(box.w, box.h)
    setStatus(`canvas ajustado em ${box.w}x${box.h}`)
  }

  const clearSelection = () => {
    const rect = selection
    const layer = activeLayer()
    if (!rect || !layer) return
    const before = layer.data.slice()
    const { width } = docRef.current
    for (let y = 0; y < rect.h; y++) {
      for (let x = 0; x < rect.w; x++) {
        layer.data[(rect.y + y) * width + rect.x + x] = 0
      }
    }
    pushHistory({
      kind: 'pixels',
      label: 'apagar seleção',
      index: docRef.current.active,
      before,
      after: layer.data.slice(),
    })
    bump()
  }

  const [pose, setPose] = useState('POSE_SIT')
  const [poses, setPoses] = useState<string[]>(['POSE_SIT'])
  const [preview, setPreview] = useState<string[]>([])
  const previewRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    // A prévia é o que vai ser gravado, não uma aproximação. Ela espera o
    // traço terminar para não recalcular a conversão a cada pixel.
    const timer = window.setTimeout(() => setPreview(noxRows(docRef.current)), 200)
    return () => window.clearTimeout(timer)
  }, [doc, revision])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const cell = 5
    canvas.width = NOX_W * cell
    canvas.height = NOX_H * cell
    context.clearRect(0, 0, canvas.width, canvas.height)
    preview.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const index = '123456789abcdef'.indexOf(row[x])
        if (index < 0) continue
        context.fillStyle = NOX_PAL[index]
        context.fillRect(x * cell, y * cell, cell, cell)
      }
    })
  }, [preview])


  useEffect(() => {
    fetch('/__sprite-studio/read')
      .then((response) => response.json())
      .then((data: { ok: boolean; source?: string }) => {
        if (!data.ok || !data.source) return
        setPoses(parseArt(data.source).map((item) => item.id))
      })
      .catch(() => setStatus('servidor de dev fora do ar, o envio para o Nox não funciona'))
  }, [])

  const sendToNox = async () => {
    if (frameBridge) {
      setStatus('estes quadros são 216x216; use "enviar ao importador" para não perder pixels')
      return
    }
    try {
      const rows = noxRows(docRef.current)
      const painted = rows.reduce((sum, row) => sum + [...row].filter((ch) => ch !== '.').length, 0)
      // Um quadro vazio gravaria transparente por cima da arte que já existe, e
      // foi assim que o sentado sumiu. Melhor recusar e explicar.
      if (!painted) {
        throw new Error('a arte está vazia; importe a imagem numa camada normal, não só como referência')
      }

      const response = await fetch('/__sprite-studio/read')
      const data = (await response.json()) as { ok: boolean; source?: string; error?: string }
      if (!data.ok || !data.source) throw new Error(data.error ?? 'não leu a arte')
      const all = parseArt(data.source)
      const target = all.find((item) => item.id === pose)
      if (!target) throw new Error('quadro não encontrado')
      target.rows = rows

      const saved = await fetch('/__sprite-studio/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: writeArt(data.source, all) }),
      })
      const result = (await saved.json()) as { ok: boolean; error?: string }
      if (!result.ok) throw new Error(result.error ?? 'não gravou')

      // Ler de volta confirma que a gravação pegou, em vez de confiar no status.
      const check = await fetch('/__sprite-studio/read')
      const after = (await check.json()) as { ok: boolean; source?: string }
      const written = after.ok && after.source ? parseArt(after.source).find((item) => item.id === pose) : null
      if (!written || written.rows.join('\n') !== rows.join('\n')) {
        throw new Error('o arquivo não ficou com o quadro enviado')
      }

      setStatus(`enviado para ${pose}: ${painted} pixels`)
    } catch (error) {
      setStatus(`não enviou: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const active = doc.layers[doc.active]
  const canvasCursor = panelCursor(tool)

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-200">
      <header className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2">
        <h1 className="text-sm font-semibold">Editor de pixel art</h1>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
        <span className="text-xs text-zinc-500">
          {doc.width} x {doc.height}
        </span>
        <StudioNav current="/__pixel-editor" />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={4}
            max={MAX_CELLS}
            defaultValue={doc.width}
            key={`w${doc.width}`}
            onBlur={(event) => resize(Number(event.target.value), doc.height)}
            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
          />
          <span className="text-xs text-zinc-600">x</span>
          <input
            type="number"
            min={4}
            max={MAX_CELLS}
            defaultValue={doc.height}
            key={`h${doc.height}`}
            onBlur={(event) => resize(doc.width, Number(event.target.value))}
            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
          />
          <select
            value=""
            onChange={(event) => {
              const value = Number(event.target.value)
              if (value) resize(value, value)
            }}
            className="rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-400"
          >
            <option value="">tamanho</option>
            {[16, 32, 64, 128].map((side) => (
              <option key={side} value={side}>
                {side} x {side}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button onClick={undo} disabled={!past.current.length} className={BTN}>
            desfazer
          </button>
          <button onClick={redo} disabled={!future.current.length} className={BTN}>
            refazer
          </button>
          <span className="mx-1 h-5 w-px bg-zinc-800" />
          <button onClick={() => setZoom((value) => Math.max(0.25, value / 1.25))} className={BTN}>
            −
          </button>
          <span className="w-12 text-center text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(64, value * 1.25))} className={BTN}>
            +
          </button>
          <button onClick={fitView} className={BTN}>
            ajustar
          </button>
          <button onClick={() => setZoom(1)} className={BTN}>
            100%
          </button>
          <label className="ml-1 flex items-center gap-1 text-xs text-zinc-500">
            <input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} />
            grade
          </label>
          <label className="flex items-center gap-1 text-xs text-zinc-500">
            <input type="checkbox" checked={guide} onChange={(event) => setGuide(event.target.checked)} />
            guia 30x28
          </label>
          <button onClick={cropToContent} className={BTN}>
            ajustar ao conteúdo
          </button>
          <span className="mx-1 h-5 w-px bg-zinc-800" />
          <button onClick={() => exportPng(doc, name)} className={BTN}>
            png
          </button>
          <button onClick={() => exportSvg(doc, name)} className={BTN}>
            svg
          </button>
          <button
            onClick={() => download(new Blob([JSON.stringify(projectOf(doc, name))], { type: 'application/json' }), `${name}.json`)}
            className={BTN}
          >
            projeto
          </button>
          <label className={`${BTN} cursor-pointer`}>
            abrir
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void openProject(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-12 shrink-0 flex-col gap-1 border-r border-zinc-800 p-1">
          {TOOLS.map(([id, label, key]) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={`${label} (${key})`}
              className={`flex h-9 items-center justify-center rounded border text-sm ${
                tool === id
                  ? 'border-amber-400/70 bg-amber-400/10 text-amber-200'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              {label.slice(0, 2)}
            </button>
          ))}
        </aside>

        <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-zinc-800 p-3">
          <section>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">cor</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900"
              />
              <input
                value={color}
                onChange={(event) => {
                  const value = event.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value.toLowerCase())
                  else setColor(value)
                }}
                className="w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
              />
              <button
                onClick={() =>
                  transact('paleta', (draft) => {
                    if (!draft.favorites.includes(color)) draft.favorites.push(color)
                  })
                }
                title="favoritar"
                className={BTN}
              >
                +
              </button>
              <button
                onClick={() =>
                  transact('paleta', (draft) => {
                    draft.favorites = draft.favorites.filter((item) => item !== color)
                  })
                }
                title="tirar dos favoritos"
                className={BTN}
              >
                −
              </button>
            </div>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              paleta
              <span className="font-normal normal-case text-zinc-600">{colors.length}/48</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {colors.map((value) => (
                <button
                  key={value}
                  onClick={() => setColor(value)}
                  title={value}
                  className={`h-6 rounded ring-1 ${value === color ? 'ring-amber-300' : 'ring-zinc-700'}`}
                  style={{ background: value }}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              tolerância
            </div>
            <label className="block text-[11px] text-zinc-500">
              {tolerance}
              <input
                type="range"
                min={0}
                max={128}
                value={tolerance}
                onChange={(event) => setTolerance(Number(event.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <p className="mt-1 text-[10px] leading-3 text-zinc-600">
              balde, borracha com alt e troca de cor
            </p>
          </section>

          <section className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              quantizar
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setQuantizeNox(true)}
                className={`${BTN} flex-1 ${quantizeNox ? 'border-amber-400/70 text-amber-200' : ''}`}
              >
                nox
              </button>
              <button
                onClick={() => setQuantizeNox(false)}
                className={`${BTN} flex-1 ${!quantizeNox ? 'border-amber-400/70 text-amber-200' : ''}`}
              >
                top N
              </button>
            </div>
            {!quantizeNox && (
              <input
                type="number"
                min={2}
                max={64}
                value={quantizeCount}
                onChange={(event) => setQuantizeCount(clampInt(event.target.value, 2, 64, quantizeCount))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
              />
            )}
            <button onClick={quantizeNow} className={`${BTN} w-full`}>
              quantizar camada
            </button>
          </section>

          <section className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              trocar cor
            </div>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={replaceFrom}
                onChange={(event) => setReplaceFrom(event.target.value)}
                className="h-6 w-8 rounded border border-zinc-700 bg-zinc-900"
                title="de"
              />
              <span className="text-xs text-zinc-600">→</span>
              <input
                type="color"
                value={replaceTo}
                onChange={(event) => setReplaceTo(event.target.value)}
                className="h-6 w-8 rounded border border-zinc-700 bg-zinc-900"
                title="para"
              />
              <button onClick={() => setReplaceTo(color)} className={BTN}>
                atual
              </button>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-zinc-500">
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(event) => setReplaceAll(event.target.checked)}
              />
              todas as camadas
            </label>
            <button onClick={replaceNow} className={`${BTN} w-full`}>
              trocar
            </button>
          </section>

          <section className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              seleção
            </div>
            <div className="flex gap-1">
              <button onClick={clearSelection} disabled={!selection} className={`${BTN} flex-1`}>
                apagar
              </button>
              <button
                onClick={() => setSelection(null)}
                disabled={!selection}
                className={`${BTN} flex-1`}
              >
                soltar
              </button>
            </div>
            <p className="text-[10px] leading-3 text-zinc-600">
              tecla s, arraste para marcar, arraste dentro para mover
            </p>
          </section>

          {!frameBridge && (
            <section className="mt-auto space-y-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                para o Nox
              </div>
              <select
                value={pose}
                onChange={(event) => setPose(event.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
              >
                {poses.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <canvas
                ref={previewRef}
                className="w-full rounded border border-zinc-700 bg-zinc-900"
                style={{ imageRendering: 'pixelated', aspectRatio: `${NOX_W} / ${NOX_H}` }}
              />
              <button onClick={() => void sendToNox()} className={`${BTN} w-full`}>
                enviar para 30x28
              </button>
              <p className="text-[11px] leading-4 text-zinc-600">
                A prévia acima é exatamente o que vai ser gravado: camadas achatadas, cor dominante
                de cada célula e a paleta do gato.
              </p>
            </section>
          )}
        </aside>

        <div ref={boxRef} className="relative min-w-0 flex-1 overflow-hidden bg-zinc-900">
          <canvas
            ref={viewRef}
            className="block h-full w-full touch-none"
            style={{ cursor: canvasCursor }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(event) => event.preventDefault()}
          />

          {importState && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4">
              <div className="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">importar imagem</h2>
                  <span className="truncate text-xs text-zinc-500">
                    {importState.name} · {importState.image.width}x{importState.image.height}
                    {importState.exact
                      ? ' · pixels originais 1:1'
                      : ` · bloco detectado ${importState.detected}px`}
                  </span>
                </div>

                <div className="flex min-h-0 flex-wrap gap-4">
                  <div className="flex min-w-[240px] flex-1 items-center justify-center rounded border border-zinc-800 bg-zinc-900 p-2">
                    <canvas
                      ref={importRef}
                      className="max-h-[46vh] w-full"
                      style={{
                        imageRendering: 'pixelated',
                        background:
                          'repeating-conic-gradient(#27272a 0% 25%, #1b1b21 0% 50%) 50% / 16px 16px',
                      }}
                    />
                  </div>

                  <div className="w-56 shrink-0 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={importState.exact}
                        onChange={(event) =>
                          setImportState((state) =>
                            state ? { ...state, exact: event.target.checked } : state,
                          )
                        }
                      />
                      pixels originais (1:1)
                    </label>
                    <p className="text-[11px] leading-4 text-zinc-600">
                      {importState.exact
                        ? 'cada pixel do arquivo vira um pixel do editor. sem reduzir.'
                        : 'a imagem é reduzida pela grade detectada. pixels são descartados.'}
                    </p>
                    <label className="block text-[11px] text-zinc-500">
                      tamanho do bloco
                      <input
                        type="number"
                        min={1}
                        max={256}
                        disabled={importState.exact}
                        value={importState.cell}
                        onChange={(event) =>
                          setImportState((state) =>
                            state
                              ? { ...state, cell: clampInt(event.target.value, 1, 256, state.cell) }
                              : state,
                          )
                        }
                        className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-200 disabled:opacity-40"
                      />
                    </label>
                    <div className="flex gap-1">
                      <label className="block flex-1 text-[11px] text-zinc-500">
                        offset x
                        <input
                          type="number"
                          disabled={importState.exact}
                          value={importState.offsetX}
                          onChange={(event) =>
                            setImportState((state) =>
                              state ? { ...state, offsetX: clampInt(event.target.value, -4096, 4096, state.offsetX) } : state,
                            )
                          }
                          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-200 disabled:opacity-40"
                        />
                      </label>
                      <label className="block flex-1 text-[11px] text-zinc-500">
                        offset y
                        <input
                          type="number"
                          disabled={importState.exact}
                          value={importState.offsetY}
                          onChange={(event) =>
                            setImportState((state) =>
                              state ? { ...state, offsetY: clampInt(event.target.value, -4096, 4096, state.offsetY) } : state,
                            )
                          }
                          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-200 disabled:opacity-40"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={importState.removeBg}
                        onChange={(event) =>
                          setImportState((state) =>
                            state ? { ...state, removeBg: event.target.checked } : state,
                          )
                        }
                      />
                      fundo transparente
                    </label>
                    <label className="block text-[11px] text-zinc-500">
                      tolerância do fundo {importState.tolerance}
                      <input
                        type="range"
                        min={0}
                        max={128}
                        disabled={!importState.removeBg}
                        value={importState.tolerance}
                        onChange={(event) =>
                          setImportState((state) =>
                            state ? { ...state, tolerance: Number(event.target.value) } : state,
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={importState.asReference}
                        onChange={(event) =>
                          setImportState((state) =>
                            state ? { ...state, asReference: event.target.checked } : state,
                          )
                        }
                      />
                      como referência
                    </label>
                    <div className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400">
                      {importState.exact ? 'arte original' : 'arte reduzida'}:{' '}
                      {importPreview ? `${importPreview.width} x ${importPreview.height}` : '...'}
                      {importPreview && (
                        <span
                          className={
                            importEmpty
                              ? 'text-red-400'
                              : importState.exact ||
                                  (importPreview.width <= NOX_W && importPreview.height <= NOX_H)
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                          }
                        >
                          {' '}
                          {importEmpty
                            ? 'vazia'
                            : importState.exact
                              ? '1:1'
                              : importPreview.width <= NOX_W && importPreview.height <= NOX_H
                                ? 'cabe em 30x28'
                                : 'maior que 30x28'}
                        </span>
                      )}
                    </div>
                    {frameBridge &&
                      importPreview &&
                      !importState.asReference &&
                      importPreview.width === doc.width &&
                      importPreview.height === doc.height && (
                        <p className="text-[11px] leading-4 text-amber-300">
                          modo de quadros: a arte entra como um quadro novo da animação.
                        </p>
                      )}
                    {importState.exact &&
                      importPreview &&
                      !isEmpty(doc) &&
                      (importPreview.width > doc.width || importPreview.height > doc.height) && (
                        <p className="text-[11px] leading-4 text-emerald-400">
                          a arte é maior que o canvas: ele vai crescer para{' '}
                          {Math.max(doc.width, importPreview.width)}x
                          {Math.max(doc.height, importPreview.height)} sem cortar pixels.
                        </p>
                      )}
                    {importEmpty && (
                      <p className="text-[11px] leading-4 text-red-400">
                        a prévia está vazia: tente outro tamanho de bloco, outro offset ou desligue o
                        fundo transparente.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setImportState(null)} className={BTN}>
                    cancelar
                  </button>
                  <button
                    onClick={applyImport}
                    disabled={importEmpty}
                    className={`${BTN} border-amber-400/70 text-amber-200`}
                  >
                    aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-l border-zinc-800 p-3">
          {frameBridge && (
            <section className="rounded border border-amber-400/50 bg-amber-400/5 p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                quadros · {frameBridge.clip}
              </div>
              <div className="mb-2 grid grid-cols-3 gap-1">
                {frameIndices.map(({ layer, index }, order) => (
                  <button
                    key={layer.id}
                    onClick={() => selectFrame(index)}
                    className={`rounded border px-1 py-1 text-[11px] ${
                      index === doc.active
                        ? 'border-amber-400/70 bg-amber-400/10 text-amber-200'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {order + 1}
                  </button>
                ))}
              </div>
              <button onClick={sendFramesBack} className={`${BTN} w-full border-amber-400/70 text-amber-200`}>
                enviar ao importador
              </button>
              <button onClick={exportFramePngs} className={`${BTN} mt-1 w-full`}>
                baixar quadros 1:1
              </button>
              <button onClick={leaveFrames} className={`${BTN} mt-1 w-full`}>
                descartar quadros
              </button>
              <p className="mt-1 text-[10px] leading-3 text-zinc-500">
                cada botão acima é um quadro. o rascunho é salvo sozinho neste navegador; o envio
                mantém os pixels no tamanho original.
              </p>
            </section>
          )}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            camadas
            <div className="flex gap-1">
              <button
                onClick={() =>
                  transact('nova camada', (draft) => {
                    const layer = createLayer(
                      draft.width,
                      draft.height,
                      frameBridge ? nextFrameName(draft.layers) : `camada ${draft.layers.length + 1}`,
                    )
                    if (frameBridge) {
                      for (const other of draft.layers) {
                        if (isFrameLayer(other)) other.visible = false
                      }
                    }
                    draft.layers.push(layer)
                    draft.active = draft.layers.length - 1
                  })
                }
                className={BTN}
                title="nova camada"
              >
                +
              </button>
              <button
                onClick={() =>
                  transact('duplicar camada', (draft) => {
                    const source = draft.layers[draft.active]
                    if (!source) return
                    const asFrame = Boolean(frameBridge) && isFrameLayer(source)
                    const copy = {
                      ...source,
                      id: `${source.id}-copia-${Date.now()}`,
                      name: asFrame ? nextFrameName(draft.layers) : `${source.name} cópia`,
                      visible: true,
                      data: source.data.slice(),
                    }
                    if (asFrame) {
                      for (const other of draft.layers) {
                        if (isFrameLayer(other)) other.visible = false
                      }
                    }
                    draft.layers.splice(draft.active + 1, 0, copy)
                    draft.active += 1
                  })
                }
                className={BTN}
                title="duplicar"
              >
                ⧉
              </button>
              <button
                onClick={() =>
                  transact('apagar camada', (draft) => {
                    if (draft.layers.length <= 1) return
                    draft.layers.splice(draft.active, 1)
                    draft.active = Math.min(draft.active, draft.layers.length - 1)
                  })
                }
                className={BTN}
                title="apagar"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {doc.layers.map((layer, index) => ({ layer, index })).reverse().map(({ layer, index }) => (
              <div
                key={layer.id}
                onClick={() => selectLayer(index)}
                className={`flex cursor-pointer items-center gap-1 rounded border px-1 py-1 text-xs ${
                  index === doc.active
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-zinc-800 hover:bg-zinc-900'
                }`}
              >
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    transact('visibilidade', (draft) => {
                      const target = draft.layers[index]
                      if (target) target.visible = !target.visible
                    })
                  }}
                  title="visibilidade"
                  className={layer.visible ? 'text-zinc-300' : 'text-zinc-600'}
                >
                  {layer.visible ? '◉' : '○'}
                </button>
                <span className="flex-1 truncate">{layer.name}</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    transact('referência', (draft) => {
                      const target = draft.layers[index]
                      if (!target) return
                      target.reference = !target.reference
                      if (target.reference) target.locked = true
                    })
                  }}
                  title="camada de referência, não sai na exportação"
                  className={layer.reference ? 'text-sky-300' : 'text-zinc-600'}
                >
                  R
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    transact('trava', (draft) => {
                      const target = draft.layers[index]
                      if (target) target.locked = !target.locked
                    })
                  }}
                  title="travar"
                  className={layer.locked ? 'text-amber-300' : 'text-zinc-600'}
                >
                  {layer.locked ? '▣' : '▢'}
                </button>
              </div>
            ))}
          </div>

          {active && (
            <section className="space-y-2 border-t border-zinc-800 pt-2">
              <input
                value={active.name}
                onChange={(event) => {
                  const value = event.target.value
                  doc.layers[doc.active].name = value
                  bump()
                }}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
              />
              <label className="block text-[11px] text-zinc-500">
                opacidade {Math.round(active.opacity * 100)}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(active.opacity * 100)}
                  onChange={(event) => {
                    doc.layers[doc.active].opacity = Number(event.target.value) / 100
                    bump()
                  }}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-[11px] text-zinc-500">
                mesclagem
                <select
                  value={active.blend}
                  onChange={(event) => {
                    doc.layers[doc.active].blend = event.target.value as Blend
                    bump()
                  }}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs"
                >
                  {BLENDS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    transact('mover camada', (draft) => {
                      const [layer] = draft.layers.splice(draft.active, 1)
                      if (!layer) return
                      draft.layers.splice(Math.min(draft.layers.length, draft.active + 1), 0, layer)
                      draft.active = Math.min(draft.layers.length - 1, draft.active + 1)
                    })
                  }
                  className={BTN}
                >
                  subir
                </button>
                <button
                  onClick={() =>
                    transact('mover camada', (draft) => {
                      const [layer] = draft.layers.splice(draft.active, 1)
                      if (!layer) return
                      draft.layers.splice(Math.max(0, draft.active - 1), 0, layer)
                      draft.active = Math.max(0, draft.active - 1)
                    })
                  }
                  className={BTN}
                >
                  descer
                </button>
              </div>
              <label className={`${BTN} block cursor-pointer text-center`}>
                importar imagem
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void openImport(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </section>
          )}
        </aside>
      </div>

      <footer className="flex items-center gap-3 border-t border-zinc-800 px-4 py-1 text-[11px] text-zinc-500">
        <span>{status || 'pronto'}</span>
        <span className="ml-auto">
          b lápis · e borracha · g balde · i conta-gotas · s seleção · m mover · espaço arrasta ·
          roda dá zoom · ctrl+z desfaz · alt pega a cor · delete apaga seleção
        </span>
      </footer>
    </div>
  )
}

function readFrameDraft(clip: string): Doc | null {
  try {
    const raw = localStorage.getItem(FRAME_DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as { clip?: string; project?: ProjectFile }
    if (draft.clip !== clip || !draft.project?.layers?.length) return null
    return docOfProject(draft.project)
  } catch {
    return null
  }
}

function layerCanvas(width: number, height: number, data: Uint32Array) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context) {
    const image = context.createImageData(width, height)
    const bytes = image.data
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const offset = i * 4
      bytes[offset] = value & 255
      bytes[offset + 1] = (value >>> 8) & 255
      bytes[offset + 2] = (value >>> 16) & 255
      bytes[offset + 3] = value >>> 24
    }
    context.putImageData(image, 0, 0)
  }
  return canvas
}

function isFrameLayer(layer: Doc['layers'][number]) {
  return /^quadro \d+$/.test(layer.name)
}

function nextFrameName(layers: Doc['layers']) {
  const used = new Set(
    layers
      .filter(isFrameLayer)
      .map((layer) => Number(layer.name.replace(/^quadro /, '')))
      .filter((value) => Number.isFinite(value)),
  )
  let number = 1
  while (used.has(number)) number++
  return `quadro ${number}`
}

function docFromBridge(bridge: FrameBridge): Doc {
  const width = bridge.frames[0]?.width ?? 1
  const height = bridge.frames[0]?.height ?? 1
  const base = createDoc(width, height)
  const layers = bridge.frames.map((frame, index) => {
    const layer = createLayer(width, height, `quadro ${index + 1}`)
    const decoded = decodeLayer(frame)
    layer.data.set(decoded.subarray(0, Math.min(decoded.length, layer.data.length)))
    layer.visible = index === 0
    return layer
  })
  return { ...base, layers: layers.length ? layers : base.layers, active: 0 }
}

function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(AUTOSAVE)
    if (!raw) return createDoc(32, 32)
    const project = JSON.parse(raw) as ProjectFile
    if (!project.layers?.length) return createDoc(32, 32)
    return docOfProject(project)
  } catch {
    return createDoc(32, 32)
  }
}

function panelCursor(tool: Tool) {
  if (tool === 'pan') return 'grab'
  if (tool === 'move') return 'move'
  if (tool === 'pick') return 'copy'
  return 'crosshair'
}

function isEmpty(doc: Doc) {
  return doc.layers.every((layer) => !layer.data.some((value) => value !== 0))
}

function insideRect(rect: Rect, x: number, y: number) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h
}

function clampRect(start: [number, number], end: [number, number], width: number, height: number): Rect | null {
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
  const x0 = clamp(Math.min(start[0], end[0]), width)
  const y0 = clamp(Math.min(start[1], end[1]), height)
  const x1 = clamp(Math.max(start[0], end[0]) + 1, width)
  const y1 = clamp(Math.max(start[1], end[1]) + 1, height)
  if (x1 <= x0 || y1 <= y0) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function extractBlock(data: Uint32Array, width: number, rect: Rect): Block {
  const out = new Uint32Array(rect.w * rect.h)
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      out[y * rect.w + x] = data[(rect.y + y) * width + rect.x + x]
    }
  }
  return { width: rect.w, height: rect.h, data: out }
}

function stampBlock(
  target: Uint32Array,
  width: number,
  height: number,
  block: Block,
  left: number,
  top: number,
) {
  for (let y = 0; y < block.height; y++) {
    const ny = top + y
    if (ny < 0 || ny >= height) continue
    for (let x = 0; x < block.width; x++) {
      const nx = left + x
      if (nx < 0 || nx >= width) continue
      target[ny * width + nx] = block.data[y * block.width + x]
    }
  }
}

function clampInt(value: string | number, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

const BTN =
  'rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40'

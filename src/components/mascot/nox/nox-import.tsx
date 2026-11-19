// Importador de uma animacao por vez para o Nox.
//
// A arte entra em escala 1:1: o corte usa coordenadas inteiras e o canvas do
// clipe recebe os pixels sem redimensionar. Antes de gravar, a pagina pergunta
// o que fazer com o fundo, mostra a divisao dos quadros e deixa ajustar ancora,
// fps, loop e status. So no fim grava os PNGs, atualiza o clips.json e, se
// pedido, roda o build_atlas.py.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { StudioNav } from '../studio-nav'
import type { ClipStatus } from './animation/types'
import {
  autoCuts,
  bandsFromCuts,
  colorDistance,
  composeFrame,
  contentBox,
  fitDivisor,
  imageDataToCanvas,
  loadImageData,
  quietestColumn,
  removeBackground,
  rgbHex,
  suggestBackground,
  type BackgroundMode,
  type Rgb,
} from './import/art'

interface ClipConfig {
  folder?: string
  fps?: number
  loop?: boolean
  status?: ClipStatus
  note?: string
  frameWidth?: number
  frameHeight?: number
  anchor?: { x: number; y: number }
  air?: boolean
}

interface Manifest {
  frameWidth: number
  frameHeight: number
  meta: { anchor: { x: number; y: number } }
  clips: Record<string, ClipConfig>
}

interface ConfigResponse {
  ok: boolean
  error?: string
  manifest?: Manifest
}

interface SaveResponse {
  ok: boolean
  error?: string
  saved?: string[]
  build?: { ok: boolean; output: string }
}

interface Source {
  name: string
  data: ImageData
}

interface Piece {
  key: string
  image: number
  x0: number
  x1: number
}

const ZOOMS = [1, 2, 3, 4, 6]
const FIELD =
  'w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200'
const BTN =
  'rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35'
const PRIMARY = 'border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'

const BG_OPTIONS: { value: BackgroundMode; label: string; hint: string }[] = [
  {
    value: 'keep',
    label: 'manter o alpha do arquivo',
    hint: 'O PNG ja vem transparente. Nenhum pixel e apagado.',
  },
  {
    value: 'components',
    label: 'remover o fundo e a moldura',
    hint: 'Apaga as areas grandes das cores detectadas. Olhos e detalhes pequenos ficam.',
  },
  {
    value: 'global',
    label: 'remover essas cores em toda a imagem',
    hint: 'Apaga a cor em qualquer lugar, inclusive dentro do desenho.',
  },
]

export function NoxImport() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [configError, setConfigError] = useState('')
  const [clip, setClip] = useState('idle')
  const [mode, setMode] = useState<'strip' | 'frames'>('strip')
  const [sources, setSources] = useState<Source[]>([])
  const [label, setLabel] = useState('')
  const [bgMode, setBgMode] = useState<BackgroundMode>('components')
  const [bgColors, setBgColors] = useState<Rgb[]>([])
  const [newColor, setNewColor] = useState('#ffffff')
  const [tolerance, setTolerance] = useState(40)

  const [gap, setGap] = useState(12)
  const [minBand, setMinBand] = useState(8)
  const [cuts, setCuts] = useState<number[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [hidden, setHidden] = useState<string[]>([])
  const [selected, setSelected] = useState(0)

  const [manualBaseline, setManualBaseline] = useState<number | null>(null)
  const [preserveVertical, setPreserveVertical] = useState(true)
  const [scaleChoice, setScaleChoice] = useState<'auto' | number>('auto')
  const [fps, setFps] = useState(8)
  const [loop, setLoop] = useState(true)
  const [status, setStatus] = useState<ClipStatus>('pending')
  const [buildAtlas, setBuildAtlas] = useState(true)

  const [zoom, setZoom] = useState(2)
  const [playing, setPlaying] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  const sourceRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const indexRef = useRef(0)

  const loadConfig = useCallback(async () => {
    const response = await fetch('/__nox-import/config')
    const payload = (await response.json()) as ConfigResponse
    if (!payload.ok || !payload.manifest) throw new Error(payload.error ?? 'configuração indisponível')
    setManifest(payload.manifest)
    setConfigError('')
  }, [])

  useEffect(() => {
    void loadConfig().catch((error: unknown) => {
      setConfigError(error instanceof Error ? error.message : String(error))
    })
  }, [loadConfig])

  useEffect(() => {
    const config = manifest?.clips[clip]
    if (!config) return
    setFps(config.fps ?? 8)
    setLoop(config.loop ?? true)
    setStatus(config.status ?? 'pending')
    setManualBaseline(null)
    setPreserveVertical(true)
  }, [clip, manifest])

  const processed = useMemo(
    () =>
      sources.map((source) =>
        removeBackground(source.data, { mode: bgMode, colors: bgColors, tolerance }),
      ),
    [sources, bgMode, bgColors, tolerance],
  )

  useEffect(() => {
    setHidden([])
  }, [sources, mode])

  useEffect(() => {
    if (mode !== 'strip') return
    if (!processed.length) {
      setCuts([])
      return
    }
    setCuts(autoCuts(processed[0], gap, minBand))
  }, [mode, processed, gap, minBand])

  const pieces = useMemo<Piece[]>(() => {
    if (!processed.length) return []
    const all: Piece[] = []

    if (mode === 'strip') {
      for (const band of bandsFromCuts(cuts, processed[0].width)) {
        all.push({ key: `0:${band.x0}-${band.x1}`, image: 0, x0: band.x0, x1: band.x1 })
      }
    } else {
      processed.forEach((source, image) => {
        // Num upload unico o arquivo pode ser o sheet inteiro. Se ele e mais
        // largo que alto e tem colunas vazias, divide igual ao modo tira.
        const bands =
          source.width > source.height * 1.25
            ? bandsFromCuts(autoCuts(source, gap, minBand), source.width)
            : []
        if (bands.length > 1) {
          for (const band of bands) {
            all.push({ key: `${image}:${band.x0}-${band.x1}`, image, x0: band.x0, x1: band.x1 })
          }
        } else {
          all.push({ key: `${image}:0-${source.width}`, image, x0: 0, x1: source.width })
        }
      })
    }

    return all.filter((piece) => !hidden.includes(piece.key))
  }, [mode, cuts, processed, gap, minBand, hidden])

  useEffect(() => {
    setOrder(pieces.map((_, index) => index))
  }, [pieces.length, mode, sources])

  useEffect(() => {
    setSelected((value) => Math.min(value, Math.max(0, pieces.length - 1)))
  }, [pieces.length])

  const sequence = useMemo(
    () => (order.length === pieces.length ? order : pieces.map((_, index) => index)),
    [order, pieces],
  )

  const playPieces = useMemo(
    () => sequence.map((index) => pieces[index]).filter((piece): piece is Piece => Boolean(piece)),
    [sequence, pieces],
  )

  const config = manifest?.clips[clip]
  const frameWidth = config?.frameWidth ?? manifest?.frameWidth ?? 216
  const frameHeight = config?.frameHeight ?? manifest?.frameHeight ?? 216
  const anchorX = config?.anchor?.x ?? manifest?.meta.anchor.x ?? 108
  const anchorY = config?.anchor?.y ?? manifest?.meta.anchor.y ?? 204
  const isAir = Boolean(config?.air)

  const boxes = useMemo(
    () =>
      playPieces.map((piece) => {
        const source = processed[piece.image]
        return source ? contentBox(source, piece.x0, piece.x1) : null
      }),
    [playPieces, processed],
  )

  const autoBaseline = useMemo(() => {
    let bottom = -1
    for (const box of boxes) {
      if (box) bottom = Math.max(bottom, box.y1 - 1)
    }
    return bottom
  }, [boxes])

  const baselineInclusive = manualBaseline ?? (autoBaseline >= 0 ? autoBaseline : frameHeight - 1)
  const baseline = baselineInclusive + 1
  const preserve = isAir && preserveVertical

  // A arte pode vir maior que o canvas do clipe (o sheet de referencia tem
  // cerca de 800 px por quadro). A escala automatica acha o menor divisor
  // inteiro que cabe, sem ampliar nada.
  const autoDivisor = useMemo(
    () => fitDivisor(boxes, frameWidth, isAir ? frameHeight : Math.min(frameHeight, anchorY)),
    [boxes, frameWidth, frameHeight, anchorY, isAir],
  )
  const divisor = scaleChoice === 'auto' ? autoDivisor : scaleChoice

  const composed = useMemo(
    () =>
      playPieces.map((piece) => {
        const source = processed[piece.image]
        if (!source) {
          return { data: null, empty: true, clipped: false, top: 0, bottom: -1 }
        }
        return composeFrame(source, piece.x0, piece.x1, {
          width: frameWidth,
          height: frameHeight,
          anchorX,
          anchorY,
          preserveVertical: preserve,
          baseline,
          divisor,
        })
      }),
    [playPieces, processed, frameWidth, frameHeight, anchorX, anchorY, preserve, baseline, divisor],
  )

  const canvases = useMemo(
    () => composed.map((frame) => (frame.data ? imageDataToCanvas(frame.data) : null)),
    [composed],
  )

  const issues = useMemo(() => {
    const list: string[] = []
    if (!sources.length) list.push('nenhuma imagem carregada')
    if (sources.length && !playPieces.length) list.push('nenhum quadro reconhecido')
    if (playPieces.length > 64) list.push('mais de 64 quadros; o build espera no máximo 64')
    composed.forEach((frame, index) => {
      if (frame.empty) list.push(`quadro ${index + 1}: vazio`)
      else if (frame.clipped) list.push(`quadro ${index + 1}: sai do canvas ${frameWidth}x${frameHeight}`)
      else if (!isAir && frame.bottom !== anchorY - 1) {
        list.push(`quadro ${index + 1}: o pé não encosta na âncora (y=${anchorY - 1})`)
      }
    })
    if (isAir && preserve && composed.some((frame) => frame.top < 0)) {
      list.push('clipe aéreo: o quadro sobe para fora do canvas')
    }
    return list
  }, [sources.length, playPieces.length, composed, frameWidth, frameHeight, isAir, anchorY, preserve])

  const canSave = Boolean(
    manifest && sources.length && composed.length && composed.every((frame) => frame.data && !frame.clipped),
  ) && issues.length === 0

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setResult(null)
    try {
      const chosen = mode === 'strip' ? [files[0]] : Array.from(files)
      const loaded: Source[] = []
      for (const file of chosen) {
        loaded.push({ name: file.name, data: await loadImageData(file) })
      }
      setSources(loaded)
      setLabel(chosen.map((file) => file.name).join(', '))
      const suggestion = suggestBackground(loaded[0].data)
      setBgMode(suggestion.mode)
      setBgColors(suggestion.colors)
      setManualBaseline(null)
      setSelected(0)
    } catch (error) {
      setResult({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    indexRef.current = 0
  }, [canvases])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    canvas.width = frameWidth * zoom
    canvas.height = frameHeight * zoom
    const context = canvas.getContext('2d')
    if (!context) return

    let raf = 0
    let last = performance.now()
    let elapsed = 0

    const paint = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.imageSmoothingEnabled = false
      const current = canvases[indexRef.current]
      if (current) context.drawImage(current, 0, 0, canvas.width, canvas.height)

      context.strokeStyle = 'rgba(250,250,250,0.22)'
      context.lineWidth = 1
      context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1)
      context.beginPath()
      context.moveTo(0, anchorY * zoom + 0.5)
      context.lineTo(canvas.width, anchorY * zoom + 0.5)
      context.moveTo(anchorX * zoom + 0.5, anchorY * zoom - 5)
      context.lineTo(anchorX * zoom + 0.5, anchorY * zoom + 5)
      context.stroke()
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const delta = Math.min(250, Math.max(0, now - last))
      last = now
      if (playing && canvases.length > 1) {
        elapsed += delta
        const step = 1000 / Math.max(1, fps)
        while (elapsed >= step) {
          elapsed -= step
          if (loop) indexRef.current = (indexRef.current + 1) % canvases.length
          else indexRef.current = Math.min(canvases.length - 1, indexRef.current + 1)
        }
      }
      paint()
    }

    paint()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [canvases, frameWidth, frameHeight, zoom, anchorX, anchorY, fps, loop, playing])

  useEffect(() => {
    const canvas = sourceRef.current
    if (!canvas) return
    if (mode !== 'strip' || !processed.length) {
      canvas.width = 1
      canvas.height = 1
      return
    }
    const source = processed[0]
    canvas.width = source.width
    canvas.height = source.height
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = false
    context.drawImage(imageDataToCanvas(source), 0, 0)

    const band = pieces[selected]
    if (band) {
      context.fillStyle = 'rgba(56,189,248,0.16)'
      context.fillRect(band.x0, 0, band.x1 - band.x0, canvas.height)
    }

    context.strokeStyle = 'rgba(244,63,94,0.95)'
    context.lineWidth = Math.max(1, Math.round(canvas.width / 1200))
    for (const cut of cuts.slice(1, -1)) {
      context.beginPath()
      context.moveTo(cut + 0.5, 0)
      context.lineTo(cut + 0.5, canvas.height)
      context.stroke()
    }
  }, [mode, processed, cuts, pieces, selected])

  const clickSource = (event: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'strip' || !processed.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const width = processed[0].width
    const x = Math.round(((event.clientX - rect.left) / rect.width) * width)
    const threshold = Math.max(4, Math.round((8 * width) / rect.width))
    const hit = cuts.slice(1, -1).findIndex((cut) => Math.abs(cut - x) <= threshold)
    if (hit >= 0) {
      setCuts(cuts.filter((_, index) => index !== hit + 1))
      return
    }
    if (x > 2 && x < width - 2) {
      setCuts([...cuts, x].sort((a, b) => a - b))
    }
  }

  const joinBand = (direction: -1 | 1) => {
    if (mode !== 'strip' || !processed.length) return
    if (direction < 0 && selected < 1) return
    if (direction > 0 && selected >= pieces.length - 1) return
    const boundary = direction < 0 ? selected : selected + 1
    setCuts(cuts.filter((_, index) => index !== boundary))
  }

  const divideBand = () => {
    if (mode !== 'strip' || !processed.length) return
    const band = pieces[selected]
    if (!band) return
    const cut = quietestColumn(processed[0], band)
    if (cut > band.x0 && cut < band.x1) {
      setCuts([...cuts, cut].sort((a, b) => a - b))
    }
  }

  const moveSelected = (direction: -1 | 1) => {
    const target = selected + direction
    if (target < 0 || target >= sequence.length) return
    const next = [...sequence]
    ;[next[selected], next[target]] = [next[target], next[selected]]
    setOrder(next)
    setSelected(target)
  }

  const removeSelected = () => {
    if (mode !== 'frames') return
    const piece = pieces[selected]
    if (!piece) return
    setHidden((value) => [...value, piece.key])
    setSelected(Math.max(0, selected - 1))
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setResult(null)
    try {
      const frames = composed.map((frame) =>
        frame.data ? imageDataToCanvas(frame.data).toDataURL('image/png') : '',
      )
      const response = await fetch('/__nox-import/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clip,
          frames,
          fps,
          loop,
          status,
          frameWidth,
          frameHeight,
          anchor: { x: anchorX, y: anchorY },
          air: isAir,
          build: buildAtlas,
        }),
      })
      const payload = (await response.json()) as SaveResponse
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'falha ao gravar')

      const count = payload.saved?.length ?? frames.length
      if (payload.build && !payload.build.ok) {
        setResult({
          kind: 'warn',
          text: `${count} quadro(s) gravados em ${clip}, mas o atlas falhou:\n${payload.build.output}`,
        })
      } else {
        setResult({
          kind: 'ok',
          text: `${count} quadro(s) gravados em ${clip}.${
            payload.build ? ' Atlas remontado.' : ' Atlas não remontado.'
          }`,
        })
      }
      await loadConfig()
    } catch (error) {
      setResult({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setSaving(false)
    }
  }

  const setNumber = (setter: (value: number) => void, min: number, max: number) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)
      if (!Number.isFinite(value)) return
      setter(Math.max(min, Math.min(max, value)))
    }
  }

  const addColor = () => {
    const value = newColor.replace('#', '')
    if (value.length !== 6) return
    const color: Rgb = {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
      a: 255,
    }
    if (!bgColors.some((item) => colorDistance(item, color) <= 24)) {
      setBgColors([...bgColors, color])
    }
  }

  const clipNames = manifest ? Object.keys(manifest.clips) : []

  return (
    <div className='min-h-screen bg-zinc-950 text-zinc-200'>
      <header className='flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 px-5 py-4'>
        <div>
          <p className='text-[11px] uppercase tracking-[0.2em] text-zinc-500'>nox · importador</p>
          <h1 className='mt-1 text-xl font-semibold'>Importar uma animação</h1>
          <p className='mt-1 max-w-2xl text-xs text-zinc-500'>
            Uma animação por vez. O fundo e a moldura são removidos pelas cores detectadas, a tira é
            dividida nas colunas vazias e os quadros entram no canvas com a âncora ajustada. Se a arte
            vier maior que o canvas, a escala inteira reduz sem ampliar.
          </p>
        </div>
        <StudioNav current='/__nox-import' />
      </header>

      {configError && <p className='px-5 py-3 text-sm text-red-400'>{configError}</p>}

      <main className='mx-auto grid max-w-[1500px] items-start gap-5 p-5 xl:grid-cols-[390px_minmax(0,1fr)]'>
        <aside className='space-y-3'>
          <Section title='clipe' note={`${frameWidth}x${frameHeight} · âncora ${anchorX},${anchorY}`}>
            <select value={clip} onChange={(event) => setClip(event.target.value)} className={FIELD}>
              {clipNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {config && (
              <p className='text-[11px] leading-4 text-zinc-500'>
                status atual: {config.status ?? 'pending'}
                {config.note ? ` · ${config.note}` : ''}
                {isAir ? ' · clipe aéreo' : ''}
              </p>
            )}
          </Section>

          <Section title='entrada' note='uma tira ou vários PNGs'>
            <div className='grid grid-cols-2 gap-1'>
              {(
                [
                  ['strip', 'tira de quadros'],
                  ['frames', 'quadro a quadro'],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  onClick={() => {
                    setMode(value)
                    setSources([])
                    setLabel('')
                    setResult(null)
                    setSelected(0)
                  }}
                  className={`${BTN} ${mode === value ? PRIMARY : ''}`}
                >
                  {text}
                </button>
              ))}
            </div>

            <label className={`${BTN} block cursor-pointer text-center`}>
              {busy ? 'lendo...' : mode === 'strip' ? 'escolher a tira' : 'escolher os quadros'}
              <input
                type='file'
                accept='image/png,image/jpeg,image/webp'
                multiple={mode === 'frames'}
                className='hidden'
                onChange={(event) => {
                  void pick(event.target.files)
                  event.target.value = ''
                }}
              />
            </label>

            {label && <p className='truncate text-[11px] text-zinc-500'>{label}</p>}

            {mode === 'frames' && sources.length > 0 && (
              <ul className='max-h-28 space-y-0.5 overflow-auto text-[11px] text-zinc-500'>
                {sources.map((source, index) => (
                  <li key={`${source.name}-${index}`} className='truncate'>
                    {index + 1}. {source.name} · {source.data.width}x{source.data.height}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {sources.length > 0 && (
            <Section title='fundo' note='pergunta obrigatória antes de gravar'>
              <div className='space-y-1'>
                {BG_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setBgMode(option.value)}
                    className={`w-full rounded border px-2 py-1.5 text-left text-[11px] leading-4 transition ${
                      bgMode === option.value
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <span className='block font-medium'>{option.label}</span>
                    <span className='block text-zinc-500'>{option.hint}</span>
                  </button>
                ))}
              </div>

              <div className='space-y-1'>
                {bgColors.length > 0 ? (
                  <>
                    <p className='text-[11px] leading-4 text-zinc-500'>
                      cores detectadas no arquivo. Clique em uma para deixar de remover:
                    </p>
                    <div className='flex flex-wrap gap-1'>
                      {bgColors.map((color, index) => (
                        <button
                          key={`${rgbHex(color)}-${index}`}
                          onClick={() => setBgColors(bgColors.filter((_, item) => item !== index))}
                          title='remover esta cor da lista'
                          className='flex items-center gap-1 rounded border border-zinc-700 px-1.5 py-1 text-[10px] text-zinc-400 transition hover:border-red-500/60 hover:text-red-300'
                        >
                          <span
                            className='h-3 w-3 rounded-sm ring-1 ring-zinc-600'
                            style={{ backgroundColor: rgbHex(color) }}
                          />
                          {rgbHex(color)} ×
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className='text-[11px] leading-4 text-amber-300/90'>
                    nenhuma cor escolhida; o arquivo fica com o alpha original.
                  </p>
                )}

                <div className='flex items-end gap-1'>
                  <label className='flex-1 text-[11px] text-zinc-500'>
                    acrescentar cor
                    <input
                      type='color'
                      value={newColor}
                      onChange={(event) => setNewColor(event.target.value)}
                      className='mt-0.5 h-7 w-full rounded border border-zinc-700 bg-zinc-900'
                    />
                  </label>
                  <button onClick={addColor} className={BTN}>
                    acrescentar
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (!sources[0]) return
                    const suggestion = suggestBackground(sources[0].data)
                    setBgMode(suggestion.mode)
                    setBgColors(suggestion.colors)
                  }}
                  className={BTN}
                >
                  detectar de novo
                </button>
              </div>

              {bgMode !== 'keep' && (
                <label className='block text-[11px] text-zinc-500'>
                  tolerância {tolerance}
                  <input
                    type='range'
                    min={0}
                    max={160}
                    value={tolerance}
                    onChange={(event) => setTolerance(Number(event.target.value))}
                    className='mt-1 w-full accent-amber-500'
                  />
                </label>
              )}
            </Section>
          )}

          {mode === 'strip' && sources.length > 0 && (
            <Section title='divisão' note={`${pieces.length} quadro(s)`}>
              <div className='grid grid-cols-2 gap-2'>
                <label className='text-[11px] text-zinc-500'>
                  separação (px)
                  <input
                    type='number'
                    min={0}
                    max={200}
                    value={gap}
                    onChange={setNumber(setGap, 0, 200)}
                    className={`${FIELD} mt-0.5`}
                  />
                </label>
                <label className='text-[11px] text-zinc-500'>
                  largura mínima
                  <input
                    type='number'
                    min={1}
                    max={400}
                    value={minBand}
                    onChange={setNumber(setMinBand, 1, 400)}
                    className={`${FIELD} mt-0.5`}
                  />
                </label>
              </div>

              <div className='flex flex-wrap gap-1'>
                <button
                  onClick={() => processed[0] && setCuts(autoCuts(processed[0], gap, minBand))}
                  className={BTN}
                >
                  dividir automático
                </button>
                <button
                  onClick={() => processed[0] && setCuts([0, processed[0].width])}
                  className={BTN}
                >
                  juntar tudo
                </button>
              </div>

              <div className='flex flex-wrap gap-1'>
                <button onClick={() => joinBand(-1)} disabled={selected < 1} className={BTN}>
                  juntar anterior
                </button>
                <button
                  onClick={() => joinBand(1)}
                  disabled={selected >= pieces.length - 1}
                  className={BTN}
                >
                  juntar próxima
                </button>
                <button onClick={divideBand} disabled={!pieces.length} className={BTN}>
                  dividir no vazio
                </button>
              </div>

              <p className='text-[11px] leading-4 text-zinc-600'>
                Clique na tira para acrescentar um corte. Clique em cima de uma linha vermelha para
                juntar os dois lados.
              </p>
            </Section>
          )}

          {sources.length > 0 && (
            <Section title='encaixe' note={`${frameWidth}x${frameHeight}`}>
              <div className='grid grid-cols-2 gap-2'>
                <label className='text-[11px] text-zinc-500'>
                  âncora x
                  <input value={anchorX} readOnly className={`${FIELD} mt-0.5 opacity-60`} />
                </label>
                <label className='text-[11px] text-zinc-500'>
                  âncora y
                  <input value={anchorY} readOnly className={`${FIELD} mt-0.5 opacity-60`} />
                </label>
              </div>

              <label className='block text-[11px] text-zinc-500'>
                escala da arte {scaleChoice === 'auto' ? `· usando 1/${divisor}` : ''}
                <select
                  value={String(scaleChoice)}
                  onChange={(event) =>
                    setScaleChoice(event.target.value === 'auto' ? 'auto' : Number(event.target.value))
                  }
                  className={`${FIELD} mt-0.5`}
                >
                  <option value='auto'>automática (1/{autoDivisor})</option>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                    <option key={value} value={value}>
                      {value === 1 ? '1:1 (sem reduzir)' : `1/${value}`}
                    </option>
                  ))}
                </select>
              </label>
              <p className='text-[11px] leading-4 text-zinc-600'>
                A escala só reduz, por amostragem nearest. O divisor inteiro mantém os pixels da
                arte alinhados.
              </p>

              {isAir ? (
                <>
                  <label className='flex items-center gap-2 text-[11px] text-zinc-400'>
                    <input
                      type='checkbox'
                      checked={preserveVertical}
                      onChange={(event) => setPreserveVertical(event.target.checked)}
                    />
                    preservar a subida entre os quadros
                  </label>
                  {preserveVertical && (
                    <>
                      <label className='block text-[11px] text-zinc-500'>
                        linha dos pés na origem (y) {manualBaseline === null ? '· automática' : ''}
                        <input
                          type='number'
                          min={0}
                          max={100000}
                          value={baselineInclusive}
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            if (Number.isFinite(value)) setManualBaseline(value)
                          }}
                          className={`${FIELD} mt-0.5`}
                        />
                      </label>
                      {manualBaseline !== null && (
                        <button onClick={() => setManualBaseline(null)} className={BTN}>
                          voltar para automática
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className='text-[11px] leading-4 text-zinc-600'>
                  A base de cada quadro é encostada na âncora. O eixo X é centralizado na âncora.
                </p>
              )}
            </Section>
          )}

          <Section title='animação e gravação' note='entra no clips.json'>
            <div className='grid grid-cols-2 gap-2'>
              <label className='text-[11px] text-zinc-500'>
                fps
                <input
                  type='number'
                  min={1}
                  max={60}
                  value={fps}
                  onChange={setNumber(setFps, 1, 60)}
                  className={`${FIELD} mt-0.5`}
                />
              </label>
              <label className='text-[11px] text-zinc-500'>
                status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ClipStatus)}
                  className={`${FIELD} mt-0.5`}
                >
                  <option value='ready'>ready</option>
                  <option value='provisional'>provisional</option>
                  <option value='pending'>pending</option>
                </select>
              </label>
            </div>

            <label className='flex items-center gap-2 text-[11px] text-zinc-400'>
              <input type='checkbox' checked={loop} onChange={(event) => setLoop(event.target.checked)} />
              repetir em loop
            </label>
            <label className='flex items-center gap-2 text-[11px] text-zinc-400'>
              <input
                type='checkbox'
                checked={buildAtlas}
                onChange={(event) => setBuildAtlas(event.target.checked)}
              />
              rodar build_atlas.py depois de gravar
            </label>

            <button onClick={() => void save()} disabled={!canSave || saving} className={`${BTN} w-full ${PRIMARY}`}>
              {saving ? 'gravando...' : 'gravar quadros'}
            </button>

            {result && (
              <p
                className={`whitespace-pre-wrap rounded border px-2 py-1.5 text-[11px] leading-4 ${
                  result.kind === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : result.kind === 'warn'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {result.text}
              </p>
            )}

            {issues.length > 0 && sources.length > 0 && (
              <ul className='space-y-0.5 text-[11px] leading-4 text-amber-300/90'>
                {issues.map((issue) => (
                  <li key={issue}>· {issue}</li>
                ))}
              </ul>
            )}
          </Section>
        </aside>

        <section className='space-y-3'>
          {mode === 'strip' && sources.length > 0 && (
            <Panel title='tira de origem' note={`${processed[0]?.width}x${processed[0]?.height} · clique para cortar`}>
              <canvas
                ref={sourceRef}
                onClick={clickSource}
                className='block max-h-[420px] max-w-full cursor-crosshair'
                style={{ imageRendering: 'pixelated' }}
              />
            </Panel>
          )}

          <Panel title='quadros' note={`${playPieces.length} quadro(s) na ordem de reprodução`}>
            {playPieces.length === 0 ? (
              <p className='py-8 text-center text-xs text-zinc-600'>
                Escolha um clipe e carregue a arte para ver os quadros.
              </p>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {playPieces.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelected(index)}
                    className={`rounded-lg border p-1 transition ${
                      index === selected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <DataCanvas canvas={canvases[index] ?? null} className='block h-16 w-auto' />
                    <span className='mt-1 block text-center text-[10px] text-zinc-500'>{index + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {mode === 'frames' && playPieces.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-1'>
                <button onClick={() => moveSelected(-1)} disabled={selected < 1} className={BTN}>
                  mover para trás
                </button>
                <button
                  onClick={() => moveSelected(1)}
                  disabled={selected >= playPieces.length - 1}
                  className={BTN}
                >
                  mover para frente
                </button>
                <button onClick={removeSelected} className={BTN}>
                  remover quadro
                </button>
              </div>
            )}
          </Panel>

          <Panel title='prévia' note={`${frameWidth}x${frameHeight} · âncora ${anchorX},${anchorY}`}>
            <div className='mb-3 flex flex-wrap items-center gap-2'>
              <button onClick={() => setPlaying((value) => !value)} className={BTN}>
                {playing ? 'pausar' : 'tocar'}
              </button>
              <label className='flex items-center gap-1 text-[11px] text-zinc-500'>
                zoom
                <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className={FIELD}>
                  {ZOOMS.map((value) => (
                    <option key={value} value={value}>
                      {value}x
                    </option>
                  ))}
                </select>
              </label>
              <span className='text-[11px] text-zinc-500'>{fps} fps · {loop ? 'loop' : 'uma vez'}</span>
            </div>

            <div
              className='mx-auto w-fit rounded-lg p-3'
              style={{
                backgroundImage:
                  'repeating-conic-gradient(#27272a 0% 25%, #3f3f46 0% 50%)',
                backgroundSize: '16px 16px',
              }}
            >
              <canvas
                ref={previewRef}
                className='block max-w-full'
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </Panel>
        </section>
      </main>
    </div>
  )
}

function Section(props: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className='space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3'>
      <div className='flex items-baseline justify-between gap-2'>
        <h2 className='text-xs font-semibold uppercase tracking-wide text-zinc-400'>{props.title}</h2>
        {props.note && <span className='text-[10px] text-zinc-600'>{props.note}</span>}
      </div>
      {props.children}
    </section>
  )
}

function Panel(props: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className='rounded-xl border border-zinc-800 bg-zinc-900/40 p-4'>
      <div className='mb-3 flex flex-wrap items-baseline justify-between gap-2'>
        <h2 className='text-sm font-semibold text-zinc-200'>{props.title}</h2>
        {props.note && <span className='text-[11px] text-zinc-500'>{props.note}</span>}
      </div>
      {props.children}
    </section>
  )
}

function DataCanvas(props: { canvas: HTMLCanvasElement | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!props.canvas) {
      node.width = 1
      node.height = 1
      return
    }
    node.width = props.canvas.width
    node.height = props.canvas.height
    const context = node.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, node.width, node.height)
    context.imageSmoothingEnabled = false
    context.drawImage(props.canvas, 0, 0)
  }, [props.canvas])

  return (
    <canvas
      ref={ref}
      className={props.className}
      style={{ imageRendering: 'pixelated', background: 'rgba(63,63,70,0.35)' }}
    />
  )
}

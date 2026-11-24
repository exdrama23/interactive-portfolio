// Importador de imagem do studio.
//
// Não substitui o editor: traz uma figura de fora para a grade, mostra o
// encaixe cru antes de quantizar e só aplica quando você manda. A prévia é a
// mesma grade que o importador leu, então célula errada aparece na hora.

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { NOX_PAL } from '../sprite-art'
import { CAT_H, CAT_W } from './format'
import {
  cellsFrom,
  cornerColor,
  detectFit,
  frameRows,
  quantize,
  readImage,
  readImageUrl,
  scoreFit,
  splitFrames,
  type Fit,
} from './import-art'

const SCALE = 6
const MAX_W = 232
const PREVIEW = 4

export type ImportTarget = 'current' | 'walk'

// Quadro que chegou do preview do Nox. Vem como tira pronta, sem passar por
// arquivo: o studio le, mostra o encaixe e so aplica quando voce manda.
export interface IncomingStrip {
  label: string
  strip: string
  frames: number
}

interface Props {
  onApply: (frames: string[][], target: ImportTarget) => void
  incoming?: IncomingStrip | null
  onIncomingUsed?: () => void
}

export function Importer({ onApply, incoming, onIncomingUsed }: Props) {
  const [data, setData] = useState<ImageData | null>(null)
  const [name, setName] = useState('')
  const [fit, setFit] = useState<Fit>({ cell: 1, offsetX: 0, offsetY: 0 })
  const [score, setScore] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<ImportTarget>('current')
  const [frame, setFrame] = useState(0)

  const rawRef = useRef<HTMLCanvasElement>(null)
  const outRef = useRef<HTMLCanvasElement>(null)

  const cells = useMemo(() => (data ? cellsFrom(data, fit) : null), [data, fit])
  const background = useMemo(() => (cells ? cornerColor(cells) : null), [cells])
  const frames = useMemo(() => (cells ? splitFrames(cells, background) : []), [cells, background])
  const poses = useMemo(() => {
    if (!cells) return []
    return frames.map((rect) => quantize(frameRows(cells, rect, CAT_W, CAT_H, background), NOX_PAL))
  }, [cells, frames, background])

  const pick = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const image = await readImage(file)
      const found = detectFit(image)
      setData(image)
      setName(file.name)
      setFit(found.fit)
      setScore(found.score)
      setFrame(0)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem))
    } finally {
      setBusy(false)
    }
  }

  // Tira que veio do preview do Nox: mesmo caminho do arquivo escolhido a mao,
  // so que ja com os quadros montados na ordem do clipe.
  useEffect(() => {
    if (!incoming) return
    let alive = true
    setBusy(true)
    setError('')
    readImageUrl(incoming.strip)
      .then((image) => {
        if (!alive) return
        const plain = { cell: 1, offsetX: 0, offsetY: 0 }
        setData(image)
        setName(`${incoming.label} · ${incoming.frames} quadro(s)`)
        // A tira do preview ja e arte 1:1, nao uma referencia reescalonada: nao
        // ha celula para adivinhar. Celula 1 mantem o desenho inteiro e deixa o
        // encaixe na grade 30x28 ser uma reducao proporcional, sem cortar.
        setFit(plain)
        setScore(scoreFit(image, plain))
        setFrame(0)
        setTarget(incoming.frames >= 4 ? 'walk' : 'current')
        onIncomingUsed?.()
      })
      .catch((problem) => {
        if (alive) setError(problem instanceof Error ? problem.message : String(problem))
      })
      .finally(() => {
        if (alive) setBusy(false)
      })
    return () => {
      alive = false
    }
    // So a tira nova interessa; repetir o mesmo objeto nao deve recarregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.strip])

  useEffect(() => {
    const canvas = rawRef.current
    if (!canvas || !cells) return
    const scale = Math.max(1, Math.min(SCALE, Math.floor(MAX_W / Math.max(1, cells.columns))))
    canvas.width = cells.columns * scale
    canvas.height = cells.rows * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#111116'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < cells.rows; y++) {
      for (let x = 0; x < cells.columns; x++) {
        const color = cells.cell[y][x]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let x = 1; x < cells.columns; x++) {
      ctx.beginPath()
      ctx.moveTo(x * scale + 0.5, 0)
      ctx.lineTo(x * scale + 0.5, canvas.height)
      ctx.stroke()
    }
    for (let y = 1; y < cells.rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * scale + 0.5)
      ctx.lineTo(canvas.width, y * scale + 0.5)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(56,189,248,0.9)'
    ctx.lineWidth = 2
    for (const rect of frames) {
      ctx.strokeRect(rect.x * scale + 1, rect.y * scale + 1, rect.w * scale - 2, rect.h * scale - 2)
    }
  }, [cells, frames])

  const chosen = poses[Math.min(frame, Math.max(0, poses.length - 1))]

  useEffect(() => {
    const canvas = outRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#111116'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!chosen) return
    chosen.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = NOX_PAL['123456789abcdef'.indexOf(row[x])]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x * PREVIEW, y * PREVIEW, PREVIEW, PREVIEW)
      }
    })
  }, [chosen])

  const setNumber = (key: keyof Fit) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (!Number.isFinite(value)) return
    const next = { ...fit, [key]: value }
    setFit(next)
    if (data) setScore(scoreFit(data, next))
  }

  return (
    <section className="space-y-2">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">importar imagem</div>

      <label className={`${BTN} block cursor-pointer text-center`}>
        {busy ? 'lendo...' : 'escolher arquivo'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void pick(file)
            event.target.value = ''
          }}
        />
      </label>

      {error && <p className="text-[11px] leading-4 text-red-400">{error}</p>}

      {name && (
        <p className="truncate text-[11px] text-zinc-500">
          {name} {data ? `· ${data.width}x${data.height}` : ''}
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ['cell', 'célula'],
                ['offsetX', 'desloc. x'],
                ['offsetY', 'desloc. y'],
              ] as [keyof Fit, string][]
            ).map(([key, label]) => (
              <label key={key} className="text-[11px] text-zinc-500">
                {label}
                <input
                  type="number"
                  step={key === 'cell' ? 0.05 : 0.5}
                  value={Number(fit[key].toFixed(2))}
                  onChange={setNumber(key)}
                  className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200"
                />
              </label>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500">
            encaixe {(score * 100).toFixed(1)}% · {cells?.columns}x{cells?.rows} células ·{' '}
            {frames.length} quadro{frames.length === 1 ? '' : 's'}
          </p>
          <p className="text-[11px] leading-4 text-zinc-600">
            A célula é um chute quando o arquivo veio reescalonado. Se a prévia sair torta, ajuste
            até o desenho ficar limpo.
          </p>

          <canvas ref={rawRef} className="block rounded ring-1 ring-zinc-800" style={{ imageRendering: 'pixelated' }} />

          {frames.length > 1 && (
            <select
              value={frame}
              onChange={(event) => setFrame(Number(event.target.value))}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            >
              {frames.map((_, index) => (
                <option key={index} value={index}>
                  quadro {index + 1}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-start gap-2">
            <canvas
              ref={outRef}
              width={CAT_W * PREVIEW}
              height={CAT_H * PREVIEW}
              className="rounded ring-1 ring-zinc-800"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="flex-1 space-y-1">
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value as ImportTarget)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value="current">quadro atual</option>
                <option value="walk">andando (6 quadros)</option>
              </select>
              <button
                onClick={() => onApply(poses.map((item) => item.rows), target)}
                disabled={!poses.length}
                className={`${BTN} w-full`}
              >
                aplicar
              </button>
            </div>
          </div>

          {chosen && chosen.misses.length > 0 && (
            <div className="text-[11px] leading-4 text-amber-300/80">
              fora da paleta:
              {chosen.misses.map((miss) => (
                <span key={miss.color} className="ml-1">
                  {miss.color} ({miss.count})
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

const BTN =
  'rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40'


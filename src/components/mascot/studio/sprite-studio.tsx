// Studio do Nox. Rota só de desenvolvimento.
//
// A arte é lida crua do `sprite-art.ts` (?raw), editada aqui e regravada pelo
// plugin do `vite.config.ts` na mesma hora. O que aparece na grade é exatamente
// o que o gato usa no site, sem arquivo intermediário nem conversão.

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import artRaw from '../sprite-art.ts?raw'
import { NOX_PAL } from '../sprite-art'
import { CAT_H, CAT_W, parseArt, writeArt, type StudioPose } from './format'

// O índice de cada caractere é a posição na paleta, então a lista de cores
// manda: se alguém acrescentar um tom, ele aparece aqui sozinho.
const CHARS = '123456789abcdef'.slice(0, NOX_PAL.length)
const COLOR: Record<string, string> = Object.fromEntries(
  CHARS.split('').map((ch, i) => [ch, NOX_PAL[i]]),
)
const CELL = 15

type Tool = 'pencil' | 'eraser' | 'bucket' | 'pick'

const LABELS: Record<string, string> = {
  POSE_SIT: 'sentado',
  POSE_STAND_1: 'em pé 1',
  POSE_STAND_2: 'em pé 2',
  POSE_STAND_3: 'em pé 3',
}

const labelOf = (id: string) => {
  if (id === 'POSE_WALK') return 'andando 1'
  const walk = /^POSE_WALK\[(\d+)\]$/.exec(id)
  return walk ? `andando ${Number(walk[1]) + 1}` : (LABELS[id] ?? id)
}

const CLIPS = [
  { name: 'parado', ids: ['POSE_STAND_3'], fps: 3 },
  {
    name: 'andando',
    ids: ['POSE_WALK[0]', 'POSE_WALK[1]', 'POSE_WALK[2]', 'POSE_WALK[3]', 'POSE_WALK[4]', 'POSE_WALK[5]'],
    fps: 8,
  },
  { name: 'levantar', ids: ['POSE_SIT', 'POSE_STAND_1', 'POSE_STAND_2', 'POSE_STAND_3'], fps: 9 },
  { name: 'sentar', ids: ['POSE_STAND_3', 'POSE_STAND_2', 'POSE_STAND_1', 'POSE_SIT'], fps: 9 },
]

function paintRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  scale: number,
  ox = 0,
  oy = 0,
) {
  rows.forEach((row, y) => {
    for (let x = 0; x < CAT_W; x++) {
      const color = COLOR[row[x]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale)
    }
  })
}

function thumbUrl(rows: string[], scale: number) {
  const canvas = document.createElement('canvas')
  canvas.width = CAT_W * scale
  canvas.height = CAT_H * scale
  const ctx = canvas.getContext('2d')
  if (ctx) paintRows(ctx, rows, scale)
  return canvas.toDataURL()
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function bucketFill(grid: string[][], x: number, y: number, ch: string) {
  const target = grid[y][x]
  if (target === ch) return
  const stack: [number, number][] = [[x, y]]
  while (stack.length) {
    const [cx, cy] = stack.pop()!
    if (cx < 0 || cy < 0 || cx >= CAT_W || cy >= CAT_H) continue
    if (grid[cy][cx] !== target) continue
    grid[cy][cx] = ch
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
}

function line(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const cells: [number, number][] = []
  let dx = Math.abs(x1 - x0)
  let dy = -Math.abs(y1 - y0)
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

export function SpriteStudio() {
  const [source, setSource] = useState(artRaw)
  const [poses, setPoses] = useState<StudioPose[]>(() => parseArt(artRaw))
  // Salvar reescreve o arquivo, o Vite recarrega a página e o studio perderia a
  // seleção. Guardar o quadro atual na sessão deixa a recarga invisível.
  const [active, setActive] = useState(() => Number(sessionStorage.getItem('nox-studio-frame') ?? 0))
  const [char, setChar] = useState('3')
  const [tool, setTool] = useState<Tool>('pencil')
  const [history, setHistory] = useState<StudioPose[][]>([])
  const [future, setFuture] = useState<StudioPose[][]>([])
  const [onion, setOnion] = useState(true)
  const [grid, setGrid] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(() =>
    sessionStorage.getItem('nox-studio-saved') ? 'gravado em sprite-art.ts' : '',
  )
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [clip, setClip] = useState(1)
  const [playing, setPlaying] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const lastCell = useRef<[number, number] | null>(null)
  const drawing = useRef(false)
  const posesRef = useRef(poses)
  posesRef.current = poses

  const thumbnails = useMemo(() => poses.map((pose) => thumbUrl(pose.rows, 3)), [poses])
  const pose = poses[active]

  const paint = (
    x: number,
    y: number,
    from: [number, number] | null,
    onlyOnce = false,
  ) => {
    if (x < 0 || y < 0 || x >= CAT_W || y >= CAT_H) return
    if (tool === 'pick') {
      const picked = posesRef.current[active]?.rows[y]?.[x]
      if (picked && picked !== '.') setChar(picked)
      return
    }
    setPoses((list) =>
      list.map((item, index) => {
        if (index !== active) return item
        const cells = item.rows.map((row) => row.split(''))
        if (tool === 'bucket') bucketFill(cells, x, y, char)
        else {
          const points = onlyOnce || !from ? [[x, y]] : line(from[0], from[1], x, y)
          for (const [cx, cy] of points) {
            if (cx < 0 || cy < 0 || cx >= CAT_W || cy >= CAT_H) continue
            cells[cy][cx] = tool === 'eraser' ? '.' : char
          }
        }
        return { ...item, rows: cells.map((row) => row.join('')) }
      }),
    )
    setDirty(true)
  }

  const cellAt = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [
      Math.floor(((event.clientX - rect.left) / rect.width) * CAT_W),
      Math.floor(((event.clientY - rect.top) / rect.height) * CAT_H),
    ]
  }

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const [x, y] = cellAt(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    setHistory((stack) => [...stack.slice(-49), poses])
    setFuture([])
    drawing.current = true
    lastCell.current = [x, y]
    paint(x, y, null, true)
  }

  const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const [x, y] = cellAt(event)
    setHover([x, y])
    if (!drawing.current) return
    if (tool === 'pick' || tool === 'bucket') return
    paint(x, y, lastCell.current)
    lastCell.current = [x, y]
  }

  const endStroke = () => {
    drawing.current = false
    lastCell.current = null
  }

  const undo = () => {
    if (!history.length) return
    setFuture([poses, ...future].slice(0, 50))
    setPoses(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setDirty(true)
  }

  const redo = () => {
    if (!future.length) return
    setHistory([...history, poses].slice(-50))
    setPoses(future[0])
    setFuture(future.slice(1))
    setDirty(true)
  }

  const patchPose = (patch: Partial<StudioPose>) => {
    setHistory((stack) => [...stack.slice(-49), poses])
    setFuture([])
    setPoses((list) => list.map((item, index) => (index === active ? { ...item, ...patch } : item)))
    setDirty(true)
  }

  const duplicatePrevious = () => {
    const previous = poses[active - 1]
    if (!previous) return
    patchPose({ rows: previous.rows })
  }

  const clear = () => {
    patchPose({ rows: Array.from({ length: CAT_H }, () => '.'.repeat(CAT_W)) })
  }

  const save = async () => {
    const next = writeArt(source, poses)
    setBusy(true)
    try {
      const response = await fetch('/__sprite-studio/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: next }),
      })
      const data = (await response.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'falha ao gravar')
      sessionStorage.setItem('nox-studio-saved', '1')
      setSource(next)
      setDirty(false)
      setHistory([])
      setFuture([])
      setStatus('gravado em sprite-art.ts')
    } catch (error) {
      setStatus(`não gravou: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const exportPng = () => {
    if (!pose) return
    const canvas = document.createElement('canvas')
    canvas.width = CAT_W
    canvas.height = CAT_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    paintRows(ctx, pose.rows, 1)
    canvas.toBlob((blob) => blob && download(blob, `${pose.id}.png`))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < CAT_H; y++) {
      for (let x = 0; x < CAT_W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#191920' : '#20202a'
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }

    const draw = (rows: string[], alpha: number) => {
      ctx.globalAlpha = alpha
      paintRows(ctx, rows, CELL)
      ctx.globalAlpha = 1
    }

    const previous = poses[active - 1]
    if (onion && previous) draw(previous.rows, 0.22)
    if (pose) draw(pose.rows, 1)

    if (grid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      for (let x = 1; x < CAT_W; x++) {
        ctx.beginPath()
        ctx.moveTo(x * CELL + 0.5, 0)
        ctx.lineTo(x * CELL + 0.5, CAT_H * CELL)
        ctx.stroke()
      }
      for (let y = 1; y < CAT_H; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * CELL + 0.5)
        ctx.lineTo(CAT_W * CELL, y * CELL + 0.5)
        ctx.stroke()
      }
    }

    if (pose) {
      ctx.strokeStyle = 'rgba(56,189,248,0.85)'
      ctx.lineWidth = 1
      const hx = pose.headX * CELL + 0.5
      const hy = pose.headY * CELL + 0.5
      ctx.beginPath()
      ctx.moveTo(hx - 6, hy)
      ctx.lineTo(hx + 6, hy)
      ctx.moveTo(hx, hy - 6)
      ctx.lineTo(hx, hy + 6)
      ctx.stroke()
    }

    if (hover) {
      ctx.strokeStyle = 'rgba(250,250,250,0.85)'
      ctx.lineWidth = 2
      ctx.strokeRect(hover[0] * CELL + 1, hover[1] * CELL + 1, CELL - 2, CELL - 2)
    }
  }, [poses, active, onion, grid, hover, pose])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const spec = CLIPS[clip]
    let frame = 0

    const render = () => {
      const current = posesRef.current.find((item) => item.id === spec.ids[frame % spec.ids.length])
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (current) paintRows(ctx, current.rows, 6)
      frame++
    }

    render()
    if (!playing) return
    const timer = window.setInterval(render, 1000 / spec.fps)
    return () => window.clearInterval(timer)
  }, [clip, playing])

  useEffect(() => {
    sessionStorage.setItem('nox-studio-frame', String(active))
  }, [active])

  useEffect(() => {
    sessionStorage.removeItem('nox-studio-saved')
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const key = event.key.toLowerCase()
      if (key === 'b') setTool('pencil')
      else if (key === 'e') setTool('eraser')
      else if (key === 'g') setTool('bucket')
      else if (key === 'i') setTool('pick')
      else if (key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      } else if (key === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const hex = CHAR_HEX(char)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Studio do Nox</h1>
        <span className="text-xs text-zinc-500">{CAT_W} x {CAT_H}</span>
        <span className="text-xs text-zinc-500">{dirty ? 'alterações não salvas' : 'salvo'}</span>
        <a href="/__sprite-preview" className="text-xs text-zinc-500 underline hover:text-zinc-300">
          ver todos os clipes
        </a>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={undo} disabled={!history.length} className={BTN}>desfazer</button>
          <button onClick={redo} disabled={!future.length} className={BTN}>refazer</button>
          <button onClick={exportPng} className={BTN}>baixar png</button>
          <button
            onClick={() => download(new Blob([writeArt(source, poses)], { type: 'text/plain' }), 'sprite-art.ts')}
            className={BTN}
          >
            baixar .ts
          </button>
          <button onClick={() => void save()} disabled={busy} className={`${BTN} ${PRIMARY}`}>
            {busy ? 'gravando...' : 'salvar'}
          </button>
        </div>
      </header>

      {status && (
        <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-2 text-sm text-amber-300">{status}</div>
      )}

      <div className="flex flex-wrap items-start gap-6 p-6">
        <aside className="w-56 shrink-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">quadros</div>
          <div className="flex flex-col gap-1">
            {poses.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActive(index)}
                className={`flex items-center gap-3 rounded-md border px-2 py-1.5 text-left text-sm ${
                  index === active
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <img
                  src={thumbnails[index]}
                  alt=""
                  className="h-10 w-[43px] rounded bg-zinc-800"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="truncate">{labelOf(item.id)}</span>
              </button>
            ))}
          </div>
        </aside>

        <main>
          <canvas
            ref={canvasRef}
            width={CAT_W * CELL}
            height={CAT_H * CELL}
            className="touch-none cursor-crosshair rounded-md ring-1 ring-zinc-800"
            style={{ imageRendering: 'pixelated' }}
            onPointerDown={beginStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={() => setHover(null)}
          />
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span>{hover ? `${hover[0]}, ${hover[1]}` : 'fora da grade'}</span>
            <span>{hex ?? 'transparente'}</span>
            <span className="ml-auto">
              teclas: b lápis, e borracha, g balde, i conta-gotas, ctrl+z desfazer
            </span>
          </div>
        </main>

        <aside className="w-64 shrink-0 space-y-5">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">ferramenta</div>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ['pencil', 'lápis'],
                  ['eraser', 'borracha'],
                  ['bucket', 'balde'],
                  ['pick', 'conta-gotas'],
                ] as [Tool, string][]
              ).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  className={`${BTN} ${tool === id ? 'border-amber-400/70 bg-amber-400/10 text-amber-200' : ''}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">paleta</div>
            <div className="grid grid-cols-7 gap-1">
              {CHARS.split('').map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    setChar(ch)
                    setTool((current) => (current === 'eraser' || current === 'pick' ? 'pencil' : current))
                  }}
                  title={`${ch} ${COLOR[ch]}`}
                  className={`h-7 rounded ring-1 ${
                    char === ch ? 'ring-amber-300' : 'ring-zinc-700'
                  }`}
                  style={{ background: COLOR[ch] }}
                />
              ))}
              <button
                onClick={() => {
                  setChar('.')
                  setTool('eraser')
                }}
                title="transparente"
                className={`h-7 rounded bg-zinc-900 text-xs ring-1 ${
                  tool === 'eraser' ? 'ring-amber-300' : 'ring-zinc-700'
                }`}
              >
                .
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-600">
              O tom 1 é a sombra do chão. No site ela aparece como preto a 22%.
            </p>
          </section>

          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">cabeça</div>
            <div className="flex gap-2">
              {(['headX', 'headY'] as const).map((key) => {
                const value = key === 'headX' ? (pose?.headX ?? 0) : (pose?.headY ?? 0)
                return (
                  <label key={key} className="flex-1 text-xs text-zinc-500">
                    {key === 'headX' ? 'x' : 'y'}
                    <input
                      type="number"
                      value={value}
                      onChange={(event) =>
                        patchPose(
                          key === 'headX'
                            ? { headX: Number(event.target.value) }
                            : { headY: Number(event.target.value) },
                        )
                      }
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>
                )
              })}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-600">
              Onde a cabeça começa no quadro. A piscada e a boca usam isso.
            </p>
          </section>

          <section className="space-y-2">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">quadro</div>
            <div className="flex flex-wrap gap-1">
              <button onClick={duplicatePrevious} disabled={active === 0} className={BTN}>
                copiar anterior
              </button>
              <button onClick={clear} className={BTN}>limpar</button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onion} onChange={(event) => setOnion(event.target.checked)} />
              mostrar quadro anterior
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} />
              grade
            </label>
          </section>

          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">animação</div>
            <select
              value={clip}
              onChange={(event) => setClip(Number(event.target.value))}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
            >
              {CLIPS.map((item, index) => (
                <option key={item.name} value={index}>
                  {item.name} ({item.fps} fps)
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-start gap-3">
              <canvas
                ref={previewRef}
                width={CAT_W * 6}
                height={CAT_H * 6}
                className="rounded bg-zinc-900 ring-1 ring-zinc-800"
                style={{ imageRendering: 'pixelated' }}
              />
              <button onClick={() => setPlaying((value) => !value)} className={BTN}>
                {playing ? 'pausar' : 'tocar'}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function CHAR_HEX(ch: string) {
  if (ch === '.') return null
  return COLOR[ch] ?? null
}

const BTN =
  'rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40'

const PRIMARY = 'border-amber-400/70 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20'

export default SpriteStudio


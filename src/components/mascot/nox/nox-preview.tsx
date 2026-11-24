import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SpriteAnimator } from './animation/animator'
import { NOX_ANIMATIONS, getAnimation, isPlayable } from './animation/registry'
import { drawFrame, loadNoxAssets, type NoxSheet } from './sprite-sheet'
import palette from './assets/nox-palette.json'
import { StudioNav } from '../studio-nav'
import { writeStudioHandoff } from '../studio/nox-bridge'

const PLAYABLE = Object.keys(NOX_ANIMATIONS.animations).filter(isPlayable)
const ZOOMS = [2, 3, 4, 5, 6, 8]
const INITIAL_CLIP = new URLSearchParams(window.location.search).get('clip')
const BADGE: Record<string, string> = {
  ready: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  provisional: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  pending: 'bg-zinc-700/40 text-zinc-500 ring-zinc-600/40',
}

export function NoxPreview() {
  const [assets, setAssets] = useState<{ sheet: NoxSheet; reference: HTMLImageElement } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clipName, setClipName] = useState(
    INITIAL_CLIP && isPlayable(INITIAL_CLIP) ? INITIAL_CLIP : 'idle',
  )
  const [playing, setPlaying] = useState(true)
  const [zoom, setZoom] = useState(2)
  const [debug, setDebug] = useState(true)

  const darkRef = useRef<HTMLCanvasElement>(null)
  const lightRef = useRef<HTMLCanvasElement>(null)
  const referenceRef = useRef<HTMLCanvasElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const playingRef = useRef(playing)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    let alive = true
    loadNoxAssets()
      .then((value) => {
        if (alive) setAssets(value)
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'falha ao carregar o Nox')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!assets) return
    const { sheet, reference } = assets
    const meta = sheet.meta
    const animator = new SpriteAnimator()
    animator.play(getAnimation(clipName))

    const paint = (
      canvas: HTMLCanvasElement | null,
      mode: 'dark' | 'light' | 'reference',
    ) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // O clipe aereo pode usar um canvas mais alto. A area do preview acompanha
      // o maior quadro do clipe, sem mexer na escala.
      const clip = getAnimation(clipName)
      const anchor = clip.anchor ?? meta.anchor
      const width = Math.max(meta.frameWidth, ...clip.frames.map((item) => item.w)) * zoom
      const height = Math.max(meta.frameHeight, ...clip.frames.map((item) => item.h)) * zoom
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      ctx.clearRect(0, 0, width, height)
      ctx.imageSmoothingEnabled = false

      if (mode === 'reference') {
        // A referencia antiga tem escala nativa propria (43x55). Ela fica
        // apoiada na mesma linha dos pes, sem ser esticada para o canvas novo.
        ctx.drawImage(
          reference,
          0,
          0,
          reference.width,
          reference.height,
          (width - reference.width * zoom) / 2,
          anchor.y * zoom - reference.height * zoom,
          reference.width * zoom,
          reference.height * zoom,
        )
      } else {
        const frame = animator.frame
        if (frame) drawFrame(ctx, sheet, frame, zoom)
      }

      if (!debug) return
      const line = mode === 'light' ? 'rgba(24,24,27,0.35)' : 'rgba(250,250,250,0.35)'
      ctx.strokeStyle = line
      ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
      const ax = anchor.x * zoom
      const ay = anchor.y * zoom
      ctx.beginPath()
      ctx.moveTo(0, ay + 0.5)
      ctx.lineTo(width, ay + 0.5)
      ctx.moveTo(ax + 0.5, ay - 4)
      ctx.lineTo(ax + 0.5, ay + 4)
      ctx.stroke()
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const delta = Math.min(100, Math.max(0, now - last))
      last = now
      if (playingRef.current) animator.update(delta)
      if (counterRef.current) counterRef.current.textContent = `${animator.index + 1}`
      paint(darkRef.current, 'dark')
      paint(lightRef.current, 'light')
      paint(referenceRef.current, 'reference')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [assets, clipName, zoom, debug])

  const current = getAnimation(clipName)
  const currentAnchor = current.anchor ?? NOX_ANIMATIONS.meta.anchor
  const currentFrame = current.frames[0]
  const currentSize = currentFrame
    ? `${currentFrame.w}x${currentFrame.h}`
    : `${NOX_ANIMATIONS.meta.frameWidth}x${NOX_ANIMATIONS.meta.frameHeight}`

  // Leva o clipe que esta tocando para o studio principal, quadro a quadro e
  // sem redimensionar. O studio recebe uma tira unica, que e o formato que o
  // importador dele ja sabe dividir.
  const sendToStudio = () => {
    if (!assets) return
    const clip = getAnimation(clipName)
    if (!clip.frames.length) {
      setError('esse clipe nao tem quadro para enviar')
      return
    }
    const gutter = 4
    const width =
      clip.frames.reduce((sum, frame) => sum + frame.w, 0) + gutter * (clip.frames.length - 1)
    const height = Math.max(...clip.frames.map((frame) => frame.h))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = false
    let left = 0
    for (const frame of clip.frames) {
      context.drawImage(
        assets.sheet.image,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        left,
        0,
        frame.w,
        frame.h,
      )
      left += frame.w + gutter
    }
    const ok = writeStudioHandoff({
      clip: clipName,
      fps: clip.fps ?? 8,
      loop: Boolean(clip.loop),
      frames: clip.frames.length,
      width,
      height,
      strip: canvas.toDataURL('image/png'),
    })
    if (!ok) {
      setError('nao deu para enviar ao studio: o navegador ficou sem espaco')
      return
    }
    window.location.assign('/__sprite-studio?from=nox')
  }

  return (
    <div className='min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100'>
      <header className='mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>nox oficial</p>
          <h1 className='mt-1 text-2xl font-semibold'>Atlas de animacoes do Nox</h1>
          <p className='mt-1 max-w-2xl text-sm text-zinc-400'>
            Quadros extraidos do atlas aprovado, em escala 1:1 e com alpha real. O clipe de
            celebracao fica pendente ate a arte ser refeita.
          </p>
          <div className='mt-3'>
            <StudioNav current='/__nox-preview' />
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <select
            value={clipName}
            onChange={(event) => setClipName(event.target.value)}
            className='rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5'
          >
            {PLAYABLE.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPlaying((value) => !value)}
            className='rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 hover:border-zinc-500'
          >
            {playing ? 'pausar' : 'tocar'}
          </button>
          <button
            onClick={sendToStudio}
            disabled={!assets || !current.frames.length}
            title='leva os quadros deste clipe para o studio principal'
            className='rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-300 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40'
          >
            importar para o studio
          </button>
          <label className='flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5'>
            zoom
            <select
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className='bg-transparent'
            >
              {ZOOMS.map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </label>
          <label className='flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5'>
            <input type='checkbox' checked={debug} onChange={(event) => setDebug(event.target.checked)} />
            ancora
          </label>
        </div>
      </header>

      {error && <p className='mx-auto mt-6 max-w-6xl text-sm text-red-400'>{error}</p>}

      <div className='mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3'>
        <Card title='referencia antiga' note='arte nativa 43x55, sem esticar'>
          <canvas ref={referenceRef} className='mx-auto block bg-zinc-800' />
        </Card>
        <Card title='runtime escuro' note='atlas oficial, escala 1:1'>
          <canvas ref={darkRef} className='mx-auto block bg-zinc-900' />
        </Card>
        <Card title='runtime claro' note='mesmo atlas em fundo claro'>
          <canvas ref={lightRef} className='mx-auto block bg-zinc-200' />
        </Card>
      </div>

      <div className='mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-[1.4fr_1fr]'>
        <section className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-4'>
          <h2 className='text-sm font-semibold text-zinc-200'>Clipes</h2>
          <p className='mt-1 text-xs text-zinc-500'>
            Só entra no runtime o que tem quadro de verdade. Clipe vazio fica marcado como pendente.
          </p>
          <ul className='mt-3 divide-y divide-zinc-800 text-sm'>
            {Object.entries(NOX_ANIMATIONS.animations).map(([name, clip]) => (
              <li key={name} className='flex items-start gap-3 py-2'>
                <button
                  disabled={!isPlayable(name)}
                  onClick={() => setClipName(name)}
                  className={`w-24 shrink-0 text-left ${
                    isPlayable(name) ? 'hover:text-amber-300' : 'cursor-not-allowed text-zinc-600'
                  } ${name === clipName ? 'text-amber-300' : ''}`}
                >
                  {name}
                </button>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ring-1 ${
                    BADGE[clip.status ?? 'pending']
                  }`}
                >
                  {clip.status ?? 'pending'}
                </span>
                <span className='text-xs text-zinc-500'>
                  {clip.frames.length > 0 ? `${clip.frames.length} quadro(s)` : 'sem quadro'}
                  {clip.note ? ` · ${clip.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm'>
          <h2 className='text-sm font-semibold text-zinc-200'>Asset</h2>
          <dl className='mt-3 space-y-1.5 text-xs text-zinc-400'>
            <Row label='canvas do clipe' value={currentSize} />
            <Row label='ancora do clipe' value={`${currentAnchor.x}, ${currentAnchor.y}`} />
            <Row
              label='personagem antigo'
              value={`${NOX_ANIMATIONS.meta.native.width}x${NOX_ANIMATIONS.meta.native.height}`}
            />
            <Row label='quadro atual'>
              <span ref={counterRef}>1</span>
            </Row>
          </dl>
          <h3 className='mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
            paleta da arte antiga
          </h3>
          <div className='mt-2 flex flex-wrap gap-1'>
            {palette.colors.map((color) => (
              <span
                key={color}
                title={color}
                className='h-5 w-5 rounded ring-1 ring-black/40'
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Card(props: { title: string; note: string; children: ReactNode }) {
  return (
    <figure className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-4'>
      <figcaption className='mb-3 flex items-baseline justify-between gap-2'>
        <span className='text-sm font-medium text-zinc-200'>{props.title}</span>
        <span className='text-[11px] text-zinc-500'>{props.note}</span>
      </figcaption>
      {props.children}
    </figure>
  )
}

function Row(props: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <dt>{props.label}</dt>
      <dd className='font-mono text-zinc-300'>{props.value ?? props.children}</dd>
    </div>
  )
}

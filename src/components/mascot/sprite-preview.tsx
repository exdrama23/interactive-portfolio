// Preview da folha de sprites (só em desenvolvimento). Cada linha é um clipe
// desenhado no mesmo zoom, para comparar silhueta e cores lado a lado.

import { useEffect, useRef } from 'react'
import { createMascotSheet, type MascotClipName } from './sprite'
import { StudioNav } from './studio-nav'

const CLIPS: MascotClipName[] = [
  'idle',
  'walk',
  'trot',
  'jump',
  'fall',
  'land',
  'hover',
  'sit',
  'sleep',
  'wake',
  'paw',
  'complain',
  'scared',
  'held',
  'dragged',
  'celebrate',
  'standup',
  'sitdown',
]

const ZOOM = 3
const LABEL = 92

export function SpritePreview() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const sheet = createMascotSheet()
    const { frameW, frameH } = sheet
    const cellW = frameW * ZOOM
    const cellH = frameH * ZOOM
    const cols = 6
    canvas.width = LABEL + cellW * cols
    canvas.height = cellH * CLIPS.length
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    CLIPS.forEach((name, row) => {
      const clip = sheet.clips[name]
      ctx.fillStyle = row % 2 ? '#f4f4f5' : '#ffffff'
      ctx.fillRect(0, row * cellH, canvas.width, cellH)
      ctx.fillStyle = '#18181b'
      ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, 12, row * cellH + cellH / 2)

      for (let i = 0; i < clip.count; i++) {
        const frame = clip.start + i
        ctx.drawImage(
          sheet.image,
          frame * frameW,
          0,
          frameW,
          frameH,
          LABEL + i * cellW,
          row * cellH,
          cellW,
          cellH,
        )
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <a
        href="/__sprite-studio"
        className="mb-4 inline-block text-sm font-semibold text-zinc-700 underline hover:text-zinc-900"
      >
        abrir o studio
      </a>
      <div className="mb-4">
        <StudioNav current="/__sprite-preview" />
      </div>
      <canvas ref={ref} className="block rounded-lg ring-1 ring-zinc-300" />
    </div>
  )
}

export default SpritePreview

import { useEffect, useRef, useState } from 'react'
import { createPlaceholderSheet, type MascotClipName } from './sprite'

type Mode =
  | 'idle'
  | 'walk'
  | 'jet'
  | 'flee'
  | 'talk'
  | 'poke'
  | 'peek'
  | 'point'
  | 'sit'
  | 'sleep'
  | 'yawn'
  | 'celebrate'
  | 'scratch'

type ActionId =
  | 'wander'
  | 'fly'
  | 'rest'
  | 'sleep'
  | 'yawn'
  | 'talk'
  | 'hop'
  | 'point'
  | 'celebrate'
  | 'peek'
  | 'poke'
  | 'scratch'

const SECTION_LINES: Record<string, string[]> = {
  inicio: ['esse aqui é o começo de tudo', 'repara nos pontinhos do fundo', 'o nome tá bem grande, né?'],
  sobre: ['minha história tá aqui do lado', 'aqui eu conto de onde vim', 'lê essa parte, é rapidinho'],
  skills: ['as ferramentas do ofício', 'passa o mouse nas tags', 'cada bloquinho é uma stack'],
  formacao: ['os crachás são meus diplomas', 'arrasta a fileira pra ver de perto', 'tem instituição aqui no meio'],
  certificacoes: ['mais certificado do que juízo', 'clica num que abre o PDF', 'são vários, rola a lista'],
  projetos: ['os projetos tão aqui', 'abre um que eu espero', 'cada card tem um link'],
  contato: ['bora conversar?', 'os canais tão no fim da página', 'manda um oi, eu respondo'],
}

const GENERIC_LINES = [
  'psiu, tem coisa aqui do lado',
  'sabia que o menu fica na borda direita?',
  'eu sei onde tudo mora',
  'rola mais, tem mais coisa embaixo',
  'clica em mim, eu reajo',
  'tô de olho no que você faz',
]

const CLICK_LINES = ['opa!', 'oi!', 'eita', 'cuidado com o dedo', 'gostei disso', 'de novo!']
const BOTTOM_LINES = ['chegou no fim!', 'acabou, mas o contato tá aqui', 'fim da página, bora conversar?']
const STARTLE_LINES = ['calma, calma!', 'uau, devagar', 'tô tonto']
const SCROLL_LINES = ['opa, o chão se mexeu', 'tô escorregando!', 'calma com o scroll', 'a página tá fugindo']
const BLOB_LINES = ['o menu é ali, ó', 'toca nesse blob', 'esse pontinho abre o menu', 'só cutuco, não abro']
const FLY_LINES = ['hora do jetpack', 'combustível no limite', 'vruum']
const WAKE_LINES = ['hã?', 'tava acordado', 'quem tá aí?']

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const GRAVITY = 1750
const MAX_FALL = 980
const WALK_SPEED = 84
const RUN_SPEED = 210
const JUMP_SPEED = 560
const THRUST_ACCEL = 5200
const MAX_RISE = 420
const FUEL_DRAIN = 0.34
const FUEL_REGEN = 0.3

const SOLID_SELECTOR = [
  'main h1',
  'main h2',
  'main h3',
  'main h4',
  'main h5',
  'main h6',
  'main p',
  'main li',
  'main blockquote',
  'main figure',
  'main img',
  'main video',
  'main button',
  'main a',
  'main input',
  'main textarea',
  'main select',
  'main table',
  'main article',
  '[data-mascot-solid]',
].join(',')

interface Memory {
  lines: string[]
  sections: string[]
}

interface Solid {
  el: HTMLElement
  left: number
  top: number
  width: number
  height: number
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const MEM_KEY = 'mascot:memory:v1'

const readMemory = (): Memory => {
  try {
    const raw = sessionStorage.getItem(MEM_KEY)
    if (!raw) return { lines: [], sections: [] }
    const parsed = JSON.parse(raw) as Partial<Memory>
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    }
  } catch {
    return { lines: [], sections: [] }
  }
}

const writeMemory = (memory: Memory) => {
  try {
    sessionStorage.setItem(MEM_KEY, JSON.stringify(memory))
  } catch {
    return
  }
}

export default function Mascot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<string | null>(null)
  const [bubbleKey, setBubbleKey] = useState(0)
  const [below, setBelow] = useState(false)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setActive(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const node = nodeRef.current
    if (!active || !canvas || !node) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sheet = createPlaceholderSheet()
    const { frameW, frameH } = sheet
    const drawH = frameH + 4
    const memory = readMemory()

    let scale = 4
    const fit = () => {
      scale = window.innerWidth < 768 ? 3 : 5
      canvas.style.width = `${frameW * scale}px`
      canvas.style.height = `${drawH * scale}px`
      canvas.width = frameW
      canvas.height = drawH
      ctx.imageSmoothingEnabled = false
    }
    fit()

    const size = () => ({ w: frameW * scale, h: frameH * scale })
    const clampX = (value: number) => Math.min(Math.max(value, 4), window.innerWidth - size().w - 4)
    const floorTop = () => window.innerHeight - 6

    const start = performance.now()
    const first = size()

    const b = {
      x: window.innerWidth * 0.35,
      y: floorTop() - first.h,
      vx: 0,
      vy: 0,
      facing: 1 as 1 | -1,
      mode: 'idle' as Mode,
      anim: 'idle' as MascotClipName,
      animStart: start,
      nextDecision: start + 1400,
      modeUntil: start + 1800,
      fleeUntil: start,
      scrollReadyAt: start + 1800,
      nextSpeechAt: start + 3500,
      spoken: [] as number[],
      bubbleOpen: false,
      grounded: true,
      wasGrounded: true,
      landAt: start,
      energy: 0.5 + Math.random() * 0.3,
      curiosity: 0.45,
      fuel: 1,
      thrusting: false,
      jetUntil: 0,
      jetTarget: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      pokeReadyAt: start + 9000,
      pokeFireAt: 0,
      pokeFired: false,
      pokeBlob: null as HTMLElement | null,
      animLock: 0,
      lastDist: 0,
      progressAt: start,
      lastClickAt: 0,
      cd: {} as Partial<Record<ActionId, number>>,
    }
    b.x = clampX(b.x)
    b.target = { x: b.x, y: b.y }
    b.jetTarget = { x: b.x, y: b.y }

    const setAnim = (name: MascotClipName) => {
      if (performance.now() < b.animLock) return
      if (b.anim === name) return
      b.anim = name
      b.animStart = performance.now()
    }

    // Transição de postura: segura o clipe por um tempo para o levantar ou o
    // sentar terminar antes de outro clipe assumir.
    const lunge = (clip: MascotClipName, ms: number) => {
      b.anim = clip
      b.animStart = performance.now()
      b.animLock = performance.now() + ms
    }

    const menuOpen = () =>
      document.querySelectorAll('.menu-item-in').length > 0 ||
      document.querySelectorAll('.sidebar-menu-open').length > 0

    const atBottom = () => {
      const doc = document.documentElement
      return window.scrollY + window.innerHeight >= doc.scrollHeight - 48
    }

    const interactives = () => {
      const list: HTMLElement[] = []
      document.querySelectorAll<HTMLElement>('a, button').forEach((el) => {
        if (el.closest('[aria-hidden="true"]')) return
        const rect = el.getBoundingClientRect()
        if (rect.width < 18 || rect.height < 12) return
        if (rect.bottom < 70 || rect.top > window.innerHeight - 40) return
        if (rect.right < 40 || rect.left > window.innerWidth - 40) return
        list.push(el)
      })
      return list
    }

    const canSpeak = (now: number) => {
      if (b.bubbleOpen) return false
      if (menuOpen()) return false
      if (now - b.lastClickAt < 2200) return false
      b.spoken = b.spoken.filter((t) => now - t < 60000)
      if (b.spoken.length >= 3) return false
      return now >= b.nextSpeechAt
    }

    const remember = (text: string) => {
      if (!memory.lines.includes(text)) memory.lines.push(text)
      writeMemory(memory)
    }

    let section = ''

    const pickLine = () => {
      let pool = SECTION_LINES[section] ? [...SECTION_LINES[section]] : []
      if (!pool.length || Math.random() < 0.4) pool = pool.concat(GENERIC_LINES)
      let unused = pool.filter((text) => !memory.lines.includes(text))
      if (!unused.length) {
        memory.lines = memory.lines.filter((text) => !pool.includes(text))
        unused = pool
      }
      const text = pick(unused)
      remember(text)
      return text
    }

    const say = (text: string, hold = 2800) => {
      setLine(text)
      setBubbleKey((value) => value + 1)
      setBelow(b.y < 120)
      b.bubbleOpen = true
      b.mode = 'talk'
      b.modeUntil = performance.now() + hold
      b.nextSpeechAt = performance.now() + 7000
      b.spoken.push(performance.now())
    }

    let solids: Solid[] = []
    const visible: Box[] = []

    const collectSolids = () => {
      const list: Solid[] = []
      const vw = window.innerWidth
      const vh = window.innerHeight
      document.querySelectorAll<HTMLElement>(SOLID_SELECTOR).forEach((el) => {
        if (el.closest('.mascot-root, [aria-hidden="true"]')) return
        const rect = el.getBoundingClientRect()
        if (rect.width < 28 || rect.height < 8) return
        if (rect.width > vw * 0.94 || rect.height > vh * 0.88) return
        list.push({
          el,
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        })
      })
      list.sort((a, c) => a.width * a.height - c.width * c.height)
      solids = list.slice(0, 240)
    }

    const collectVisible = () => {
      visible.length = 0
      const sx = window.scrollX
      const sy = window.scrollY
      const vh = window.innerHeight
      for (const s of solids) {
        const top = s.top - sy
        if (top > vh + 140 || top + s.height < 40) continue
        visible.push({ left: s.left - sx, top, width: s.width, height: s.height })
      }
    }

    // Hitbox fica na coluna central do sprite para ele conseguir encostar nos
    // blocos sem o frame vazio das laterais travar o movimento.
    const overlaps = (s: Box, w: number, h: number) => {
      const left = b.x + w * 0.22
      const right = b.x + w * 0.78
      return left < s.left + s.width && right > s.left && b.y + h > s.top && b.y < s.top + s.height
    }

    const physics = (dt: number) => {
      const { w, h } = size()

      b.x += b.vx * dt
      if (b.vx !== 0) {
        for (const s of visible) {
          if (!overlaps(s, w, h)) continue
          const feet = b.y + h
          if (feet - s.top <= 10 && feet - s.top > 0) {
            b.y = s.top - h
            continue
          }
          if (b.vx > 0) b.x = s.left - w * 0.78
          else b.x = s.left + s.width - w * 0.22
          b.vx = 0
        }
      }
      b.x = clampX(b.x)

      b.y += b.vy * dt
      b.grounded = false
      for (const s of visible) {
        if (!overlaps(s, w, h)) continue
        if (b.vy >= 0 && b.y + h - s.top < h * 0.8) {
          b.y = s.top - h
          b.vy = 0
          b.grounded = true
        } else if (b.vy < 0) {
          b.y = s.top + s.height
          b.vy = 0
        } else {
          const fromLeft = b.x + w * 0.78 - s.left
          const fromRight = s.left + s.width - (b.x + w * 0.22)
          if (fromLeft < fromRight) b.x = s.left - w * 0.78
          else b.x = s.left + s.width - w * 0.22
        }
      }

      const floor = floorTop()
      if (b.y + h >= floor) {
        b.y = floor - h
        if (b.vy > 0) b.vy = 0
        b.grounded = true
      }
      if (b.y < 56) {
        b.y = 56
        if (b.vy < 0) b.vy = 0
      }
    }

    const spot = () => {
      const { h } = size()
      const floor = {
        x: clampX(24 + Math.random() * Math.max(1, window.innerWidth - 48)),
        y: floorTop() - h,
      }
      if (Math.random() < 0.4) return floor
      const pool = visible.filter((v) => v.width > 70 && v.top > 70 && v.top < window.innerHeight - 80)
      if (!pool.length) return floor
      const rect = pick(pool)
      return {
        x: clampX(rect.left + 10 + Math.random() * Math.max(1, rect.width - 20)),
        y: rect.top - h,
      }
    }

    const goTo = (x: number, y: number, mode: Mode = 'walk') => {
      if (b.mode === 'sit' || b.mode === 'sleep') lunge('standup', 420)
      const { h } = size()
      const limit = floorTop() - h
      b.target = { x: clampX(x), y: Math.min(Math.max(y, 56), limit) }
      b.mode = mode
      b.modeUntil = 0
      b.pokeFired = false
      b.pokeFireAt = 0
      b.lastDist = Math.abs(b.target.x - b.x)
      b.progressAt = performance.now()
      setAnim('walk')
    }

    const ignite = (x: number, y: number, ms = 2200) => {
      if (b.fuel <= 0.12) return false
      b.jetTarget = { x, y }
      b.jetUntil = performance.now() + ms
      b.mode = 'jet'
      b.modeUntil = 0
      return true
    }

    const jump = (power: number) => {
      if (!b.grounded) return
      b.vy = -power
      b.grounded = false
      setAnim('leap')
    }

    const walk = () => {
      const next = spot()
      goTo(next.x, next.y, 'walk')
      b.curiosity = clamp01(b.curiosity - 0.4)
    }

    const fly = () => {
      const { h } = size()
      const pool = visible.filter((v) => v.top > 80 && v.top < window.innerHeight * 0.7 && v.width > 80)
      const rect = pool.length ? pick(pool) : null
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth * (0.2 + Math.random() * 0.6)
      const y = rect ? rect.top - h : window.innerHeight * 0.3
      if (!ignite(clampX(x), y)) {
        walk()
        return
      }
      b.curiosity = clamp01(b.curiosity - 0.3)
      if (Math.random() < 0.35) say(pick(FLY_LINES), 1800)
    }

    const rest = () => {
      if (b.anim !== 'sit' && b.anim !== 'sleep') lunge('sitdown', 420)
      b.mode = 'sit'
      b.modeUntil = performance.now() + 2600 + Math.random() * 2600
      setAnim('sit')
    }

    const doSleep = () => {
      if (b.anim !== 'sit' && b.anim !== 'sleep') lunge('sitdown', 420)
      b.mode = 'sleep'
      b.modeUntil = performance.now() + 6000 + Math.random() * 6000
      setAnim('sleep')
    }

    const doYawn = () => {
      // O quadro de levantar começa sentado, então só faz sentido saindo do
      // repouso.
      if (b.anim !== 'sit' && b.anim !== 'sleep') return false
      lunge('yawn', 460)
      b.mode = 'yawn'
      b.modeUntil = performance.now() + 1600
      return true
    }

    const doTalk = () => {
      if (!canSpeak(performance.now())) return false
      say(pickLine())
      return true
    }

    const doPoint = () => {
      const targets = interactives()
      if (!targets.length) return false
      const { w, h } = size()
      const rect = pick(targets).getBoundingClientRect()
      const standY = rect.top - h > 80 ? rect.top - h : rect.bottom + 6
      goTo(rect.left + rect.width / 2 - w / 2, standY, 'point')
      return true
    }

    const goToBlob = (mode: Mode) => {
      const blob = document.querySelector<HTMLElement>('.sidebar-peek')
      if (!blob) return false
      const { w, h } = size()
      const rect = blob.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return false
      const style = window.getComputedStyle(blob)
      if (style.opacity === '0' || style.pointerEvents === 'none') return false
      b.pokeBlob = blob
      goTo(rect.left - w - 4, rect.top + rect.height / 2 - h / 2, mode)
      return true
    }

    const doPeek = () => {
      if (goToBlob('peek')) return
      goTo(window.innerWidth - size().w - 4, window.innerHeight * 0.5, 'peek')
    }

    const doPoke = () => {
      if (!goToBlob('poke')) return
      b.pokeFired = false
      b.pokeFireAt = 0
    }

    let pokeTimer = 0
    const firePoke = () => {
      const blob = b.pokeBlob
      if (blob) {
        blob.classList.add('sidebar-peek--poked')
        pokeTimer = window.setTimeout(() => blob.classList.remove('sidebar-peek--poked'), 900)
      }
      b.pokeReadyAt = performance.now() + 45000
      say(pick(BLOB_LINES), 2600)
      b.modeUntil = performance.now() + 1800
    }

    const cool = (id: ActionId, ms: number) => {
      b.cd[id] = performance.now() + ms
    }

    const run = (id: ActionId) => {
      switch (id) {
        case 'wander':
          walk()
          cool('wander', 1200)
          break
        case 'fly':
          fly()
          cool('fly', 16000)
          break
        case 'rest':
          rest()
          cool('rest', 9000)
          break
        case 'sleep':
          doSleep()
          cool('sleep', 32000)
          break
        case 'yawn':
          doYawn()
          b.energy = clamp01(b.energy + 0.03)
          cool('yawn', 14000)
          break
        case 'talk':
          if (!doTalk()) return
          b.curiosity = clamp01(b.curiosity - 0.2)
          cool('talk', 9000)
          break
        case 'hop':
          jump(JUMP_SPEED)
          b.modeUntil = performance.now() + 900
          cool('hop', 4500)
          break
        case 'point':
          if (!doPoint()) {
            walk()
            return
          }
          cool('point', 10000)
          break
        case 'celebrate':
          b.mode = 'celebrate'
          b.modeUntil = performance.now() + 2400
          setAnim('celebrate')
          if (atBottom() && canSpeak(performance.now())) say(pick(BOTTOM_LINES), 2200)
          cool('celebrate', 14000)
          break
        case 'peek':
          doPeek()
          cool('peek', 13000)
          break
        case 'poke':
          doPoke()
          break
        case 'scratch':
          b.mode = 'scratch'
          b.modeUntil = performance.now() + 1700
          setAnim('scratch')
          cool('scratch', 12000)
          break
      }
    }

    const decide = (now: number) => {
      b.nextDecision = now + 4000 + Math.random() * 4000
      if (!b.grounded) return
      if (menuOpen()) {
        b.nextDecision = now + 9000 + Math.random() * 6000
        return
      }
      const ready = (id: ActionId) => (b.cd[id] ?? 0) <= now
      const speech = canSpeak(now)
      const options: { id: ActionId; score: number; weight: number }[] = [
        { id: 'wander', score: 0.45 + b.curiosity * 0.55, weight: 1.1 },
        { id: 'fly', score: b.fuel > 0.6 ? 0.25 + b.curiosity * 0.4 : 0, weight: 0.7 },
        { id: 'rest', score: b.energy < 0.75 ? 0.2 + (1 - b.energy) * 0.7 : 0, weight: 0.9 },
        { id: 'sleep', score: b.energy < 0.4 ? (0.4 - b.energy) * 3.2 : 0, weight: 0.8 },
        { id: 'yawn', score: b.energy < 0.55 ? 0.4 : 0.05, weight: 0.6 },
        { id: 'talk', score: speech ? 0.5 + b.curiosity * 0.35 : 0, weight: 1.5 },
        { id: 'hop', score: 0.28 + b.curiosity * 0.3, weight: 1 },
        { id: 'point', score: 0.4 + b.curiosity * 0.4, weight: 1.2 },
        { id: 'celebrate', score: atBottom() ? 0.9 : 0.02, weight: 0.7 },
        { id: 'peek', score: 0.3, weight: 0.8 },
        { id: 'poke', score: now > b.pokeReadyAt ? 0.95 : 0, weight: 1.3 },
        { id: 'scratch', score: 0.12, weight: 0.9 },
      ]
      const usable = options.filter((option) => option.score > 0 && ready(option.id))
      if (!usable.length) return
      const total = usable.reduce((sum, option) => sum + option.score * option.weight, 0)
      let roll = Math.random() * total
      let chosen = usable[usable.length - 1]
      for (const option of usable) {
        roll -= option.score * option.weight
        if (roll <= 0) {
          chosen = option
          break
        }
      }
      run(chosen.id)
    }

    const io = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry
        }
        if (!best) return
        const id = (best.target as HTMLElement).id
        if (!id || id === section) return
        section = id
        const firstVisit = !memory.sections.includes(id)
        if (firstVisit) {
          memory.sections.push(id)
          writeMemory(memory)
        }
        const now = performance.now()
        const calm = b.mode === 'idle' || b.mode === 'sit' || b.mode === 'walk'
        if (calm && canSpeak(now) && Math.random() < (firstVisit ? 0.55 : 0.18)) say(pickLine())
      },
      { threshold: 0.35 }
    )

    const observe = () => {
      document.querySelectorAll('section[id]').forEach((el) => io.observe(el))
    }
    observe()
    const observeTimer = window.setInterval(observe, 5000)

    collectSolids()
    collectVisible()
    const solidsTimer = window.setInterval(collectSolids, 2500)

    const cursor = { x: -9999, y: -9999, speed: 0, px: 0, py: 0, at: 0, ready: false }
    const onPointerMove = (event: PointerEvent) => {
      const stamp = performance.now()
      if (cursor.ready) {
        const elapsed = Math.max(0.004, (stamp - cursor.at) / 1000)
        const moved = Math.hypot(event.clientX - cursor.px, event.clientY - cursor.py)
        cursor.speed = Math.min(6000, Math.max(cursor.speed, moved / elapsed))
      }
      cursor.ready = true
      cursor.at = stamp
      cursor.px = event.clientX
      cursor.py = event.clientY
      cursor.x = event.clientX
      cursor.y = event.clientY
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const onPointerDown = (event: PointerEvent) => {
      const now = performance.now()
      b.lastClickAt = now
      const rect = canvas.getBoundingClientRect()
      const inside =
        event.clientX >= rect.left - 4 &&
        event.clientX <= rect.right + 4 &&
        event.clientY >= rect.top - 4 &&
        event.clientY <= rect.bottom + 4
      if (!inside) return
      b.energy = clamp01(b.energy + 0.08)
      b.curiosity = clamp01(b.curiosity + 0.15)
      jump(620)
      say(pick(CLICK_LINES), 2200)
    }
    window.addEventListener('pointerdown', onPointerDown, true)

    const onHover = (event: Event) => {
      const target = event.target as HTMLElement | null
      const el = target?.closest?.('a, button, [role="button"]')
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 10) return
      b.facing = rect.left + rect.width / 2 >= b.x + size().w / 2 ? 1 : -1
      if (b.mode === 'idle' && b.grounded && Math.random() < 0.22) jump(380)
    }
    document.addEventListener('pointerover', onHover, true)

    let lastScrollY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      const now = performance.now()
      if (Math.abs(delta) < 40) return
      b.facing = delta > 0 ? 1 : -1
      if (now < b.scrollReadyAt) return
      b.scrollReadyAt = now + 2400

      if (b.mode === 'sleep' || b.mode === 'sit' || b.mode === 'yawn') {
        if (b.mode !== 'yawn') lunge('standup', 420)
        b.mode = 'idle'
        b.modeUntil = now + 600
        if (Math.random() < 0.5) say(pick(WAKE_LINES), 1600)
      }

      if (b.fuel > 0.25) {
        ignite(b.x + size().w / 2, Math.max(80, b.y - 110), 700)
        b.modeUntil = now + 900
      } else if (b.grounded) {
        jump(360)
      }
      if (canSpeak(now) && Math.random() < 0.4) say(pick(SCROLL_LINES), 1600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const onResize = () => {
      fit()
      b.x = clampX(b.x)
      b.y = Math.min(b.y, floorTop() - size().h)
      collectSolids()
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now

      const { w, h } = size()
      const moving = b.mode === 'walk' || b.mode === 'flee' || b.mode === 'jet'
      b.energy = clamp01(b.energy - (moving ? 0.014 : 0.006) * dt)
      b.curiosity = clamp01(b.curiosity + 0.009 * dt)
      if (b.mode === 'sleep') b.energy = clamp01(b.energy + 0.075 * dt)
      else if (b.mode === 'sit') b.energy = clamp01(b.energy + 0.028 * dt)
      cursor.speed = Math.max(0, cursor.speed - dt * 2600)

      collectVisible()

      b.thrusting = now < b.jetUntil && b.fuel > 0
      if (b.thrusting) {
        b.vy = Math.max(b.vy - THRUST_ACCEL * dt, -MAX_RISE)
        b.fuel = Math.max(0, b.fuel - FUEL_DRAIN * dt)
        if (b.fuel <= 0) b.jetUntil = 0
      } else {
        b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL)
      }

      const cx = b.x + w / 2
      const cy = b.y + h / 2
      const dx = cx - cursor.x
      const dy = cy - cursor.y
      const distance = Math.hypot(dx, dy)

      if (b.mode === 'sleep' && distance < 120) {
        b.mode = 'idle'
        b.modeUntil = now + 500
        lunge('standup', 420)
        if (Math.random() < 0.5) say(pick(WAKE_LINES), 1800)
      }

      if (
        distance < 74 &&
        cursor.speed > 700 &&
        now > b.fleeUntil &&
        b.mode !== 'poke' &&
        b.mode !== 'peek' &&
        b.mode !== 'sleep' &&
        b.mode !== 'jet'
      ) {
        b.mode = 'flee'
        b.fleeUntil = now + 2400
        b.modeUntil = now + 900
        b.curiosity = clamp01(b.curiosity + 0.1)
        b.vx = (dx >= 0 ? 1 : -1) * RUN_SPEED
        if (b.anim === 'sit' || b.anim === 'sleep') lunge('standup', 300)
        setAnim('walk')
      }

      if ((b.mode === 'idle' || b.mode === 'sit') && distance < 300) {
        b.facing = cursor.x < cx ? -1 : 1
      }

      if (!b.grounded && (b.mode === 'sit' || b.mode === 'sleep')) {
        b.mode = 'idle'
        b.modeUntil = now + 400
      }

      if (now > b.nextDecision && b.mode === 'idle' && b.grounded) decide(now)

      if (b.mode === 'walk') {
        const targetX = b.target.x + w / 2
        const delta = targetX - cx
        b.vx = Math.min(WALK_SPEED, Math.max(-WALK_SPEED, delta * 3))
        b.facing = delta >= 0 ? 1 : -1
        const dist = Math.abs(delta)
        if (dist < b.lastDist - 1) {
          b.lastDist = dist
          b.progressAt = now
        } else if (dist > 24 && now - b.progressAt > 1100) {
          b.progressAt = now
          if (!ignite(targetX, Math.max(70, b.y - 150))) {
            const next = spot()
            goTo(next.x, next.y, 'walk')
          }
        }
        if (Math.abs(delta) < 8) {
          b.vx = 0
          if (b.target.y < b.y - 12) {
            if (!ignite(b.target.x + w / 2, b.target.y)) {
              b.mode = 'idle'
              b.modeUntil = now + 700
            }
          } else {
            b.mode = 'idle'
            b.modeUntil = now + 700 + Math.random() * 1400
          }
        } else if (b.target.y < b.y - 30 && Math.abs(delta) < 100 && b.fuel > 0.2) {
          ignite(b.target.x + w / 2, b.target.y)
        }
      } else if (b.mode === 'jet') {
        const delta = b.jetTarget.x - cx
        b.vx = Math.min(RUN_SPEED, Math.max(-RUN_SPEED, delta * 4))
        b.facing = delta >= 0 ? 1 : -1
        if (b.y > b.jetTarget.y + 2 && b.fuel > 0.02) b.jetUntil = now + 140
        else b.jetUntil = 0
        if (b.grounded && now > b.jetUntil) {
          b.vx = 0
          b.jetUntil = 0
          b.mode = 'idle'
          b.modeUntil = now + 500
        }
      } else if (b.mode === 'flee') {
        if (b.grounded && Math.abs(b.vx) < 20) b.vy = -420
        if (now > b.modeUntil) {
          b.vx = 0
          b.mode = 'idle'
          b.modeUntil = now + 800
        }
      } else if (b.mode === 'point') {
        const delta = b.target.x + w / 2 - cx
        b.facing = delta >= 0 ? 1 : -1
        b.vx = 0
        if (!b.modeUntil) b.modeUntil = now + 2200
        else if (now > b.modeUntil) {
          b.mode = 'idle'
          b.modeUntil = now + 600
        }
      } else if (b.mode === 'peek' || b.mode === 'poke') {
        const delta = b.target.x + w / 2 - cx
        if (Math.abs(delta) > 10) {
          b.vx = Math.min(120, Math.max(-120, delta * 3))
          b.facing = delta >= 0 ? 1 : -1
        } else {
          b.vx = 0
          b.facing = 1
          if (b.mode === 'poke') {
            if (!b.pokeFired) {
              if (!b.pokeFireAt) b.pokeFireAt = now + 360
              if (now >= b.pokeFireAt) {
                b.pokeFired = true
                firePoke()
              }
            } else if (now > b.modeUntil) {
              b.mode = 'idle'
              b.modeUntil = now + 600
            }
          } else if (!b.modeUntil) {
            b.modeUntil = now + 2400
            if (canSpeak(now) && Math.random() < 0.6) say(pick(BLOB_LINES), 2200)
          } else if (now > b.modeUntil) {
            b.mode = 'idle'
            b.modeUntil = now + 600
          }
        }
      } else {
        b.vx *= 0.82
        if (Math.abs(b.vx) < 3) b.vx = 0
      }

      if (b.vx === 0 && (b.mode === 'idle' || b.mode === 'sit' || b.mode === 'sleep')) {
        b.vx = 0
      }

      physics(dt)

      if (b.grounded && !b.thrusting) b.fuel = Math.min(1, b.fuel + FUEL_REGEN * dt)
      if (b.grounded && !b.wasGrounded) b.landAt = now
      b.wasGrounded = b.grounded

      if (
        (b.mode === 'talk' ||
          b.mode === 'yawn' ||
          b.mode === 'celebrate' ||
          b.mode === 'scratch' ||
          b.mode === 'point' ||
          b.mode === 'peek' ||
          b.mode === 'sit' ||
          b.mode === 'sleep') &&
        b.modeUntil &&
        now > b.modeUntil
      ) {
        if (b.mode === 'talk') {
          setLine(null)
          b.bubbleOpen = false
        }
        if (b.mode === 'sit' || b.mode === 'sleep') lunge('standup', 420)
        b.mode = 'idle'
        b.modeUntil = now + 600 + Math.random() * 1600
      }

      if (b.mode === 'point') setAnim('point')
      else if (b.mode === 'poke' || b.mode === 'peek') setAnim(b.mode === 'poke' ? 'pull' : 'wave')
      else if (b.thrusting) setAnim('hover')
      else if (!b.grounded) setAnim(b.vy < 0 ? 'leap' : 'fall')
      else if (now - b.landAt < 180) setAnim('land')
      else if (b.mode === 'walk' || b.mode === 'flee') setAnim('walk')
      else if (b.mode === 'sit') setAnim('sit')
      else if (b.mode === 'sleep') setAnim('sleep')
      else if (b.mode === 'yawn') setAnim('yawn')
      else if (b.mode === 'celebrate') setAnim('celebrate')
      else if (b.mode === 'scratch') setAnim('scratch')
      else if (b.mode === 'talk') setAnim('wave')
      else setAnim('idle')

      const clip = sheet.clips[b.anim]
      const elapsed = (now - b.animStart) / 1000
      let index = Math.floor(elapsed * clip.fps)
      index = clip.loop ? index % clip.count : Math.min(index, clip.count - 1)
      const frameIndex = clip.start + index

      ctx.clearRect(0, 0, frameW, drawH)
      ctx.save()
      if (b.facing === -1) {
        ctx.translate(frameW, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(sheet.image, frameIndex * frameW, 0, frameW, frameH, 0, 0, frameW, frameH)

      // O "z" flutuante é o que faz o clipe de sono ler como sono, já que a
      // arte de frente não muda de postura.
      if (b.mode === 'sleep') {
        const rise = Math.floor(now / 700) % 2
        ctx.fillStyle = '#171514'
        ctx.fillRect(25, 2 - rise, 3, 1)
        ctx.fillRect(27, 3 - rise, 1, 1)
        ctx.fillRect(26, 4 - rise, 1, 1)
        ctx.fillRect(25, 5 - rise, 3, 1)
      }

      // O jato sai de baixo do corpo e cai dentro do espaço extra do canvas.
      if (b.thrusting) {
        const flick = Math.floor(now / 60) % 3
        ctx.fillStyle = '#ff9b21'
        ctx.fillRect(12, frameH - 1, 3, 2 + flick)
        ctx.fillStyle = '#fff0a8'
        ctx.fillRect(13, frameH, 1, 1 + (flick > 1 ? 1 : 0))
      }
      ctx.restore()

      node.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0)`
    }

    raf = requestAnimationFrame(frame)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __mascot?: unknown }).__mascot = { b, run, decide, say, jump, setAnim, cursor }
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(observeTimer)
      window.clearInterval(solidsTimer)
      window.clearTimeout(pokeTimer)
      io.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerover', onHover, true)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (import.meta.env.DEV) delete (window as unknown as { __mascot?: unknown }).__mascot
    }
  }, [active])

  if (!active) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-20 mascot-root" aria-hidden="true">
      <div ref={nodeRef} className="absolute top-0 left-0 will-change-transform">
        <canvas ref={canvasRef} className="mascot-canvas block" />
        {line && (
          <div key={bubbleKey} className={`mascot-bubble${below ? ' mascot-bubble--below' : ''}`}>
            {line}
          </div>
        )}
      </div>
    </div>
  )
}

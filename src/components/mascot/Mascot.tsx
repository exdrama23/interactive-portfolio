import { useEffect, useRef, useState } from 'react'
import { createPlaceholderSheet, type MascotClipName } from './sprite'

type Mode =
  | 'idle'
  | 'walk'
  | 'flee'
  | 'talk'
  | 'pull'
  | 'peek'
  | 'point'
  | 'sit'
  | 'sleep'
  | 'yawn'
  | 'celebrate'
  | 'scratch'

type ActionId =
  | 'wander'
  | 'rest'
  | 'sleep'
  | 'yawn'
  | 'talk'
  | 'hop'
  | 'leap'
  | 'point'
  | 'celebrate'
  | 'peek'
  | 'pull'
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
const PULL_LINES = ['o menu é ali', 'deixa eu abrir pra você', 'ó, o menu']
const WAKE_LINES = ['hã?', 'tava acordado', 'quem tá aí?']

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface Memory {
  lines: string[]
  sections: string[]
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
    const memory = readMemory()

    let scale = 4
    const fit = () => {
      scale = window.innerWidth < 768 ? 2 : 4
      canvas.style.width = `${frameW * scale}px`
      canvas.style.height = `${frameH * scale}px`
      canvas.width = frameW
      canvas.height = frameH
      ctx.imageSmoothingEnabled = false
    }
    fit()

    const size = () => ({ w: frameW * scale, h: frameH * scale })
    const clampX = (value: number) => Math.min(Math.max(value, 6), window.innerWidth - size().w - 6)
    const clampY = (value: number) => Math.min(Math.max(value, 76), window.innerHeight - size().h - 8)

    const start = performance.now()

    const b = {
      x: clampX(window.innerWidth * 0.35),
      y: clampY(window.innerHeight * 0.68),
      tx: 0,
      ty: 0,
      facing: 1 as 1 | -1,
      mode: 'idle' as Mode,
      arrived: false,
      anim: 'idle' as MascotClipName,
      animStart: start,
      nextDecision: start + 1400,
      modeUntil: start + 1800,
      fleeUntil: start,
      startleReadyAt: start + 2200,
      nextSpeechAt: start + 3500,
      spoken: [] as number[],
      bubbleOpen: false,
      energy: 0.5 + Math.random() * 0.3,
      curiosity: 0.45,
      jumpY: 0,
      vy: 0,
      airborne: false,
      landAt: 0,
      pullReadyAt: start + 11000,
      pullFireAt: 0,
      pullFired: false,
      lastClickAt: 0,
      cd: {} as Record<ActionId, number>,
    }
    b.tx = b.x
    b.ty = b.y

    const setAnim = (name: MascotClipName) => {
      if (b.anim === name) return
      b.anim = name
      b.animStart = performance.now()
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
      if (!b.airborne) setAnim('wave')
    }

    const jump = (power: number) => {
      if (b.airborne) return
      b.airborne = true
      b.vy = power
      b.jumpY = 0
      setAnim('leap')
    }

    const walk = () => {
      b.mode = 'walk'
      b.tx = clampX(24 + Math.random() * Math.max(1, window.innerWidth - size().w - 48))
      b.ty = clampY(84 + Math.random() * Math.max(1, window.innerHeight - size().h - 120))
      setAnim('walk')
    }

    const rest = () => {
      b.mode = 'sit'
      b.modeUntil = performance.now() + 2600 + Math.random() * 2600
      setAnim('sit')
    }

    const doSleep = () => {
      b.mode = 'sleep'
      b.modeUntil = performance.now() + 6000 + Math.random() * 6000
      setAnim('sleep')
    }

    const doYawn = () => {
      b.mode = 'yawn'
      b.modeUntil = performance.now() + 1600
      setAnim('yawn')
    }

    const doTalk = () => {
      if (!canSpeak(performance.now())) return false
      say(pickLine())
      return true
    }

    const doPoint = () => {
      const targets = interactives()
      if (!targets.length) return false
      const rect = pick(targets).getBoundingClientRect()
      b.tx = clampX(rect.left + rect.width / 2 - size().w / 2)
      const under = rect.bottom + 4
      b.ty = clampY(under + size().h < window.innerHeight - 10 ? under : rect.top - size().h - 6)
      b.mode = 'point'
      b.arrived = false
      setAnim('walk')
      return true
    }

    const doPeek = () => {
      b.mode = 'peek'
      b.arrived = false
      b.tx = clampX(window.innerWidth - size().w - 2)
      b.ty = clampY(window.innerHeight * 0.5 - size().h / 2)
      setAnim('walk')
    }

    const doPull = () => {
      b.mode = 'pull'
      b.arrived = false
      b.pullFired = false
      b.tx = clampX(window.innerWidth - size().w - 2)
      b.ty = clampY(window.innerHeight * 0.5 - size().h / 2)
      setAnim('walk')
    }

    const cool = (id: ActionId, ms: number) => {
      b.cd[id] = performance.now() + ms
    }

    const run = (id: ActionId) => {
      switch (id) {
        case 'wander':
          walk()
          b.curiosity = clamp01(b.curiosity - 0.4)
          cool('wander', 1200)
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
          jump(-540)
          b.modeUntil = performance.now() + 900
          cool('hop', 4500)
          break
        case 'leap':
          jump(-880)
          b.modeUntil = performance.now() + 1400
          cool('leap', 12000)
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
        case 'pull':
          doPull()
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
      if (menuOpen()) {
        b.nextDecision = now + 9000 + Math.random() * 6000
        return
      }
      const ready = (id: ActionId) => (b.cd[id] ?? 0) <= now
      const speech = canSpeak(now)
      const options: { id: ActionId; score: number; weight: number }[] = [
        { id: 'wander', score: 0.45 + b.curiosity * 0.55, weight: 1.1 },
        { id: 'rest', score: b.energy < 0.75 ? 0.2 + (1 - b.energy) * 0.7 : 0, weight: 0.9 },
        { id: 'sleep', score: b.energy < 0.4 ? (0.4 - b.energy) * 3.2 : 0, weight: 0.8 },
        { id: 'yawn', score: b.energy < 0.55 ? 0.4 : 0.05, weight: 0.6 },
        { id: 'talk', score: speech ? 0.5 + b.curiosity * 0.35 : 0, weight: 1.5 },
        { id: 'hop', score: 0.28 + b.curiosity * 0.3, weight: 1 },
        { id: 'leap', score: b.curiosity > 0.6 ? 0.35 : 0.06, weight: 0.5 },
        { id: 'point', score: 0.4 + b.curiosity * 0.4, weight: 1.2 },
        { id: 'celebrate', score: atBottom() ? 0.9 : 0.02, weight: 0.7 },
        { id: 'peek', score: 0.3, weight: 0.8 },
        { id: 'pull', score: now > b.pullReadyAt ? 0.95 : 0, weight: 1.3 },
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

    const approach = (speed: number, dt: number) => {
      const dx = b.tx - b.x
      const dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      if (d < 2.5) return true
      b.x = clampX(b.x + (dx / d) * speed * dt)
      b.y = clampY(b.y + (dy / d) * speed * dt)
      b.facing = dx >= 0 ? 1 : -1
      setAnim('walk')
      return false
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
      jump(-620)
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
      if (b.mode === 'idle' && !b.airborne && Math.random() < 0.22) jump(-380)
    }
    document.addEventListener('pointerover', onHover, true)

    let lastScrollY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const delta = Math.abs(y - lastScrollY)
      lastScrollY = y
      const now = performance.now()
      if (delta < 110 || now < b.startleReadyAt) return
      if (b.mode === 'pull' || b.mode === 'peek' || b.mode === 'sleep' || b.airborne) return
      b.startleReadyAt = now + 2600
      jump(-300)
      if (canSpeak(now) && Math.random() < 0.45) say(pick(STARTLE_LINES), 1600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const onResize = () => {
      fit()
      b.x = clampX(b.x)
      b.y = clampY(b.y)
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now

      const { w, h } = size()
      const moving = b.mode === 'walk' || b.mode === 'flee'
      b.energy = clamp01(b.energy - (moving ? 0.014 : 0.006) * dt)
      b.curiosity = clamp01(b.curiosity + 0.009 * dt)
      if (b.mode === 'sleep') b.energy = clamp01(b.energy + 0.075 * dt)
      else if (b.mode === 'sit') b.energy = clamp01(b.energy + 0.028 * dt)
      cursor.speed = Math.max(0, cursor.speed - dt * 2600)

      if (b.airborne) {
        b.vy += 1500 * dt
        b.jumpY += b.vy * dt
        if (b.jumpY >= 0) {
          b.jumpY = 0
          b.vy = 0
          b.airborne = false
          b.landAt = now
          setAnim(b.mode === 'talk' ? 'wave' : 'land')
        } else {
          setAnim(b.vy < 0 ? 'leap' : 'fall')
        }
      }

      const cx = b.x + w / 2
      const cy = b.y + h / 2 + b.jumpY
      const dx = cx - cursor.x
      const dy = cy - cursor.y
      const distance = Math.hypot(dx, dy)

      if (b.mode === 'sleep' && distance < 120) {
        b.mode = 'idle'
        b.modeUntil = now + 500
        setAnim('idle')
        if (Math.random() < 0.5) say(pick(WAKE_LINES), 1800)
      }

      if (
        distance < 74 &&
        cursor.speed > 700 &&
        now > b.fleeUntil &&
        b.mode !== 'pull' &&
        b.mode !== 'peek' &&
        b.mode !== 'sleep'
      ) {
        b.mode = 'flee'
        b.fleeUntil = now + 2400
        b.modeUntil = now + 900
        const nx = dx / (distance || 1)
        const ny = dy / (distance || 1)
        b.tx = clampX(b.x + nx * 180)
        b.ty = clampY(b.y + ny * 180)
        b.curiosity = clamp01(b.curiosity + 0.1)
        setAnim('walk')
      }

      if ((b.mode === 'idle' || b.mode === 'sit') && distance < 300) {
        b.facing = cursor.x < cx ? -1 : 1
      }

      if (now > b.nextDecision && b.mode === 'idle' && !b.airborne) decide(now)

      if (
        (b.mode === 'talk' ||
          b.mode === 'yawn' ||
          b.mode === 'celebrate' ||
          b.mode === 'scratch' ||
          b.mode === 'sit' ||
          b.mode === 'sleep') &&
        now > b.modeUntil
      ) {
        if (b.mode === 'talk') {
          setLine(null)
          b.bubbleOpen = false
        }
        b.mode = 'idle'
        b.modeUntil = now + 600 + Math.random() * 1600
        setAnim('idle')
      }

      if (b.mode === 'walk') {
        if (approach(82, dt)) {
          b.mode = 'idle'
          b.modeUntil = now + 700 + Math.random() * 1800
          setAnim('idle')
        }
      } else if (b.mode === 'flee') {
        if (approach(215, dt) || now > b.modeUntil) {
          b.mode = 'idle'
          b.modeUntil = now + 800
          setAnim('idle')
        }
      } else if (b.mode === 'point') {
        if (!b.arrived) {
          if (approach(110, dt)) {
            b.arrived = true
            setAnim('point')
            b.modeUntil = now + 2200
          }
        } else if (now > b.modeUntil) {
          b.mode = 'idle'
          b.modeUntil = now + 600
          setAnim('idle')
        }
      } else if (b.mode === 'peek') {
        if (!b.arrived) {
          if (approach(132, dt)) {
            b.arrived = true
            b.facing = 1
            setAnim('wave')
            b.modeUntil = now + 2400
            if (canSpeak(now) && Math.random() < 0.6) say(pick(PULL_LINES), 2200)
          }
        } else if (now > b.modeUntil) {
          b.mode = 'idle'
          b.modeUntil = now + 600
          setAnim('idle')
        }
      } else if (b.mode === 'pull') {
        if (!b.arrived) {
          if (approach(150, dt)) {
            b.arrived = true
            b.facing = 1
            setAnim('pull')
            b.pullFireAt = now + 420
          }
        } else if (!b.pullFired && now > b.pullFireAt) {
          b.pullFired = true
          b.pullReadyAt = now + 55000
          window.dispatchEvent(new CustomEvent('portfolio:open-sidebar'))
          say(pick(PULL_LINES), 2600)
        }
      }

      if (b.anim === 'land' && !b.airborne && now - b.landAt > 240) setAnim('idle')

      const clip = sheet.clips[b.anim]
      const elapsed = (now - b.animStart) / 1000
      let index = Math.floor(elapsed * clip.fps)
      index = clip.loop ? index % clip.count : Math.min(index, clip.count - 1)
      const frameIndex = clip.start + index

      ctx.clearRect(0, 0, frameW, frameH)
      ctx.save()
      if (b.facing === -1) {
        ctx.translate(frameW, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(sheet.image, frameIndex * frameW, 0, frameW, frameH, 0, 0, frameW, frameH)
      ctx.restore()

      node.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y + b.jumpY)}px, 0)`
    }

    raf = requestAnimationFrame(frame)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __mascot?: unknown }).__mascot = { b, run, decide, say, jump, setAnim, cursor }
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(observeTimer)
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
    <div className="pointer-events-none fixed inset-0 z-20" aria-hidden="true">
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

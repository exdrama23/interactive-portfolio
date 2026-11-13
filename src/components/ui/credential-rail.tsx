"use client"

import * as React from "react"
import { createPortal } from "react-dom"

/**
 * Credential Rail — adapted from the skate-deck rail.
 *
 * The cards hang by printed lanyards from a metal rail, swing with the pointer,
 * slide when dragged and lift into a detail view on click. Instead of deck
 * photos, each card gets two React faces (front / back) drawn at its real pixel
 * width, so a credential can be laid out with the same numbers at any size.
 */

export interface RailItem {
  id: string
  /** Accessible name, caption and detail title. */
  name: string
  /** Collection / institution line. */
  series?: string
  /** Short tag hung from the hook, e.g. a status. */
  tag?: string
  description?: string
  /** Short facts shown as chips in the detail view. */
  details?: string[]
  /** Cord colours and printed motif. */
  strap?: { color: string; ink: string; pattern?: "mandala" | "grid" | "orbit" | "circuit" }
  /** Card face. `w` is the rendered card width in px. */
  front: (w: number) => React.ReactNode
  /** Reverse face, shown when the card is turned. */
  back: (w: number) => React.ReactNode
}

export interface CredentialRailLabels {
  front: string
  back: string
  close: string
  open: string
}

export interface CredentialRailProps extends React.ComponentProps<"section"> {
  items: RailItem[]
  /** Shown under the rail while no card faces the front. */
  caption?: string
  /** Small line under the caption. */
  hint?: string
  autoplay?: boolean
  interval?: number
  active?: number | null
  onActiveChange?: (index: number | null) => void
  labels?: CredentialRailLabels
}

const DECK_ASPECT = 0.62
const PERSPECTIVE = 1000
const LIFT_Z = 34
const LIFT_SCALE = 0.03
const GAP = 0.09
const FRONT_EXTRA = 0.26
const MAX_H = 330
const MIN_RAIL_H = 150
const CAROUSEL_MAX_H = 350
const EDGE = 16
const RAIL_TOP = 12
const RAIL_Y = 0.03
const HOOK_LEN = 0.2
const HOLE_Y = 0.05
const FOOT_PX = 34
const FOOT = 0.1
const STAGE_K = 1 + RAIL_Y + HOOK_LEN - HOLE_Y + FOOT
const SWING_K = 26
const SWING_DAMP = 2.3
const SWING_LIMIT = 12
const COUPLE = 0.035
const HANG_SHARE = 0.3
const RAD = Math.PI / 180

const DEFAULT_LABELS: CredentialRailLabels = {
  front: "Frente",
  back: "Verso",
  close: "Fechar",
  open: "Abrir",
}

/** Rounded credential board, same proportions as DECK_ASPECT. */
const DECK_PATH =
  "M32,4 H206 C224,4 234,14 234,32 V352 C234,370 224,380 206,380 H32 C14,380 4,370 4,352 V32 C4,14 14,4 32,4 Z"

const BOARD_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 238 384' preserveAspectRatio='none'><path d='${DECK_PATH}'/></svg>`,
)}")`

const CONCAVE =
  "linear-gradient(90deg, color-mix(in oklab, black 30%, transparent) 0%, transparent 12%, color-mix(in oklab, white 10%, transparent) 50%, transparent 88%, color-mix(in oklab, black 30%, transparent) 100%), linear-gradient(to bottom, color-mix(in oklab, white 8%, transparent) 0%, transparent 8%, transparent 92%, color-mix(in oklab, white 6%, transparent) 100%)"

const RAIL_GRADIENT =
  "linear-gradient(to bottom, #6e6a62 0%, #918b80 17%, #4a463f 46%, #2f2c27 80%, #1c1a17 100%)"
const REST_SHADE =
  "linear-gradient(90deg, color-mix(in oklab, black 34%, transparent), color-mix(in oklab, black 12%, transparent) 45%, color-mix(in oklab, black 4%, transparent))"
const BRACKET_GRADIENT =
  "linear-gradient(to right, #8a8478, #57524a 55%, #2b2823)"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function restAngle(i: number) {
  return -7 - ((i * 5 + 3) % 7)
}

function maskStyle(mask: string): React.CSSProperties {
  const value = `${mask} center / 100% 100% no-repeat`
  return { WebkitMask: value, mask: value }
}

function tagScale(h: number) {
  return clamp(h / 300, 0.78, 1)
}

function railThickness(h: number) {
  return Math.max(8, Math.round(h * 0.032))
}

function stageGeometry(h: number) {
  const railY = Math.round(RAIL_TOP + RAIL_Y * h)
  const top = railY + (HOOK_LEN - HOLE_Y) * h
  return {
    railY,
    railT: railThickness(h),
    top,
    height: Math.round(top + h + FOOT_PX + FOOT * h),
  }
}

function hookGeometry(h: number) {
  const t = Math.max(1.7, h * 0.0078)
  return {
    t,
    pivotX: 0,
    pivotY: -(HOOK_LEN - HOLE_Y) * h,
  }
}

function Defs({ uid }: { uid: string }) {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
      <defs>
        <filter
          id={`${uid}-powder`}
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * The lanyard: two printed strands come down from the rail, meet at a buckle
 * and hold the card through a metal clip. It lives inside the hanging group,
 * so it swings with the card and stays attached to the rail.
 */
function Lanyard({
  h,
  color,
  ink,
  pattern = "mandala",
}: {
  h: number
  color: string
  ink: string
  pattern?: "mandala" | "grid" | "orbit" | "circuit"
}) {
  const railDrop = -((HOOK_LEN - HOLE_Y) * h)
  const hole = HOLE_Y * h
  const height = hole - railDrop
  const width = Math.max(60, h * 0.5)
  const cx = width / 2
  const topY = 10
  const holeY = topY + height
  const buckleY = topY + height * 0.74
  const spread = Math.min(h * 0.16, 46)
  const strapW = Math.max(5, h * 0.034)
  const dash =
    pattern === "grid"
      ? "5 5"
      : pattern === "orbit"
        ? "1 6"
        : pattern === "circuit"
          ? "8 3 2 3"
          : "1 4"
  const left = `M${cx - spread},${topY} Q${cx - spread * 0.55},${topY + height * 0.42} ${cx},${buckleY}`
  const right = `M${cx + spread},${topY} Q${cx + spread * 0.55},${topY + height * 0.42} ${cx},${buckleY}`
  const lower = `M${cx},${buckleY} L${cx},${holeY - strapW * 0.9}`

  return (
    <svg
      aria-hidden="true"
      data-lanyard
      width={width}
      height={holeY + strapW * 2}
      viewBox={`0 0 ${width} ${holeY + strapW * 2}`}
      className="pointer-events-none absolute overflow-visible"
      style={{ left: "50%", top: railDrop, transform: "translateX(-50%)" }}
    >
      {/* sombra */}
      <g fill="none" stroke="black" strokeOpacity="0.35" strokeLinecap="round" transform="translate(1.2 1.8)">
        <path d={left} strokeWidth={strapW} />
        <path d={right} strokeWidth={strapW} />
        <path d={lower} strokeWidth={strapW * 0.8} />
      </g>

      {/* fita */}
      <g fill="none" strokeLinecap="butt">
        <path d={left} stroke={color} strokeWidth={strapW} />
        <path d={right} stroke={color} strokeWidth={strapW} />
        <path d={lower} stroke={color} strokeWidth={strapW * 0.8} />
      </g>

      {/* impressão no cordão */}
      <g fill="none" strokeLinecap="butt">
        <path d={left} stroke={ink} strokeWidth={strapW * 0.22} strokeDasharray={dash} opacity={0.9} />
        <path d={right} stroke={ink} strokeWidth={strapW * 0.22} strokeDasharray={dash} opacity={0.9} />
      </g>

      {/* brilho da trama */}
      <g fill="none" stroke="white" strokeOpacity="0.22" strokeWidth={Math.max(0.7, strapW * 0.12)}>
        <path d={left} />
        <path d={right} />
      </g>

      {/* fivela */}
      <g transform={`translate(${cx} ${buckleY})`}>
        <rect
          x={-strapW * 1.15}
          y={-strapW * 0.55}
          width={strapW * 2.3}
          height={strapW * 1.15}
          rx={strapW * 0.22}
          fill="#b8b1a3"
          stroke="#6d675c"
          strokeWidth={Math.max(0.6, strapW * 0.1)}
        />
        <rect
          x={-strapW * 0.85}
          y={-strapW * 0.28}
          width={strapW * 1.7}
          height={strapW * 0.28}
          rx={strapW * 0.1}
          fill="#4c473e"
          opacity={0.7}
        />
      </g>

      {/* clipe metálico que prende o cartão */}
      <g transform={`translate(${cx} ${holeY - strapW * 0.9})`}>
        <rect
          x={-strapW * 0.42}
          y={-strapW * 0.2}
          width={strapW * 0.84}
          height={strapW * 1.55}
          rx={strapW * 0.16}
          fill="#d7d1c4"
          stroke="#8b8578"
          strokeWidth={Math.max(0.5, strapW * 0.08)}
        />
        <rect
          x={-strapW * 0.28}
          y={strapW * 0.15}
          width={strapW * 0.56}
          height={strapW * 0.9}
          rx={strapW * 0.1}
          fill="#2c2924"
          opacity={0.55}
        />
      </g>
    </svg>
  )
}

function Hole({ h }: { h: number }) {
  const size = Math.max(5, h * 0.024)
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80"
      style={{
        top: `${HOLE_Y * 100}%`,
        width: size,
        height: size,
        boxShadow:
          "0 1px 0 color-mix(in oklab, white 35%, transparent), inset 0 1px 1px color-mix(in oklab, black 70%, transparent)",
      }}
    />
  )
}

type Sim = {
  x: number[]
  vx: number[]
  tx: number[]
  turn: number[]
  vturn: number[]
  tturn: number[]
  swing: number[]
  vswing: number[]
  tag: number[]
  vtag: number[]
  frameX: number[]
  frameV: number[]
  acc: number[]
  drag: number
  grab: number
  free: number
  last: number
  raf: number
}

function emptySim(): Sim {
  return {
    x: [],
    vx: [],
    tx: [],
    turn: [],
    vturn: [],
    tturn: [],
    swing: [],
    vswing: [],
    tag: [],
    vtag: [],
    frameX: [],
    frameV: [],
    acc: [],
    drag: -1,
    grab: 0,
    free: 0,
    last: 0,
    raf: 0,
  }
}

function footprint(h: number, e: number) {
  return h * DECK_ASPECT * (1 + FRONT_EXTRA * clamp(e, 0, 1))
}

function progress(turn: number, i: number) {
  return clamp(1 - turn / restAngle(i), 0, 1.12)
}

export function CredentialRail({
  items,
  caption,
  hint,
  autoplay = false,
  interval = 3200,
  active: activeProp,
  onActiveChange,
  labels = DEFAULT_LABELS,
  className,
  ...rest
}: CredentialRailProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const count = items.length
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const slots = React.useRef<(HTMLButtonElement | null)[]>([])
  const hangs = React.useRef<(HTMLSpanElement | null)[]>([])
  const swings = React.useRef<(HTMLSpanElement | null)[]>([])
  const turns = React.useRef<(HTMLSpanElement | null)[]>([])
  const shades = React.useRef<(HTMLSpanElement | null)[]>([])
  const glints = React.useRef<(HTMLSpanElement | null)[]>([])
  const nears = React.useRef<(HTMLSpanElement | null)[]>([])
  const fars = React.useRef<(HTMLSpanElement | null)[]>([])
  const tags = React.useRef<(HTMLSpanElement | null)[]>([])
  const sim = React.useRef(emptySim())
  const [size, setSize] = React.useState({ width: 0, h: 300, carousel: false })
  const [innerActive, setInnerActive] = React.useState<number | null>(null)
  const controlled = activeProp !== undefined
  const wanted = controlled ? activeProp : innerActive
  const active =
    wanted !== null && wanted !== undefined && wanted >= 0 && wanted < count ? wanted : null
  const [focusIndex, setFocusIndex] = React.useState(0)
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)
  const [reduced, setReduced] = React.useState(false)
  const [playing, setPlaying] = React.useState(autoplay)
  const [lifted, setLifted] = React.useState<number | null>(null)
  const returnFocus = React.useRef<number | null>(null)
  const pendingOpen = React.useRef(-1)
  const pointer = React.useRef({
    id: -1,
    index: -1,
    x: 0,
    y: 0,
    moved: false,
    kind: "",
    swipe: 0,
    lastX: 0,
    lastT: 0,
    v: 0,
  })
  const live = React.useRef({
    active: null as number | null,
    requested: null as number | null | undefined,
    size,
    reduced,
    count,
    openIndex: null as number | null,
    carouselIndex: 0,
    controlled,
    onActiveChange,
  })
  live.current = {
    ...live.current,
    active,
    size,
    reduced,
    count,
    openIndex,
    controlled,
    onActiveChange,
  }

  const carouselIndex = size.carousel ? (active ?? live.current.carouselIndex) : null
  const geo = stageGeometry(size.h)
  const w = size.h * DECK_ASPECT

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    setPlaying(autoplay)
  }, [autoplay])

  React.useLayoutEffect(() => {
    const stage = stageRef.current
    const section = stage?.parentElement
    if (!stage || !section) return
    const measure = () => {
      const width = stage.clientWidth
      if (!width) return
      const chrome = section.getBoundingClientRect().height - stage.getBoundingClientRect().height
      const byHeight = (window.innerHeight - chrome - 12 - RAIL_TOP - FOOT_PX) / STAGE_K
      const fit =
        (width - 2 * EDGE) /
        (Math.max(1, count) * (DECK_ASPECT + GAP) + FRONT_EXTRA * DECK_ASPECT)
      const carousel = fit < MIN_RAIL_H
      const raw = carousel
        ? Math.min(CAROUSEL_MAX_H, width * 0.9, byHeight)
        : Math.min(MAX_H, fit, byHeight)
      const h = Math.round(Math.max(150, raw))
      setSize((old) =>
        Math.abs(old.width - width) < 0.5 && old.carousel === carousel && Math.abs(old.h - h) < 1
          ? old
          : { width, h, carousel },
      )
    }
    measure()
    const observer = new ResizeObserver(() => measure())
    observer.observe(stage)
    observer.observe(section)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [count])

  const targets = React.useCallback(
    (h: number, width: number, carousel: boolean, front: number | null, centre: number) => {
      const deckW = h * DECK_ASPECT
      const feet = items.map((_, i) => footprint(h, i === front ? 1 : 0))
      if (carousel) {
        const gap = GAP * h * 1.5
        const c = clamp(centre, 0, Math.max(0, feet.length - 1))
        const xs = feet.map(() => 0)
        xs[c] = width / 2
        for (let i = c + 1; i < feet.length; i++) {
          xs[i] = (xs[i - 1] ?? 0) + ((feet[i - 1] ?? 0) + (feet[i] ?? 0)) / 2 + gap
        }
        for (let i = c - 1; i >= 0; i--) {
          xs[i] = (xs[i + 1] ?? 0) - ((feet[i + 1] ?? 0) + (feet[i] ?? 0)) / 2 - gap
        }
        return xs
      }
      const n = feet.length
      const restGap = clamp(
        (width - 2 * EDGE - n * deckW - FRONT_EXTRA * deckW) / Math.max(1, n - 1),
        GAP * h,
        deckW * 0.8,
      )
      const total = feet.reduce((sum, f) => sum + f, 0) + restGap * Math.max(0, n - 1)
      let cursor = (width - total) / 2
      return feet.map((f) => {
        const x = cursor + f / 2
        cursor += f + restGap
        return x
      })
    },
    [items],
  )

  const paint = React.useCallback((i: number) => {
    const s = sim.current
    const { h } = live.current.size
    const deckW = h * DECK_ASPECT
    const slot = slots.current[i]
    if (!slot) return
    const angle = s.turn[i] ?? restAngle(i)
    const e = progress(angle, i)
    const lift = Math.min(1, e)
    const theta = s.swing[i] ?? 0
    slot.style.transform = `translate3d(${((s.x[i] ?? 0) - deckW / 2).toFixed(2)}px,0,0)`
    const hang = hangs.current[i]
    if (hang) hang.style.transform = `rotate(${(theta * HANG_SHARE).toFixed(3)}deg)`
    const sw = swings.current[i]
    if (sw) sw.style.transform = `rotate(${(theta * (1 - HANG_SHARE)).toFixed(3)}deg)`
    const tu = turns.current[i]
    if (tu)
      tu.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${angle.toFixed(
        2,
      )}deg) translateZ(${(LIFT_Z * lift).toFixed(2)}px) scale(${(1 + LIFT_SCALE * e).toFixed(4)})`
    const shade = shades.current[i]
    if (shade) shade.style.opacity = (1 - lift).toFixed(3)
    const glint = glints.current[i]
    if (glint) {
      glint.style.transform = `translate3d(${(-140 + 290 * lift).toFixed(1)}%,0,0) skewX(-14deg)`
      glint.style.opacity = (Math.sin(Math.PI * clamp(lift, 0, 1)) * 0.7).toFixed(3)
    }
    const near = nears.current[i]
    if (near) {
      near.style.opacity = (1 - lift).toFixed(3)
      near.style.transform = `translate3d(${(deckW * 0.07).toFixed(1)}px, ${(h * 0.012).toFixed(1)}px, 0)`
    }
    const far = fars.current[i]
    if (far) {
      far.style.opacity = lift.toFixed(3)
      far.style.transform = `translate3d(${(deckW * (0.07 + 0.2 * lift)).toFixed(1)}px, ${(
        h *
        (0.012 + 0.045 * lift)
      ).toFixed(1)}px, 0) scale(${(1 + 0.05 * lift).toFixed(3)})`
    }
    const tag = tags.current[i]
    if (tag) tag.style.transform = `rotate(${(-9 + (s.tag[i] ?? 0)).toFixed(2)}deg) scale(${tagScale(h).toFixed(3)})`
  }, [])

  const step = React.useCallback(
    (now: number) => {
      const s = sim.current
      const n = live.current.count
      const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 1 / 60
      s.last = now
      const { h, width, carousel } = live.current.size
      const deckW = h * DECK_ASPECT
      const tail = h * (1 - HOLE_Y) + HOOK_LEN * h * HANG_SHARE
      const spacing = (i: number) =>
        (footprint(h, progress(s.turn[i] ?? 0, i)) +
          footprint(h, progress(s.turn[i + 1] ?? 0, i + 1))) /
          2 +
        h * 0.015
      for (let i = 0; i < n; i++) s.frameX[i] = s.x[i] ?? 0
      const sub = Math.max(2, Math.ceil(dt / 0.017))
      const sdt = dt / sub
      for (let k = 0; k < sub; k++) {
        for (let i = 0; i < n; i++) {
          if (i === s.drag) continue
          const restoring = now > s.free
          const stiff = restoring ? 130 : 0
          const damp = restoring ? 2 * Math.sqrt(130) * 0.86 : 3.2
          const ax = -stiff * ((s.x[i] ?? 0) - (s.tx[i] ?? 0)) - damp * (s.vx[i] ?? 0)
          s.vx[i] = (s.vx[i] ?? 0) + ax * sdt
          s.x[i] = (s.x[i] ?? 0) + (s.vx[i] ?? 0) * sdt
        }
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n - 1; i++) {
            const a = s.x[i] ?? 0
            const b = s.x[i + 1] ?? 0
            const overlap = spacing(i) - (b - a)
            if (overlap <= 0) continue
            if (i === s.drag) s.x[i + 1] = b + overlap
            else if (i + 1 === s.drag) s.x[i] = a - overlap
            else {
              s.x[i] = a - overlap / 2
              s.x[i + 1] = b + overlap / 2
            }
            const va = s.vx[i] ?? 0
            const vb = s.vx[i + 1] ?? 0
            if (va > vb) {
              const shared = (va + vb) / 2
              const kick = (va - vb) * 0.12
              if (i !== s.drag) s.vx[i] = shared - kick
              if (i + 1 !== s.drag) s.vx[i + 1] = shared + kick
            }
          }
        }
        if (!carousel && n > 0) {
          const first = EDGE * 0.5 + footprint(h, progress(s.turn[0] ?? 0, 0)) / 2
          const last = width - EDGE * 0.5 - footprint(h, progress(s.turn[n - 1] ?? 0, n - 1)) / 2
          if ((s.x[0] ?? 0) < first) {
            s.x[0] = first
            s.vx[0] = Math.abs(s.vx[0] ?? 0) * 0.3
          }
          if ((s.x[n - 1] ?? 0) > last) {
            s.x[n - 1] = last
            s.vx[n - 1] = -Math.abs(s.vx[n - 1] ?? 0) * 0.3
          }
          for (let i = 0; i < n - 1; i++) {
            const min = (s.x[i] ?? 0) + spacing(i)
            if ((s.x[i + 1] ?? 0) >= min - 0.01) continue
            s.x[i + 1] = min
            if (i + 1 !== s.drag && (s.vx[i + 1] ?? 0) < (s.vx[i] ?? 0)) s.vx[i + 1] = s.vx[i] ?? 0
          }
          if ((s.x[n - 1] ?? 0) > last) s.x[n - 1] = last
          for (let i = n - 1; i > 0; i--) {
            const max = (s.x[i] ?? 0) - spacing(i - 1)
            if ((s.x[i - 1] ?? 0) <= max + 0.01) continue
            s.x[i - 1] = max
            if (i - 1 !== s.drag && (s.vx[i - 1] ?? 0) > (s.vx[i] ?? 0)) s.vx[i - 1] = s.vx[i] ?? 0
          }
        }
        for (let i = 0; i < n; i++) {
          const ta =
            -150 * ((s.turn[i] ?? 0) - (s.tturn[i] ?? 0)) -
            2 * Math.sqrt(150) * 0.78 * (s.vturn[i] ?? 0)
          s.vturn[i] = (s.vturn[i] ?? 0) + ta * sdt
          s.turn[i] = (s.turn[i] ?? 0) + (s.vturn[i] ?? 0) * sdt
          const sa =
            -SWING_K * (s.swing[i] ?? 0) -
            SWING_DAMP * (s.vswing[i] ?? 0) +
            (s.acc[i] ?? 0) * COUPLE
          s.vswing[i] = (s.vswing[i] ?? 0) + sa * sdt
          let swing = (s.swing[i] ?? 0) + (s.vswing[i] ?? 0) * sdt
          if (Math.abs(swing) > SWING_LIMIT) {
            swing = Math.sign(swing) * SWING_LIMIT
            if ((s.vswing[i] ?? 0) * swing > 0) s.vswing[i] = -(s.vswing[i] ?? 0) * 0.25
          }
          s.swing[i] = swing
          const tagA =
            -46 * ((s.tag[i] ?? 0) - swing * 0.6) - 3.4 * (s.vtag[i] ?? 0) - (s.vswing[i] ?? 0) * 0.9
          s.vtag[i] = (s.vtag[i] ?? 0) + tagA * sdt
          s.tag[i] = clamp((s.tag[i] ?? 0) + (s.vtag[i] ?? 0) * sdt, -30, 30)
        }
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n - 1; i++) {
            if (progress(s.turn[i] ?? 0, i) > 0.5 || progress(s.turn[i + 1] ?? 0, i + 1) > 0.5)
              continue
            const ta = (s.x[i] ?? 0) - tail * Math.sin((s.swing[i] ?? 0) * RAD)
            const tb = (s.x[i + 1] ?? 0) - tail * Math.sin((s.swing[i + 1] ?? 0) * RAD)
            const overlap = deckW * 0.98 + 1 - (tb - ta)
            if (overlap <= 0) continue
            const turn = overlap / 2 / tail / RAD
            s.swing[i] = clamp((s.swing[i] ?? 0) + turn, -SWING_LIMIT, SWING_LIMIT)
            s.swing[i + 1] = clamp((s.swing[i + 1] ?? 0) - turn, -SWING_LIMIT, SWING_LIMIT)
            const wa = s.vswing[i] ?? 0
            const wb = s.vswing[i + 1] ?? 0
            if (wa < wb) {
              const mean = (wa + wb) / 2
              s.vswing[i] = mean + (wb - wa) * 0.18
              s.vswing[i + 1] = mean - (wb - wa) * 0.18
            }
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const v = ((s.x[i] ?? 0) - (s.frameX[i] ?? 0)) / dt
        const a = (v - (s.frameV[i] ?? 0)) / dt
        s.frameV[i] = v
        s.acc[i] = (s.acc[i] ?? 0) * 0.5 + clamp(a, -30000, 30000) * 0.5
      }
      let busy = s.drag >= 0 || now < s.free
      for (let i = 0; i < n; i++) {
        paint(i)
        if (
          Math.abs(s.vx[i] ?? 0) > 0.4 ||
          (now > s.free && Math.abs((s.x[i] ?? 0) - (s.tx[i] ?? 0)) > 0.25) ||
          Math.abs((s.turn[i] ?? 0) - (s.tturn[i] ?? 0)) > 0.05 ||
          Math.abs(s.vturn[i] ?? 0) > 0.05 ||
          Math.abs(s.swing[i] ?? 0) > 0.02 ||
          Math.abs(s.vswing[i] ?? 0) > 0.05 ||
          Math.abs(s.tag[i] ?? 0) > 0.05 ||
          Math.abs(s.vtag[i] ?? 0) > 0.08 ||
          Math.abs(s.acc[i] ?? 0) > 1
        )
          busy = true
      }
      if (busy) s.raf = requestAnimationFrame(step)
      else {
        s.raf = 0
        s.last = 0
        for (let i = 0; i < n; i++) {
          if (now > s.free) s.x[i] = s.tx[i] ?? 0
          s.turn[i] = s.tturn[i] ?? restAngle(i)
          s.vturn[i] = 0
          s.swing[i] = 0
          s.vswing[i] = 0
          s.tag[i] = 0
          s.vtag[i] = 0
          s.acc[i] = 0
          s.frameV[i] = 0
          paint(i)
        }
      }
    },
    [paint],
  )

  const kick = React.useCallback(() => {
    const s = sim.current
    if (live.current.reduced) {
      for (let i = 0; i < live.current.count; i++) {
        s.x[i] = s.tx[i] ?? 0
        s.vx[i] = 0
        s.turn[i] = s.tturn[i] ?? restAngle(i)
        s.vturn[i] = 0
        s.swing[i] = 0
        s.vswing[i] = 0
        s.tag[i] = 0
        s.vtag[i] = 0
        s.acc[i] = 0
        s.frameV[i] = 0
        paint(i)
      }
      return
    }
    if (!s.raf) {
      s.last = 0
      s.raf = requestAnimationFrame(step)
    }
  }, [paint, step])

  const impulse = React.useCallback(
    (i: number, amount: number) => {
      const s = sim.current
      if (live.current.reduced || i < 0 || i >= live.current.count) return
      s.vswing[i] = (s.vswing[i] ?? 0) + amount
      kick()
    },
    [kick],
  )

  const choose = React.useCallback((index: number | null) => {
    const l = live.current
    if (index === l.active || index === l.requested) return
    l.requested = index
    if (!l.controlled) {
      l.active = index
      setInnerActive(index)
    }
    l.onActiveChange?.(index)
  }, [])

  const previous = React.useRef<number | null>(null)
  React.useLayoutEffect(() => {
    const old = previous.current
    live.current.requested = undefined
    if (old === active) return
    previous.current = active
    if (active !== null) {
      impulse(active - 1, -26)
      impulse(active + 1, 26)
      live.current.carouselIndex = active
    }
    if (old !== null) {
      impulse(old - 1, 12)
      impulse(old + 1, -12)
    }
  }, [active, impulse])

  React.useLayoutEffect(() => {
    if (!size.width) return
    const s = sim.current
    const front = active
    const xs = targets(size.h, size.width, size.carousel, front, active ?? live.current.carouselIndex)
    const fresh = s.x.length !== count
    for (let i = 0; i < count; i++) {
      s.tx[i] = (xs[i] ?? 0) + (size.carousel ? pointer.current.swipe : 0)
      s.tturn[i] = i === front ? 0 : restAngle(i)
      if (fresh || reduced) {
        s.x[i] = s.tx[i] ?? 0
        s.vx[i] = 0
        s.frameX[i] = s.x[i] ?? 0
        s.frameV[i] = 0
        s.acc[i] = 0
        s.turn[i] = s.tturn[i] ?? restAngle(i)
        s.vturn[i] = 0
        s.swing[i] = s.swing[i] ?? 0
        s.vswing[i] = s.vswing[i] ?? 0
        s.tag[i] = 0
        s.vtag[i] = 0
      }
    }
    if (fresh) {
      s.x.length = count
      for (let i = 0; i < count; i++) paint(i)
    }
    kick()
  }, [size, active, count, reduced, targets, paint, kick])

  const brushed = React.useRef(false)
  React.useEffect(() => {
    if (!size.width || brushed.current || reduced) return
    brushed.current = true
    const timers = items.map((_, i) => window.setTimeout(() => impulse(i, 32 - i * 2), 90 + i * 60))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [size.width, reduced, items, impulse])

  React.useEffect(
    () => () => {
      cancelAnimationFrame(sim.current.raf)
      sim.current.raf = 0
    },
    [],
  )

  React.useLayoutEffect(() => {
    if (openIndex !== null || lifted !== null || returnFocus.current === null) return
    const index = returnFocus.current
    returnFocus.current = null
    slots.current[index]?.focus({ preventScroll: true })
  }, [openIndex, lifted])

  const stop = React.useCallback(() => setPlaying(false), [])

  React.useEffect(() => {
    if (!playing || reduced || openIndex !== null || count === 0 || !size.width) return
    let timer = window.setTimeout(function advance() {
      const current = live.current.active
      choose(current === null ? 0 : (current + 1) % live.current.count)
      timer = window.setTimeout(advance, interval)
    }, active === null ? 1100 : interval)
    return () => window.clearTimeout(timer)
  }, [playing, reduced, openIndex, count, interval, size.width, choose, active])

  const open = React.useCallback(
    (index: number) => {
      stop()
      choose(index)
      setOpenIndex(index)
    },
    [choose, stop],
  )

  const source = React.useCallback(
    () => (openIndex === null ? null : turns.current[openIndex]?.getBoundingClientRect() ?? null),
    [openIndex],
  )
  const onLift = React.useCallback(
    (lift: boolean) => setLifted(lift ? openIndex : null),
    [openIndex],
  )
  const onDetailClose = React.useCallback(() => {
    const index = openIndex
    if (index === null) return
    returnFocus.current = index
    setOpenIndex(null)
    impulse(index, (index % 2 ? 1 : -1) * 40)
  }, [openIndex, impulse])

  function nearest(clientX: number, clientY: number) {
    const stage = stageRef.current
    if (!stage) return null
    const box = stage.getBoundingClientRect()
    const x = clientX - box.left
    const y = clientY - box.top
    const { h } = live.current.size
    const g = stageGeometry(h)
    if (y < g.railY - 10 || y > g.height) return null
    const s = sim.current
    let best: number | null = null
    let distance = Infinity
    for (let i = 0; i < live.current.count; i++) {
      const half = footprint(h, progress(s.turn[i] ?? 0, i)) / 2 + 4
      const d = Math.abs(x - (s.x[i] ?? 0))
      if (d < half && d < distance) {
        best = i
        distance = d
      }
    }
    return best
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const p = pointer.current
    const s = sim.current
    const stage = stageRef.current
    if (p.id === event.pointerId && stage) {
      const dx = event.clientX - p.x
      const now = performance.now()
      if (!p.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - p.y)) {
        p.moved = true
        stop()
        if (stage.isConnected) stage.setPointerCapture(event.pointerId)
        if (!live.current.size.carousel && p.index >= 0) {
          s.drag = p.index
          s.grab = event.clientX - stage.getBoundingClientRect().left - (s.x[p.index] ?? 0)
        }
      }
      if (p.moved) {
        const v = (event.clientX - p.lastX) / Math.max(1, now - p.lastT)
        p.v = p.v * 0.6 + v * 0.4
        p.lastX = event.clientX
        p.lastT = now
        if (s.drag >= 0) {
          s.vx[s.drag] = p.v * 1000
          s.x[s.drag] = event.clientX - stage.getBoundingClientRect().left - s.grab
          s.free = now + 900
          kick()
        } else if (live.current.size.carousel) {
          p.swipe = dx
          const xs = targets(
            live.current.size.h,
            live.current.size.width,
            true,
            live.current.active,
            live.current.active ?? live.current.carouselIndex,
          )
          for (let i = 0; i < live.current.count; i++) s.tx[i] = (xs[i] ?? 0) + dx
          kick()
        }
      }
      return
    }
    if (event.pointerType !== "mouse" || live.current.size.carousel || live.current.openIndex !== null)
      return
    const hit = nearest(event.clientX, event.clientY)
    const current = live.current.active
    if (current !== null && hit !== current) {
      const box = stage?.getBoundingClientRect()
      const keep = box
        ? Math.abs(event.clientX - box.left - (s.x[current] ?? 0)) <
          footprint(live.current.size.h, 1) / 2 + 10
        : false
      if (keep && hit === null) return
    }
    if (hit !== null) {
      stop()
      choose(hit)
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    const hit = nearest(event.clientX, event.clientY)
    const now = performance.now()
    pendingOpen.current = -1
    pointer.current = {
      id: event.pointerId,
      index: hit ?? -1,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      kind: event.pointerType,
      swipe: 0,
      lastX: event.clientX,
      lastT: now,
      v: 0,
    }
  }

  const finishPointer = (event: React.PointerEvent, cancelled: boolean) => {
    const p = pointer.current
    if (p.id !== event.pointerId) return
    const s = sim.current
    const stage = stageRef.current
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    pointer.current = { ...p, id: -1 }
    if (s.drag >= 0) {
      const idle = performance.now() - p.lastT
      s.vx[s.drag] = (s.vx[s.drag] ?? 0) * clamp(1 - idle / 120, 0, 1)
      s.drag = -1
      s.free = performance.now() + 700
      kick()
      return
    }
    if (p.moved && live.current.size.carousel) {
      const dx = event.clientX - p.x
      const current = live.current.active ?? live.current.carouselIndex
      const advance = Math.abs(dx) > 40 || Math.abs(p.v) > 0.45 ? (dx < 0 ? 1 : -1) : 0
      pointer.current.swipe = 0
      choose(clamp(current + advance, 0, live.current.count - 1))
      for (let i = 0; i < live.current.count; i++) impulse(i, clamp(-p.v * 22, -30, 30))
      return
    }
    if (cancelled || p.moved || p.index < 0) return
    stop()
    const touch = p.kind !== "mouse"
    if (touch && live.current.active !== p.index) choose(p.index)
    pendingOpen.current = p.index
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]
    if (!keys.includes(event.key) || count === 0) return
    event.preventDefault()
    stop()
    const from = active ?? focusIndex
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? count - 1
          : clamp(from + (event.key === "ArrowRight" ? 1 : -1), 0, count - 1)
    setFocusIndex(next)
    choose(next)
    slots.current[next]?.focus({ preventScroll: true })
  }

  const current = active === null ? null : items[active]
  const hook = hookGeometry(size.h)

  return (
    <section
      {...rest}
      data-slot="credential-rail"
      data-mode={size.carousel ? "carousel" : "rail"}
      data-active={active ?? ""}
      className={`relative isolate w-full overflow-hidden bg-transparent text-stone-200 ${className ?? ""}`}
    >
      <Defs uid={uid} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(90% 75% at 22% 18%, color-mix(in oklab, white 5%, transparent), transparent 70%), radial-gradient(70% 60% at 50% 55%, color-mix(in oklab, white 3%, transparent), transparent 80%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 18%, black 80%, transparent)",
          maskImage: "linear-gradient(to bottom, transparent, black 18%, black 80%, transparent)",
        }}
      />

      <div
        ref={stageRef}
        data-stage
        role="group"
        aria-roledescription="credential rail"
        aria-label="Cartões de credencial"
        className="relative mt-2 w-full touch-pan-y select-none"
        style={{ height: geo.height, overflowX: "clip" }}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={(event) => finishPointer(event, false)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onPointerLeave={(event) => {
          if (
            event.pointerType === "mouse" &&
            pointer.current.id < 0 &&
            !live.current.size.carousel &&
            !document.activeElement?.matches("[data-deck]:focus-visible")
          )
            choose(null)
        }}
        onKeyDown={onKeyDown}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, white 8%, transparent) 0 1.3px, transparent 1.8px)",
            backgroundSize: "22px 22px",
            backgroundPosition: "11px 6px",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 14%, black 72%, transparent)",
            maskImage: "linear-gradient(to bottom, transparent, black 14%, black 72%, transparent)",
          }}
        />
        <div
          aria-hidden="true"
          data-rail
          className="pointer-events-none absolute inset-x-0 z-[5]"
          style={{ top: geo.railY - geo.railT / 2, height: geo.railT }}
        >
          <div
            className="absolute inset-x-3 h-3 rounded-full bg-black/60 blur-[5px]"
            style={{ top: geo.railT + 1 }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: RAIL_GRADIENT, boxShadow: "0 1px 0 color-mix(in oklab, white 14%, transparent)" }}
          />
          <svg aria-hidden="true" className="absolute inset-0 size-full rounded-full opacity-25 mix-blend-overlay" preserveAspectRatio="none">
            <rect width="100%" height="100%" filter={`url(#${uid}-powder)`} />
          </svg>
          <div className="absolute inset-x-2 top-[20%] h-px rounded-full bg-white/25" />
          {[0, 1].map((side) => (
            <div
              key={side}
              className="absolute top-1/2 w-3.5 -translate-y-1/2 rounded-[3px]"
              style={{
                [side ? "right" : "left"]: 8,
                height: geo.railT * 2.8,
                background: BRACKET_GRADIENT,
                boxShadow: "0 3px 6px color-mix(in oklab, black 22%, transparent)",
              }}
            >
              <span className="absolute left-1/2 top-1 size-1 -translate-x-1/2 rounded-full bg-white/30" />
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white/30" />
            </div>
          ))}
        </div>

        {items.map((item, i) => {
          const facing = active === i
          return (
            <button
              key={item.id}
              ref={(node) => {
                slots.current[i] = node
              }}
              type="button"
              data-deck={i}
              data-front={facing || undefined}
              tabIndex={i === (active ?? focusIndex) ? 0 : -1}
              aria-label={item.name}
              aria-describedby={`${uid}-caption`}
              aria-pressed={facing}
              className="group absolute left-0 cursor-pointer rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-200/60"
              style={{
                top: geo.top,
                width: w,
                height: size.h,
                zIndex: facing ? 30 : 10 + i,
                transform: `translate3d(${((sim.current.x[i] ?? 0) - w / 2).toFixed(2)}px,0,0)`,
              }}
              onFocus={() => {
                setFocusIndex(i)
                if (pointer.current.id < 0) {
                  stop()
                  choose(i)
                }
              }}
              onClick={(event) => {
                const pending = pendingOpen.current
                pendingOpen.current = -1
                if (event.detail === 0 || pending === i) open(i)
              }}
            >
              <span
                ref={(node) => {
                  hangs.current[i] = node
                }}
                data-hang
                className="absolute inset-0"
                style={{
                  transformOrigin: `calc(50% + ${hook.pivotX.toFixed(2)}px) ${hook.pivotY.toFixed(2)}px`,
                }}
              >
                <span
                  ref={(node) => {
                    swings.current[i] = node
                  }}
                  data-swing
                  className="absolute inset-0"
                  style={{
                    transformOrigin: `50% ${HOLE_Y * 100}%`,
                    visibility: lifted === i ? "hidden" : undefined,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ filter: `blur(${Math.max(2, size.h * 0.008).toFixed(1)}px)` }}
                  >
                    <span
                      ref={(node) => {
                        nears.current[i] = node
                      }}
                      data-shadow="near"
                      className="absolute inset-0 block bg-black/30"
                      style={maskStyle(BOARD_MASK)}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ filter: `blur(${Math.max(6, size.h * 0.03).toFixed(1)}px)` }}
                  >
                    <span
                      ref={(node) => {
                        fars.current[i] = node
                      }}
                      data-shadow="far"
                      className="absolute inset-0 block bg-black/25 opacity-0"
                      style={maskStyle(BOARD_MASK)}
                    />
                  </span>
                  <span
                    ref={(node) => {
                      turns.current[i] = node
                    }}
                    data-turn
                    className="absolute inset-0"
                    style={{
                      transformOrigin: `50% ${HOLE_Y * 100}%`,
                      transform: `perspective(${PERSPECTIVE}px) rotateY(${restAngle(i)}deg)`,
                    }}
                  >
                    <span className="absolute inset-0 overflow-hidden" style={maskStyle(BOARD_MASK)}>
                      {item.front(w)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: CONCAVE }}
                    />
                    <span
                      ref={(node) => {
                        shades.current[i] = node
                      }}
                      aria-hidden="true"
                      data-shade
                      className="pointer-events-none absolute inset-0"
                      style={{ ...maskStyle(BOARD_MASK), background: REST_SHADE }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={maskStyle(BOARD_MASK)}
                    >
                      <span
                        ref={(node) => {
                          glints.current[i] = node
                        }}
                        className="absolute inset-y-0 left-0 w-[70%] opacity-0"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, color-mix(in oklab, white 45%, transparent) 50%, transparent)",
                        }}
                      />
                    </span>
                    <Hole h={size.h} />
                  </span>
                </span>
                <Lanyard
                  h={size.h}
                  color={item.strap?.color ?? "#2a2823"}
                  ink={item.strap?.ink ?? "#f0b429"}
                  pattern={item.strap?.pattern}
                />
                {item.tag && (
                  <span
                    ref={(node) => {
                      tags.current[i] = node
                    }}
                    aria-hidden="true"
                    className="pointer-events-none absolute origin-top"
                    style={{
                      left: `calc(50% + ${(size.h * 0.075).toFixed(1)}px)`,
                      top: `${(-(HOOK_LEN - HOLE_Y) * size.h * 0.7).toFixed(1)}px`,
                      transform: `rotate(-9deg) scale(${tagScale(size.h).toFixed(3)})`,
                    }}
                  >
                    <span className="block h-[12px] w-px bg-white/40" />
                    <span className="relative -ml-2 block whitespace-nowrap rounded-[3px] border border-black/10 bg-stone-100 px-1.5 pb-1 pt-2 text-[9px] font-semibold leading-none tracking-wide text-stone-900 shadow-[0_2px_6px_color-mix(in_oklab,black_22%,transparent)]">
                      <span className="absolute left-2 top-[3px] size-[3px] -translate-x-1/2 rounded-full bg-black/30" />
                      {item.tag}
                    </span>
                  </span>
                )}
              </span>
            </button>
          )
        })}

        {size.carousel && count > 1 && (
          <>
            <button
              type="button"
              aria-label="Cartão anterior"
              onClick={() => {
                stop()
                choose(clamp((active ?? 0) - 1, 0, count - 1))
              }}
              className="absolute left-1 top-1/2 z-40 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-stone-200 backdrop-blur transition-colors hover:bg-black/80"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3 5 8l5 5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Próximo cartão"
              onClick={() => {
                stop()
                choose(clamp((active ?? 0) + 1, 0, count - 1))
              }}
              className="absolute right-1 top-1/2 z-40 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-stone-200 backdrop-blur transition-colors hover:bg-black/80"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          </>
        )}
      </div>

      {size.carousel && count > 1 && (
        <div className="relative z-10 flex justify-center gap-1.5" role="group" aria-label="Cartões">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              tabIndex={-1}
              aria-label={item.name}
              aria-current={carouselIndex === i}
              onClick={() => {
                stop()
                choose(i)
              }}
              className={`h-1.5 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-stone-200/60 motion-reduce:transition-none ${
                carouselIndex === i ? "w-6 bg-stone-100" : "w-1.5 bg-white/25 hover:bg-white/45"
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-2 px-6 pb-2 pt-3 text-center">
        <div id={`${uid}-caption`} aria-live="polite" className="min-h-[2.5rem]">
          <p className="text-sm font-medium text-stone-200">
            {current ? current.name : caption}
          </p>
          {current && (current.series || current.tag) && (
            <p className="mt-1 text-[12px] text-stone-500">
              {[current.series, current.tag].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {hint && <p className="text-[11px] tracking-[0.16em] text-stone-600 uppercase">{hint}</p>}
      </div>

      {openIndex !== null && items[openIndex] && (
        <Detail
          uid={uid}
          item={items[openIndex]}
          index={openIndex}
          total={count}
          labels={labels}
          reduced={reduced}
          source={source}
          onLift={onLift}
          onClose={onDetailClose}
        />
      )}
    </section>
  )
}

function Detail({
  uid,
  item,
  index,
  total,
  labels,
  reduced,
  source,
  onLift,
  onClose,
}: {
  uid: string
  item: RailItem
  index: number
  total: number
  labels: CredentialRailLabels
  reduced: boolean
  source: () => DOMRect | null
  onLift: (lifted: boolean) => void
  onClose: () => void
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null)
  const figureRef = React.useRef<HTMLDivElement | null>(null)
  const spinRef = React.useRef<HTMLDivElement | null>(null)
  const closeRef = React.useRef<HTMLButtonElement | null>(null)
  const [side, setSide] = React.useState<"front" | "back">("front")
  const [shown, setShown] = React.useState(false)
  const [figW, setFigW] = React.useState(0)
  const angle = React.useRef({
    value: 0,
    target: 0,
    velocity: 0,
    raf: 0,
    last: 0,
    dragging: false,
    startX: 0,
    startAngle: 0,
  })
  const closing = React.useRef(false)
  const titleId = `${uid}-deck-title`

  const spin = React.useCallback(() => {
    const a = angle.current
    const node = spinRef.current
    const loop = (now: number) => {
      const dt = a.last ? Math.min(0.1, (now - a.last) / 1000) : 1 / 60
      a.last = now
      const steps = Math.max(1, Math.ceil(dt / 0.017))
      for (let k = 0; k < steps; k++) {
        const accel = -90 * (a.value - a.target) - 2 * Math.sqrt(90) * 0.8 * a.velocity
        a.velocity += accel * (dt / steps)
        a.value += a.velocity * (dt / steps)
      }
      if (node) node.style.transform = `rotateY(${a.value.toFixed(2)}deg)`
      if (Math.abs(a.value - a.target) < 0.05 && Math.abs(a.velocity) < 0.05) {
        a.value = a.target
        if (node) node.style.transform = `rotateY(${a.value}deg)`
        a.raf = 0
        a.last = 0
        return
      }
      a.raf = requestAnimationFrame(loop)
    }
    if (reduced) {
      a.value = a.target
      a.velocity = 0
      if (node) node.style.transform = `rotateY(${a.value}deg)`
      return
    }
    if (!a.raf) a.raf = requestAnimationFrame(loop)
  }, [reduced])

  const turnTo = React.useCallback(
    (next: "front" | "back") => {
      const a = angle.current
      const base = Math.round(a.value / 360) * 360
      a.target = base + (next === "back" ? 180 : 0)
      if (Math.abs(a.target - a.value) > 180) a.target -= 360 * Math.sign(a.target - a.value)
      setSide(next)
      spin()
    },
    [spin],
  )

  React.useLayoutEffect(() => {
    const figure = figureRef.current
    const from = source()
    const a = angle.current
    closeRef.current?.focus({ preventScroll: true })
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    let animation: Animation | null = null
    if (figure && from && !reduced && from.width > 0) {
      const to = figure.getBoundingClientRect()
      const scale = from.width / to.width
      const dx = from.left + from.width / 2 - (to.left + to.width / 2)
      const dy = from.top - to.top
      const lift = Math.min(90, Math.abs(dy) * 0.25 + 30)
      onLift(true)
      animation = figure.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          {
            transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(${
              ((scale + 1) / 2) * 1.03
            }) rotate(${dx > 0 ? -3 : 3}deg)`,
            offset: 0.5,
          },
          { transform: "none" },
        ],
        { duration: 680, easing: "cubic-bezier(.22,.85,.3,1)" },
      )
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(raf)
      animation?.cancel()
      document.body.style.overflow = overflow
      cancelAnimationFrame(a.raf)
      a.raf = 0
      onLift(false)
    }
  }, [source, reduced, onLift])

  React.useLayoutEffect(() => {
    const figure = figureRef.current
    if (!figure) return
    const measure = () => setFigW(figure.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(figure)
    return () => observer.disconnect()
  }, [])

  const dismiss = React.useCallback(() => {
    if (closing.current) return
    closing.current = true
    setShown(false)
    turnTo("front")
    const figure = figureRef.current
    const to = source()
    if (!figure || !to || reduced || to.width === 0) {
      onClose()
      return
    }
    const from = figure.getBoundingClientRect()
    const scale = to.width / from.width
    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top - from.top
    const animation = figure.animate(
      [
        { transform: "none" },
        {
          transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 30}px) scale(${(scale + 1) / 2})`,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 560, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" },
    )
    animation.onfinish = () => onClose()
  }, [source, reduced, onClose, turnTo])

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog || dialog.contains(event.target as Node)) return
      if (event.key === "Escape") {
        event.preventDefault()
        dismiss()
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        turnTo(side === "front" ? "back" : "front")
      } else if (event.key === "Tab") {
        const first = dialog.querySelector("button")
        if (first) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [dismiss, turnTo, side])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      dismiss()
      return
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      turnTo(side === "front" ? "back" : "front")
      return
    }
    if (event.key !== "Tab") return
    const controls = [
      ...(dialogRef.current?.querySelectorAll(
        "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ) ?? []),
    ].filter((node) => !(node as HTMLButtonElement).disabled) as HTMLElement[]
    const first = controls[0]
    const last = controls.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const figH = figW / DECK_ASPECT
  const faces = ["front", "back"] as const

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-deck-detail
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-5 text-stone-200 sm:p-8"
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black/90 backdrop-blur-xl transition-opacity duration-300 motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
        onClick={dismiss}
      />
      <button
        ref={closeRef}
        type="button"
        onClick={dismiss}
        className={`absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide text-stone-400 outline-none transition-[opacity,color] duration-300 hover:text-stone-100 focus-visible:ring-2 focus-visible:ring-stone-200/60 motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      >
        {labels.close}
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
      <div className="relative grid w-full max-w-3xl grid-cols-1 items-center gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-12">
        <div
          ref={figureRef}
          data-figure
          className="relative mx-auto h-[min(44svh,520px)] origin-top sm:mx-0 sm:h-[min(62svh,560px)]"
          style={{ aspectRatio: DECK_ASPECT }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-x-[8%] translate-y-[3%] bg-black/60 blur-xl"
            style={maskStyle(BOARD_MASK)}
          />
          <div
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
            style={{ perspective: "1200px" }}
            onPointerDown={(event) => {
              const a = angle.current
              a.dragging = true
              a.startX = event.clientX
              a.startAngle = a.value
              cancelAnimationFrame(a.raf)
              a.raf = 0
              a.last = 0
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              const a = angle.current
              if (!a.dragging) return
              a.value = clamp(a.startAngle + (event.clientX - a.startX) * 0.6, a.startAngle - 220, a.startAngle + 220)
              if (spinRef.current) spinRef.current.style.transform = `rotateY(${a.value.toFixed(2)}deg)`
            }}
            onPointerUp={() => {
              const a = angle.current
              if (!a.dragging) return
              a.dragging = false
              const facing = ((a.value % 360) + 360) % 360
              turnTo(facing > 90 && facing < 270 ? "back" : "front")
            }}
            onPointerCancel={() => {
              angle.current.dragging = false
              turnTo(side)
            }}
          >
            <div ref={spinRef} data-detail-spin className="absolute inset-0 [transform-style:preserve-3d]">
              <div data-face="front" className="absolute inset-0 [backface-visibility:hidden]">
                <span className="absolute inset-0 overflow-hidden" style={maskStyle(BOARD_MASK)}>
                  {figW ? item.front(figW) : null}
                </span>
                {figW > 0 && <Hole h={figH} />}
              </div>
              <div
                data-face="back"
                className="absolute inset-0 [backface-visibility:hidden]"
                style={{ transform: "rotateY(180deg)" }}
              >
                <span className="absolute inset-0 overflow-hidden" style={maskStyle(BOARD_MASK)}>
                  {figW ? item.back(figW) : null}
                </span>
                {figW > 0 && <Hole h={figH} />}
              </div>
            </div>
          </div>
        </div>
        <div
          className={`flex min-w-0 flex-col gap-3 transition-[opacity,transform] delay-150 duration-500 motion-reduce:transition-none ${
            shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <p className="font-mono text-[11px] tracking-[0.2em] text-stone-500">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            {item.series ? ` · ${item.series}` : ""}
          </p>
          <h3 id={titleId} className="text-balance text-xl font-medium tracking-tight text-stone-50 sm:text-3xl">
            {item.name}
          </h3>
          {(item.tag || item.series) && (
            <div className="flex flex-wrap items-baseline gap-3">
              {item.tag && <span className="text-sm font-semibold text-stone-200">{item.tag}</span>}
              {item.series && (
                <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-xs text-stone-400">
                  {item.series}
                </span>
              )}
            </div>
          )}
          {item.description && (
            <p className="text-sm leading-relaxed text-stone-400">{item.description}</p>
          )}
          {item.details && item.details.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {item.details.map((detail) => (
                <li key={detail} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-stone-400">
                  {detail}
                </li>
              ))}
            </ul>
          )}
          <div role="group" aria-label={`${labels.front} / ${labels.back}`} className="mt-1 inline-flex self-start rounded-full border border-white/15 p-1">
            {faces.map((face) => (
              <button
                key={face}
                type="button"
                data-side={face}
                aria-pressed={side === face}
                onClick={() => turnTo(face)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stone-200/60 motion-reduce:transition-none ${
                  side === face ? "bg-stone-100 text-stone-900" : "text-stone-400 hover:text-stone-100"
                }`}
              >
                {face === "front" ? labels.front : labels.back}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default CredentialRail

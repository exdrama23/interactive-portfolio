"use client"


import * as React from "react"
import "./preloader.css"
import { pwCamera, pwClamp01, pwPad, pwSimulated, pwStageLabel } from "./camera"
import {
  AlecPortfolioHero,
  ExteriorBuildingMaskSvg,
  PixelMoonSvg,
  PixelProgrammerChairSvg,
  PixelRoomBackgroundSvg,
  SKYLINE,
  STARS,
} from "./pixel-scene"

export interface PixelWorldPreloaderProps {
  children?: React.ReactNode
  loop?: boolean
  progress?: number
  durationMs?: number
  hud?: boolean
  fontHref?: string | null
  height?: string
  onComplete?: () => void
  onRevealStart?: () => void
  className?: string
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Great+Vibes&family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;500;700&family=Silkscreen:wght@400;700&display=swap"

const FONT_PROBES = [
  '700 1em "Silkscreen"',
  '400 1em "Great Vibes"',
  '700 1em "Caveat"',
  '400 1em "JetBrains Mono"',
]

const HOLD_MS = 380
const FADE_MS = 650

const IntroScene = React.memo(function IntroScene() {
  return (
    <div className="pw-scene">
      <div className="pw-sky">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pw-pixel-svg">
          {STARS.map((st, idx) => (
            <rect
              key={idx}
              x={st.x}
              y={st.y}
              width={st.s}
              height={st.s}
              fill={st.c}
              className="pw-star"
              style={{ animationDelay: st.dl + "s" }}
            />
          ))}

          <g className="pw-cloud-drift" opacity="0.22" fill="#94a3b8">
            <rect x="12" y="24" width="18" height="3" />
            <rect x="15" y="22" width="11" height="2" />
            <rect x="52" y="38" width="22" height="3" />
            <rect x="56" y="35" width="14" height="3" />
          </g>

          {SKYLINE.map((b, bi) => (
            <g key={bi}>
              <rect x={b.x} y={100 - b.h} width={b.w} height={b.h} fill="#080d1e" />
              {b.wins.map((w, wi) => (
                <rect
                  key={wi}
                  x={b.x + w.wx}
                  y={100 - b.h + w.wy}
                  width="0.9"
                  height="1.4"
                  fill={w.lit ? "#fde047" : "#1e293b"}
                  opacity={w.lit ? 0.75 : 0.4}
                />
              ))}
            </g>
          ))}
        </svg>

        <div className="pw-moon-wrap">
          <PixelMoonSvg />
        </div>
      </div>

      <div className="pw-room-wrap">
        <PixelRoomBackgroundSvg />

        <div className="pw-monitor-screen">
          <AlecPortfolioHero />
        </div>

        <div className="pw-fg-chair-layer">
          <PixelProgrammerChairSvg />
        </div>

        <div className="pw-exterior-mask">
          <ExteriorBuildingMaskSvg />
        </div>
      </div>
    </div>
  )
})

export default function PixelWorldPreloader({
  children,
  loop = false,
  progress,
  durationMs = 7800,
  hud = true,
  fontHref = FONT_HREF,
  height = "100svh",
  onComplete,
  onRevealStart,
  className = "",
}: PixelWorldPreloaderProps) {
  const [phase, setPhase] = React.useState<"fonts" | "load" | "hold" | "fade" | "done">(
    fontHref ? "fonts" : "load"
  )
  const [pct, setPct] = React.useState(0)
  const [run, setRun] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete
  const onRevealRef = React.useRef(onRevealStart)
  onRevealRef.current = onRevealStart
  const progressRef = React.useRef(progress)
  progressRef.current = progress

  const portraitRef = React.useRef(false)
  const zoomRef = React.useRef(false)
  const heroKRef = React.useRef(-1)

  const applyCameraVars = React.useCallback((normT: number) => {
    const el = rootRef.current
    if (!el) return
    const cam = pwCamera(normT, portraitRef.current)
    const pamp = pwClamp01(1 - (normT - 0.65) / 0.3)
    const crtOp = pwClamp01(1 - (normT - 0.8) / 0.2)
    el.style.setProperty("--pw-tx", cam.tx.toFixed(4))
    el.style.setProperty("--pw-ty", cam.ty.toFixed(4))
    el.style.setProperty("--pw-sc", cam.scale.toFixed(4))
    el.style.setProperty("--pw-win-fade", cam.winFade.toFixed(3))
    el.style.setProperty("--pw-chair-drop", cam.chairDrop.toFixed(2))
    el.style.setProperty("--pw-pamp", pamp.toFixed(3))
    el.style.setProperty("--pw-crt-op", crtOp.toFixed(3))

    const heroK = portraitRef.current ? 1 / cam.scale : 0.2
    if (Math.abs(heroK - heroKRef.current) >= 0.002) {
      heroKRef.current = heroK
      el.style.setProperty("--pw-hero-k", heroK.toFixed(4))
    }

    const zoom = normT >= 0.55
    if (zoom !== zoomRef.current) {
      zoomRef.current = zoom
      el.dataset.pwZoom = zoom ? "true" : "false"
    }
  }, [])

  React.useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)")
    const sync = () => {
      portraitRef.current = mq.matches
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  React.useEffect(() => {
    if (!fontHref) {
      setPhase((p) => (p === "fonts" ? "load" : p))
      return
    }
    if (!document.querySelector('link[data-pw-fonts="' + fontHref + '"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = fontHref
      link.setAttribute("data-pw-fonts", fontHref)
      document.head.appendChild(link)
    }
    let live = true
    const go = () => {
      if (live) setPhase((p) => (p === "fonts" ? "load" : p))
    }
    const timer = window.setTimeout(go, 1500)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fonts && fonts.load) {
      Promise.all(FONT_PROBES.map((f) => fonts.load(f).catch(() => null)))
        .then(go)
        .catch(go)
    } else go()
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [fontHref])

  React.useEffect(() => {
    if (phase !== "load") return
    let raf = 0
    let shown = 0
    let lastPctInt = -1
    let last = performance.now()
    const t0 = last
    const dur = Math.max(2000, durationMs)

    applyCameraVars(0)

    const tick = (now: number) => {
      const dt = Math.min(250, Math.max(0, now - last))
      last = now
      const real = progressRef.current
      const elapsed = (now - t0) / dur
      const target =
        real === undefined
          ? pwSimulated(elapsed)
          : Math.max(0, Math.min(100, Number(real) || 0))

      const easeK = 1 - Math.pow(0.88, dt / 16.6667)
      shown = Math.max(shown, shown + (target - shown) * easeK)
      if (target >= 100 && shown > 99.6) shown = 100

      const normT = pwClamp01(shown / 100)
      applyCameraVars(normT)

      const pctInt = Math.floor(shown)
      if (pctInt !== lastPctInt) {
        lastPctInt = pctInt
        setPct(shown)
      }

      if (shown >= 100) {
        applyCameraVars(1)
        setPct(100)
        setPhase("hold")
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, run, durationMs, applyCameraVars])

  const restart = React.useCallback(() => {
    setPct(0)
    applyCameraVars(0)
    setRun((x) => x + 1)
    setPhase("load")
  }, [applyCameraVars])

  React.useEffect(() => {
    let timer = 0
    if (phase === "hold") {
      timer = window.setTimeout(() => {
        setPhase("fade")
      }, HOLD_MS)
    } else if (phase === "fade") {
      timer = window.setTimeout(() => {
        if (loop) {
          restart()
          return
        }
        setPhase("done")
        onCompleteRef.current?.()
      }, FADE_MS)
    }
    return () => window.clearTimeout(timer)
  }, [phase, loop, restart])

  React.useEffect(() => {
    if (phase === "hold" || phase === "fade") onRevealRef.current?.()
  }, [phase])

  const pointer = React.useRef({ raf: 0, x: 0, y: 0 })
  const onPointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current
    if (!el || reduced) return
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    if (pointer.current.raf) return
    pointer.current.raf = requestAnimationFrame(() => {
      pointer.current.raf = 0
      el.style.setProperty("--pw-px", pointer.current.x.toFixed(3))
      el.style.setProperty("--pw-py", pointer.current.y.toFixed(3))
    })
  }

  const onPointerLeave = () => {
    const el = rootRef.current
    if (!el) return
    el.style.setProperty("--pw-px", "0")
    el.style.setProperty("--pw-py", "0")
  }

  const skipAnimation = () => {
    applyCameraVars(1)
    setPct(100)
    setPhase("fade")
  }

  const done = phase === "done"
  const revealedContent = children ?? <AlecPortfolioHero />

  return (
    <div
      ref={rootRef}
      className={"pw-root " + className}
      style={
        {
          height,
          "--pw-pixel": '"Silkscreen", "Courier New", monospace',
          "--pw-script": '"Great Vibes", "Brush Script MT", cursive',
          "--pw-hand": '"Caveat", cursive',
          "--pw-mono": '"JetBrains Mono", ui-monospace, monospace',
          "--pw-sans": '"Inter", system-ui, -apple-system, sans-serif',
        } as React.CSSProperties
      }
    >
      {revealedContent}

      {done && !loop ? null : (
        <div
          className="pw-gate"
          data-phase={phase}
          role="progressbar"
          aria-label="Carregando portfólio Alec"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(pct)}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <IntroScene />

          <div className="pw-crt" aria-hidden="true" />

          {hud ? (
            <div className="pw-hud" data-hide={pct >= 96 || phase === "fade"}>
              <div className="pw-hud-top">
                <span>ALEC // PIXEL WORLD</span>
                <span>ARACAJU — SE // 2026</span>
                <button type="button" className="pw-hud-skip" onClick={skipAnimation}>
                  Pular Intro ↗
                </button>
              </div>
              <div className="pw-hud-bot">
                <span className="pw-hud-stage">{pwStageLabel(pct)}</span>
                <span className="pw-hud-pct">
                  {pwPad(pct)}
                  <small>%</small>
                </span>
              </div>
              <div
                className="pw-hud-bar"
                style={{ transform: "scaleX(" + (pct / 100).toFixed(4) + ")" }}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

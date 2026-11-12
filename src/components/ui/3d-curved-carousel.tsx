"use client"

import * as React from "react"

// A photo carousel seen through a curved lens. The cards sit on one WebGL canvas:
// the middle one reads flat, and the further a card travels from the centre, the
// taller and more bent it grows, with a fringe of chromatic split at the rim.
// Drag, flick, arrow keys or the buttons; it settles on a spring and loops.

export type LensSlide = {
  title: string
  /** Small line above the title, e.g. a place or a category. */
  kicker?: string
  /** One short line under the title. */
  caption?: string
  /** Photo URL. Portrait (about 4:5) reads best. Remote URLs need CORS. */
  image: string
  alt?: string
}

export type CurvedLensCarouselProps = {
  slides: LensSlide[]
  /** Small label, top left. */
  label?: React.ReactNode
  /** How hard the lens bends the outer cards. 0 is flat. */
  bend?: number
  /** Stage colour behind the cards. */
  background?: string
  /** Text colour on the stage. */
  ink?: string
  /** Stage height. Keep it a definite length; percentages collapse once installed. */
  height?: string
  className?: string
  onChange?: (index: number) => void
}

// #region motion
/** Wraps any index into 0..n-1. */
export function wrap(i: number, n: number): number {
  return n > 0 ? ((i % n) + n) % n : 0
}

/** Signed distance of slide i from the scroll position, taking the short way round a loop of n. */
export function offsetOf(i: number, pos: number, n: number): number {
  if (n <= 0) return 0
  const d = wrap(i - pos + n / 2, n) - n / 2
  return d
}

/** Where a flick comes to rest: the nearest whole slide past the release, at most `max` away. */
export function restFor(pos: number, velocity: number, max = 3): number {
  const throwTo = pos + Math.max(-max, Math.min(max, velocity * 0.18))
  return Math.round(throwTo)
}

/** One step of a critically damped spring (slides, slides/s, seconds). */
export function springStep(pos: number, vel: number, target: number, dt: number, omega = 11): [number, number] {
  const a = (target - pos) * omega * omega - vel * 2 * omega
  const v = vel + a * dt
  return [pos + v * dt, v]
}

/** Card size in px for a stage of w × h: portrait cards, smaller share of a wide stage. */
export function cardSize(w: number, h: number): [number, number] {
  const cw = Math.min(w < 640 ? w * 0.56 : w * 0.22, h * 0.34)
  return [Math.round(cw), Math.round(cw * 1.25)]
}

/** "01" style counter. */
export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}
// #endregion

const VERT =
  "attribute vec2 aPos;" +
  "uniform vec2 uRes;uniform vec2 uSize;uniform float uX;uniform float uBend;uniform float uVel;uniform float uIntro;uniform float uLift;" +
  "varying vec2 vUv;varying float vX;" +
  "void main(){" +
  "vec2 p=vec2(uX+(aPos.x-.5)*uSize.x,(aPos.y-.5)*uSize.y);" +
  "p.y-=(1.-uIntro)*uSize.y*.9;" +
  "vec2 n=p/(uRes*.5);" +
  "float x=clamp(n.x,-1.4,1.4);" +
  "n.y*=1.+uBend*x*x;" +
  "n.y+=uVel*.05*sin(aPos.x*3.14159)*(aPos.y-.5);" +
  "n.x*=1.-.06*uBend*x*x;n.y+=uLift;" +
  "vUv=aPos;vX=x;" +
  "gl_Position=vec4(n,0.,1.);}"

const FRAG =
  "precision highp float;" +
  "uniform sampler2D uTex;uniform vec2 uSize;uniform float uAspect;uniform float uVel;uniform float uIntro;uniform float uShift;uniform float uReady;" +
  "varying vec2 vUv;varying float vX;" +
  "float box(vec2 q,vec2 b,float r){vec2 d=abs(q)-b+r;return length(max(d,0.))+min(max(d.x,d.y),0.)-r;}" +
  "void main(){" +
  "float a=uSize.x/uSize.y;vec2 uv=vUv-.5;" +
  "if(uAspect>a)uv.x*=a/uAspect;else uv.y*=uAspect/a;" +
  "uv=uv/1.12+.5;uv.x+=uShift;" +
  "float ca=(.0012+.0045*vX*vX)*(1.+abs(uVel)*1.2);" +
  "vec3 c=vec3(texture2D(uTex,uv+vec2(ca,0.)).r,texture2D(uTex,uv).g,texture2D(uTex,uv-vec2(ca,0.)).b);" +
  "c=mix(vec3(.11,.11,.12),c,uReady);" +
  "c*=1.-.42*min(1.,vX*vX);" +
  "float d=box((vUv-.5)*uSize,uSize*.5,14.);" +
  "float rim=smoothstep(-5.,0.,d);" +
  "c+=rim*.10;" +
  "c+=.07*smoothstep(.55,1.,vUv.y)*(1.-abs(vX));" +
  "float al=smoothstep(.75,-.75,d)*uIntro;" +
  "gl_FragColor=vec4(c*al,al);}"

const FONT =
  "@font-face{font-family:CLC Serif;font-style:normal;font-weight:400;font-display:swap;" +
  "src:url(data:font/woff2;base64,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) format('woff2')}"

const CSS =
  FONT +
  ".clc-root{position:relative;width:100%;overflow:hidden;isolation:isolate;outline:none;user-select:none;-webkit-user-select:none;font-family:ui-sans-serif,system-ui,sans-serif}" +
  ".clc-root:focus-visible{box-shadow:inset 0 0 0 2px var(--clc-ink)}" +
  ".clc-glow{position:absolute;inset:-20%;background:radial-gradient(50% 40% at 50% 46%,rgba(255,240,220,.07),transparent 70%);pointer-events:none}" +
  ".clc-grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;pointer-events:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")}" +
  ".clc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:pan-y}" +
  ".clc-canvas:active{cursor:grabbing}" +
  ".clc-top{position:absolute;left:clamp(20px,4vw,48px);right:clamp(20px,4vw,48px);top:clamp(18px,3.4vw,36px);display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--clc-ink);opacity:.62;pointer-events:none}" +
  ".clc-top b{font-weight:500;letter-spacing:.14em}" +
  ".clc-copy{position:absolute;left:clamp(20px,4vw,48px);bottom:clamp(22px,4vw,44px);max-width:min(560px,70%);color:var(--clc-ink);pointer-events:none}" +
  ".clc-kicker{display:block;font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.55;margin-bottom:10px}" +
  ".clc-title{font-family:var(--clc-font);font-weight:400;font-size:clamp(44px,7.2vw,104px);line-height:.92;letter-spacing:-.02em;margin:0;display:block}" +
  ".clc-ch{display:inline-block;transform:translateY(105%) rotate(6deg);opacity:0;transition:transform .9s cubic-bezier(.2,.9,.1,1),opacity .6s ease}" +
  ".clc-line{display:block;overflow:hidden;padding-bottom:.06em}" +
  ".clc-in .clc-ch{transform:none;opacity:1}" +
  ".clc-cap{display:block;margin-top:14px;font-size:14px;line-height:1.5;opacity:0;transform:translateY(10px);transition:opacity .7s ease .25s,transform .7s cubic-bezier(.2,.9,.1,1) .25s;max-width:34ch}" +
  ".clc-in .clc-cap{opacity:.66;transform:none}" +
  ".clc-ctl{position:absolute;right:clamp(20px,4vw,48px);bottom:clamp(22px,4vw,44px);display:flex;flex-direction:column;align-items:flex-end;gap:16px;color:var(--clc-ink)}" +
  ".clc-count{font-size:12px;letter-spacing:.18em;font-variant-numeric:tabular-nums;opacity:.8}" +
  ".clc-count i{font-style:normal;opacity:.45}" +
  ".clc-bar{width:132px;height:2px;border-radius:2px;background:color-mix(in srgb,var(--clc-ink) 16%,transparent);overflow:hidden}" +
  ".clc-bar>span{display:block;height:100%;width:100%;background:var(--clc-ink);transform-origin:0 50%;transition:transform .7s cubic-bezier(.2,.9,.1,1)}" +
  ".clc-btns{display:flex;gap:10px}" +
  ".clc-btn{width:46px;height:46px;border-radius:999px;display:grid;place-items:center;color:var(--clc-ink);cursor:pointer;" +
  "background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14);" +
  "box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 30px -10px rgba(0,0,0,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
  "transition:transform .35s cubic-bezier(.3,1.6,.5,1),background .3s ease,border-color .3s ease}" +
  ".clc-btn:hover{transform:translateY(-2px) scale(1.06);background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.06));border-color:rgba(255,255,255,.3)}" +
  ".clc-btn:active{transform:scale(.94)}" +
  ".clc-btn:focus-visible{outline:2px solid var(--clc-ink);outline-offset:3px}" +
  ".clc-btn svg{width:18px;height:18px}" +
  ".clc-fallback{position:absolute;left:50%;top:50%;width:min(62vw,360px);aspect-ratio:4/5;transform:translate(-50%,-50%);object-fit:cover;border-radius:14px;max-width:none}" +
  ".clc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
  "@media (max-width:640px){.clc-copy{max-width:calc(100% - 40px);bottom:96px}.clc-ctl{flex-direction:row;align-items:center;left:20px;justify-content:space-between}.clc-bar{width:96px}.clc-top span{display:none}.clc-top b{font-size:10px;letter-spacing:.12em}}" +
  "@media (prefers-reduced-motion:reduce){.clc-ch,.clc-cap,.clc-bar>span,.clc-btn{transition:opacity .2s ease}.clc-ch{transform:none}.clc-cap{transform:none}}"

type GLState = {
  gl: WebGLRenderingContext
  prog: WebGLProgram
  buf: WebGLBuffer
  count: number
  u: Record<string, WebGLUniformLocation | null>
  tex: { t: WebGLTexture; aspect: number; ready: boolean }[]
}

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type) as WebGLShader
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

/** A (segX × segY) grid of quads as triangles, positions 0..1. */
function grid(segX: number, segY: number): Float32Array {
  const out: number[] = []
  for (let y = 0; y < segY; y++)
    for (let x = 0; x < segX; x++) {
      const x0 = x / segX, x1 = (x + 1) / segX, y0 = y / segY, y1 = (y + 1) / segY
      out.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1)
    }
  return new Float32Array(out)
}

function Chars({ text, base }: { text: string; base: number }) {
  return (
    <>
      {text.split(" ").map((word, w, all) => (
        <React.Fragment key={w}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {word.split("").map((ch, i) => (
              <span key={i} className="clc-ch" style={{ transitionDelay: base + (all.slice(0, w).join(" ").length + i) * 24 + "ms" }}>
                {ch}
              </span>
            ))}
          </span>
          {w < all.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  )
}

/** The caption block. Mounted fresh per slide, then flipped on next frame so the letters rise. */
function Copy({ slide, shown }: { slide: LensSlide; shown: boolean }) {
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    if (!shown) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [shown])
  return (
    <div className={"clc-copy" + (on ? " clc-in" : "")} aria-live="polite">
      {slide.kicker ? <span className="clc-kicker">{slide.kicker}</span> : null}
      <h2 className="clc-title">
        <span className="clc-line">
          <Chars text={slide.title} base={60} />
        </span>
      </h2>
      {slide.caption ? <span className="clc-cap">{slide.caption}</span> : null}
    </div>
  )
}

export default function CurvedLensCarousel({
  slides,
  label = "Field Atlas",
  bend = 0.55,
  background = "#0e0e10",
  ink = "#f3ede4",
  height = "100svh",
  className,
  onChange,
}: CurvedLensCarouselProps) {
  const n = slides.length
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [index, setIndex] = React.useState(0)
  const [shown, setShown] = React.useState(false)
  const [noGL, setNoGL] = React.useState(false)
  const api = React.useRef({ go: (_d: number) => {} })
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  React.useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root || n === 0) return
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true })
    if (!gl) {
      setNoGL(true)
      setShown(true)
      return
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const prog = gl.createProgram() as WebGLProgram
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("3d-curved-carousel: " + gl.getProgramInfoLog(prog))
      setNoGL(true)
      setShown(true)
      return
    }
    gl.useProgram(prog)
    const mesh = grid(36, 12)
    const buf = gl.createBuffer() as WebGLBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u: GLState["u"] = {}
    for (const k of ["uRes", "uSize", "uX", "uBend", "uVel", "uIntro", "uTex", "uAspect", "uShift", "uReady", "uLift"]) u[k] = gl.getUniformLocation(prog, k)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    let disposed = false
    const tex = slides.map((s) => {
      const t = gl.createTexture() as WebGLTexture
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([28, 28, 30, 255]))
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
        gl.texParameteri(gl.TEXTURE_2D, p, v)
      const entry = { t, aspect: 0.8, ready: false }
      const img = new Image()
      if (!s.image.startsWith("data:")) img.crossOrigin = "anonymous"
      img.decoding = "async"
      img.onload = () => {
        if (disposed) return
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        entry.aspect = img.naturalWidth / img.naturalHeight
        entry.ready = true
        kick()
      }
      img.src = s.image
      return entry
    })

    // Stage size, measured on resize only; the frame loop reads these numbers.
    let W = 1, H = 1, dpr = 1, cw = 1, ch = 1, gap = 1
    let pos = 0, vel = 0, target = 0
    let intro = reduced.matches ? 1 : 0
    let introStart = -1
    let dragging = false, dragX = 0, dragPos = 0, lastX = 0, lastT = 0, flick = 0
    let raf = 0, last = 0, visible = true, current = 0

    const resize = (w: number, h: number) => {
      W = Math.max(1, w)
      H = Math.max(1, h)
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ;[cw, ch] = cardSize(W, H)
      gap = cw * 0.14
      gl.viewport(0, 0, canvas.width, canvas.height)
      kick()
    }

    const draw = () => {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u.uRes, W, H)
      gl.uniform2f(u.uSize, cw, ch)
      gl.uniform1f(u.uBend, bend)
      gl.uniform1f(u.uVel, reduced.matches ? 0 : Math.max(-1, Math.min(1, vel * 0.12)))
      gl.uniform1f(u.uLift, W < 640 ? 0.3 : 0.15)
      const step = cw + gap
      for (let i = 0; i < n; i++) {
        const d = offsetOf(i, pos, n)
        const x = d * step
        if (Math.abs(x) > W * 0.5 + step * 1.5) continue
        const order = Math.abs(d)
        const t = Math.max(0, Math.min(1, (intro - order * 0.12) / 0.6))
        const e = 1 - Math.pow(1 - t, 3)
        gl.bindTexture(gl.TEXTURE_2D, tex[i].t)
        gl.uniform1f(u.uX, x)
        gl.uniform1f(u.uIntro, e)
        gl.uniform1f(u.uAspect, tex[i].aspect)
        gl.uniform1f(u.uReady, tex[i].ready ? 1 : 0)
        gl.uniform1f(u.uShift, Math.max(-0.05, Math.min(0.05, -d * 0.035)))
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 2)
      }
    }

    const frame = (now: number) => {
      raf = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      if (intro < 1) {
        if (introStart < 0) introStart = now
        intro = Math.min(1.5, (now - introStart) / 1100)
        if (intro >= 1.5) intro = 1
      }
      if (!dragging) {
        if (reduced.matches) {
          pos = target
          vel = 0
        } else [pos, vel] = springStep(pos, vel, target, dt)
      }
      const idx = wrap(Math.round(pos), n)
      if (idx !== current) {
        current = idx
        setIndex(idx)
        onChangeRef.current?.(idx)
      }
      draw()
      const settled = !dragging && Math.abs(target - pos) < 0.0005 && Math.abs(vel) < 0.001 && (intro >= 1 || reduced.matches)
      if (settled) {
        pos = target
        draw()
        last = 0
      } else if (visible) raf = requestAnimationFrame(frame)
    }

    function kick() {
      if (!raf && visible && !disposed) raf = requestAnimationFrame(frame)
    }

    api.current.go = (dir: number) => {
      target = Math.round(target) + dir
      kick()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging = true
      dragX = lastX = e.clientX
      lastT = e.timeStamp
      dragPos = pos
      flick = 0
      canvas.setPointerCapture(e.pointerId)
      kick()
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const step = cw + gap
      const p = dragPos - (e.clientX - dragX) / step
      const dts = Math.max(1, e.timeStamp - lastT) / 1000
      flick = flick * 0.6 + (-(e.clientX - lastX) / step / dts) * 0.4
      vel = flick
      lastX = e.clientX
      lastT = e.timeStamp
      pos = p
      kick()
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      target = restFor(pos, flick)
      vel = flick
      kick()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") api.current.go(1)
      else if (e.key === "ArrowLeft") api.current.go(-1)
      else return
      e.preventDefault()
    }
    const onMotion = () => kick()

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)
    root.addEventListener("keydown", onKey)
    reduced.addEventListener("change", onMotion)

    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      resize(r.width, r.height)
    })
    ro.observe(root)
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
      if (visible) {
        setShown(true)
        kick()
      }
    })
    io.observe(root)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      root.removeEventListener("keydown", onKey)
      reduced.removeEventListener("change", onMotion)
      for (const t of tex) gl.deleteTexture(t.t)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [n, slides, bend])

  const slide = slides[index] ?? slides[0]
  if (!slide) return null
  const vars = { height, background, "--clc-ink": ink, "--clc-font": "CLC Serif, ui-serif, Georgia, serif" } as React.CSSProperties

  return (
    <div
      ref={rootRef}
      className={"clc-root" + (className ? " " + className : "")}
      style={vars}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={typeof label === "string" ? label : "Carrossel de projetos"}
    >
      <style>{CSS}</style>
      <div className="clc-glow" aria-hidden="true" />
      <canvas ref={canvasRef} className="clc-canvas" aria-hidden="true" />
      {noGL ? <img className="clc-fallback" src={slide.image} alt={slide.alt ?? slide.title} /> : null}
      <div className="clc-grain" aria-hidden="true" />
      <div className="clc-top">
        <b>{label}</b>
        <span>Arraste para explorar</span>
      </div>
      <Copy key={index} slide={slide} shown={shown} />
      <div className="clc-ctl">
        <span className="clc-count">
          {pad2(index + 1)} <i>/ {pad2(n)}</i>
        </span>
        <span className="clc-bar" aria-hidden="true">
          <span style={{ transform: "scaleX(" + (index + 1) / n + ")" }} />
        </span>
        <div className="clc-btns">
          <button type="button" className="clc-btn" aria-label="Slide anterior" onClick={() => api.current.go(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="clc-btn" aria-label="Próximo slide" onClick={() => api.current.go(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

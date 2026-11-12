import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Colagem tipográfica da hero — adaptação do modelo Skeleton Key Preloader
 * (sem a chave e sem o buraco da fechadura). Cada peça é decorativa e usa
 * paralaxe de ponteiro; a palavra-ânima ("Bem-vindo ao meu mundo") é
 * renderizada pelo GlyphPortal, no centro.
 */

const TAGS = ['#fullstack', '#react', '#motion', '#typescript']

// Palavra do bloco pixelado. Qualquer texto em maiúsculas funciona (A–Z, 0–9).
const PIXEL_WORD = 'ALEC'

// 5 × 7 em negrito (mesma construção do modelo: linha OR linha deslocada).
const GLYPH_BITS: Record<string, string> = {
  A: '01110100011000111111100011000110001',
  C: '01110100011000010000100001000101110',
  E: '11111100001000011110100001000011111',
  L: '10000100001000010000100001000011111',
}

function glyphRows(ch: string) {
  const bits = GLYPH_BITS[ch] ?? '11111111111111111111111111111111111'
  const rows: string[] = []
  for (let r = 0; r < 7; r++) {
    const row = bits.slice(r * 5, r * 5 + 5) + '0'
    let out = ''
    for (let c = 0; c < 6; c++) {
      out += row[c] === '1' || (c > 0 && row[c - 1] === '1') ? '1' : '0'
    }
    rows.push(out)
  }
  return rows
}

// 6 colunas por letra + 1 de respiro entre elas.
const PIXEL_TRACK = 7
const PIXEL_COLUMNS = Math.max(1, PIXEL_WORD.length * PIXEL_TRACK - 1)

const PIXELS = Array.from(PIXEL_WORD).flatMap((ch, letter) =>
  glyphRows(ch).flatMap((line, row) =>
    Array.from(line).map((cell, col) => ({
      row,
      col: letter * PIXEL_TRACK + col,
      on: cell === '1',
    }))
  )
).filter((p) => p.on)

const CSS = `
.hcl-root{
  --hcl-cell:clamp(7px,.82vw,12px);
  position:absolute;inset:0;z-index:1;pointer-events:none;color:#0d0d0d;
  font-family:"Space Grotesk","Helvetica Neue",Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.hcl-par{
  translate:calc(var(--hcl-px,0) * var(--d,0) * 1px) calc(var(--hcl-py,0) * var(--d,0) * 1px);
  transition:translate .9s cubic-bezier(.2,.8,.2,1)
}
.hcl-abs{position:absolute}

.hcl-greet{
  left:4vw;top:13vh;font-weight:500;font-size:clamp(14px,1.35vw,21px);line-height:1;
  letter-spacing:-.01em;white-space:nowrap;color:#141414
}
.hcl-ch{display:inline-block;opacity:0;transform:translateY(.35em);
  transition:opacity .24s ease,transform .38s cubic-bezier(.2,1.4,.4,1)}
.hcl-root[data-on="true"] .hcl-ch{opacity:1;transform:none}

.hcl-ver{right:4.5vw;top:10vh;width:132px;height:74px}
.hcl-ver-num{
  position:absolute;left:8px;top:0;font:500 clamp(40px,3.6vw,58px)/1 Caveat,"Segoe Print",cursive;
  transform:rotate(-7deg);white-space:nowrap
}
.hcl-ver svg{position:absolute;inset:-8px -12px;width:calc(100% + 24px);height:calc(100% + 16px);
  max-width:none;overflow:visible}
.hcl-ver path{fill:none;stroke:#141414;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1;
  stroke-dashoffset:1;opacity:0;transition:stroke-dashoffset .8s .35s cubic-bezier(.6,0,.3,1),opacity .2s}
.hcl-root[data-on="true"] .hcl-ver path{stroke-dashoffset:0;opacity:1}

.hcl-pixel{left:4vw;top:21vh}
.hcl-px{
  position:absolute;width:var(--hcl-cell);height:var(--hcl-cell);background:#141414;
  border-radius:1px;transform:scale(.18);opacity:.1;
  transition:transform .42s cubic-bezier(.2,1.6,.4,1),opacity .16s ease
}
.hcl-root[data-on="true"] .hcl-px{transform:none;opacity:1}

.hcl-sup{left:calc(4vw + ${PIXEL_COLUMNS} * var(--hcl-cell) + 1.4vw);top:27vh;width:clamp(38px,4vw,62px);height:clamp(38px,4vw,62px)}
.hcl-sup svg{width:100%;height:100%;max-width:none;overflow:visible}
.hcl-sup circle{fill:none;stroke:#141414;stroke-width:9;stroke-dasharray:1.02 1.02;stroke-dashoffset:1.02;
  opacity:0;transition:stroke-dashoffset .9s .3s cubic-bezier(.6,0,.2,1),opacity .12s}
.hcl-root[data-on="true"] .hcl-sup circle{stroke-dashoffset:0;opacity:1}

.hcl-dial{left:3.5vw;bottom:13vh;width:clamp(108px,11vw,168px);height:clamp(108px,11vw,168px)}
.hcl-dial svg{width:100%;height:100%;max-width:none;overflow:visible}
.hcl-mono{font:400 78px/1 "Space Grotesk",sans-serif;letter-spacing:-.05em;fill:none;stroke:#141414;
  stroke-width:1.8;stroke-dasharray:520;stroke-dashoffset:520;
  transition:stroke-dashoffset 1.6s .2s cubic-bezier(.5,0,.2,1)}
.hcl-root[data-on="true"] .hcl-mono{stroke-dashoffset:0}
.hcl-swe-label{
  position:absolute;left:50%;top:64%;transform:translateX(-50%);white-space:nowrap;
  font:500 clamp(11px,.95vw,15px)/1 "Space Grotesk",sans-serif;letter-spacing:-.01em;color:#141414;
  opacity:0;transition:opacity .5s .45s ease
}
.hcl-root[data-on="true"] .hcl-swe-label{opacity:1}

.hcl-tag{right:4.5vw;top:23vh;width:190px;height:130px;pointer-events:auto;cursor:pointer;
  background:none;border:0;padding:0;color:inherit}
.hcl-tag-swoosh{position:absolute;left:0;top:0;width:190px;height:130px;max-width:none;overflow:visible;
  clip-path:inset(0 100% 0 0);transition:clip-path .9s .3s cubic-bezier(.7,0,.2,1)}
.hcl-tag-swoosh path{fill:#141414}
.hcl-root[data-on="true"] .hcl-tag-swoosh{clip-path:inset(-20% -20% -20% -20%)}
.hcl-pill{
  position:absolute;left:0;top:0;width:184px;height:62px;border:3px solid #141414;border-radius:999px;
  background:#f7f4ee;display:flex;align-items:center;justify-content:center;
  font:500 30px/1 "Space Grotesk",sans-serif;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;
  opacity:0;transform:translateY(-40px) rotate(-14deg) scale(.8);
  transition:opacity .26s ease,transform .76s cubic-bezier(.2,1.5,.35,1),background-color .22s,color .22s
}
.hcl-root[data-on="true"] .hcl-pill{opacity:1;transform:none}
.hcl-tag:hover .hcl-pill,.hcl-tag:focus-visible .hcl-pill{background:#141414;color:#f7f4ee}
.hcl-tag:active .hcl-pill{transform:scale(.95)}
.hcl-pill span{display:inline-block;animation:hcl-roll .52s cubic-bezier(.2,1.4,.4,1) both}
.hcl-tag:focus-visible{outline:2px solid #141414;outline-offset:6px;border-radius:999px}

.hcl-about{
  right:4.5vw;bottom:18vh;width:min(360px,30vw);text-align:right;
  font:500 clamp(13px,1.15vw,17px)/1.4 "Space Grotesk",sans-serif;letter-spacing:-.01em
}
.hcl-about>div{white-space:pre}
.hcl-about i{font-style:normal;font-weight:400;opacity:.55}
.hcl-cite{
  font:400 clamp(9px,.72vw,11px)/1.4 "Space Mono",ui-monospace,Menlo,Consolas,monospace;
  letter-spacing:.05em;margin-top:.7em;opacity:0;transition:opacity .7s 2.4s ease
}
.hcl-root[data-on="true"] .hcl-cite{opacity:.5}
.hcl-root[data-on="true"] .hcl-caret{opacity:1;animation:hcl-blink 1s steps(1) infinite}
.hcl-caret{display:inline-block;width:2px;height:.95em;margin-left:3px;vertical-align:-.12em;
  background:#141414;opacity:0;transition:opacity .2s}

.hcl-sig{
  left:50%;bottom:6.5vh;transform:translateX(-50%);width:520px;text-align:center;white-space:nowrap;
  font:400 11px/1 "Space Grotesk",sans-serif;letter-spacing:.9em;padding-left:.9em
}
.hcl-sig span{display:inline-block;min-width:.6em;text-align:center;opacity:0;transition:opacity .2s}
.hcl-root[data-on="true"] .hcl-sig span{opacity:1}
.hcl-sig span[data-locked="false"]{opacity:.45}

.hcl-hud{
  position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;
  gap:16px;padding:0 4vw 2.2vh;font:400 10px/1.4 "Space Mono",ui-monospace,Menlo,Consolas,monospace;
  letter-spacing:.14em;text-transform:uppercase
}
.hcl-hud>span{opacity:.55;white-space:nowrap;flex:1 1 0}
.hcl-hud>span:nth-child(2){text-align:right}
.hcl-hud>span:nth-child(3){text-align:right}

@keyframes hcl-roll{from{opacity:0;transform:translateY(.8em)}}
@keyframes hcl-blink{50%{opacity:0}}

@media (max-width:768px){
  .hcl-greet{top:12vh;left:6vw}
  .hcl-ver{top:9.5vh;right:6vw}
  .hcl-pixel,.hcl-sup,.hcl-dial{display:none}
  .hcl-tag{top:20vh;right:6vw;width:150px;height:104px;transform:scale(.86);transform-origin:100% 0}
  .hcl-tag-swoosh{width:150px;height:104px}
  .hcl-pill{width:150px;height:52px;font-size:24px;border-width:2.5px}
  .hcl-about{right:6vw;bottom:17vh;width:72vw;font-size:12px}
  .hcl-sig{display:none}
  .hcl-hud{padding:0 6vw 2vh;font-size:9px;letter-spacing:.1em}
  .hcl-hud-links{display:none}
  .hcl-hud>span:nth-child(2){text-align:right}
}
@media (prefers-reduced-motion:reduce){
  .hcl-par{translate:none;transition:none}
  .hcl-ch,.hcl-px,.hcl-clock,.hcl-pill,.hcl-caret,.hcl-pill span{animation:none!important;transform:none!important}
  .hcl-ch{opacity:1}
  .hcl-px{opacity:1}
  .hcl-script{opacity:1}
  .hcl-mono,.hcl-tag-swoosh{transition:none}
}
`

const SCRAMBLE_POOL = 'abcdefghijklmnopqrstuvwxyz*/#'

function Scramble({ text, on }: { text: string; on: boolean }) {
  const chars = Array.from(text)
  const [tick, setTick] = useState(-1)

  useEffect(() => {
    if (!on) {
      setTick(-1)
      return
    }
    let k = 0
    setTick(0)
    const id = window.setInterval(() => {
      k += 1
      setTick(k)
      if (k > chars.length + 8) window.clearInterval(id)
    }, 55)
    return () => window.clearInterval(id)
  }, [on, text, chars.length])

  return (
    <>
      {chars.map((c, i) => {
        const locked = tick - 8 >= i
        const shown = locked || tick < 0 ? c : SCRAMBLE_POOL[(i * 7 + tick * 13) % SCRAMBLE_POOL.length]
        return (
          <span key={i} data-locked={locked || tick < 0}>
            {shown}
          </span>
        )
      })}
    </>
  )
}

function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {Array.from(text).map((c, i) => (
        <span key={i} className="hcl-ch" style={{ transitionDelay: delay + i * 28 + 'ms' }}>
          {c === ' ' ? '\u00a0' : c}
        </span>
      ))}
    </>
  )
}

export function HeroCollage({ active = true }: { active?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tag, setTag] = useState(0)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!active) return
    const t = window.setTimeout(() => setOn(true), 120)
    return () => window.clearTimeout(t)
  }, [active])

  // Paralaxe de ponteiro. Escrita direta no DOM, sem re-render por frame.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let nx = 0
    let ny = 0
    let cx = 0
    let cy = 0
    let raf = 0
    const onMove = (e: PointerEvent) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1
      ny = (e.clientY / window.innerHeight) * 2 - 1
    }
    const loop = () => {
      cx += (nx - cx) * 0.06
      cy += (ny - cy) * 0.06
      el.style.setProperty('--hcl-px', cx.toFixed(4))
      el.style.setProperty('--hcl-py', cy.toFixed(4))
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const about = [
    'Nada em um círculo interno pode saber',
    'absolutamente nada sobre algo em um',
    'círculo externo',
  ]

  return (
    <div ref={rootRef} className="hcl-root" data-on={on} aria-hidden="true">
      <style>{CSS}</style>

      <div className="hcl-abs hcl-greet hcl-par" style={{ '--d': 6 } as CSSProperties}>
        <Typed text="desenvolvedor full stack" />
      </div>

      <div className="hcl-abs hcl-ver hcl-par" style={{ '--d': 10 } as CSSProperties}>
        <div className="hcl-ver-num">2026</div>
        <svg viewBox="0 0 148 90" aria-hidden="true">
          <path
            pathLength={1}
            d="M118 22 C96 4 34 6 18 30 C2 56 40 80 84 76 C126 72 146 50 132 28 C124 16 104 10 88 12"
          />
        </svg>
      </div>

      <div
        className="hcl-abs hcl-pixel hcl-par"
        style={
          {
            '--d': 14,
            width: `calc(${PIXEL_COLUMNS} * var(--hcl-cell))`,
            height: 'calc(7 * var(--hcl-cell))',
          } as CSSProperties
        }
      >
        {PIXELS.map((p, i) => (
          <span
            key={i}
            className="hcl-px"
            style={{
              left: `calc(${p.col} * var(--hcl-cell))`,
              top: `calc(${p.row} * var(--hcl-cell))`,
              transitionDelay: `${p.row * 22 + (p.col % PIXEL_TRACK) * 8}ms`,
            }}
          />
        ))}
      </div>

      <div className="hcl-abs hcl-sup hcl-par" style={{ '--d': 18 } as CSSProperties}>
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="19" pathLength={1} transform="rotate(-90 32 32)" />
        </svg>
      </div>

      <div className="hcl-abs hcl-dial hcl-par" style={{ '--d': 9 } as CSSProperties}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <text className="hcl-mono" x="120" y="145" textAnchor="middle">
            SWE
          </text>
        </svg>
        <div className="hcl-swe-label">Software Engineer</div>
      </div>

      <button
        type="button"
        tabIndex={-1}
        className="hcl-abs hcl-tag hcl-par"
        style={{ '--d': 22 } as CSSProperties}
        onClick={() => setTag((x) => (x + 1) % TAGS.length)}
      >
        <svg className="hcl-tag-swoosh" viewBox="0 0 210 150" aria-hidden="true">
          <path d="M48 14 H170 C192 14 210 31 210 52 C210 70 198 84 182 89 C160 97 142 104 128 118 C116 130 112 142 108 149 C104 132 112 110 128 96 C134 91 140 88 146 86 H48 C28 86 12 70 12 50 C12 30 28 14 48 14 Z" />
        </svg>
        <span className="hcl-pill">
          <span key={tag}>{TAGS[tag]}</span>
        </span>
      </button>

      <div className="hcl-abs hcl-about hcl-par" style={{ '--d': 8 } as CSSProperties}>
        {about.map((line, i) => {
          const lead = i === 0 ? 'sobre/ ' : ''
          const typedBefore = (i === 0 ? 'sobre/ '.length : 0) + about.slice(0, i).join('').length
          return (
            <div key={i}>
              {lead ? (
                <i>
                  <Typed text={lead} />
                </i>
              ) : null}
              <Typed text={line} delay={typedBefore * 28 + i * 140} />
              {i === about.length - 1 ? <span className="hcl-caret" /> : null}
            </div>
          )
        })}
        <div className="hcl-cite">(MARTIN, 2019, p. 204)</div>
      </div>

      <div className="hcl-abs hcl-sig hcl-par" style={{ '--d': 5 } as CSSProperties}>
        <Scramble text="exdrama23" on={on} />
      </div>

      <div className="hcl-hud">
        <span>portfólio — 2026</span>
        <span className="hcl-hud-links">github.com/exdrama23</span>
      </div>
    </div>
  )
}

export default HeroCollage


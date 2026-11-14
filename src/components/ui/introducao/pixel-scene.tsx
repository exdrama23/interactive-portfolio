// ---------------------------------------------------------------------------
// A ARTE da introdução. Tudo que é desenho mora aqui:
//   - AlecPortfolioHero   -> o que aparece dentro do monitor central
//   - PixelRoomBackgroundSvg -> quarto + mesa + 3 monitores
//   - PixelProgrammerChairSvg -> cadeira gamer + programador (frente)
//   - PixelMoonSvg / ExteriorBuildingMaskSvg
// Os SVGs usam viewBox 0 0 320 180 esticado (preserveAspectRatio="none").
// Se mudar a posição do monitor central, ajuste também camera.ts e o CSS
// (.pw-monitor-screen) para manter o mergulho da câmera alinhado.
// ---------------------------------------------------------------------------

import { pwRand } from "./camera"

/* ------------------------------------------------------------------
   1. PORTFOLIO HERO COMPONENT (exact match for the reference hero screen)
   ------------------------------------------------------------------ */

const PERSPECTIVE_DOTS = (() => {
  const dots: { cx: number; cy: number; r: number; op: number }[] = []
  const rows = 26
  const cols = 44
  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1)
    const y = 24.5 + Math.pow(v, 2.15) * 74.5
    const spread = 1 + Math.pow(v, 1.45) * 2.8
    const radius = 0.055 + Math.pow(v, 1.3) * 0.14
    const op = Math.min(0.75, 0.18 + v * 0.65)
    for (let c = -cols; c <= cols; c++) {
      const u = c / (cols * 0.48)
      const wave = Math.sin(u * Math.PI * 1.5) * (1 - v) * 1.4
      const x = 50 + u * 50 * spread
      if (x >= -2 && x <= 102 && y + wave >= 23.5 && y + wave <= 99.5) {
        dots.push({
          cx: Number(x.toFixed(2)),
          cy: Number((y + wave).toFixed(2)),
          r: Number(radius.toFixed(3)),
          op: Number(op.toFixed(2)),
        })
      }
    }
  }
  return dots
})()

export function AlecPortfolioHero() {
  return (
    <div className="pw-hero">
      <div className="pw-hero-inner">
        <svg className="pw-hero-dots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {PERSPECTIVE_DOTS.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#1f1f1f" opacity={d.op} />
          ))}
        </svg>

        <div className="pw-hero-top-role">desenvolvedor full stack</div>

        <svg className="pw-hero-year-badge" viewBox="0 0 120 75" aria-hidden="true">
          <path
            d="M14 38 C10 16, 48 8, 84 12 C112 15, 116 44, 98 58 C78 70, 26 68, 12 46 C8 36, 22 18, 56 14"
            fill="none"
            stroke="#161616"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <text
            x="60"
            y="47"
            textAnchor="middle"
            fontSize="30"
            fontWeight="700"
            fill="#141414"
            style={{ fontFamily: "var(--pw-hand)" }}
          >
            2026
          </text>
        </svg>

        <div className="pw-hero-alec-wrap">
          <span className="pw-hero-alec">ALEC</span>
          <span className="pw-hero-alec-o" />
        </div>

        <svg className="pw-hero-tag-bubble" viewBox="0 0 180 125" aria-hidden="true">
          <path
            d="M32 22 H148 A26 26 0 0 1 174 48 V54 A26 26 0 0 1 148 80 H138 C126 92, 118 106, 114 118 C113 98, 118 86, 124 80 H32 A26 26 0 0 1 6 54 V48 A26 26 0 0 1 32 22 Z"
            fill="#141414"
          />
          <rect x="4" y="10" width="164" height="58" rx="29" fill="#ffffff" stroke="#141414" strokeWidth="3" />
          <text
            x="86"
            y="46"
            textAnchor="middle"
            fontSize="22"
            fontWeight="600"
            fill="#141414"
            style={{ fontFamily: "var(--pw-sans)" }}
          >
            #fullstack
          </text>
        </svg>

        <h1 className="pw-hero-center-title">Bem-vindo ao meu mundo</h1>

        <div className="pw-hero-swe">
          <div className="pw-hero-swe-letters">SWE</div>
          <div className="pw-hero-swe-sub">Software Engineer</div>
        </div>

        <div className="pw-hero-quote">
          <span className="pw-muted">sobre/ </span>
          <span>
            Nada em um círculo interno pode saber absolutamente nada sobre algo em um círculo externo
          </span>
          <span className="pw-cursor-blink" />
          <span className="pw-cite">(MARTIN, 2019, p. 204)</span>
        </div>

        <div className="pw-hero-foot-left">PORTFÓLIO — 2026</div>
        <div className="pw-hero-foot-center">exdrama23</div>
        <div className="pw-hero-foot-right">GITHUB.COM/EXDRAMA23</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   2. HIGH-DETAIL 16-BIT PIXEL ART WORLD (Sky + Cozy Room + 3-Monitor Setup)
   ------------------------------------------------------------------ */

const STARS = (() => {
  const r = pwRand(202609)
  return Array.from({ length: 90 }, () => ({
    x: Number((r() * 98 + 1).toFixed(2)),
    y: Number((r() * 88 + 2).toFixed(2)),
    s: r() > 0.78 ? 0.55 : 0.32,
    c: r() > 0.82 ? "#93c5fd" : r() > 0.62 ? "#fde68a" : "#ffffff",
    dl: Number((r() * 2.4).toFixed(2)),
  }))
})()

const SKYLINE = (() => {
  const r = pwRand(7741)
  const buildings: { x: number; w: number; h: number; wins: { wx: number; wy: number; lit: boolean }[] }[] = []
  let x = 0
  while (x < 100) {
    const w = 5 + Math.floor(r() * 6)
    const h = 14 + Math.floor(r() * 24)
    const wins = []
    for (let wy = 4; wy < h - 4; wy += 3) {
      for (let wx = 1.2; wx < w - 1.5; wx += 1.8) {
        if (r() > 0.45) wins.push({ wx, wy, lit: r() > 0.25 })
      }
    }
    buildings.push({ x, w, h, wins })
    x += w - 0.5
  }
  return buildings
})()

export function PixelMoonSvg() {
  return (
    <svg viewBox="0 0 32 32" className="pw-pixel-svg" aria-hidden="true">
      <rect x="10" y="2" width="12" height="28" fill="#fef08a" opacity="0.12" />
      <rect x="2" y="10" width="28" height="12" fill="#fef08a" opacity="0.12" />
      <rect x="5" y="5" width="22" height="22" fill="#fef08a" opacity="0.16" />
      <rect x="11" y="4" width="10" height="24" fill="#fef9c3" />
      <rect x="8" y="6" width="16" height="20" fill="#fef9c3" />
      <rect x="6" y="8" width="20" height="16" fill="#fef9c3" />
      <rect x="4" y="11" width="24" height="10" fill="#fef9c3" />
      <rect x="18" y="6" width="6" height="2" fill="#fde047" />
      <rect x="22" y="8" width="4" height="4" fill="#fde047" />
      <rect x="24" y="12" width="3" height="8" fill="#fde047" />
      <rect x="21" y="20" width="5" height="4" fill="#fde047" />
      <rect x="15" y="24" width="7" height="3" fill="#fde047" />
      <rect x="10" y="9" width="4" height="3" fill="#facc15" />
      <rect x="11" y="10" width="2" height="2" fill="#eab308" />
      <rect x="17" y="14" width="5" height="4" fill="#facc15" />
      <rect x="18" y="15" width="3" height="2" fill="#eab308" />
      <rect x="9" y="18" width="3" height="3" fill="#facc15" />
    </svg>
  )
}

/**
 * 320x180 High-Detail 16-bit Pixel Art Room Background:
 * - Left side (x: 0..108): Cozy bedroom (framed posters, wooden bookshelves
 *   with colorful books, BMO robot lamp, split AC unit above window with venetian blinds,
 *   warm moonlight/sunset glow, cozy bed with layered blanket, rug, open cardboard box).
 * - Right side (x: 108..320): 3-Monitor Developer Battlestation
 *   (U-shaped desk with drawers, sleeping black cat, potted cactus, mechanical keyboard,
 *   Monster & Red Bull energy cans, speaker, architectural CAD on left monitor, city bars on right monitor).
 * - Center monitor inner screen is mapped to x:166.4..230.4 (52cqw..72cqw), y:50.4..86.4 (28cqh..48cqh).
 */
export function PixelRoomBackgroundSvg() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="none" className="pw-pixel-svg" aria-hidden="true">
      {/* ================= 1. WALLS & AMBIENT PIXEL TEXTURE ================= */}
      {/* Deep twilight indigo-violet wall */}
      <rect x="0" y="0" width="320" height="132" fill="#1b1936" />
      {/* Left accent wall warm plum tint */}
      <rect x="0" y="0" width="106" height="132" fill="#2d1b38" />
      <rect x="105" y="0" width="2" height="132" fill="#121024" />

      {/* Subtle pixel wall dithering & floating ambient dust pixels */}
      <g fill="#262347">
        <rect x="122" y="10" width="4" height="4" />
        <rect x="158" y="16" width="6" height="6" />
        <rect x="242" y="12" width="5" height="5" />
        <rect x="288" y="20" width="6" height="6" />
        <rect x="114" y="36" width="5" height="5" />
        <rect x="296" y="42" width="4" height="4" />
      </g>
      <g className="pw-float-pix">
        <rect x="148" y="22" width="1.5" height="1.5" fill="#f59e0b" />
        <rect x="196" y="14" width="1.5" height="1.5" fill="#38bdf8" />
        <rect x="234" y="24" width="2" height="2" fill="#f472b6" />
        <rect x="274" y="16" width="1.5" height="1.5" fill="#fde047" />
        <rect x="164" y="38" width="1.5" height="1.5" fill="#34d399" />
        <rect x="218" y="34" width="2" height="2" fill="#f59e0b" />
      </g>

      {/* Large recessed back molding behind the 3 monitors */}
      <rect x="142" y="22" width="112" height="72" fill="#15142b" stroke="#252347" strokeWidth="2" />
      <rect x="146" y="26" width="104" height="64" fill="#191833" />

      {/* ================= 2. WOODEN FLOOR, RUG & LIGHT CAST ================= */}
      {/* Baseboard */}
      <rect x="0" y="129" width="320" height="4" fill="#120e21" />
      <rect x="0" y="130" width="320" height="2" fill="#2a203d" />
      {/* Warm wooden plank floor */}
      <rect x="0" y="133" width="320" height="47" fill="#3b232e" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x="0" y={137 + i * 5} width="320" height="1" fill="#24141e" />
      ))}
      {/* Warm floor highlight under the desk & chair */}
      <polygon points="154,133 242,133 268,180 128,180" fill="#d97746" opacity="0.24" />
      <polygon points="166,133 230,133 248,180 148,180" fill="#fbbf24" opacity="0.15" />

      {/* Cozy crimson-terracotta bedroom rug */}
      <rect x="26" y="146" width="58" height="24" fill="#88293f" />
      <rect x="28" y="148" width="54" height="20" fill="#a8384e" />
      <rect x="26" y="146" width="58" height="2" fill="#591828" />
      <rect x="26" y="168" width="58" height="2" fill="#591828" />

      {/* Open pixel cardboard box & game controller on floor */}
      <rect x="18" y="158" width="18" height="14" fill="#7c4d3a" stroke="#120d1a" strokeWidth="1.2" />
      <rect x="19" y="159" width="16" height="4" fill="#331c19" />
      <rect x="15" y="156" width="5" height="3" fill="#9c654f" />
      <rect x="34" y="156" width="5" height="3" fill="#9c654f" />
      {/* Little socks / gamepad next to rug */}
      <rect x="44" y="172" width="6" height="3" fill="#cbd5e1" />
      <rect x="52" y="171" width="4" height="4" fill="#94a3b8" />

      {/* ================= 3. SPLIT AC UNIT & BEDROOM WINDOW ================= */}
      {/* Split Air Conditioner above window */}
      <rect x="42" y="8" width="56" height="13" fill="#3b3354" stroke="#0d0a18" strokeWidth="1.5" />
      <rect x="44" y="10" width="52" height="6" fill="#524870" />
      <rect x="45" y="17" width="50" height="3" fill="#1e1930" />
      <rect x="91" y="13" width="3" height="1.5" fill="#4ade80" />

      {/* Bedroom Window (x: 44..96, y: 25..86) */}
      <rect x="44" y="25" width="52" height="62" fill="#0d132a" stroke="#0e0b16" strokeWidth="2" />
      {/* Starry sky & warm city glow visible through bedroom window */}
      <rect x="46" y="27" width="48" height="58" fill="#161f42" />
      <rect x="46" y="54" width="48" height="31" fill="#f59e0b" opacity="0.22" />
      <rect x="52" y="34" width="1.5" height="1.5" fill="#fff" />
      <rect x="64" y="31" width="1.5" height="1.5" fill="#fde047" />
      <rect x="84" y="36" width="1.5" height="1.5" fill="#93c5fd" />
      <rect x="56" y="44" width="1.2" height="1.2" fill="#fff" />
      {/* Distant silhouette in window */}
      <rect x="47" y="68" width="12" height="17" fill="#0f172a" />
      <rect x="59" y="62" width="14" height="23" fill="#1e1b4b" />
      <rect x="73" y="66" width="20" height="19" fill="#0f172a" />

      {/* Venetian Blinds (Top half of window) */}
      <rect x="45" y="26" width="50" height="22" fill="#1c162e" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="46" y={28 + i * 3.4} width="48" height="1.6" fill="#352a4f" />
      ))}
      {/* Window center mullion & sill */}
      <rect x="69" y="26" width="2" height="60" fill="#1c162e" />
      <rect x="42" y="86" width="56" height="4" fill="#4a354f" stroke="#0e0b16" strokeWidth="1.2" />
      {/* Coffee mug on window sill */}
      <rect x="88" y="81" width="5" height="5" fill="#f97316" stroke="#0e0b16" strokeWidth="1" />
      <rect x="89" y="82" width="3" height="1.5" fill="#fde047" />

      {/* Warm diagonal light beam from window onto bed & floor */}
      <polygon points="46,48 94,48 76,144 10,144" fill="#fde68a" opacity="0.08" />

      {/* ================= 4. WALL POSTERS & BOOKSHELVES ================= */}
      {/* Upper wooden shelf with books & bottles */}
      <rect x="12" y="42" width="28" height="3" fill="#6b3e2e" stroke="#0e0b16" strokeWidth="1" />
      <rect x="14" y="45" width="3" height="3" fill="#47281e" />
      <rect x="35" y="45" width="3" height="3" fill="#47281e" />
      {/* Books on upper shelf */}
      <rect x="26" y="32" width="3" height="10" fill="#ef4444" stroke="#0e0b16" strokeWidth="0.8" />
      <rect x="29" y="33" width="3" height="9" fill="#f59e0b" stroke="#0e0b16" strokeWidth="0.8" />
      <rect x="32" y="31" width="4" height="11" fill="#3b82f6" stroke="#0e0b16" strokeWidth="0.8" />
      <rect x="15" y="34" width="3" height="8" fill="#a855f7" />
      <rect x="19" y="35" width="3" height="7" fill="#22c55e" />

      {/* Lower wooden shelf above bed */}
      <rect x="12" y="68" width="28" height="3" fill="#6b3e2e" stroke="#0e0b16" strokeWidth="1" />
      {/* Cute BMO-style boxy robot lamp & books on lower shelf */}
      <rect x="14" y="56" width="9" height="12" fill="#cbd5e1" stroke="#0e0b16" strokeWidth="1" />
      <rect x="16" y="58" width="5" height="5" fill="#0f172a" />
      <rect x="25" y="58" width="3" height="10" fill="#ec4899" stroke="#0e0b16" strokeWidth="0.8" />
      <rect x="28" y="59" width="3" height="9" fill="#eab308" stroke="#0e0b16" strokeWidth="0.8" />
      <rect x="31" y="57" width="4" height="11" fill="#14b8a6" stroke="#0e0b16" strokeWidth="0.8" />

      {/* Framed Pixel Posters on Left Wall */}
      <rect x="2" y="52" width="8" height="14" fill="#0f172a" stroke="#0e0b16" strokeWidth="1" />
      <rect x="3" y="54" width="6" height="8" fill="#38bdf8" />
      <rect x="2" y="72" width="8" height="16" fill="#0f172a" stroke="#0e0b16" strokeWidth="1" />
      <rect x="3" y="74" width="6" height="10" fill="#f43f5e" />

      {/* ================= 5. COZY BED NEXT TO WINDOW ================= */}
      {/* Bed Frame & Headboard */}
      <rect x="8" y="92" width="6" height="42" fill="#4a2825" stroke="#0e0b16" strokeWidth="1.4" />
      <rect x="12" y="108" width="76" height="22" fill="#281e3d" stroke="#0e0b16" strokeWidth="1.4" />
      {/* Pillow */}
      <rect x="15" y="101" width="18" height="9" rx="2" fill="#cbd5e1" stroke="#0e0b16" strokeWidth="1.2" />
      <rect x="17" y="102" width="14" height="6" fill="#f8fafc" />
      {/* Layered Duvet / Blanket with Fold */}
      <rect x="31" y="104" width="10" height="20" fill="#94a3b8" stroke="#0e0b16" strokeWidth="1" />
      <rect x="39" y="105" width="48" height="20" fill="#3b2d54" stroke="#0e0b16" strokeWidth="1.2" />
      <rect x="41" y="107" width="44" height="10" fill="#4c3b6e" />
      {/* Wooden bed base */}
      <rect x="10" y="124" width="80" height="8" fill="#5c342c" stroke="#0e0b16" strokeWidth="1.4" />
      <rect x="12" y="125" width="76" height="2" fill="#7c4a3e" />

      {/* ================= 6. U-SHAPED DEVELOPER DESK & DRAWERS ================= */}
      {/* Left Cabinet Under Desk */}
      <rect x="102" y="114" width="34" height="44" fill="#1e203b" stroke="#0b0914" strokeWidth="1.6" />
      <rect x="105" y="118" width="28" height="36" fill="#252847" />
      <rect x="116" y="148" width="2" height="2" fill="#d97746" />

      {/* Right 3-Drawer Cabinet Under Desk */}
      <rect x="260" y="114" width="38" height="44" fill="#1e203b" stroke="#0b0914" strokeWidth="1.6" />
      <rect x="263" y="118" width="32" height="10" fill="#252847" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="263" y="130" width="32" height="10" fill="#252847" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="263" y="142" width="32" height="12" fill="#252847" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="266" y="122" width="3" height="2" fill="#d97746" />
      <rect x="275" y="122" width="8" height="2" fill="#0b0914" />
      <rect x="275" y="134" width="8" height="2" fill="#0b0914" />
      <rect x="275" y="146" width="8" height="2" fill="#0b0914" />

      {/* Main Desk Surface with Warm Rim-Lit Edge */}
      <rect x="98" y="106" width="204" height="5" fill="#7c4d3b" stroke="#0b0914" strokeWidth="1.6" />
      <rect x="100" y="107" width="200" height="2" fill="#e08e5a" />
      {/* Desk under-bevel & inner support legs */}
      <rect x="102" y="111" width="196" height="4" fill="#3d2729" />
      <rect x="144" y="115" width="4" height="36" fill="#191b33" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="248" y="115" width="4" height="36" fill="#191b33" stroke="#0b0914" strokeWidth="1.2" />

      {/* ================= 7. THREE MONITORS ================= */}

      {/* --- LEFT MONITOR (Architectural Floorplan & UI Inspector) --- */}
      {/* Monitor Stand */}
      <rect x="126" y="88" width="8" height="18" fill="#1e203b" stroke="#0b0914" strokeWidth="1.4" />
      <rect x="118" y="104" width="22" height="3" fill="#333659" stroke="#0b0914" strokeWidth="1.2" />
      {/* Monitor Outer Frame with Warm Rim Light */}
      <rect x="104" y="45" width="56" height="43" rx="1" fill="#2b2745" stroke="#0b0914" strokeWidth="1.8" />
      <rect x="105" y="46" width="54" height="1.5" fill="#e08e5a" />
      <rect x="105" y="86" width="54" height="1.5" fill="#d97746" />
      {/* Screen Inner Canvas */}
      <rect x="108" y="49" width="48" height="35" fill="#1c2238" />
      {/* Top IDE bar */}
      <rect x="108" y="49" width="48" height="3" fill="#2c3554" />
      <rect x="110" y="50" width="2" height="1" fill="#f87171" />
      <rect x="113" y="50" width="2" height="1" fill="#fbbf24" />
      <rect x="116" y="50" width="2" height="1" fill="#4ade80" />
      {/* CAD Blueprint Grid inside left monitor */}
      <rect x="113" y="55" width="24" height="24" fill="#242c47" stroke="#94a3b8" strokeWidth="0.9" />
      <rect x="117" y="58" width="8" height="7" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
      <rect x="125" y="58" width="9" height="11" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
      <rect x="117" y="65" width="12" height="10" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
      <rect x="121" y="62" width="6" height="6" fill="none" stroke="#38bdf8" strokeWidth="0.7" />
      {/* Right Inspector Sidebar */}
      <rect x="140" y="54" width="14" height="28" fill="#151a2d" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="142" y={56 + i * 3.5} width={i % 2 ? 8 : 10} height="1.4" fill={i === 1 || i === 4 ? "#f59e0b" : "#64748b"} />
      ))}

      {/* --- CENTER MONITOR BEZEL (Screen opening is exact x:166.4..230.4, y:50.4..86.4) --- */}
      {/* Monitor Stand */}
      <rect x="194" y="89" width="8" height="17" fill="#1e203b" stroke="#0b0914" strokeWidth="1.4" />
      {/* Outer Bezel with warm rim highlight */}
      <rect x="163" y="47" width="70" height="43" rx="1" fill="#2b2745" stroke="#0b0914" strokeWidth="1.8" />
      <rect x="164" y="48" width="68" height="1.5" fill="#e08e5a" />
      <rect x="164" y="88" width="68" height="1.5" fill="#d97746" />
      {/* Inner dark frame holding the DOM Hero Portal */}
      <rect x="165.5" y="49.5" width="65" height="37.8" fill="#0b0914" />

      {/* --- RIGHT MONITOR (Orange/Coral Skyline Bars & Code Timeline) --- */}
      {/* Monitor Stand */}
      <rect x="262" y="88" width="8" height="18" fill="#1e203b" stroke="#0b0914" strokeWidth="1.4" />
      <rect x="255" y="104" width="22" height="3" fill="#333659" stroke="#0b0914" strokeWidth="1.2" />
      {/* Outer Frame */}
      <rect x="236" y="45" width="56" height="43" rx="1" fill="#2b2745" stroke="#0b0914" strokeWidth="1.8" />
      <rect x="237" y="46" width="54" height="1.5" fill="#e08e5a" />
      <rect x="237" y="86" width="54" height="1.5" fill="#d97746" />
      {/* Screen Inner Canvas */}
      <rect x="240" y="49" width="48" height="35" fill="#1c2238" />
      <rect x="240" y="49" width="48" height="3" fill="#2c3554" />
      {/* Orange/Coral Pixel City/Histogram Bars */}
      <rect x="246" y="65" width="4" height="11" fill="#e08e5a" />
      <rect x="251" y="56" width="6" height="20" fill="#d97746" />
      <rect x="257" y="62" width="5" height="14" fill="#f59e0b" />
      <rect x="263" y="58" width="7" height="18" fill="#e08e5a" />
      {/* Little pixel windows inside the bars */}
      <rect x="253" y="58" width="1.2" height="1.2" fill="#1c2238" />
      <rect x="253" y="62" width="1.2" height="1.2" fill="#1c2238" />
      <rect x="265" y="61" width="1.2" height="1.2" fill="#1c2238" />
      <rect x="265" y="65" width="1.2" height="1.2" fill="#1c2238" />
      {/* Bottom timeline tracks */}
      <rect x="243" y="77" width="28" height="4" fill="#131726" />
      <rect x="244" y="78" width="18" height="1.5" fill="#e08e5a" />
      {/* Right side code panel */}
      <rect x="273" y="54" width="13" height="28" fill="#151a2d" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="275" y={56 + i * 4} width={i % 2 ? 7 : 9} height="1.5" fill={i === 0 ? "#38bdf8" : "#94a3b8"} />
      ))}

      {/* ================= 8. DESK PROPS: CAT, CACTUS, KEYBOARD, MONSTER & RED BULL ================= */}

      {/* Audio interface box behind cat */}
      <rect x="116" y="92" width="26" height="14" fill="#6b4435" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="118" y="95" width="22" height="9" fill="#262038" />
      <rect x="120" y="97" width="4" height="4" fill="#d97746" />

      {/* SLEEPING BLACK CAT (Curled up on left desk) */}
      <g className="pw-cat-breathe">
        {/* Curled body */}
        <rect x="103" y="95" width="24" height="11" rx="4" fill="#191926" stroke="#08070d" strokeWidth="1.5" />
        <rect x="105" y="96" width="18" height="4" fill="#29293d" />
        {/* Cat Head & Pointy Ears */}
        <polygon points="116,95 119,89 122,95" fill="#191926" stroke="#08070d" strokeWidth="1.2" />
        <polygon points="124,95 127,89 130,95" fill="#191926" stroke="#08070d" strokeWidth="1.2" />
        <rect x="116" y="93" width="14" height="11" rx="3" fill="#1e1e2e" stroke="#08070d" strokeWidth="1.4" />
        {/* Closed sleeping eyes (happy arcs) & little pink/dark nose */}
        <rect x="119" y="98" width="3" height="1" fill="#08070d" />
        <rect x="125" y="98" width="3" height="1" fill="#08070d" />
        <rect x="123" y="100" width="1.5" height="1" fill="#f472b6" opacity="0.7" />
        {/* Whiskers */}
        <rect x="114" y="99" width="3" height="0.7" fill="#475569" />
        <rect x="130" y="99" width="3" height="0.7" fill="#475569" />
        {/* Curled tail */}
        <rect x="101" y="102" width="10" height="4" rx="2" fill="#191926" stroke="#08070d" strokeWidth="1.2" />
      </g>

      {/* POTTED CACTUS (Next to cat) */}
      {/* Terracotta pot */}
      <polygon points="141,100 149,100 148,107 142,107" fill="#b4532a" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="140" y="98.5" width="10" height="2.5" fill="#d97746" stroke="#0b0914" strokeWidth="1" />
      {/* Green Cactus ribs */}
      <rect x="142.5" y="90" width="5" height="9" rx="2" fill="#22c55e" stroke="#0b0914" strokeWidth="1.2" />
      <rect x="144" y="91" width="1.5" height="7" fill="#86efac" />
      <rect x="140.5" y="93" width="2" height="4" fill="#16a34a" stroke="#0b0914" strokeWidth="0.9" />
      <rect x="147.5" y="92" width="2" height="4" fill="#16a34a" stroke="#0b0914" strokeWidth="0.9" />

      {/* MECHANICAL KEYBOARD (With individual pixel keycaps) */}
      <polygon points="153,100 174,100 176,106 151,106" fill="#2b2640" stroke="#0b0914" strokeWidth="1.2" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={154 + i * 3} y="101.2" width="2" height="1.4" fill="#d97746" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={155 + i * 3} y="103.2" width="2.2" height="1.4" fill="#e2e8f0" />
      ))}

      {/* MONSTER ENERGY CAN (Black can with iconic 3 green claws) */}
      <rect x="227" y="90" width="10" height="16" rx="1.5" fill="#11131c" stroke="#08070d" strokeWidth="1.3" />
      <rect x="228" y="89.5" width="8" height="1.5" fill="#cbd5e1" />
      {/* 3 neon green claw marks */}
      <rect x="229.5" y="92.5" width="1.2" height="7" fill="#22c55e" />
      <rect x="231.5" y="92" width="1.2" height="8" fill="#4ade80" />
      <rect x="233.5" y="92.5" width="1.2" height="7" fill="#22c55e" />
      <rect x="228.5" y="101.5" width="7" height="1.2" fill="#94a3b8" />
      <rect x="228" y="104.5" width="8" height="1" fill="#64748b" />

      {/* RED BULL CAN (Silver & Blue quadrants with red bull mark) */}
      <rect x="239" y="90" width="9.5" height="16" rx="1.5" fill="#e2e8f0" stroke="#08070d" strokeWidth="1.3" />
      <rect x="240" y="89.5" width="7.5" height="1.5" fill="#94a3b8" />
      {/* Blue & silver split */}
      <rect x="239.8" y="91.5" width="4.2" height="5" fill="#2563eb" />
      <rect x="244" y="96.5" width="4" height="5.5" fill="#2563eb" />
      <rect x="239.8" y="102" width="8" height="2.5" fill="#1d4ed8" />
      {/* Red bull emblem in center */}
      <rect x="241.5" y="95.5" width="4.5" height="2" fill="#ef4444" />
      <rect x="243" y="95.8" width="1.5" height="1.5" fill="#fde047" />

      {/* RIGHT SPEAKER & WIRED MOUSE */}
      <rect x="282" y="91" width="12" height="15" fill="#d97746" stroke="#0b0914" strokeWidth="1.4" />
      <rect x="285" y="93" width="7" height="11" fill="#262038" />
      <rect x="287" y="95" width="3" height="3" fill="#0b0914" />
      <rect x="287" y="100" width="3" height="2" fill="#d97746" />
      {/* Mouse & Cable */}
      <path d="M255 105 C262 103, 268 104, 276 105" stroke="#0b0914" strokeWidth="1.2" fill="none" />
      <rect x="251" y="103" width="5" height="3" rx="1" fill="#333659" stroke="#0b0914" strokeWidth="1" />
    </svg>
  )
}

/**
 * FOREGROUND LAYER: The Programmer & Racing Gaming Chair.
 * Rendered in a separate SVG layer above the center monitor so the top of the head
 * naturally overlaps the bottom bezel of the center monitor, and slides smoothly down
 * when the camera zooms into the Hero screen.
 */
export function PixelProgrammerChairSvg() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="none" className="pw-pixel-svg" aria-hidden="true">
      <g className="pw-breathe">
        {/* 1. PROGRAMMER HEAD & OVER-EAR HEADPHONES (Looking slightly left toward window) */}
        {/* Headphone headband */}
        <path
          d="M185 78 C185 65, 209 65, 209 78"
          fill="none"
          stroke="#0b0914"
          strokeWidth="4.5"
        />
        <path
          d="M186 78 C186 67, 208 67, 208 78"
          fill="none"
          stroke="#e08e5a"
          strokeWidth="1.4"
        />
        {/* Dark hair & head */}
        <rect x="187" y="68" width="20" height="18" rx="6" fill="#17152b" stroke="#0b0914" strokeWidth="1.8" />
        <rect x="189" y="70" width="16" height="12" rx="4" fill="#221f3d" />
        {/* Subtle left-side warm skin/glasses rim showing he is glancing toward the window */}
        <rect x="185.5" y="75" width="2.5" height="5" fill="#e08e5a" />
        <rect x="185" y="75.5" width="2" height="1.8" fill="#38bdf8" />
        {/* Left & Right Headphone Ear Cups */}
        <rect x="183.5" y="74" width="4" height="9" rx="1.2" fill="#2b2745" stroke="#0b0914" strokeWidth="1.4" />
        <rect x="184.5" y="75.5" width="1.5" height="6" fill="#d97746" />
        <rect x="206.5" y="74" width="4" height="9" rx="1.2" fill="#2b2745" stroke="#0b0914" strokeWidth="1.4" />
        <rect x="208" y="75.5" width="1.5" height="6" fill="#d97746" />

        {/* 2. PROGRAMMER SHOULDERS / HOODIE ARMS EXTENDING TO DESK */}
        <polygon
          points="174,96 162,115 171,118 182,102"
          fill="#1b1934"
          stroke="#0b0914"
          strokeWidth="1.8"
        />
        <polygon
          points="220,96 232,115 223,118 212,102"
          fill="#1b1934"
          stroke="#0b0914"
          strokeWidth="1.8"
        />
        {/* Rim light on hoodie sleeves */}
        <line x1="173" y1="97" x2="163" y2="114" stroke="#e08e5a" strokeWidth="1.4" />
        <line x1="221" y1="97" x2="231" y2="114" stroke="#e08e5a" strokeWidth="1.4" />

        {/* 3. RACING GAMING CHAIR BACKREST */}
        {/* Outer warm rim-light silhouette */}
        <polygon
          points="190,82 204,82 211,93 221,105 217,140 177,140 173,105 183,93"
          fill="#e08e5a"
          stroke="#0b0914"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Main dark chair body inset inside the rim light */}
        <polygon
          points="191,84 203,84 209,94 219,106 215,139 179,139 175,106 185,94"
          fill="#181730"
        />
        {/* Inner backrest panel */}
        <polygon
          points="192,87 202,87 208,108 208,136 186,136 186,108"
          fill="#1f1e3d"
          stroke="#0b0914"
          strokeWidth="1.4"
        />

        {/* Iconic Left & Right Racing Harness Cutout Holes */}
        <polygon
          points="183,98 192,98 190,105 181,104"
          fill="#2b2745"
          stroke="#0b0914"
          strokeWidth="1.5"
        />
        <line x1="182" y1="103.5" x2="190" y2="104.5" stroke="#e08e5a" strokeWidth="1.3" />

        <polygon
          points="202,98 211,98 213,104 204,105"
          fill="#2b2745"
          stroke="#0b0914"
          strokeWidth="1.5"
        />
        <line x1="204" y1="104.5" x2="212" y2="103.5" stroke="#e08e5a" strokeWidth="1.3" />
      </g>

      {/* 4. CHAIR ARMRESTS, SEAT CUSHION & 5-STAR ROLLING BASE */}
      {/* Left & Right Padded Armrests with orange highlight */}
      <rect x="163" y="120" width="11" height="5" rx="1" fill="#d97746" stroke="#0b0914" strokeWidth="1.5" />
      <rect x="164" y="121" width="9" height="2" fill="#fbbf24" />
      <rect x="166" y="125" width="6" height="17" fill="#181730" stroke="#0b0914" strokeWidth="1.5" />

      <rect x="220" y="120" width="11" height="5" rx="1" fill="#d97746" stroke="#0b0914" strokeWidth="1.5" />
      <rect x="221" y="121" width="9" height="2" fill="#fbbf24" />
      <rect x="222" y="125" width="6" height="17" fill="#181730" stroke="#0b0914" strokeWidth="1.5" />

      {/* Seat Base & Mechanism */}
      <rect x="168" y="139" width="58" height="7" rx="2" fill="#141329" stroke="#0b0914" strokeWidth="1.8" />
      <rect x="176" y="146" width="42" height="5" fill="#0e0d1c" stroke="#0b0914" strokeWidth="1.4" />

      {/* Programmer's shoes/legs visible under the chair */}
      <rect x="180" y="151" width="8" height="11" fill="#252342" stroke="#0b0914" strokeWidth="1.4" />
      <rect x="179" y="160" width="10" height="5" rx="1" fill="#0b0914" />
      <rect x="206" y="151" width="8" height="11" fill="#252342" stroke="#0b0914" strokeWidth="1.4" />
      <rect x="205" y="160" width="10" height="5" rx="1" fill="#0b0914" />

      {/* Center Hydraulic Cylinder & 5-Star Wheel Base */}
      <rect x="193" y="151" width="8" height="19" fill="#1e203b" stroke="#0b0914" strokeWidth="1.6" />
      <polygon
        points="193,167 201,167 224,174 224,177 197,173 170,177 170,174"
        fill="#1e203b"
        stroke="#0b0914"
        strokeWidth="1.6"
      />
      {/* Caster Wheels */}
      <rect x="168" y="175" width="6" height="4" rx="1" fill="#0b0914" />
      <rect x="183" y="175" width="6" height="4" rx="1" fill="#0b0914" />
      <rect x="205" y="175" width="6" height="4" rx="1" fill="#0b0914" />
      <rect x="220" y="175" width="6" height="4" rx="1" fill="#0b0914" />
    </svg>
  )
}

export function ExteriorBuildingMaskSvg() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="none" className="pw-pixel-svg" aria-hidden="true">
      {/* Dark brick facade surrounding the window opening */}
      <path
        fillRule="evenodd"
        d="M0 0 H320 V180 H0 Z M24 14 H296 V164 H24 Z"
        fill="#080b18"
      />
      <rect x="0" y="5" width="320" height="2" fill="#11172e" />
      <rect x="0" y="10" width="320" height="2" fill="#11172e" />
      <rect x="0" y="169" width="320" height="2" fill="#11172e" />
      <rect x="0" y="175" width="320" height="2" fill="#11172e" />
      {/* Window Outer Frame & Sill */}
      <rect x="20" y="11" width="280" height="4" fill="#1e293b" />
      <rect x="16" y="162" width="288" height="6" fill="#334155" />
      <rect x="20" y="14" width="5" height="148" fill="#1e293b" />
      <rect x="295" y="14" width="5" height="148" fill="#1e293b" />
      {/* Subtle glass sheen */}
      <polygon points="28,18 82,18 28,96" fill="#93c5fd" opacity="0.06" />
    </svg>
  )
}

export { STARS, SKYLINE }

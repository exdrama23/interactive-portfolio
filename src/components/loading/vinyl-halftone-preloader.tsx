// ---------------------------------------------------------------------------
// Vinyl Halftone — tela de carregamento de troca de ROTA.
//
// Não é a introdução do site (essa é a "pixel world", em ui/introducao) e não
// tem relação com o conteúdo das páginas: é um portão independente que cobre a
// tela inteira. A montagem/uso fica em ./route-transition.tsx.
//
// O que ele é:
// - vinil WebGL + explosão de meio-tons travados no centro da tela;
// - rótulo central com o retrato (3 camadas de parallax) de cada vocalista;
// - HUD brutalista nos cantos com metadados e etapas;
// - nome da SEÇÃO DE DESTINO em letras garrafais no rodapé;
// - queima de tinta (burn-in) -> giro/carregamento -> dissolução dos pontos.
// ---------------------------------------------------------------------------

import * as React from "react"
import { LOADING_DEFAULTS, ROCK_TRACKS, type RockTrackId, type VinylPalette, type VinylPreset } from "./rock-tracks"
import {
  vhpAngleDelta,
  vhpBeat,
  vhpClamp01,
  vhpLayout,
  vhpNeedle,
  vhpPad,
  vhpRGB,
  vhpRpm,
  vhpSimulated,
  vhpStage,
} from "./vinyl-math"

export interface VinylHalftonePreloaderProps {
  /** Conteúdo revelado quando o portão sai. */
  children?: React.ReactNode
  /** Modo demonstração: repete para sempre. */
  loop?: boolean
  /** Progresso real, 0–100. Sem ele, simula ao longo de `durationMs`. */
  progress?: number
  /** Duração da carga simulada. */
  durationMs?: number
  /** "auto" levanta sozinho ao chegar em 100; "click" espera o clique. */
  enter?: "auto" | "click"
  /** Faixa/ vocalista ativo. */
  track?: RockTrackId
  /** Nome da seção exibido no final. */
  sectionName?: string
  /** Começa com a tinta queimando sobre a página atual. */
  burnIn?: boolean
  /** Chamado com a tela 100% coberta — hora de trocar a rota/DOM. */
  onMidTransition?: () => void
  /** Preset de cor. */
  preset?: VinylPreset
  /** Override de cores. */
  palette?: { paper?: string; ink?: string; glow?: string; edge?: string; spark?: string }
  /** Override do nome da banda. */
  title?: string
  /** Override do subtítulo (música — vocalista). */
  subtitle?: string
  /** Palavra exibida enquanto carrega (<100%). */
  loadingWord?: string
  /** Palavra exibida em 100% (padrão: `sectionName`). */
  readyWord?: string
  /** Texto girando ao redor do rótulo. */
  ringText?: string
  /** Etapas exibidas no HUD. */
  stages?: string[]
  /** BPM do pulso. */
  bpm?: number
  /** Fonte de display. */
  displayFamily?: string
  /** Fonte de UI. */
  textFamily?: string
  /** URL do Google Fonts. `null` desliga. */
  fontHref?: string | null
  /** Altura do container (comprimento definido). */
  height?: string
  /** Fired once quando a transição termina. */
  onComplete?: () => void
  /** Classes extras. */
  className?: string
}

const PRESETS: Record<string, VinylPalette> = {
  rhythm: { paper: "#f2687c", ink: "#1d070b", glow: "#fff6c4", edge: "#d63250", spark: "#ffffff" },
  cobalt: { paper: "#5370ff", ink: "#05081f", glow: "#f2f5ff", edge: "#1f2fc4", spark: "#dfe6ff" },
  citrus: { paper: "#ffb21a", ink: "#1c0e00", glow: "#fffbea", edge: "#e2531a", spark: "#fff8dc" },
  newsprint: { paper: "#ebe5d8", ink: "#151311", glow: "#ffffff", edge: "#e3402a", spark: "#fff7e6" },
  sharks: ROCK_TRACKS.sharks.palette,
  vermilion: ROCK_TRACKS.vermilion.palette,
  what_ive_done: ROCK_TRACKS.what_ive_done.palette,
  eu_protesto: ROCK_TRACKS.eu_protesto.palette,
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;600;800&display=swap"
const DISPLAY_STACK =
  'Anton, "Bebas Neue", Oswald, Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'
const TEXT_STACK = 'Archivo, "Helvetica Neue", Arial, "Segoe UI", sans-serif'

const BURNIN_MS = 480
const INTRO_MS = 850
const HOLD_MS = 650
const FLOOD_MS = 540
const REVEAL_MS = 820
const LOOP_REST_MS = 2200

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"

const FRAG = [
  "precision highp float;",
  "uniform vec2 uRes;uniform float uTime,uCell,uU,uIntro,uBurn,uE1,uE2,uBeat,uEnergy,uNeedle,uScratch,uHole,uPx;",
  "uniform vec2 uSpin,uRec;uniform vec3 uBurst,uPaper,uInk,uSpark;",
  "float sat(float x){return clamp(x,0.,1.);}",
  "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
  "float field(vec2 p){",
  " float u=uU;vec2 d=p-uSpin;float r=length(d);float a=atan(d.y,d.x);float soft=.01*u;",
  " float disc=smoothstep(uRec.x-soft,uRec.x+soft,r)*(1.-smoothstep(uRec.y-soft*1.5,uRec.y+soft*1.5,r));",
  " float zone=sat((r-uRec.x)/(uRec.y-uRec.x));",
  " float groove=.82+.18*sin(r/uCell*2.1)*sin(zone*35.);",
  " float sheen=pow(abs(cos(a-.75)),10.)*sin(zone*3.14159);",
  " float vinyl=disc*groove*(1.-.58*sheen);",
  " float nd=(r-uNeedle)/(.005*u+uPx);vinyl*=1.-.92*exp(-nd*nd)*disc;",
  " vec2 q=p-uBurst.xy;float rr=length(q);float th=atan(q.y,q.x);float t=uTime;",
  " float s1=pow(.5+.5*sin(th*11.+t*.45),3.);float s2=pow(.5+.5*sin(th*18.-t*.65+1.1),5.);float s3=.5+.5*sin(th*39.+t*1.9);",
  " float R=uBurst.z*(1.+uEnergy*(.14*s1+.18*s2+.04*s3)+.08*uBeat*uEnergy+.12*uScratch*s3);",
  " float halo=smoothstep(uRec.y-soft*2.,uRec.y+soft,rr)*(1.-smoothstep(R-.04*u,R+.04*u,rr));",
  " float rays=pow(.5+.5*sin(th*22.+2.*sin(th*4.+t*.3)),24.)*(1.-smoothstep(R,R*1.38,rr))*smoothstep(uRec.y*.95,R,rr);",
  " float gap=uRec.y*.06;",
  " float clearRing=smoothstep(uRec.y+gap-soft*1.2,uRec.y+gap+soft*1.8,rr);",
  " float burst=max(halo*.88,rays*.85*uEnergy)*clearRing;",
  " vec2 nc=p/uRes-.5;nc.x*=uRes.x/uRes.y;",
  " float vig=.22*smoothstep(.38,.95,length(nc))*smoothstep(uRec.x,uRec.x+soft*4.,r);",
  " float f=max(vinyl,max(burst,vig));",
  " float ir=mix(-.3*u,length(uRes)*1.15,uIntro);f*=1.-smoothstep(ir-.35*u,ir,r);",
  " float fr=mix(-.3*u,length(uRes)*1.25,uE1);f=max(f,1.-smoothstep(fr-.3*u,fr,rr));",
  " return sat(f);",
  "}",
  "float cover(vec2 p){",
  " vec2 g=mat2(.70710678,-.70710678,.70710678,.70710678)*p;",
  " vec2 cc=(floor(g/uCell)+.5)*uCell;",
  " vec2 c=mat2(.70710678,.70710678,-.70710678,.70710678)*cc;",
  " float f;",
  " if(uBurn>0.){float br=mix(-.35*uU,length(uRes)*1.25,uBurn);f=1.-smoothstep(br-.4*uU,br,length(c-uRes*.5));}",
  " else if(uE2>0.){float rv=mix(-.45*uU,length(uRes)*1.2,uE2);f=smoothstep(rv-.45*uU,rv,length(c-uBurst.xy));}",
  " else f=field(c);",
  " float rad=sqrt(f)*uCell*.8;float dist=length(g-cc);",
  " return max(1.-smoothstep(rad-uPx*.9,rad+uPx*.9,dist),step(.985,f));",
  "}",
  "void main(){",
  " vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
  " vec2 o=vec2(1.,.6)*uPx*(1.1+5.*uScratch);",
  " float cr=cover(p+o);float cg=cover(p);float cb=cover(p-o);",
  " if(uBurn>0.){gl_FragColor=vec4(uInk*cg,cg);return;}",
  " if(uE2>0.){gl_FragColor=vec4(uInk*cg,cg);return;}",
  " vec3 col=vec3(mix(uPaper.r,uInk.r,cr),mix(uPaper.g,uInk.g,cg),mix(uPaper.b,uInk.b,cb));",
  " float sc=uU*.085;vec2 sp=p/sc;sp.y+=uTime*.12;vec2 id=floor(sp);vec2 fr=fract(sp);",
  " float h=hash(id);vec2 pos=vec2(hash(id+3.1),hash(id+7.7))*.8+.1;",
  " float tw=pow(.5+.5*sin(uTime*(1.4+h*3.)+h*40.),6.)*step(.6,h);",
  " float sz=(.9+1.4*h)*uPx/sc;",
  " float s=step(abs(fr.x-pos.x),sz)*step(abs(fr.y-pos.y),sz)*tw*cg*(1.-uE1);",
  " col=mix(col,uSpark,s);",
  " col+=(hash(p+fract(uTime*7.)*91.)-.5)*.04;",
  " gl_FragColor=vec4(col,1.);",
  "}",
].join("\n")

const VHP_CSS = `
.vhp-root { position: relative; width: 100%; overflow: hidden; isolation: isolate; }
.vhp-gate {
  position: absolute; inset: 0; z-index: 50; overflow: hidden; background: var(--vhp-paper); color: var(--vhp-ink);
  -webkit-font-smoothing: antialiased; touch-action: none; user-select: none; -webkit-user-select: none;
}
.vhp-gate[data-gl="true"][data-phase="burnin"],
.vhp-gate[data-gl="true"][data-phase="exit"] { background: transparent; }
.vhp-gate[data-fade="true"] { opacity: 0; transition: opacity 450ms ease; }
.vhp-gate[data-scratch="true"] { cursor: grabbing; }
.vhp-canvas { position: absolute; left: 0; top: 0; display: block; max-width: none; pointer-events: none; }
.vhp-dots {
  position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(circle, var(--vhp-ink) 0 46%, transparent 49%);
  background-size: var(--vhp-cell) var(--vhp-cell);
}

.vhp-ring {
  position: absolute; z-index: 3; pointer-events: none; overflow: visible; max-width: none;
  animation: vhp-fade 550ms 80ms both;
  transition: opacity 400ms ease;
}
.vhp-ring text {
  font-family: var(--vhp-text); font-weight: 800; letter-spacing: .28em;
  text-transform: uppercase; fill: var(--vhp-ink);
}

.vhp-center-portrait {
  position: absolute; z-index: 2; pointer-events: none;
  border-radius: 50%; overflow: hidden;
  transform: translate(-50%, -50%) scale(calc(1 + var(--vhp-beat, 0) * 0.035));
  background: radial-gradient(circle at 50% 42%, var(--vhp-paper) 0%, color-mix(in srgb, var(--vhp-paper) 75%, var(--vhp-ink)) 100%);
  box-shadow: inset 0 0 0 3px var(--vhp-ink), inset 0 0 24px rgba(0,0,0,0.35);
  transition: opacity 400ms ease, transform 450ms cubic-bezier(.2,.8,.2,1);
}
.vhp-par-layer {
  position: absolute; inset: -6%;
  transform: translate3d(
    calc(var(--vhp-px, 0px) * var(--dp, 1)),
    calc(var(--vhp-py, 0px) * var(--dp, 1)),
    0
  ) scale(calc(1 + var(--vhp-beat, 0) * var(--bp, 0.03)));
  will-change: transform;
}
.vhp-spindle-hole {
  position: absolute; left: 50%; top: 50%;
  width: 7%; height: 7%; border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--vhp-ink);
  border: 2px solid var(--vhp-glow);
  box-shadow: 0 0 10px rgba(0,0,0,0.65);
  z-index: 6;
}

.vhp-hud-top {
  position: absolute; top: clamp(16px, 3vh, 32px); left: clamp(18px, 3.5vw, 44px); right: clamp(18px, 3.5vw, 44px);
  z-index: 4; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px;
  pointer-events: none; font-family: var(--vhp-text);
  transition: opacity 350ms ease, transform 450ms ease;
}
.vhp-brand-pill {
  display: inline-flex; flex-direction: column; gap: 3px;
  background: var(--vhp-ink); color: var(--vhp-paper);
  padding: 10px 16px; border-left: 4px solid var(--vhp-glow);
  box-shadow: 4px 4px 0 var(--vhp-edge);
}
.vhp-brand-band { font-size: clamp(12px, 1.5vmin, 16px); font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--vhp-glow); }
.vhp-brand-song { font-size: clamp(10px, 1.2vmin, 13px); font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9; }

.vhp-stages-row {
  display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0; padding: 0;
}
.vhp-stage-pill {
  font-family: var(--vhp-text); font-size: clamp(9px, 1.1vmin, 11px); font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 7px 12px; border: 1.5px solid var(--vhp-ink);
  background: color-mix(in srgb, var(--vhp-paper) 85%, transparent);
  color: var(--vhp-ink); opacity: 0.5;
  transition: all 280ms ease;
}
.vhp-stage-pill[data-state="done"] {
  opacity: 0.85; background: var(--vhp-ink); color: var(--vhp-paper);
}
.vhp-stage-pill[data-state="on"] {
  opacity: 1; background: var(--vhp-ink); color: var(--vhp-glow);
  border-color: var(--vhp-glow);
  box-shadow: 3px 3px 0 var(--vhp-edge);
  transform: translateY(-2px) scale(calc(1 + var(--vhp-beat, 0) * 0.04));
}

.vhp-bottom-finale {
  position: absolute; left: 50%; bottom: clamp(18px, 3.8vh, 42px);
  transform: translateX(-50%);
  z-index: 4; width: min(92vw, 880px); text-align: center;
  pointer-events: none;
  transition: opacity 380ms ease, transform 480ms cubic-bezier(.7,0,.3,1);
}
.vhp-finale-kicker {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--vhp-text); font-size: clamp(10px, 1.3vmin, 13px); font-weight: 800;
  letter-spacing: 0.24em; text-transform: uppercase;
  background: var(--vhp-ink); color: var(--vhp-paper);
  padding: 5px 14px; margin-bottom: 6px;
}
.vhp-finale-pct {
  color: var(--vhp-glow); font-variant-numeric: tabular-nums;
}
.vhp-finale-title {
  all: unset; display: block; margin: 0 auto; pointer-events: auto;
  font-family: var(--vhp-display); font-weight: 400;
  font-size: clamp(42px, 9.2vmin, 108px); line-height: 0.88;
  letter-spacing: 0.02em; text-transform: uppercase;
  color: var(--vhp-ink);
  transform: skewX(-7deg) rotate(-2deg) scale(calc(1 + var(--vhp-beat, 0) * 0.035));
  text-shadow:
    0.025em 0.025em 0 var(--vhp-paper),
    0.05em 0.05em 0 var(--vhp-edge);
  transition: color 300ms ease, text-shadow 300ms ease, transform 300ms ease;
}
.vhp-finale-title[data-ready="true"] {
  color: var(--vhp-glow);
  text-shadow:
    -0.015em -0.015em 0 var(--vhp-ink),
    0.015em -0.015em 0 var(--vhp-ink),
    -0.015em 0.015em 0 var(--vhp-ink),
    0.03em 0.03em 0 var(--vhp-edge),
    0.06em 0.06em 0 var(--vhp-ink),
    0 0 0.28em var(--vhp-halo);
  animation: vhp-pop 520ms cubic-bezier(.2,1.6,.4,1) both;
}

.vhp-gate[data-phase="burnin"] .vhp-center-portrait,
.vhp-gate[data-phase="burnin"] .vhp-ring,
.vhp-gate[data-phase="burnin"] .vhp-hud-top,
.vhp-gate[data-phase="burnin"] .vhp-bottom-finale {
  opacity: 0; pointer-events: none;
}
.vhp-gate[data-phase="exit"] .vhp-center-portrait {
  opacity: 0; transform: translate(-50%, -50%) scale(0.78);
}
.vhp-gate[data-phase="exit"] .vhp-ring,
.vhp-gate[data-phase="exit"] .vhp-hud-top,
.vhp-gate[data-phase="exit"] .vhp-bottom-finale {
  opacity: 0; transform: translateY(16px);
}
.vhp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* Foto real do cantor, tratada como serigrafia duotone */
.vhp-singer-photo-wrap {
  position: absolute; inset: 4%;
  border-radius: 50%; overflow: hidden;
  background-color: var(--vhp-paper);
  box-shadow: inset 0 0 18px var(--vhp-ink);
}
.vhp-singer-photo {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center 22%;
  /* Serigrafia high-key: clareia a foto e deixa o papel do rótulo tingir via multiply */
  filter: grayscale(100%) contrast(112%) brightness(1.5);
  mix-blend-mode: multiply;
  transform: scale(1.08);
}
.vhp-singer-photo-glow {
  position: absolute; inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, transparent 45%, var(--vhp-ink) 98%);
  pointer-events: none;
}

/* Crédito da foto (CC BY / CC BY-SA exigem atribuição) */
.vhp-photo-credit {
  position: absolute; right: clamp(14px, 2.6vw, 34px); bottom: clamp(10px, 2vh, 22px);
  z-index: 5; font-family: var(--vhp-text);
  font-size: clamp(8px, 0.95vmin, 10px); font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  background: color-mix(in srgb, var(--vhp-ink) 82%, transparent);
  color: var(--vhp-paper);
  padding: 4px 8px; border-left: 2px solid var(--vhp-glow);
  text-decoration: none; pointer-events: auto;
  opacity: 0.8; transition: opacity 200ms ease;
}
.vhp-photo-credit:hover { opacity: 1; }
.vhp-gate[data-phase="burnin"] .vhp-photo-credit,
.vhp-gate[data-phase="exit"] .vhp-photo-credit { opacity: 0; pointer-events: none; }

@keyframes vhp-fade { from { opacity: 0; } }
@keyframes vhp-pop { from { opacity: 0; transform: skewX(-7deg) rotate(-5deg) scale(0.72); } }
@media (max-width: 640px) {
  .vhp-stages-row { display: none; }
}
`

/* ------------------------------------------------------------------
   RETRATOS DOS VOCALISTAS (3 camadas de parallax: --dp)
   ------------------------------------------------------------------ */

function SingerPhotoLayer({
  src,
  alt,
  fallback,
  onFail,
}: {
  src?: string
  alt: string
  fallback: React.ReactNode
  onFail?: () => void
}) {
  const [err, setErr] = React.useState(false)

  if (!src || err) return <>{fallback}</>

  return (
    <div className="vhp-par-layer" style={{ ["--dp" as string]: 1.15, ["--bp" as string]: 0.08 } as React.CSSProperties}>
      <div className="vhp-singer-photo-wrap">
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          onError={() => {
            setErr(true)
            onFail?.()
          }}
          className="vhp-singer-photo"
        />
        <div className="vhp-singer-photo-glow" />
      </div>
    </div>
  )
}

function SingerCenterEmblem({
  track,
  colors,
  photo,
  singer,
  onPhotoFail,
  photoFailed,
}: {
  track: RockTrackId
  colors: VinylPalette
  photo?: string
  singer: string
  onPhotoFail?: () => void
  /** A foto tentou carregar e falhou: o SVG volta e a camada 3 também. */
  photoFailed?: boolean
}) {
  // Com foto real no centro, os enfeites da camada 3 (mic, raio, borboletas,
  // bolinhas) caem por cima do rosto e viram ruído. Só aparecem no SVG.
  const showOverlay = !photo || photoFailed

  if (track === "eu_protesto") {
    // CHARLIE BROWN JR. — CHORÃO
    return (
      <>
        {/* Camada 1: raios urbanos + shape de skate atravessado */}
        <div className="vhp-par-layer" style={{ ["--dp" as string]: -1.0, ["--bp" as string]: 0.04 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r="88" fill="none" stroke={colors.ink} strokeWidth="3" strokeDasharray="12 8" opacity="0.35" />
            <g transform="rotate(-28 100 105)">
              <rect x="24" y="84" width="152" height="34" rx="17" fill={colors.edge} stroke={colors.ink} strokeWidth="4" />
              <circle cx="56" cy="122" r="7" fill={colors.glow} stroke={colors.ink} strokeWidth="3" />
              <circle cx="144" cy="122" r="7" fill={colors.glow} stroke={colors.ink} strokeWidth="3" />
            </g>
          </svg>
        </div>

        <SingerPhotoLayer
          src={photo}
          alt={singer}
          onFail={onPhotoFail}
          fallback={
            <div className="vhp-par-layer" style={{ ["--dp" as string]: 1.1, ["--bp" as string]: 0.07 } as React.CSSProperties}>
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <path d="M 38 195 C 42 148, 70 138, 100 138 C 130 138, 158 148, 162 195 Z" fill={colors.ink} />
                <path d="M 70 72 C 70 50, 130 50, 130 72 L 128 118 C 128 136, 114 146, 100 146 C 86 146, 72 136, 72 118 Z" fill={colors.paper} stroke={colors.ink} strokeWidth="4.5" />
                <path d="M 66 74 C 66 42, 134 42, 134 74 Z" fill={colors.ink} />
                <path d="M 124 62 L 166 56 L 164 70 L 124 74 Z" fill={colors.edge} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
                <path d="M 88 68 C 92 60, 108 60, 112 68" fill="none" stroke={colors.paper} strokeWidth="3" />
                <text x="100" y="57" textAnchor="middle" fontSize="13" fontWeight="900" fill={colors.glow} style={{ fontFamily: "var(--vhp-display)" }}>
                  013
                </text>
                <path d="M 68 78 L 132 78 L 128 94 L 104 94 L 100 86 L 96 94 L 72 94 Z" fill={colors.ink} />
                <polygon points="75,81 93,81 88,90 74,90" fill={colors.glow} opacity="0.85" />
                <polygon points="107,81 125,81 122,90 105,90" fill={colors.glow} opacity="0.85" />
                <path d="M 88 116 L 112 116 L 115 126 L 106 126 L 104 142 L 96 142 L 94 126 L 85 126 Z" fill={colors.ink} />
              </svg>
            </div>
          }
        />

        {/* Camada 3: microfone e raio punk (só no SVG) */}
        {showOverlay && (
        <div className="vhp-par-layer" style={{ ["--dp" as string]: 2.2, ["--bp" as string]: 0.12 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <g transform="rotate(-22 132 136)">
              <rect x="124" y="122" width="12" height="36" rx="4" fill={colors.ink} stroke={colors.glow} strokeWidth="2.5" />
              <circle cx="130" cy="114" r="11" fill={colors.edge} stroke={colors.ink} strokeWidth="3.5" />
              <line x1="120" y1="114" x2="140" y2="114" stroke={colors.glow} strokeWidth="2" />
            </g>
            <polygon points="36,52 54,42 46,58 60,56 38,72 44,56" fill={colors.glow} stroke={colors.ink} strokeWidth="1.5" />
          </svg>
        </div>
        )}
      </>
    )
  }

  if (track === "vermilion") {
    // SLIPKNOT — COREY TAYLOR
    return (
      <>
        <div className="vhp-par-layer" style={{ ["--dp" as string]: -1.1, ["--bp" as string]: 0.05 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <polygon points="100,14 154,166 24,64 176,64 46,166" fill="none" stroke={colors.ink} strokeWidth="3.5" opacity="0.55" />
            <polygon points="100,186 46,34 176,136 24,136 154,34" fill="none" stroke={colors.edge} strokeWidth="3.5" opacity="0.7" />
          </svg>
        </div>

        <SingerPhotoLayer
          src={photo}
          alt={singer}
          onFail={onPhotoFail}
          fallback={
            <div className="vhp-par-layer" style={{ ["--dp" as string]: 1.15, ["--bp" as string]: 0.08 } as React.CSSProperties}>
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <path
                  d="M 56 64 C 34 88, 32 135, 44 172 M 64 52 C 44 82, 42 128, 52 168 M 144 64 C 166 88, 168 135, 156 172 M 136 52 C 156 82, 158 128, 148 168"
                  stroke={colors.ink}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 62 56 C 62 30, 138 30, 138 56 L 144 116 C 144 150, 120 174, 100 178 C 80 174, 56 150, 56 116 Z"
                  fill={colors.glow}
                  stroke={colors.ink}
                  strokeWidth="4.5"
                />
                <path d="M 88 38 C 84 62, 78 96, 82 128" fill="none" stroke={colors.edge} strokeWidth="3.5" />
                <path d="M 80 48 L 92 50 M 78 60 L 90 62 M 76 106 L 88 108 M 76 118 L 88 120" stroke={colors.ink} strokeWidth="2.5" />
                <ellipse cx="80" cy="86" rx="14" ry="10" fill={colors.ink} transform="rotate(-10 80 86)" />
                <ellipse cx="120" cy="88" rx="13" ry="11" fill={colors.ink} transform="rotate(14 120 88)" />
                <circle cx="80" cy="86" r="3" fill={colors.paper} />
                <circle cx="120" cy="88" r="3" fill={colors.paper} />
                <path d="M 68 134 Q 100 144 132 130" fill="none" stroke={colors.ink} strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M 76 124 L 74 144 M 86 126 L 84 146 M 96 127 L 96 148 M 106 127 L 106 148 M 116 125 L 118 145 M 126 122 L 128 142"
                  stroke={colors.ink}
                  strokeWidth="3"
                />
              </svg>
            </div>
          }
        />

        {/* Camada 3: borboletas (só no SVG) */}
        {showOverlay && (
        <div className="vhp-par-layer" style={{ ["--dp" as string]: 2.3, ["--bp" as string]: 0.13 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <path d="M 42 52 C 26 38, 24 60, 40 62 C 28 70, 38 80, 46 66 C 54 80, 64 70, 52 62 C 68 60, 66 38, 50 52 Z" fill={colors.paper} stroke={colors.ink} strokeWidth="1.5" />
            <path d="M 154 46 C 140 34, 138 54, 152 56 C 142 64, 150 72, 157 60 C 164 72, 172 64, 162 56 C 176 54, 174 34, 160 46 Z" fill={colors.paper} stroke={colors.ink} strokeWidth="1.5" />
          </svg>
        </div>
        )}
      </>
    )
  }

  if (track === "what_ive_done") {
    // LINKIN PARK — CHESTER BENNINGTON
    return (
      <>
        <div className="vhp-par-layer" style={{ ["--dp" as string]: -1.0, ["--bp" as string]: 0.05 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r="84" fill="none" stroke={colors.ink} strokeWidth="3" strokeDasharray="4 8" opacity="0.55" />
            <line x1="100" y1="100" x2="88" y2="38" stroke={colors.ink} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
            <line x1="100" y1="100" x2="96" y2="22" stroke={colors.edge} strokeWidth="3.5" strokeLinecap="round" opacity="0.65" />
          </svg>
        </div>

        <SingerPhotoLayer
          src={photo}
          alt={singer}
          onFail={onPhotoFail}
          fallback={
            <div className="vhp-par-layer" style={{ ["--dp" as string]: 1.15, ["--bp" as string]: 0.08 } as React.CSSProperties}>
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <path
                  d="M 74 62 L 68 46 L 82 52 L 88 38 L 98 48 L 106 36 L 112 50 L 124 42 L 122 58 C 130 68, 130 92, 124 108 C 118 122, 82 122, 76 108 C 70 92, 70 68, 74 62 Z"
                  fill={colors.ink}
                />
                <rect x="75" y="68" width="22" height="12" rx="2" fill={colors.paper} stroke={colors.glow} strokeWidth="2.5" />
                <rect x="103" y="68" width="22" height="12" rx="2" fill={colors.paper} stroke={colors.glow} strokeWidth="2.5" />
                <line x1="97" y1="74" x2="103" y2="74" stroke={colors.glow} strokeWidth="2.5" />
                <ellipse cx="100" cy="98" rx="11" ry="8" fill={colors.edge} stroke={colors.paper} strokeWidth="2" />
              </svg>
            </div>
          }
        />

        {/* Camada 3: leques + mic (só no SVG) */}
        {showOverlay && (
        <div className="vhp-par-layer" style={{ ["--dp" as string]: 2.25, ["--bp" as string]: 0.12 } as React.CSSProperties}>
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <path d="M 42 185 L 82 114 L 98 122 L 64 192 Z" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
            <path d="M 158 185 L 118 114 L 102 122 L 136 192 Z" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
            <path d="M 52 178 C 58 158, 68 154, 66 142 C 74 150, 78 138, 84 126 C 86 142, 78 158, 66 184 Z" fill={colors.edge} />
            <path d="M 58 176 C 64 162, 72 156, 76 138 C 80 152, 74 166, 64 184 Z" fill={colors.glow} />
            <path d="M 148 178 C 142 158, 132 154, 134 142 C 126 150, 122 138, 116 126 C 114 142, 122 158, 134 184 Z" fill={colors.glow} />
            <path d="M 142 176 C 136 162, 128 156, 124 138 C 120 152, 126 166, 136 184 Z" fill={colors.edge} />
            <rect x="94" y="102" width="12" height="32" rx="4" fill={colors.ink} stroke={colors.glow} strokeWidth="2.5" />
            <circle cx="100" cy="98" r="9" fill={colors.ink} stroke={colors.paper} strokeWidth="3" />
          </svg>
        </div>
        )}
      </>
    )
  }

  // IMAGINE DRAGONS — DAN REYNOLDS
  return (
    <>
      <div className="vhp-par-layer" style={{ ["--dp" as string]: -1.0, ["--bp" as string]: 0.05 } as React.CSSProperties}>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <circle cx="100" cy="100" r="82" fill="none" stroke={colors.edge} strokeWidth="3" strokeDasharray="8 6" />
          <path d="M 54 118 C 66 64, 96 28, 134 22 C 118 56, 120 88, 142 118 Z" fill={colors.glow} stroke={colors.ink} strokeWidth="4" />
          <path
            d="M 44 132 L 54 146 L 64 132 L 74 148 L 84 132 L 94 148 L 104 132 L 114 148 L 124 132 L 134 148 L 144 132 L 154 146"
            fill="none"
            stroke={colors.ink}
            strokeWidth="3.5"
          />
        </svg>
      </div>

      <SingerPhotoLayer
        src={photo}
        alt={singer}
        onFail={onPhotoFail}
        fallback={
          <div className="vhp-par-layer" style={{ ["--dp" as string]: 1.2, ["--bp" as string]: 0.09 } as React.CSSProperties}>
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <circle cx="100" cy="84" r="14" fill={colors.ink} />
              <path d="M 42 74 L 74 104 L 82 178 L 118 178 L 126 104 L 158 68 L 148 58 L 118 92 L 82 92 L 52 64 Z" fill={colors.ink} />
              <line x1="100" y1="98" x2="100" y2="156" stroke={colors.glow} strokeWidth="3.5" />
              <line x1="64" y1="44" x2="148" y2="164" stroke={colors.glow} strokeWidth="4" strokeLinecap="round" />
              <circle cx="62" cy="42" r="6" fill={colors.paper} stroke={colors.ink} strokeWidth="3" />
            </svg>
          </div>
        }
      />

      {/* Camada 3: faíscas (só no SVG) */}
      {showOverlay && (
      <div className="vhp-par-layer" style={{ ["--dp" as string]: 2.3, ["--bp" as string]: 0.13 } as React.CSSProperties}>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <circle cx="46" cy="118" r="6" fill={colors.glow} />
          <circle cx="154" cy="112" r="7" fill={colors.spark} />
          <circle cx="144" cy="48" r="4.5" fill={colors.glow} />
        </svg>
      </div>
      )}
    </>
  )
}

type Phase = "burnin" | "load" | "ready" | "exit" | "done"

interface Live {
  w: number
  h: number
  pct: number
  shown: number
  phase: Phase
  burnAt: number
  loadAt: number
  readyAt: number
  exitAt: number
  midFired: boolean
  rot: number
  vel: number
  scratching: boolean
  lastA: number
  lastT: number
  scratch: number
  mx: number
  my: number
  sx: number
  sy: number
  wantExit: boolean
}

function makeShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s)
    return null
  }
  return s
}

export default function VinylHalftonePreloader({
  children,
  loop = false,
  progress,
  durationMs = 2500,
  enter = "auto",
  track = "sharks",
  sectionName = "PROJETOS",
  burnIn = false,
  onMidTransition,
  preset,
  palette,
  title,
  subtitle,
  loadingWord = LOADING_DEFAULTS.loadingWord,
  readyWord,
  ringText,
  stages,
  bpm,
  displayFamily = DISPLAY_STACK,
  textFamily = TEXT_STACK,
  fontHref = FONT_HREF,
  height = "100svh",
  onComplete,
  className = "",
}: VinylHalftonePreloaderProps) {
  const rockMeta = ROCK_TRACKS[track] || ROCK_TRACKS.sharks
  const activePreset = preset || track
  const colors = { ...(PRESETS[activePreset] || rockMeta.palette), ...(palette || {}) }

  const resolvedTitle = title ?? rockMeta.band
  const resolvedSubtitle = subtitle ?? `${rockMeta.song} — ${rockMeta.singer}`
  const resolvedReadyWord = (readyWord ?? sectionName).toUpperCase()
  const resolvedBpm = bpm ?? rockMeta.bpm
  const resolvedRing = ringText ?? rockMeta.ringText
  const list = stages && stages.length ? stages : [...rockMeta.stages, resolvedReadyWord]

  const [run, setRun] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>(burnIn ? "burnin" : "load")
  const [count, setCount] = React.useState(0)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const [gl, setGl] = React.useState(true)
  const [reduced, setReduced] = React.useState(false)
  const [photoFailed, setPhotoFailed] = React.useState(false)

  const gateRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const ringRef = React.useRef<SVGGElement | null>(null)

  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete
  const onMidRef = React.useRef(onMidTransition)
  onMidRef.current = onMidTransition

  const opts = React.useRef({
    progress,
    durationMs,
    enter,
    loop,
    bpm: resolvedBpm,
    colors,
    n: list.length,
    reduced,
    burnIn,
  })
  opts.current = {
    progress,
    durationMs,
    enter,
    loop,
    bpm: resolvedBpm,
    colors,
    n: list.length,
    reduced,
    burnIn,
  }
  const live = React.useRef({} as Live)

  React.useEffect(() => {
    if (!fontHref || typeof document === "undefined") return
    const has = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
      (l) => (l as HTMLLinkElement).href === fontHref,
    )
    if (has) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = fontHref
    document.head.appendChild(link)
  }, [fontHref])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  React.useEffect(() => {
    if (phase === "done") return
    const gate = gateRef.current
    if (!gate) return
    const now0 = performance.now()
    const startPhase: Phase = opts.current.burnIn ? "burnin" : "load"
    const L: Live = {
      w: gate.clientWidth,
      h: gate.clientHeight,
      pct: 0,
      shown: 0,
      phase: startPhase,
      burnAt: now0,
      loadAt: startPhase === "load" ? now0 : 0,
      readyAt: 0,
      exitAt: 0,
      midFired: !opts.current.burnIn,
      rot: 0,
      vel: 0,
      scratching: false,
      lastA: 0,
      lastT: 0,
      scratch: 0,
      mx: 0,
      my: 0,
      sx: 0,
      sy: 0,
      wantExit: false,
    }
    live.current = L
    setPhase(startPhase)
    setSize({ w: L.w, h: L.h })

    const canvas = canvasRef.current
    let ctx: WebGLRenderingContext | null = null
    let prog: WebGLProgram | null = null
    const U: { [k: string]: WebGLUniformLocation | null } = {}
    let soft = false
    if (canvas) {
      try {
        ctx = (canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true }) ||
          canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
      } catch {
        ctx = null
      }
    }
    if (ctx) {
      const vs = makeShader(ctx, ctx.VERTEX_SHADER, VERT)
      const fs = makeShader(ctx, ctx.FRAGMENT_SHADER, FRAG)
      const p = vs && fs ? ctx.createProgram() : null
      if (p && vs && fs) {
        ctx.attachShader(p, vs)
        ctx.attachShader(p, fs)
        ctx.linkProgram(p)
        if (ctx.getProgramParameter(p, ctx.LINK_STATUS)) prog = p
      }
      if (prog) {
        ctx.useProgram(prog)
        const buf = ctx.createBuffer()
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buf)
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
        const loc = ctx.getAttribLocation(prog, "a")
        ctx.enableVertexAttribArray(loc)
        ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0)
        for (const k of [
          "uRes", "uTime", "uCell", "uU", "uIntro", "uBurn", "uE1", "uE2",
          "uBeat", "uEnergy", "uNeedle", "uScratch", "uHole", "uPx",
          "uSpin", "uRec", "uBurst", "uPaper", "uInk", "uSpark",
        ]) {
          U[k] = ctx.getUniformLocation(prog, k)
        }
        const dbg = ctx.getExtension("WEBGL_debug_renderer_info")
        const name = dbg ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ""
        soft = /swiftshader|llvmpipe|software/i.test(name)
      } else {
        ctx = null
      }
    }
    setGl(!!ctx)

    let scale = 1
    const resize = () => {
      L.w = Math.max(1, gate.clientWidth)
      L.h = Math.max(1, gate.clientHeight)
      setSize({ w: L.w, h: L.h })
      if (!canvas || !ctx) return
      const budget = soft ? 1.1e6 : 2.4e6
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      scale = Math.min(dpr, Math.sqrt(budget / (L.w * L.h)))
      canvas.width = Math.max(1, Math.round(L.w * scale))
      canvas.height = Math.max(1, Math.round(L.h * scale))
      canvas.style.width = L.w + "px"
      canvas.style.height = L.h + "px"
      ctx.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(gate)

    let last = now0
    let raf = 0
    let shownInt = -1

    const frame = (now: number) => {
      const o = opts.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const still = o.reduced

      // 1. queima sobre a página atual
      if (L.phase === "burnin") {
        if (now - L.burnAt >= BURNIN_MS) {
          L.phase = "load"
          L.loadAt = now
          if (!L.midFired) {
            L.midFired = true
            onMidRef.current?.()
          }
          setPhase("load")
        }
      }

      // 2. giro e carga
      const loadElapsed = L.loadAt > 0 ? now - L.loadAt : 0
      if (L.phase === "load") {
        const real = o.progress
        const target =
          real === undefined
            ? vhpSimulated(loadElapsed / Math.max(500, o.durationMs))
            : Math.max(0, Math.min(100, Number(real) || 0))
        L.shown = still
          ? Math.max(L.shown, target)
          : Math.max(L.shown, L.shown + (target - L.shown) * Math.min(1, dt * 9))
        if (target >= 100 && L.shown > 99.5) L.shown = 100
        if (L.shown >= 100 && loadElapsed > INTRO_MS * 0.7) {
          L.phase = "ready"
          L.readyAt = now
          setPhase("ready")
        }
      }

      L.pct = L.shown
      const ci = Math.floor(L.shown)
      if (ci !== shownInt) {
        shownInt = ci
        setCount(ci)
      }

      // 3. pronto -> saída (dissolução de meio-tons)
      if (L.phase === "ready" && (L.wantExit || (o.enter === "auto" && now - L.readyAt > HOLD_MS))) {
        L.phase = "exit"
        L.exitAt = now
        setPhase("exit")
      }
      const exitLen = still || !ctx ? 420 : FLOOD_MS + REVEAL_MS
      if (L.phase === "exit" && now - L.exitAt > exitLen) {
        L.phase = "done"
        setPhase("done")
        return
      }

      // rotação do prato
      const motor = still ? 0 : vhpRpm(L.pct) * 6 * (L.phase === "exit" ? 1.6 : 1)
      if (!L.scratching) {
        L.vel += (motor - L.vel) * Math.min(1, dt * 2.2)
        L.rot += L.vel * dt
      }
      const off = L.scratching ? 1 : Math.min(1, Math.abs(L.vel - motor) / 500)
      L.scratch += (off - L.scratch) * Math.min(1, dt * 8)
      if (ringRef.current) {
        ringRef.current.setAttribute("transform", "rotate(" + (L.rot % 360).toFixed(2) + ")")
      }

      // parallax do ponteiro
      L.sx += (L.mx - L.sx) * Math.min(1, dt * 3.5)
      L.sy += (L.my - L.sy) * Math.min(1, dt * 3.5)
      const lay = vhpLayout(L.w, L.h)
      const px = still ? 0 : L.sx * lay.u * 0.014
      const py = still ? 0 : L.sy * lay.u * 0.014
      gate.style.setProperty("--vhp-px", px.toFixed(2) + "px")
      gate.style.setProperty("--vhp-py", py.toFixed(2) + "px")

      const beat = still ? 0 : vhpBeat(now - now0, o.bpm)
      gate.style.setProperty("--vhp-beat", beat.toFixed(3))

      // desenho WebGL
      if (ctx && prog && canvas) {
        const c = o.colors
        const s = scale
        const burnProg = L.phase === "burnin" ? vhpClamp01((now - L.burnAt) / BURNIN_MS) : 0
        const intro = still ? 1 : vhpClamp01(loadElapsed / INTRO_MS)
        const ie = 1 - Math.pow(1 - intro, 3)
        const et = L.phase === "exit" ? now - L.exitAt : 0
        const e1 = L.phase === "exit" && !still ? vhpClamp01(et / FLOOD_MS) : 0
        const e2 = L.phase === "exit" && !still ? vhpClamp01((et - FLOOD_MS) / REVEAL_MS) : 0
        const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
        const energy = 0.45 + 0.55 * vhpClamp01(L.pct / 100) + (L.phase === "ready" ? 0.15 : 0)

        ctx.uniform2f(U.uRes, canvas.width, canvas.height)
        ctx.uniform1f(U.uTime, still ? 0 : (now - now0) / 1000)
        ctx.uniform1f(U.uCell, lay.cell * s)
        ctx.uniform1f(U.uU, lay.u * s)
        ctx.uniform1f(U.uPx, s)
        ctx.uniform1f(U.uIntro, ie)
        ctx.uniform1f(U.uBurn, L.phase === "burnin" ? Math.max(0.001, ease(burnProg)) : 0)
        ctx.uniform1f(U.uE1, ease(e1))
        ctx.uniform1f(U.uE2, e2 > 0 ? Math.max(0.0001, ease(e2)) : 0)
        ctx.uniform1f(U.uBeat, beat)
        ctx.uniform1f(U.uEnergy, energy)
        ctx.uniform1f(U.uScratch, still ? 0 : L.scratch)
        ctx.uniform1f(U.uHole, lay.hole * s)
        ctx.uniform1f(U.uNeedle, vhpNeedle(L.pct, lay.rl, lay.rv) * s)
        ctx.uniform2f(U.uSpin, (lay.sx - px * 0.5) * s, (lay.sy - py * 0.5) * s)
        ctx.uniform2f(U.uRec, lay.rl * s, lay.rv * s)
        ctx.uniform3f(U.uBurst, (lay.bx + px * 0.8) * s, (lay.by + py * 0.8) * s, lay.br * s)

        const P = vhpRGB(c.paper, [0.95, 0.41, 0.49])
        const I = vhpRGB(c.ink, [0.11, 0.03, 0.04])
        const K = vhpRGB(c.spark, [1, 1, 1])
        ctx.uniform3f(U.uPaper, P[0], P[1], P[2])
        ctx.uniform3f(U.uInk, I[0], I[1], I[2])
        ctx.uniform3f(U.uSpark, K[0], K[1], K[2])
        ctx.clearColor(0, 0, 0, 0)
        ctx.clear(ctx.COLOR_BUFFER_BIT)
        ctx.drawArrays(ctx.TRIANGLES, 0, 3)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const local = (e: PointerEvent) => {
      const r = gate.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement
      if (el.closest && el.closest("button")) return
      const p = local(e)
      const lay = vhpLayout(L.w, L.h)
      const d = Math.hypot(p.x - lay.sx, p.y - lay.sy)
      if (d > lay.rv || d < lay.hole) return
      L.scratching = true
      L.lastA = Math.atan2(p.y - lay.sy, p.x - lay.sx)
      L.lastT = performance.now()
      gate.dataset.scratch = "true"
      try {
        gate.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      L.mx = (p.x / L.w) * 2 - 1
      L.my = (p.y / L.h) * 2 - 1
      if (!L.scratching) return
      const lay = vhpLayout(L.w, L.h)
      const a = Math.atan2(p.y - lay.sy, p.x - lay.sx)
      const now = performance.now()
      const da = (vhpAngleDelta(a, L.lastA) * 180) / Math.PI
      const dts = Math.max(0.008, (now - L.lastT) / 1000)
      L.rot += da
      L.vel = L.vel * 0.5 + (da / dts) * 0.5
      L.lastA = a
      L.lastT = now
    }
    const onUp = () => {
      L.scratching = false
      delete gate.dataset.scratch
    }
    const onLeave = () => {
      L.mx = 0
      L.my = 0
    }
    gate.addEventListener("pointerdown", onDown)
    gate.addEventListener("pointermove", onMove)
    gate.addEventListener("pointerup", onUp)
    gate.addEventListener("pointercancel", onUp)
    gate.addEventListener("pointerleave", onLeave)
    const onLost = (e: Event) => {
      e.preventDefault()
      setGl(false)
    }
    canvas?.addEventListener("webglcontextlost", onLost)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gate.removeEventListener("pointerdown", onDown)
      gate.removeEventListener("pointermove", onMove)
      gate.removeEventListener("pointerup", onUp)
      gate.removeEventListener("pointercancel", onUp)
      gate.removeEventListener("pointerleave", onLeave)
      canvas?.removeEventListener("webglcontextlost", onLost)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, phase === "done"])

  React.useEffect(() => {
    if (phase !== "done") return
    if (!loop) {
      onCompleteRef.current?.()
      return
    }
    const t = setTimeout(() => {
      setCount(0)
      setPhase(burnIn ? "burnin" : "load")
      setRun((r) => r + 1)
    }, LOOP_REST_MS)
    return () => clearTimeout(t)
  }, [phase, loop, burnIn])

  const goIn = () => {
    if (live.current.phase === "ready") live.current.wantExit = true
  }

  const lay = vhpLayout(size.w || 1280, size.h || 720)
  const ready = phase === "ready" || phase === "exit"
  const lit = ready ? list.length - 1 : vhpStage(count, list.length)
  const ringR = lay.rl * 0.91
  const ringFont = Math.max(8.5, lay.u * 0.017)
  const ringId = "vhp-ring-" + run
  const fade = phase === "exit" && (reduced || !gl)

  return (
    <div
      className={"vhp-root " + className}
      style={
        {
          height,
          background: loop && !children ? colors.ink : undefined,
          "--vhp-paper": colors.paper,
          "--vhp-ink": colors.ink,
          "--vhp-glow": colors.glow,
          "--vhp-edge": colors.edge,
          "--vhp-halo": "color-mix(in srgb, " + colors.glow + " 55%, transparent)",
          "--vhp-display": displayFamily,
          "--vhp-text": textFamily,
          "--vhp-cell": lay.cell * 1.15 + "px",
        } as React.CSSProperties
      }
    >
      <style>{VHP_CSS}</style>
      {children}
      {phase === "done" ? null : (
        <div
          key={run}
          ref={gateRef}
          className="vhp-gate"
          data-phase={phase}
          data-gl={gl}
          data-fade={fade}
          role="progressbar"
          aria-label={resolvedTitle + " — " + resolvedReadyWord}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={count}
        >
          {gl ? (
            <canvas ref={canvasRef} className="vhp-canvas" aria-hidden="true" />
          ) : (
            <div className="vhp-dots" aria-hidden="true" />
          )}

          <div
            className="vhp-center-portrait"
            style={{
              left: lay.sx,
              top: lay.sy,
              width: lay.rl * 1.68,
              height: lay.rl * 1.68,
            }}
            aria-hidden="true"
          >
            <SingerCenterEmblem
              colors={colors}
              track={track}
              photo={rockMeta.singerImage}
              singer={rockMeta.singer}
              photoFailed={photoFailed}
              onPhotoFail={() => setPhotoFailed(true)}
            />
            <div className="vhp-spindle-hole" />
          </div>

          <svg
            className="vhp-ring"
            aria-hidden="true"
            width={ringR * 2 + 40}
            height={ringR * 2 + 40}
            viewBox={-ringR - 20 + " " + (-ringR - 20) + " " + (ringR * 2 + 40) + " " + (ringR * 2 + 40)}
            style={{ left: lay.sx - ringR - 20, top: lay.sy - ringR - 20 }}
          >
            <g ref={ringRef}>
              <defs>
                <path
                  id={ringId}
                  d={
                    "M " + -ringR + " 0 A " + ringR + " " + ringR + " 0 1 1 " +
                    ringR + " 0 A " + ringR + " " + ringR + " 0 1 1 " + -ringR + " 0"
                  }
                />
              </defs>
              <circle
                r={lay.rl * 0.98}
                fill="none"
                stroke={colors.ink}
                strokeWidth={lay.u * 0.01}
                strokeDasharray={lay.u * 0.005 + " " + lay.u * 0.012}
                opacity={0.65}
              />
              <text fontSize={ringFont} opacity={0.85}>
                <textPath href={"#" + ringId}>{resolvedRing + resolvedRing}</textPath>
              </text>
            </g>
          </svg>

          <div className="vhp-hud-top" aria-hidden="true">
            <div className="vhp-brand-pill">
              <span className="vhp-brand-band">{resolvedTitle}</span>
              <span className="vhp-brand-song">♫ {resolvedSubtitle}</span>
            </div>

            <ol className="vhp-stages-row">
              {list.map((s, i) => {
                const state = i === lit ? "on" : i < lit ? "done" : "next"
                return (
                  <li key={i} className="vhp-stage-pill" data-state={state}>
                    0{i + 1} // {s}
                  </li>
                )
              })}
            </ol>
          </div>

          {rockMeta.singerImage && !photoFailed && rockMeta.singerImageCredit ? (
            <a
              className="vhp-photo-credit"
              href={rockMeta.singerImageCreditUrl || undefined}
              target="_blank"
              rel="noreferrer noopener"
            >
              foto · {rockMeta.singerImageCredit}
            </a>
          ) : null}

          <div className="vhp-bottom-finale">
            <div className="vhp-finale-kicker">
              <span>{ready ? "SEÇÃO PRONTA" : loadingWord}</span>
              <span>•</span>
              <span className="vhp-finale-pct">{vhpPad(count)}%</span>
            </div>
            <button
              type="button"
              className="vhp-finale-title"
              data-ready={ready}
              disabled={!ready}
              onClick={goIn}
            >
              {resolvedReadyWord}
            </button>
          </div>

          <span className="vhp-sr" aria-live="polite">
            {ready ? resolvedReadyWord : ""}
          </span>
        </div>
      )}
    </div>
  )
}

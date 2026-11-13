import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Reveal } from '../components/ui/animations'
import CredentialRail from '../components/ui/credential-rail'
import type { RailItem } from '../components/ui/credential-rail'
import HoverSlatButton from '../components/ui/hover-button'
import type { StrapPattern } from '../components/ui/lanyard-badge'
import inovaseLogo from '../assets/img/logos/inovase-light.png'
import senaiLogo from '../assets/img/logos/senai.png'
import senaiLogoLight from '../assets/img/logos/senai-light.png'
import unitLogo from '../assets/img/logos/unit-light.png'
import formacaoData from '../data/formacao.json'

interface Tema {
  card: string
  ink: string
  accent: string
  strap: string
  strapInk: string
  pattern: StrapPattern
  seal: 'unit' | 'senai' | 'inovase' | 'work'
  logo?: string
  logoBar?: string
  logoHeight?: number
  monogram?: string
}

type Grupo = 'formacoes' | 'certificados' | 'trabalhos'
type Tipo = 'formacao' | 'certificado' | 'trabalho'

interface Credencial {
  id: string
  grupo: Grupo
  tipo: Tipo
  titulo: string
  instituicao: string
  detalhe: string
  area: string
  periodo: string
  status: string
  local: string
  strapLabel: string
  tema: Tema
  descricao: string
  skills: string[]
  codigo?: string
}

interface TemaData extends Omit<Tema, 'logo' | 'logoBar'> {
  logo?: string
  logoBar?: string
}

interface CredencialData extends Omit<Credencial, 'tema' | 'grupo' | 'tipo'> {
  grupo: string
  tipo: string
  theme: string
}

interface FormacaoData {
  eyebrow: string
  title: string
  groups: { id: string; label: string; hover: string }[]
  themes: Record<string, TemaData>
  credentials: CredencialData[]
}

const DATA = formacaoData as unknown as FormacaoData

const LOGOS: Record<string, string> = {
  unit: unitLogo,
  senai: senaiLogo,
  senaiLight: senaiLogoLight,
  inovase: inovaseLogo,
}

function resolveLogo(ref?: string) {
  if (!ref) return undefined
  return LOGOS[ref] ?? ref
}

const TEMAS: Record<string, Tema> = Object.fromEntries(
  Object.entries(DATA.themes).map(([key, tema]) => [
    key,
    {
      ...tema,
      logo: resolveLogo(tema.logo),
      logoBar: resolveLogo(tema.logoBar),
    },
  ]),
)

const CREDENCIAIS: Credencial[] = DATA.credentials.map((c) => ({
  ...c,
  grupo: c.grupo as Grupo,
  tipo: c.tipo as Tipo,
  tema: TEMAS[c.theme] ?? TEMAS.unit,
}))

const GRUPOS: { id: Grupo; label: string; hover: string }[] = DATA.groups.map((g) => ({
  ...g,
  id: g.id as Grupo,
}))

function SealSenai({ size }: { size: number }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x={-4.5}
          y={-48}
          width={9}
          height={13}
          rx={1.5}
          fill="currentColor"
          stroke="none"
          transform={`rotate(${i * 30})`}
        />
      ))}
      <circle r={37} />
      <path d="M0 -26 L22.5 -13 L22.5 13 L0 26 L-22.5 13 L-22.5 -13 Z" />
      <circle r={7} fill="currentColor" stroke="none" />
    </svg>
  )
}

function SealInovase({ size }: { size: number }) {
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    return [Math.cos(a) * 35, Math.sin(a) * 35] as const
  })
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      aria-hidden="true"
    >
      <circle r={45} strokeDasharray="2 6" opacity={0.6} />
      {nodes.map(([x, y], i) => {
        const [nx, ny] = nodes[(i + 1) % nodes.length]
        return <line key={i} x1={x} y1={y} x2={nx} y2={ny} />
      })}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4.6} fill="currentColor" stroke="none" />
      ))}
      <path d="M0 -15 L13 8 L-13 8 Z" />
    </svg>
  )
}

function SealUnit({ size }: { size: number }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      aria-hidden="true"
    >
      <circle r={45} strokeDasharray="1 6" opacity={0.7} />
      {[0, 60, -60].map((a) => (
        <ellipse key={a} rx={39} ry={15} transform={`rotate(${a})`} />
      ))}
      <circle r={5.5} fill="currentColor" stroke="none" />
      <circle cx={39} cy={0} r={3} fill="currentColor" stroke="none" />
      <circle cx={-19.5} cy={-13} r={3} fill="currentColor" stroke="none" />
    </svg>
  )
}

function SealWork({ letter, size }: { letter: string; size: number }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      aria-hidden="true"
    >
      <circle r={45} />
      <circle r={39} strokeDasharray="2 5" opacity={0.7} />
      <text
        x={0}
        y={2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        stroke="none"
        fontSize={42}
        fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {letter}
      </text>
    </svg>
  )
}

function Seal({ item, size }: { item: Credencial; size: number }) {
  const seal = item.tema.seal
  if (seal === 'unit') return <SealUnit size={size} />
  if (seal === 'senai') return <SealSenai size={size} />
  if (seal === 'inovase') return <SealInovase size={size} />
  return <SealWork letter={item.tema.monogram ?? '•'} size={size} />
}

function MonoBadge({ tema, s }: { tema: Tema; s: number }) {
  return (
    <span
      className="grid place-items-center"
      style={{
        width: 36 * s,
        height: 36 * s,
        borderRadius: 9 * s,
        background: tema.accent,
        color: tema.card,
        fontSize: 19 * s,
        fontWeight: 700,
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '-0.04em',
      }}
      aria-hidden="true"
    >
      {tema.monogram ?? '•'}
    </span>
  )
}

function CardHeader({
  s,
  left,
  right,
}: {
  s: number
  left: string
  right: string
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ fontSize: 6.5 * s, letterSpacing: '0.22em', textTransform: 'uppercase' }}
    >
      <span style={{ opacity: 0.7 }}>{left}</span>
      <span style={{ opacity: 0.85 }}>{right}</span>
    </div>
  )
}

function BottomBand({ item, s, sub }: { item: Credencial; s: number; sub?: string }) {
  const { tema } = item
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-end justify-between"
      style={{
        background: tema.strap,
        color: tema.strapInk,
        padding: `${12 * s}px ${20 * s}px`,
        borderTopLeftRadius: 20 * s,
        borderTopRightRadius: 20 * s,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 5.8 * s,
            lineHeight: 1.2,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.7,
            maxWidth: 108 * s,
          }}
        >
          {sub ?? item.detalhe}
        </div>
        {tema.logoBar ? (
          <img
            src={tema.logoBar}
            alt={item.instituicao}
            style={{
              display: 'block',
              height: 17 * s,
              width: 'auto',
              maxWidth: 108 * s,
              objectFit: 'contain',
              marginTop: 4 * s,
            }}
          />
        ) : (
          <div className="flex items-center" style={{ gap: 5 * s, marginTop: 4 * s }}>
            <span
              className="grid place-items-center"
              style={{
                width: 16 * s,
                height: 16 * s,
                borderRadius: 4 * s,
                background: tema.strapInk,
                color: tema.strap,
                fontSize: 9 * s,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              aria-hidden="true"
            >
              {tema.monogram}
            </span>
            <span
              style={{
                fontSize: 8 * s,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {item.instituicao}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-end" style={{ gap: 1.3 * s, height: 21 * s }} aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            style={{
              width: (i % 4 === 0 ? 2 : i % 3 === 0 ? 1.5 : 1) * s,
              height: '100%',
              background: 'currentColor',
              opacity: 0.55,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Chip({ children, accent, s }: { children: ReactNode; accent: string; s: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${2.6 * s}px ${6 * s}px`,
        border: `${1 * s}px solid ${accent}`,
        borderRadius: 999,
        color: accent,
        fontSize: 6 * s,
        lineHeight: 1.1,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

function FormacaoFront({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div
        className="pointer-events-none absolute"
        style={{ right: -72 * s, top: 96 * s, opacity: 0.14, color: tema.accent }}
      >
        <Seal item={item} size={250 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <CardHeader s={s} left="Credencial" right={item.status} />

        {tema.logo && (
          <img
            src={tema.logo}
            alt={item.instituicao}
            style={{
              display: 'block',
              height: (tema.logoHeight ?? 40) * s,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              marginTop: 14 * s,
            }}
          />
        )}

        <div style={{ width: 34 * s, height: 2 * s, background: tema.accent, marginTop: 12 * s }} />

        <div
          style={{
            fontSize: 11 * s,
            lineHeight: 1.35,
            marginTop: 13 * s,
            opacity: 0.92,
            textWrap: 'balance',
          }}
        >
          {item.titulo}
        </div>

        <div style={{ marginTop: 14 * s }}>
          <Chip accent={tema.accent} s={s}>
            {item.area}
          </Chip>
        </div>
      </div>

      <div className="absolute flex items-end justify-between" style={{ left: 22 * s, right: 22 * s, bottom: 22 * s }}>
        <div>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Período
          </div>
          <div style={{ fontSize: 8 * s, letterSpacing: '0.08em', marginTop: 3 * s }}>{item.periodo}</div>
        </div>
        <div style={{ color: tema.accent, opacity: 0.9 }}>
          <Seal item={item} size={26 * s} />
        </div>
      </div>
    </div>
  )
}

function FormacaoBack({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div
        className="pointer-events-none absolute"
        style={{ left: -58 * s, bottom: 30 * s, opacity: 0.12, color: tema.accent }}
      >
        <Seal item={item} size={220 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <div style={{ fontSize: 6.5 * s, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
          Status
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 20 * s,
            letterSpacing: '-0.01em',
            marginTop: 7 * s,
          }}
        >
          {item.status}
        </div>

        <div style={{ height: 1, background: tema.accent, opacity: 0.35, marginTop: 14 * s }} />

        <div style={{ marginTop: 12 * s }}>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Período
          </div>
          <div style={{ fontSize: 8.5 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>{item.periodo}</div>
        </div>

        <div style={{ marginTop: 10 * s }}>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Local
          </div>
          <div style={{ fontSize: 8.5 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>{item.local}</div>
        </div>

        <div style={{ marginTop: 10 * s }}>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Curso
          </div>
          <div style={{ fontSize: 8 * s, marginTop: 3 * s, lineHeight: 1.35, opacity: 0.9 }}>{item.titulo}</div>
        </div>

        <div style={{ marginTop: 11 * s }}>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Competências
          </div>
          <div className="flex flex-wrap" style={{ gap: 3.5 * s, marginTop: 6 * s }}>
            {item.skills.slice(0, 4).map((skill) => (
              <Chip key={skill} accent={tema.accent} s={s}>
                {skill}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <BottomBand item={item} s={s} />
    </div>
  )
}

function CertificadoFront({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div
        className="pointer-events-none absolute"
        style={{ right: -60 * s, top: 84 * s, opacity: 0.12, color: tema.accent }}
      >
        <Seal item={item} size={230 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 30 * s }}>
        <CardHeader s={s} left="Certificado" right={item.status} />

        {tema.logo && (
          <img
            src={tema.logo}
            alt={item.instituicao}
            style={{
              display: 'block',
              height: 34 * s,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              marginTop: 16 * s,
            }}
          />
        )}

        <div style={{ width: 34 * s, height: 2 * s, background: tema.accent, marginTop: 14 * s }} />

        <div
          style={{
            fontSize: 6.4 * s,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.55,
            marginTop: 14 * s,
          }}
        >
          Certificação em
        </div>

        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 13.5 * s,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            marginTop: 6 * s,
            textWrap: 'balance',
          }}
        >
          {item.titulo}
        </div>

        <div style={{ marginTop: 12 * s }}>
          <Chip accent={tema.accent} s={s}>
            {item.area}
          </Chip>
        </div>
      </div>

      <div className="absolute flex items-end justify-between" style={{ left: 22 * s, right: 22 * s, bottom: 22 * s }}>
        <div>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Emitido em
          </div>
          <div style={{ fontSize: 8.5 * s, letterSpacing: '0.06em', marginTop: 3 * s }}>{item.periodo}</div>
        </div>
        <div style={{ color: tema.accent, opacity: 0.9 }}>
          <Seal item={item} size={26 * s} />
        </div>
      </div>
    </div>
  )
}

function CertificadoBack({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <div style={{ fontSize: 6.5 * s, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
          Competências
        </div>
        <div className="flex flex-wrap" style={{ gap: 4 * s, marginTop: 10 * s }}>
          {item.skills.map((skill) => (
            <Chip key={skill} accent={tema.accent} s={s}>
              {skill}
            </Chip>
          ))}
        </div>

        <div style={{ height: 1, background: tema.accent, opacity: 0.35, marginTop: 16 * s }} />

        <div style={{ marginTop: 12 * s, fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
          Emissão
        </div>
        <div style={{ fontSize: 8.5 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>
          {item.periodo} · {item.local}
        </div>

        <div style={{ marginTop: 12 * s, fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
          Código da credencial
        </div>
        <div
          style={{
            fontFamily: '"Space Mono", ui-monospace, monospace',
            fontSize: 6.2 * s,
            lineHeight: 1.5,
            marginTop: 4 * s,
            wordBreak: 'break-all',
            opacity: 0.85,
          }}
        >
          {item.codigo}
        </div>
      </div>

      <BottomBand item={item} s={s} sub={`${item.instituicao} · ${item.area}`} />
    </div>
  )
}

function TrabalhoFront({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div
        className="pointer-events-none absolute"
        style={{ right: -60 * s, top: 92 * s, opacity: 0.1, color: tema.accent }}
      >
        <Seal item={item} size={230 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 30 * s }}>
        <CardHeader s={s} left="Experiência" right={item.status} />

        <div className="flex items-center" style={{ gap: 9 * s, marginTop: 18 * s }}>
          <MonoBadge tema={tema} s={s} />
          <div
            style={{
              fontSize: 8 * s,
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.8,
            }}
          >
            {item.instituicao}
          </div>
        </div>

        <div style={{ width: 34 * s, height: 2 * s, background: tema.accent, marginTop: 14 * s }} />

        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 15 * s,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            marginTop: 12 * s,
            textWrap: 'balance',
          }}
        >
          {item.titulo}
        </div>

        <div style={{ marginTop: 14 * s }}>
          <Chip accent={tema.accent} s={s}>
            {item.area}
          </Chip>
        </div>
      </div>

      <div className="absolute flex items-end justify-between" style={{ left: 22 * s, right: 22 * s, bottom: 22 * s }}>
        <div>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Desde
          </div>
          <div style={{ fontSize: 8 * s, letterSpacing: '0.06em', marginTop: 3 * s }}>{item.periodo}</div>
        </div>
        <div style={{ color: tema.accent, opacity: 0.9 }}>
          <Seal item={item} size={26 * s} />
        </div>
      </div>
    </div>
  )
}

function TrabalhoBack({ item, s }: { item: Credencial; s: number }) {
  const { tema } = item

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: tema.card, color: tema.ink }}>
      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <div style={{ fontSize: 6.5 * s, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
          Atuação
        </div>
        <p style={{ fontSize: 8.4 * s, lineHeight: 1.55, marginTop: 8 * s, opacity: 0.9 }}>
          {item.descricao}
        </p>

        <div style={{ height: 1, background: tema.accent, opacity: 0.35, marginTop: 14 * s }} />

        <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55, marginTop: 12 * s }}>
          Tecnologias
        </div>
        <div className="flex flex-wrap" style={{ gap: 4 * s, marginTop: 7 * s }}>
          {item.skills.map((skill) => (
            <Chip key={skill} accent={tema.accent} s={s}>
              {skill}
            </Chip>
          ))}
        </div>

        <div style={{ marginTop: 12 * s }}>
          <div style={{ fontSize: 6 * s, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
            Local
          </div>
          <div style={{ fontSize: 8.5 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>
            {item.local} · {item.area}
          </div>
        </div>
      </div>

      <BottomBand item={item} s={s} />
    </div>
  )
}

function CardFace({ item, side, w }: { item: Credencial; side: 'front' | 'back'; w: number }) {
  const s = w / 200
  if (item.tipo === 'formacao')
    return side === 'front' ? <FormacaoFront item={item} s={s} /> : <FormacaoBack item={item} s={s} />
  if (item.tipo === 'certificado')
    return side === 'front' ? <CertificadoFront item={item} s={s} /> : <CertificadoBack item={item} s={s} />
  return side === 'front' ? <TrabalhoFront item={item} s={s} /> : <TrabalhoBack item={item} s={s} />
}

export function Formacao() {
  const [grupo, setGrupo] = useState<Grupo>('formacoes')
  const [shown, setShown] = useState<Grupo>('formacoes')
  const [out, setOut] = useState(false)
  const timer = useRef<number | null>(null)
  const storyRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [entry, setEntry] = useState({ start: 0, end: 1 })
  const [exit, setExit] = useState({ start: 0, span: 1 })

  useEffect(() => {
    const measure = () => {
      const el = storyRef.current
      if (!el) return
      const vh = window.innerHeight
      const top = el.getBoundingClientRect().top + window.scrollY
      setEntry({ start: top - vh, end: top - vh * 0.25 })
      const bottom = el.getBoundingClientRect().bottom + window.scrollY
      const next = document.querySelector<HTMLElement>('#projetos')
      const start = next
        ? next.getBoundingClientRect().top + window.scrollY
        : bottom - vh
      const span = next ? Math.max(1, next.offsetHeight - vh) : vh
      setExit({ start, span })
    }
    measure()
    window.addEventListener('resize', measure)
    const timer = window.setTimeout(measure, 900)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearTimeout(timer)
    }
  }, [grupo])

  const entryRotate = useTransform(scrollY, [entry.start, entry.end], [30, 0])
  const exitX = useTransform(
    scrollY,
    [exit.start, exit.start + exit.span],
    ['0vw', '-100vw'],
  )

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const contagem = useMemo(
    () =>
      GRUPOS.reduce<Record<Grupo, number>>(
        (acc, g) => {
          acc[g.id] = CREDENCIAIS.filter((c) => c.grupo === g.id).length
          return acc
        },
        { formacoes: 0, certificados: 0, trabalhos: 0 },
      ),
    [],
  )

  const railItems: RailItem[] = useMemo(
    () =>
      CREDENCIAIS.filter((c) => c.grupo === shown).map((c) => ({
        id: c.id,
        name: c.titulo,
        series: c.instituicao,
        tag: c.status,
        description: c.descricao,
        details: [c.periodo, c.local, ...c.skills],
        strap: { color: c.tema.strap, ink: c.tema.strapInk, pattern: c.tema.pattern },
        front: (w: number) => <CardFace item={c} side="front" w={w} />,
        back: (w: number) => <CardFace item={c} side="back" w={w} />,
      })),
    [shown],
  )

  const trocar = (next: Grupo) => {
    if (next === grupo || out) return
    setGrupo(next)
    if (timer.current) window.clearTimeout(timer.current)
    setOut(true)
    timer.current = window.setTimeout(() => {
      setShown(next)
      setOut(false)
    }, 380)
  }

  const layoutSlots = useMemo(
    () => Math.max(1, ...GRUPOS.map((g) => contagem[g.id])),
    [contagem],
  )

  const irParaCertificacoes = useRef<() => void>(() => {})
  irParaCertificacoes.current = () => {
    trocar('certificados')
    window.requestAnimationFrame(() => {
      const el = document.getElementById('certificacoes')
      if (!el) return
      let top = 0
      let node: HTMLElement | null = el
      while (node) {
        top += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      const centred = top - Math.max(80, (window.innerHeight - el.offsetHeight) / 2)
      window.scrollTo({
        top: Math.max(0, centred),
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    })
  }

  useEffect(() => {
    const hash = '#certificacoes'
    const onHash = () => {
      if (window.location.hash === hash) irParaCertificacoes.current()
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target?.closest?.(`a[href="${hash}"]`)) return
      event.preventDefault()
      if (window.location.hash !== hash) window.history.pushState(null, '', hash)
      irParaCertificacoes.current()
    }
    const initial = window.location.hash === hash
      ? window.setTimeout(onHash, 700)
      : 0
    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    return () => {
      window.clearTimeout(initial)
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <div
      ref={storyRef}
      data-story-enter
      className="relative z-30 mt-[calc(-42svh)] w-full overflow-x-clip"
    >
      <motion.section
        id="formacao"
        style={
          reduceMotion
            ? undefined
            : { rotate: entryRotate, x: exitX, transformOrigin: 'bottom left' }
        }
        className="relative w-full origin-bottom-left overflow-hidden bg-black text-stone-200 antialiased selection:bg-stone-100 selection:text-black"
      >

        <div
          id="painel-formacao"
          role="tabpanel"
          aria-labelledby={`tab-${grupo}`}
          className="flex w-full flex-col pt-24 pb-32 md:pt-32 md:pb-48"
        >

          <div className="flex flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between md:gap-12 md:px-10 lg:px-14">
            <Reveal className="max-w-xl">
              <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">{DATA.eyebrow}</p>
              <h2 className="mt-3 font-serif text-[2.25rem] leading-[1.05] tracking-tight text-stone-50 md:text-[3rem] lg:text-[3.5rem]">
                {DATA.title}
              </h2>
            </Reveal>

            <Reveal delay={0.06} className="md:pb-1">
              <div
                role="tablist"
                aria-label="Grupos de credenciais"
                aria-orientation="horizontal"
                className="flex flex-wrap items-start gap-3 sm:gap-5 md:justify-end"
              >
                {GRUPOS.map((g) => {
                  const ativo = g.id === grupo
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      id={`tab-${g.id}`}
                      aria-selected={ativo}
                      aria-controls="painel-formacao"
                      aria-label={`${g.label}, ${contagem[g.id]} ${contagem[g.id] === 1 ? 'item' : 'itens'}`}
                      onClick={() => trocar(g.id)}
                      className="group/tab flex flex-col items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-200/60 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
                    >
                      <span className="relative inline-flex transition-transform duration-300 group-hover/tab:-translate-y-0.5 motion-reduce:transition-none">
                        <HoverSlatButton
                          aria-hidden="true"
                          initialText={g.label.toUpperCase()}
                          hoverText={g.hover.toUpperCase()}
                          hoverClassName="bg-white text-stone-900"
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute -bottom-1.5 left-0 h-[2px] bg-stone-100 transition-all duration-300 ${
                            ativo ? 'w-full opacity-100' : 'w-0 opacity-0'
                          }`}
                        />
                      </span>
                      <span
                        className={`font-mono text-[10px] leading-none tracking-[0.18em] tabular-nums uppercase transition-colors ${
                          ativo ? 'text-stone-200' : 'text-stone-500'
                        }`}
                      >
                        {String(contagem[g.id]).padStart(2, '0')} {contagem[g.id] === 1 ? 'item' : 'itens'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Reveal>
          </div>


          <div id="certificacoes" className="mt-10 w-full scroll-mt-28 md:mt-12">
            <div
              key={shown}
              className={out ? 'formacao-esteira-out' : 'formacao-esteira-in'}
            >
              <CredentialRail
                items={railItems}
                layoutCount={layoutSlots}
                caption="Passe o mouse sobre a fileira para trazer um cartão à frente."
                hint="passe o mouse · arraste para balançar · clique para abrir"
              />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

export default Formacao

import { Reveal } from '../components/ui/animations'
import LanyardBadge, { type StrapPattern } from '../components/ui/lanyard-badge'
import inovaseLogo from '../assets/img/logos/inovase-light.png'
import senaiLogo from '../assets/img/logos/senai.png'
import senaiLogoLight from '../assets/img/logos/senai-light.png'
import unitLogo from '../assets/img/logos/unit-light.png'

interface Tema {
  /** Papelão do cartão. */
  card: string
  /** Tinta principal. */
  ink: string
  /** Cor de destaque (selo, pill, faixa). */
  accent: string
  /** Cor do cordão. */
  strap: string
  /** Tinta impressa no cordão. */
  strapInk: string
  /** Motivo repetido no cordão. */
  pattern: StrapPattern
  /** Logo na frente do cartão (versão que contrasta com o papelão). */
  logo: string
  /** Logo na faixa escura do verso. */
  logoBar: string
}

interface FormacaoItem {
  id: string
  curso: string
  instituicao: string
  detalhe: string
  area: string
  periodo: string
  status: string
  local: string
  /** Linha manuscrita do cordão. */
  strapText: string
  /** Rótulo em caixa alta do cordão. */
  strapLabel: string
  tema: Tema
}

/**
 * Uma identidade por instituição: papelão, tinta, destaque e o motivo do
 * cordão. Os selos são desenhados em SVG (nítidos em qualquer tamanho e sem
 * depender de arquivo de logo).
 */
const TEMAS: Record<'unit' | 'senai' | 'inovase', Tema> = {
  unit: {
    card: '#0a2c56',
    ink: '#eef4fb',
    accent: '#f0b429',
    strap: '#0b3a6b',
    strapInk: '#f0b429',
    pattern: 'orbit',
    logo: unitLogo,
    logoBar: unitLogo,
  },
  senai: {
    card: '#f2ede3',
    ink: '#0b4a9b',
    accent: '#e8501e',
    strap: '#0b4a9b',
    strapInk: '#f6a01e',
    pattern: 'grid',
    logo: senaiLogo,
    logoBar: senaiLogoLight,
  },
  inovase: {
    card: '#062b45',
    ink: '#eef8fb',
    accent: '#63c46f',
    strap: '#08334f',
    strapInk: '#7fd39a',
    pattern: 'circuit',
    logo: inovaseLogo,
    logoBar: inovaseLogo,
  },
}

const FORMACOES: FormacaoItem[] = [
  {
    id: 'unit-cc',
    curso: 'Ciência da Computação',
    instituicao: 'UNIT',
    detalhe: 'Centro Universitário Tiradentes',
    area: 'Bacharelado',
    periodo: '2026 — 2030',
    status: 'Cursando',
    local: 'Aracaju, SE',
    strapText: 'unit',
    strapLabel: 'CENTRO UNIV. TIRADENTES',
    tema: TEMAS.unit,
  },
  {
    id: 'senai-tds',
    curso: 'Técnico em Desenvolvimento de Sistemas',
    instituicao: 'SENAI',
    detalhe: 'CETAF · Aracaju',
    area: 'Tecnologia da Informação',
    periodo: '01/2023 — 12/2025',
    status: 'Concluído',
    local: 'Aracaju, SE',
    strapText: 'senai',
    strapLabel: 'CETAF · ARACAJU',
    tema: TEMAS.senai,
  },
  {
    id: 'inovase-backend',
    curso: 'Desenvolvimento de Sistemas',
    instituicao: 'INOVASE',
    detalhe: 'Instituto de Inovação de Sergipe',
    area: 'Backend',
    periodo: '10/2025 — 03/2026',
    status: 'Cursando',
    local: 'Aracaju, SE',
    strapText: 'inovase',
    strapLabel: 'INOVAÇÃO · SE',
    tema: TEMAS.inovase,
  },
  {
    id: 'inovase-frontend',
    curso: 'Desenvolvimento de Sistemas',
    instituicao: 'INOVASE',
    detalhe: 'Instituto de Inovação de Sergipe',
    area: 'Frontend',
    periodo: '07/2025 — 10/2025',
    status: 'Concluído',
    local: 'Aracaju, SE',
    strapText: 'inovase',
    strapLabel: 'INOVAÇÃO · SE',
    tema: TEMAS.inovase,
  },
]

/* --------------------------------------------------------------------------
   Selos (SVG, currentColor)
   -------------------------------------------------------------------------- */

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

function Seal({ id, size }: { id: FormacaoItem['id']; size: number }) {
  if (id.startsWith('unit')) return <SealUnit size={size} />
  if (id.startsWith('senai')) return <SealSenai size={size} />
  return <SealInovase size={size} />
}

/* --------------------------------------------------------------------------
   Frente e verso
   -------------------------------------------------------------------------- */

function CredentialFront({ item, s }: { item: FormacaoItem; s: number }) {
  const { tema } = item
  const statusAberto = item.status === 'Cursando'

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: tema.card, color: tema.ink }}
    >
      {/* selo gigante como marca d'água */}
      <div
        className="pointer-events-none absolute"
        style={{ right: -72 * s, top: 96 * s, opacity: 0.14, color: tema.accent }}
      >
        <Seal id={item.id} size={250 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <div
          className="flex items-center justify-between"
          style={{ fontSize: 6.5 * s, letterSpacing: '0.22em', textTransform: 'uppercase' }}
        >
          <span style={{ opacity: 0.7 }}>Credencial</span>
          <span style={{ opacity: statusAberto ? 1 : 0.7 }}>{item.status}</span>
        </div>

        <img
          src={tema.logo}
          alt={item.instituicao}
          style={{
            display: 'block',
            height: (item.id.startsWith('senai') ? 36 : 40) * s,
            width: 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
            marginTop: 14 * s,
          }}
        />

        <div
          style={{
            width: 34 * s,
            height: 2 * s,
            background: tema.accent,
            marginTop: 12 * s,
          }}
        />

        <div
          style={{
            fontSize: 11 * s,
            lineHeight: 1.35,
            marginTop: 13 * s,
            opacity: 0.92,
            textWrap: 'balance',
          }}
        >
          {item.curso}
        </div>

        <div
          className="inline-flex items-center"
          style={{
            marginTop: 14 * s,
            padding: `${3.5 * s}px ${7 * s}px`,
            border: `${1 * s}px solid ${tema.accent}`,
            borderRadius: 999,
            color: tema.accent,
            fontSize: 6.5 * s,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {item.area}
        </div>
      </div>

      <div
        className="absolute flex items-end justify-between"
        style={{ left: 22 * s, right: 22 * s, bottom: 22 * s }}
      >
        <div>
          <div
            style={{
              fontSize: 6 * s,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.55,
            }}
          >
            Período
          </div>
          <div style={{ fontSize: 8 * s, letterSpacing: '0.08em', marginTop: 3 * s }}>
            {item.periodo}
          </div>
        </div>
        <div style={{ color: tema.accent, opacity: 0.9 }}>
          <Seal id={item.id} size={26 * s} />
        </div>
      </div>
    </div>
  )
}

function CredentialBack({ item, s }: { item: FormacaoItem; s: number }) {
  const { tema } = item
  const statusAberto = item.status === 'Cursando'

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: tema.card, color: tema.ink }}
    >
      <div
        className="pointer-events-none absolute"
        style={{ left: -58 * s, bottom: 30 * s, opacity: 0.12, color: tema.accent }}
      >
        <Seal id={item.id} size={220 * s} />
      </div>

      <div className="absolute" style={{ left: 22 * s, right: 22 * s, top: 32 * s }}>
        <div
          style={{
            fontSize: 6.5 * s,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          Status
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 21 * s,
            letterSpacing: '-0.01em',
            marginTop: 7 * s,
          }}
        >
          {item.status}
        </div>

        <div style={{ height: 1, background: tema.accent, opacity: 0.35, marginTop: 16 * s }} />

        <div style={{ marginTop: 14 * s }}>
          <div
            style={{
              fontSize: 6 * s,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.55,
            }}
          >
            Período
          </div>
          <div style={{ fontSize: 9 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>
            {item.periodo}
          </div>
        </div>

        <div style={{ marginTop: 12 * s }}>
          <div
            style={{
              fontSize: 6 * s,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.55,
            }}
          >
            Local
          </div>
          <div style={{ fontSize: 9 * s, marginTop: 3 * s, letterSpacing: '0.06em' }}>
            {item.local}
          </div>
        </div>

        <div style={{ marginTop: 12 * s }}>
          <div
            style={{
              fontSize: 6 * s,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.55,
            }}
          >
            Curso
          </div>
          <div style={{ fontSize: 8.5 * s, marginTop: 3 * s, lineHeight: 1.35, opacity: 0.9 }}>
            {item.curso}
          </div>
        </div>
      </div>

      {/* faixa inferior com a instituição e um código de barras */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-end justify-between"
        style={{
          background: tema.strap,
          color: tema.strapInk,
          padding: `${12 * s}px ${22 * s}px`,
          borderTopLeftRadius: 22 * s,
          borderTopRightRadius: 22 * s,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 6 * s,
              lineHeight: 1.2,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: 0.65,
              maxWidth: 104 * s,
            }}
          >
            {item.detalhe}
          </div>
          <img
            src={tema.logoBar}
            alt={item.instituicao}
            style={{
              display: 'block',
              height: 18 * s,
              width: 'auto',
              maxWidth: 104 * s,
              objectFit: 'contain',
              marginTop: 4 * s,
            }}
          />
        </div>
        <div className="flex items-end" style={{ gap: 1.4 * s, height: 22 * s }} aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
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
    </div>
  )
}

export function Formacao() {
  return (
    <section
      id="formacao"
      className="relative w-full overflow-hidden bg-black px-6 py-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:py-32 lg:px-12"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
                Formação
              </p>
              <h2 className="mt-5 max-w-[900px] font-serif text-[2.75rem] leading-[1.05] tracking-tight text-stone-50 md:text-[4rem] lg:text-[5rem]">
                O que me formou.
              </h2>
            </div>
            <p className="font-serif text-sm text-stone-500">
              {String(FORMACOES.length).padStart(2, '0')} credenciais
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-7 max-w-xl">
          <p className="text-base leading-relaxed text-stone-400 md:text-lg">
            Cada crachá é uma etapa, com a identidade da instituição: o curso na
            frente, o status e o período no verso.
          </p>
        </Reveal>

        <div className="relative mt-14">
          {/* trilho de onde os crachás penduram */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 md:justify-center [&::-webkit-scrollbar]:hidden">
            {FORMACOES.map((formacao) => (
              <div
                key={formacao.id}
                className="w-[240px] shrink-0 snap-center sm:w-[280px]"
              >
                <LanyardBadge
                  front={(s) => <CredentialFront item={formacao} s={s} />}
                  back={(s) => <CredentialBack item={formacao} s={s} />}
                  strapText={formacao.strapText}
                  strapLabel={formacao.strapLabel}
                  strapColor={formacao.tema.strap}
                  strapPattern={formacao.tema.pattern}
                  inkColor={formacao.tema.strapInk}
                  cardColor={formacao.tema.card}
                  label={`Crachá de ${formacao.curso} — ${formacao.instituicao}. Arraste para balançar, toque para virar.`}
                  cardWidth={200}
                  height="560px"
                  flipButton={false}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] tracking-[0.18em] text-stone-500 uppercase">
          arraste para balançar · toque no crachá para virar · deslize para ver os outros
        </p>
      </div>
    </section>
  )
}

export default Formacao

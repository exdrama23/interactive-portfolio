import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Reveal } from '../components/ui/animations'
import CredentialRail from '../components/ui/credential-rail'
import type { RailItem } from '../components/ui/credential-rail'
import type { StrapPattern } from '../components/ui/lanyard-badge'
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
  /** Cor do cordão / faixa inferior. */
  strap: string
  /** Tinta impressa no cordão. */
  strapInk: string
  /** Motivo repetido no cordão. */
  pattern: StrapPattern
  /** Logo na frente do cartão (versão que contrasta com o papelão). */
  logo?: string
  /** Logo na faixa escura do verso. */
  logoBar?: string
  /** Marca tipográfica quando não existe arquivo de logo. */
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
  /** Linha em caixa alta da faixa inferior. */
  strapLabel: string
  tema: Tema
  descricao: string
  skills: string[]
  codigo?: string
}

/**
 * Uma identidade por instituição: papelão, tinta, destaque e o motivo do
 * cordão. Os selos são desenhados em SVG (nítidos em qualquer tamanho e sem
 * depender de arquivo de logo).
 */
const TEMAS: Record<'unit' | 'senai' | 'inovase' | 'acesso', Tema> = {
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
  acesso: {
    card: '#101413',
    ink: '#f0f6f1',
    accent: '#9be8b0',
    strap: '#2c4136',
    strapInk: '#b9f5c9',
    pattern: 'orbit',
    monogram: 'A',
  },
}

const CREDENCIAIS: Credencial[] = [
  /* ---------------------------------------------------------------- formações */
  {
    id: 'unit-cc',
    grupo: 'formacoes',
    tipo: 'formacao',
    titulo: 'Ciência da Computação',
    instituicao: 'UNIT',
    detalhe: 'Centro Universitário Tiradentes',
    area: 'Bacharelado',
    periodo: '2026 — 2030',
    status: 'Cursando',
    local: 'Aracaju, SE',
    strapLabel: 'CENTRO UNIV. TIRADENTES',
    tema: TEMAS.unit,
    descricao:
      'Bacharelado com foco em fundamentos da computação, algoritmos, estruturas de dados e engenharia de software.',
    skills: ['Algoritmos', 'Estruturas de dados', 'POO', 'Engenharia de software'],
  },
  {
    id: 'senai-tds',
    grupo: 'formacoes',
    tipo: 'formacao',
    titulo: 'Técnico em Desenvolvimento de Sistemas',
    instituicao: 'SENAI',
    detalhe: 'CETAF · Aracaju',
    area: 'Tecnologia da Informação',
    periodo: '01/2023 — 12/2025',
    status: 'Concluído',
    local: 'Aracaju, SE',
    strapLabel: 'CETAF · ARACAJU',
    tema: TEMAS.senai,
    descricao:
      'Curso técnico com foco em desenvolvimento de software, lógica de programação, banco de dados e metodologias ágeis.',
    skills: ['Desenvolvimento web', 'Metodologias ágeis', 'Banco de dados', 'Git'],
  },
  {
    id: 'inovase-backend',
    grupo: 'formacoes',
    tipo: 'formacao',
    titulo: 'Desenvolvimento de Sistemas',
    instituicao: 'INOVASE',
    detalhe: 'Instituto de Inovação de Sergipe',
    area: 'Backend',
    periodo: '10/2025 — 03/2026',
    status: 'Cursando',
    local: 'Aracaju, SE',
    strapLabel: 'INOVAÇÃO · SE',
    tema: TEMAS.inovase,
    descricao:
      'Formação em desenvolvimento backend com Python, construção de APIs, modelagem de dados e boas práticas de engenharia.',
    skills: ['Python', 'APIs', 'Banco de dados', 'Docker'],
  },
  {
    id: 'inovase-frontend',
    grupo: 'formacoes',
    tipo: 'formacao',
    titulo: 'Desenvolvimento de Sistemas',
    instituicao: 'INOVASE',
    detalhe: 'Instituto de Inovação de Sergipe',
    area: 'Frontend',
    periodo: '07/2025 — 10/2025',
    status: 'Concluído',
    local: 'Aracaju, SE',
    strapLabel: 'INOVAÇÃO · SE',
    tema: TEMAS.inovase,
    descricao:
      'Formação em desenvolvimento frontend com React, TypeScript, HTML, CSS e integração com APIs.',
    skills: ['React', 'TypeScript', 'CSS', 'APIs'],
  },

  /* ------------------------------------------------------------- certificados */
  {
    id: 'senai-ia-industrial',
    grupo: 'certificados',
    tipo: 'certificado',
    titulo: 'Inteligência Artificial Industrial',
    instituicao: 'SENAI',
    detalhe: 'Serviço Nacional de Aprendizagem Industrial',
    area: 'Inteligência Artificial',
    periodo: 'abr. de 2026',
    status: 'Emitido',
    local: 'Sergipe',
    strapLabel: 'SENAI · SERGIPE',
    tema: TEMAS.senai,
    descricao:
      'Certificação em inteligência artificial aplicada à indústria, com Python, programação orientada a objetos, visão computacional e aprendizado de máquina.',
    skills: ['Python', 'POO', 'Visão computacional', 'Aprendizado de máquina', 'IA industrial'],
    codigo: '69d134af-42b8-44a5-89da-a5960a40004f',
  },

  /* ----------------------------------------------------------------- trabalhos */
  {
    id: 'acesso-dev-junior',
    grupo: 'trabalhos',
    tipo: 'trabalho',
    titulo: 'Desenvolvedor Júnior',
    instituicao: 'ACESSO',
    detalhe: 'Acesso',
    area: 'Tempo integral',
    periodo: 'fev. 2026 — o momento',
    status: 'Atual',
    local: 'Aracaju, SE',
    strapLabel: 'ACESSO · ARACAJU',
    tema: TEMAS.acesso,
    descricao:
      'Desenvolvimento full-stack em ecossistemas web e backend, integrando tecnologias tradicionais a soluções de inteligência artificial.',
    skills: ['React', 'Node.js', 'Python', 'AWS', 'Inteligência artificial'],
  },
]

const GRUPOS: { id: Grupo; label: string }[] = [
  { id: 'formacoes', label: 'Formações' },
  { id: 'certificados', label: 'Certificados' },
  { id: 'trabalhos', label: 'Trabalhos' },
]

const DESCRICAO_GRUPO: Record<Grupo, string> = {
  formacoes:
    'Graduação e formação técnica, cada uma com a identidade da instituição: o curso na frente, o status e o período no verso.',
  certificados:
    'Certificações que complementam a base técnica — a credencial na frente, as competências e o código no verso.',
  trabalhos:
    'Onde a formação vira prática: o cargo na frente, a atuação e as tecnologias no verso.',
}

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
  if (item.id.startsWith('unit')) return <SealUnit size={size} />
  if (item.id.startsWith('senai')) return <SealSenai size={size} />
  if (item.id.startsWith('inovase')) return <SealInovase size={size} />
  return <SealWork letter={item.tema.monogram ?? '•'} size={size} />
}

/* --------------------------------------------------------------------------
   Peças comuns
   -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
   Frentes e versos
   -------------------------------------------------------------------------- */

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
              height: (item.id.startsWith('senai') ? 36 : 40) * s,
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

/* --------------------------------------------------------------------------
   Seção
   -------------------------------------------------------------------------- */

export function Formacao() {
  const [grupo, setGrupo] = useState<Grupo>('formacoes')
  const [shown, setShown] = useState<Grupo>('formacoes')
  const [out, setOut] = useState(false)
  const timer = useRef<number | null>(null)

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
    }, 300)
  }

  const quantidade = contagem[grupo]

  return (
    <section
      id="formacao"
      className="relative w-full overflow-hidden bg-black px-6 py-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:py-32 lg:px-12"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">Formação</p>
              <h2 className="mt-5 max-w-[900px] font-serif text-[2.75rem] leading-[1.05] tracking-tight text-stone-50 md:text-[4rem] lg:text-[5rem]">
                O que me formou.
              </h2>
            </div>
            <p className="font-serif text-sm text-stone-500">
              {String(quantidade).padStart(2, '0')} {quantidade === 1 ? 'cartão' : 'cartões'}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-7 max-w-xl">
          <p className="text-base leading-relaxed text-stone-400 md:text-lg">{DESCRICAO_GRUPO[grupo]}</p>
        </Reveal>

        <Reveal delay={0.16}>
          <div
            role="tablist"
            aria-label="Grupos de credenciais"
            aria-orientation="horizontal"
            className="mt-9 inline-flex flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur"
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
                  onClick={() => trocar(g.id)}
                  className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stone-200/60 motion-reduce:transition-none ${
                    ativo
                      ? 'bg-stone-100 text-stone-900'
                      : 'text-stone-400 hover:bg-white/5 hover:text-stone-100'
                  }`}
                >
                  {g.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums ${
                      ativo ? 'bg-black/10 text-stone-700' : 'bg-white/5 text-stone-500 group-hover:text-stone-300'
                    }`}
                  >
                    {String(contagem[g.id]).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <div
          id="painel-formacao"
          role="tabpanel"
          aria-labelledby={`tab-${grupo}`}
          className="mt-6"
        >
          <div
            key={shown}
            className={out ? 'formacao-esteira-out' : 'formacao-esteira-in'}
          >
            <CredentialRail
              items={railItems}
              caption="Passe o mouse sobre a fileira para trazer um cartão à frente."
              hint="passe o mouse · arraste para balançar · clique para abrir"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Formacao

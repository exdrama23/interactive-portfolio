import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { NotchedProjectCard } from '@/components/ui/projetos/notched-project-card'
import type { ProjectDetail } from '@/components/ui/projetos/project-focus-info'
import projetosData from '../data/projetos.json'


interface ProjetosData {
  label: string
  hint: string
  projects: ProjectDetail[]
}

const DATA = projetosData as unknown as ProjetosData
const PROJETOS = DATA.projects

const ALL = 'Todos'

const CATEGORIAS = Array.from(
  new Set(PROJETOS.flatMap((project) => project.categories ?? [])),
).sort((a, b) => a.localeCompare(b, 'pt-BR'))

const TOTAL_POR_CATEGORIA = CATEGORIAS.reduce<Record<string, number>>(
  (acc, category) => {
    acc[category] = PROJETOS.filter((p) =>
      (p.categories ?? []).includes(category),
    ).length
    return acc
  },
  {},
)

function coverUrl(url: string) {
  return url
    .replace(/([?&])h=\d+/, '$1h=900')
    .replace(/([?&])w=\d+/, '$1w=1200')
}

export function ProjetosTodos() {
  const [active, setActive] = useState<string>(ALL)

  const filtered = useMemo(
    () =>
      active === ALL
        ? PROJETOS
        : PROJETOS.filter((p) => (p.categories ?? []).includes(active)),
    [active],
  )

  return (
    <main
      id="projetos-arquivo"
      className="relative min-h-screen w-full bg-black px-6 pt-24 pb-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:px-10 md:pt-28 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-stone-500 uppercase transition-colors hover:text-stone-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao início
        </Link>

        <header className="mt-10 border-b border-white/10 pb-10 md:mt-14 md:pb-14">
          <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
            Arquivo · {DATA.label}
          </p>
          <h1 className="mt-5 max-w-[20ch] font-serif text-[2.75rem] leading-[1.02] tracking-tight text-stone-50 md:text-[4.5rem] lg:text-[5.5rem]">
            Todos os projetos.
          </h1>
          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[52ch] text-base leading-relaxed text-stone-400 md:text-lg">
              Uma seleção de sistemas, produtos e experimentos — do back-end que
              sustenta operações ao detalhe de interface que faz a coisa toda
              parecer simples.
            </p>
            <p className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-stone-600 uppercase">
              {String(PROJETOS.length).padStart(2, '0')} projetos · 2023—2026
            </p>
          </div>
        </header>

        <div className="mt-10 flex flex-col gap-10 lg:mt-14 lg:flex-row lg:gap-14">
          <aside className="lg:w-[240px] lg:shrink-0">
            <div className="lg:sticky lg:top-28">
              <p className="text-[10px] font-medium tracking-[0.24em] text-stone-500 uppercase">
                Filtrar por
              </p>

              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:pb-0">
                <FilterButton
                  label={ALL}
                  count={PROJETOS.length}
                  active={active === ALL}
                  onClick={() => setActive(ALL)}
                />
                {CATEGORIAS.map((category) => (
                  <FilterButton
                    key={category}
                    label={category}
                    count={TOTAL_POR_CATEGORIA[category] ?? 0}
                    active={active === category}
                    onClick={() => setActive(category)}
                  />
                ))}
              </div>

              <p
                aria-live="polite"
                className="mt-5 hidden font-mono text-[10px] tracking-[0.18em] text-stone-600 uppercase lg:block"
              >
                {String(filtered.length).padStart(2, '0')} de{' '}
                {String(PROJETOS.length).padStart(2, '0')} visíveis
              </p>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <ul
              key={active}
              className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:gap-x-8 xl:gap-y-16"
            >
              {filtered.map((project, index) => (
                <li
                  key={project.id}
                  className="animate-[archive-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <NotchedProjectCard
                    href={project.links?.[0]?.url || '#'}
                    title={project.title}
                    description={project.caption ?? project.summary}
                    image={coverUrl(project.image)}
                    imageAlt={project.alt}
                    tags={project.techs?.slice(0, 4)}
                    surface="#000000"
                  />
                </li>
              ))}
            </ul>

            {filtered.length === 0 && (
              <p className="mt-10 text-sm text-stone-500">
                Nenhum projeto nesta categoria ainda.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes archive-in {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </main>
  )
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex shrink-0 items-center justify-between gap-3 rounded-full border px-4 py-2 text-left font-mono text-[10px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors lg:w-full lg:rounded-lg lg:px-3 lg:py-2.5 ' +
        (active
          ? 'border-stone-100 bg-stone-100 text-black'
          : 'border-white/15 text-stone-400 hover:border-white/35 hover:text-stone-100')
      }
    >
      <span>{label}</span>
      <span className={active ? 'text-black/60' : 'text-stone-600'}>{count}</span>
    </button>
  )
}

export default ProjetosTodos

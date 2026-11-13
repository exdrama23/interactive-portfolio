export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectCompany {
  name: string
  logo?: string
  url?: string
}

export interface ProjectDetail {
  id: string
  title: string
  kicker?: string
  caption?: string
  image: string
  alt?: string
  company?: ProjectCompany
  links?: ProjectLink[]
  summary?: string
  techs?: string[]
  description?: string
}

export function ProjectFocusInfo({
  project,
  index = 0,
  total = 0,
}: {
  project: ProjectDetail
  index?: number
  total?: number
}) {
  return (
    <>

      <div className="pointer-events-auto absolute top-1/2 right-[calc(50%_+_21svh_+_1.5rem)] hidden max-h-[86svh] w-[min(calc(50%_-_21svh_-_3rem),430px)] -translate-y-1/2 overflow-y-auto pr-2 lg:block">
        <ProjectMeta project={project} />
      </div>

      <div className="pointer-events-auto absolute top-1/2 left-[calc(50%_+_21svh_+_1.5rem)] hidden max-h-[86svh] w-[min(calc(50%_-_21svh_-_3rem),540px)] -translate-y-1/2 overflow-y-auto pl-2 lg:block">
        <ProjectDescription project={project} index={index} total={total} />
      </div>


      <div className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[48svh] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-black/75 p-5 text-stone-200 shadow-2xl backdrop-blur-xl lg:hidden">
        <ProjectMeta project={project} compact />
        <div className="mt-5 border-t border-white/10 pt-4">
          <ProjectDescription project={project} index={index} total={total} compact />
        </div>
      </div>
    </>
  )
}

function ProjectMeta({
  project,
  compact = false,
}: {
  project: ProjectDetail
  compact?: boolean
}) {
  return (
    <div>
      {project.kicker && (
        <p className="text-[11px] font-medium tracking-[0.22em] text-stone-500 uppercase">
          {project.kicker}
        </p>
      )}
      <h2
        className={`mt-2 font-serif leading-[0.95] tracking-[-0.03em] text-stone-50 ${
          compact ? 'text-[2.2rem]' : 'text-[clamp(2.4rem,3.4vw,3.6rem)]'
        }`}
      >
        {project.title}
      </h2>

      {project.company?.name && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-medium tracking-[0.22em] text-stone-500 uppercase">
            Empresa
          </span>
          {project.company.url ? (
            <a
              href={project.company.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-b border-white/20 pb-0.5 transition-colors hover:border-white/60"
            >
              <CompanyMark company={project.company} />
            </a>
          ) : (
            <CompanyMark company={project.company} />
          )}
        </div>
      )}

      {project.links && project.links.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-4 text-[12px] font-medium tracking-[0.14em] uppercase">
          {project.links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 border-b border-white/20 pb-1 text-stone-300 transition-colors hover:border-white/60 hover:text-stone-50"
            >
              {link.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          ))}
        </div>
      )}

      {project.summary && (
        <p className="mt-5 text-[15px] leading-[1.7] text-stone-300 xl:text-[16px]">
          {project.summary}
        </p>
      )}

      {project.techs && project.techs.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] font-medium tracking-[0.22em] text-stone-500 uppercase">
            Tecnologias
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.techs.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/15 px-3 py-1.5 text-[10.5px] font-medium tracking-[0.08em] text-stone-300 uppercase"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectDescription({
  project,
  index,
  total,
  compact = false,
}: {
  project: ProjectDetail
  index: number
  total: number
  compact?: boolean
}) {
  const paragraphs = (project.description ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div>
      <p className="text-[10px] font-medium tracking-[0.26em] text-stone-500 uppercase">
        Sobre o projeto
      </p>
      <div
        className={`mt-4 text-stone-300 ${
          compact
            ? 'space-y-3 text-[14px] leading-[1.75]'
            : 'space-y-4 text-[14.5px] leading-[1.8] xl:text-[15px] xl:leading-[1.85]'
        }`}
      >
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <p className="text-stone-500">Descrição completa em breve.</p>
        )}
      </div>

      <div className="mt-7 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
        <span className="pb-0.5 text-[10px] tracking-[0.22em] text-stone-600 uppercase">
          {total > 0
            ? `Projeto ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
            : 'Projeto'}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none -mb-3 font-serif text-[4rem] leading-none text-white/[0.07] select-none"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

function CompanyMark({ company }: { company: ProjectCompany }) {
  if (company.logo) {
    return (
      <img
        src={company.logo}
        alt={company.name}
        className="h-6 w-auto max-w-[150px] object-contain"
      />
    )
  }
  return (
    <span className="text-[12px] font-semibold tracking-[0.14em] text-stone-200 uppercase">
      {company.name}
    </span>
  )
}

export default ProjectFocusInfo

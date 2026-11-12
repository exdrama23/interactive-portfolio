import { Cloud, Database, Smartphone } from 'lucide-react'
import { Reveal } from '../components/ui/animations'
import { TechRelay, type TechCategory, type TechItem } from '../components/ui/tech-relay-3d'

const GRID_TECHS: TechItem[] = [
  { name: 'Tailwind', slug: 'tailwindcss', category: 'Front-end & UI' },
  { name: 'React', slug: 'react', category: 'Front-end & UI' },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'Banco de Dados & Cache' },
  { name: 'Docker', slug: 'docker', category: 'Cloud & DevOps' },
  { name: 'Git', slug: 'git', category: 'Cloud & DevOps' },
  { name: 'three.js', slug: 'threedotjs', category: 'Front-end & UI' },
  { name: 'GSAP', slug: 'greensock', category: 'Front-end & UI' },
  { name: 'Express', slug: 'express', category: 'Back-end & APIs' },
  { name: 'Prisma', slug: 'prisma', category: 'Back-end & APIs' },
  { name: 'MySQL', slug: 'mysql', category: 'Banco de Dados & Cache' },
  { name: 'Azure', icon: Cloud, category: 'Cloud & DevOps' },
  { name: 'Postman', slug: 'postman', category: 'Ferramentas e Plataformas' },
  { name: 'DBeaver', slug: 'dbeaver', category: 'Ferramentas e Plataformas' },
  { name: 'Redis', slug: 'redis', category: 'Banco de Dados & Cache' },
  { name: 'Socket.io', slug: 'socketdotio', category: 'Back-end & APIs' },
  { name: 'Vite', slug: 'vite', category: 'Front-end & UI' },
  { name: 'Anime.js', slug: 'animedotjs', category: 'Front-end & UI' },
  { name: 'GitHub', slug: 'github', category: 'Cloud & DevOps' },
  { name: 'SQL Server', icon: Database, category: 'Banco de Dados & Cache' },
  { name: 'Bootstrap', slug: 'bootstrap', category: 'Front-end & UI' },
  { name: 'n8n', slug: 'n8n', category: 'Conceitos & Especialidades' },
  { name: 'MediaPipe', slug: 'mediapipe', category: 'Conceitos & Especialidades' },
  { name: 'React Native', icon: Smartphone, category: 'Front-end & UI' },
  { name: 'GLSL / Shaders', slug: 'opengl', category: 'Front-end & UI' },
]

const EXTRA_TECHS: TechItem[] = [
  { name: 'particles.js', category: 'Front-end & UI' },
  { name: 'ScrollTrigger', category: 'Front-end & UI' },
  { name: 'Lenis / Smooth Scroll', category: 'Front-end & UI' },
  { name: 'Interactive UI & motion systems', category: 'Front-end & UI' },
  { name: 'React Three Fiber', category: 'Front-end & UI' },
  { name: 'API REST', category: 'Back-end & APIs' },
  { name: 'IXC', category: 'Back-end & APIs' },
  { name: 'Machine Learning', category: 'Conceitos & Especialidades' },
  { name: 'Arquitetura de Software (POO)', category: 'Conceitos & Especialidades' },
  { name: 'Sistemas em Cloud', category: 'Conceitos & Especialidades' },
  { name: 'Real-time interaction', category: 'Conceitos & Especialidades' },
]

const CATEGORIES: TechCategory[] = [
  'Front-end & UI',
  'Back-end & APIs',
  'Banco de Dados & Cache',
  'Cloud & DevOps',
  'Ferramentas e Plataformas',
  'Conceitos & Especialidades',
]

export function Tecnologias() {
  const all = [...GRID_TECHS, ...EXTRA_TECHS]

  return (
    <section
      id="skills"
      className="relative w-full overflow-hidden bg-black px-6 py-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:py-32 lg:px-12"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
            Hard skills
          </p>
          <h2 className="mt-5 max-w-[900px] font-serif text-[2.75rem] leading-[1.05] tracking-tight text-stone-50 md:text-[4rem] lg:text-[5rem]">
            Tecnologias que eu uso.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-7 max-w-xl">
          <p className="text-base leading-relaxed text-stone-400 md:text-lg">
            Cada quadrado é uma ferramenta que já coloquei em produção. O centro
            abre o que ainda não tem logo oficial — mas também faz parte do
            trabalho.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Reveal delay={0.15}>
              <ul className="border-t border-white/10">
                {CATEGORIES.map((category) => {
                  const techs = all.filter((tech) => tech.category === category)

                  return (
                    <li
                      key={category}
                      className="group flex flex-col gap-1 border-b border-white/10 py-5 transition-colors duration-500 hover:border-white/25"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm font-medium tracking-wide text-stone-200 transition-colors group-hover:text-white md:text-[15px]">
                          {category}
                        </span>
                        <span className="font-serif text-sm text-stone-500">
                          {String(techs.length).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-stone-500">
                        {techs.map((tech) => tech.name).join(' · ')}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </Reveal>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <TechRelay items={GRID_TECHS} extras={EXTRA_TECHS} />
            <p className="mt-6 text-center text-[11px] tracking-[0.18em] text-stone-500 uppercase">
              {GRID_TECHS.length} na grade · toque no “mais” para ver as outras{' '}
              {EXTRA_TECHS.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Tecnologias

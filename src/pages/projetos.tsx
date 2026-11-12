import { Reveal } from '../components/ui/animations'
import CurvedLensCarousel, {
  type LensSlide,
} from '../components/ui/3d-curved-carousel'

/**
 * Dados de exemplo — troque pelos reais.
 * As imagens usam o CDN do Unsplash (CORS liberado, exigido pelo WebGL).
 * O carrossel recorta em 4:5, então prefira fotos verticais.
 */
const PROJETOS: LensSlide[] = [
  {
    kicker: 'Dashboard · React + TypeScript',
    title: 'Aurora',
    caption:
      'Painel de operações com métricas em tempo real, permissões por papel e relatórios exportáveis.',
    image:
      'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=900&h=1125&q=80',
    alt: 'Montanhas cobertas de neve ao anoitecer',
  },
  {
    kicker: 'API · Node.js + PostgreSQL',
    title: 'Núcleo',
    caption:
      'Back-end modular com autenticação, filas e integrações — documentado de ponta a ponta.',
    image:
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&h=1125&q=80',
    alt: 'Lago cercado por montanhas, água parada refletindo o céu',
  },
  {
    kicker: 'E-commerce · Next.js',
    title: 'Vitrine',
    caption:
      'Loja completa com catálogo, carrinho persistente e checkout integrado a meios de pagamento.',
    image:
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=900&h=1125&q=80',
    alt: 'Cachoeira entre paredões de rocha e vegetação',
  },
  {
    kicker: 'Experimento 3D · WebGL',
    title: 'Orbe',
    caption:
      'Estudo de materiais, luz e movimento em tempo real — a mesma linguagem visual deste portfólio.',
    image:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&h=1125&q=80',
    alt: 'Pico rochoso sob um céu estrelado',
  },
  {
    kicker: 'PWA · Offline first',
    title: 'Rota',
    caption:
      'Aplicação instalável com cache inteligente, sincronização em segundo plano e mapa em campo.',
    image:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&h=1125&q=80',
    alt: 'Floresta enevoada vista do alto',
  },
]

export function Projetos() {
  return (
    <section
      id="projetos"
      className="relative w-full overflow-hidden bg-black px-6 py-24 text-stone-200 antialiased selection:bg-stone-100 selection:text-black md:py-32 lg:px-12"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.24em] text-stone-500 uppercase">
                Projetos
              </p>
              <h2 className="mt-5 max-w-[900px] font-serif text-[2.75rem] leading-[1.05] tracking-tight text-stone-50 md:text-[4rem] lg:text-[5rem]">
                Coisas que construí.
              </h2>
            </div>
            <p className="font-serif text-sm text-stone-500">
              {String(PROJETOS.length).padStart(2, '0')} selecionados
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-7 max-w-xl">
          <p className="text-base leading-relaxed text-stone-400 md:text-lg">
            Uma seleção de produtos, experimentos e sistemas — do primeiro
            rascunho ao deploy. Arraste para atravessar a lente.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <div className="overflow-hidden rounded-sm border border-white/10 bg-black">
            <CurvedLensCarousel
              slides={PROJETOS}
              label="Projetos selecionados — Vol. 01"
              bend={0.6}
              background="#000000"
              ink="#f3ede4"
              height="clamp(540px, 78vh, 800px)"
            />
          </div>
        </Reveal>

        <p className="mt-4 text-center text-[11px] tracking-[0.18em] text-stone-500 uppercase">
          arraste · setas do teclado · botões para navegar
        </p>
      </div>
    </section>
  )
}

export default Projetos

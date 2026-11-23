// Barra comum dos estúdios de desenvolvimento. Cada página continua sendo uma
// rota propria, entao a navegacao usa link normal em vez de roteador.

const LINKS = [
  { href: '/__sprite-studio', label: 'studio 43x55' },
  { href: '/__sprite-preview', label: 'preview 43x55' },
  { href: '/__nox-preview', label: 'preview Nox' },
  { href: '/__nox-import', label: 'importar Nox' },
  { href: '/__pixel-editor', label: 'pixel editor' },
]

export function StudioNav({ current }: { current: string }) {
  return (
    <nav aria-label='estudios' className='flex flex-wrap items-center gap-1 text-xs'>
      {LINKS.map((link) => {
        const active = link.href === current
        return (
          <a
            key={link.href}
            href={link.href}
            data-no-transition
            aria-current={active ? 'page' : undefined}
            className={`rounded border px-2 py-1 transition ${
              active
                ? 'border-amber-500/60 bg-amber-500/10 font-semibold text-amber-500'
                : 'border-zinc-500/30 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300'
            }`}
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}

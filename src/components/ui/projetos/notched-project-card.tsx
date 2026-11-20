import * as React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'


export interface NotchedProjectCardProps {
  href: string
  title: string
  description?: string
  image: string
  imageAlt?: string
  tags?: string[]
  screen?: { src: string; alt: string; className?: string }
  dim?: number
  surface?: string
  accent?: string
  accentForeground?: string
  className?: string
}

const DISC = 64
const BLOCK = 80
const FILLET = 28

export function NotchedProjectCard({
  href,
  title,
  description,
  image,
  imageAlt = '',
  tags = [],
  screen,
  dim = screen ? 0.45 : 0,
  surface = '#000000',
  accent,
  accentForeground = '#0a0a0a',
  className,
}: NotchedProjectCardProps) {
  const external = /^https?:/i.test(href)
  const content = (
    <>
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-stone-900">
          {image ? (
            <img
              src={image}
              alt={screen ? '' : imageAlt}
              loading="lazy"
              decoding="async"
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-[scale] duration-500 ease-out',
                !screen && 'group-hover:scale-[1.04]',
              )}
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_120%_at_20%_0%,#2a2724_0%,#171614_55%,#0b0b0c_100%)]"
            >
              <span className="px-6 text-center font-mono text-[11px] tracking-[0.22em] text-stone-500 uppercase">
                {title}
              </span>
            </div>
          )}
          {dim > 0 && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ backgroundColor: `rgb(0 0 0 / ${dim})` }}
            />
          )}
          {screen && (
            <img
              src={screen.src}
              alt={screen.alt}
              loading="lazy"
              decoding="async"
              className={cn(
                'absolute right-0 bottom-0 w-[82%] origin-bottom-right drop-shadow-[0_18px_40px_rgba(0,0,0,0.5)] transition-[scale] duration-500 group-hover:scale-[1.07]',
                screen.className,
              )}
            />
          )}
        </div>

        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0"
          style={{
            width: BLOCK,
            height: BLOCK,
            borderTopLeftRadius: BLOCK - DISC / 2,
            background: surface,
          }}
        />
        {[
          { bottom: BLOCK, right: 0 },
          { bottom: 0, right: BLOCK },
        ].map((pos, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute"
            style={{
              ...pos,
              width: FILLET,
              height: FILLET,
              background: `radial-gradient(circle at top left, transparent ${FILLET - 0.5}px, ${surface} ${FILLET}px)`,
            }}
          />
        ))}

        <span
          aria-hidden="true"
          className={cn(
            'absolute right-0 bottom-0 flex items-center justify-center rounded-full bg-stone-800 text-stone-100 transition-[background-color,color,scale] duration-300 group-hover:scale-105',
            accent
              ? 'group-hover:bg-[var(--card-accent)] group-hover:text-[var(--card-accent-fg)]'
              : 'group-hover:bg-stone-100 group-hover:text-black',
          )}
          style={
            {
              width: DISC,
              height: DISC,
              '--card-accent': accent,
              '--card-accent-fg': accentForeground,
            } as React.CSSProperties
          }
        >
          <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>

      <h3 className="mt-5 text-2xl font-medium tracking-tight text-stone-50">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-stone-400">{description}</p>
      )}
      {tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <li
              key={`${tag}-${i}`}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold tracking-wider text-stone-300 uppercase"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const classes = cn(
    'group flex flex-col rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-stone-100/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black',
    className,
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    )
  }

  return (
    <Link to={href} className={classes}>
      {content}
    </Link>
  )
}

export default NotchedProjectCard

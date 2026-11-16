import React from 'react'
import { cn } from '@/lib/utils'

export interface SocialItem {
  href: string
  ariaLabel: string
  tooltip: string
  svgUrl: string
  color: string
}

export interface SocialTooltipProps
  extends React.HTMLAttributes<HTMLUListElement> {
  items: SocialItem[]
}

const SocialTooltip = React.forwardRef<HTMLUListElement, SocialTooltipProps>(
  ({ className, items, ...props }, ref) => {
    const baseIconStyles =
      'relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white transition-all duration-300 ease-in-out group-hover:border-transparent group-hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 motion-reduce:transition-none'
    const baseSvgStyles =
      'relative z-10 h-5 w-5 transition-[filter] duration-300 ease-in-out group-hover:invert motion-reduce:transition-none'
    const baseFilledStyles =
      'absolute bottom-0 left-0 h-0 w-full transition-all duration-300 ease-in-out group-hover:h-full motion-reduce:transition-none'
    const baseTooltipStyles =
      'pointer-events-none invisible absolute bottom-[-40px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-white opacity-0 transition-all duration-300 ease-in-out group-hover:bottom-[-50px] group-hover:visible group-hover:opacity-100 group-focus-within:bottom-[-50px] group-focus-within:visible group-focus-within:opacity-100 motion-reduce:transition-none'

    return (
      <ul
        ref={ref}
        className={cn('flex items-center gap-3', className)}
        {...props}
      >
        {items.map((item) => (
          <li key={item.ariaLabel} className="group relative">
            <a
              href={item.href}
              aria-label={item.ariaLabel}
              className={cn(baseIconStyles)}
              target={item.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={item.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            >
              <span
                aria-hidden="true"
                className={cn(baseFilledStyles)}
                style={{ backgroundColor: item.color }}
              />
              <img
                src={item.svgUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className={cn(baseSvgStyles)}
              />
            </a>
            <span
              aria-hidden="true"
              className={cn(baseTooltipStyles)}
              style={{ backgroundColor: item.color }}
            >
              {item.tooltip}
            </span>
          </li>
        ))}
      </ul>
    )
  },
)

SocialTooltip.displayName = 'SocialTooltip'

export { SocialTooltip }
export default SocialTooltip

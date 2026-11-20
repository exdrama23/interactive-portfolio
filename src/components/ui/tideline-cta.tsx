import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import './tideline-cta-utils/tideline-cta.css'


type Props = {
  eyebrow?: string
  headline: ReactNode
  sub?: ReactNode
  taken: number
  action: string
  href?: string
  details?: string[]
  level?: string
  theme?: 'paper' | 'night'
  motion?: 'full' | 'reduced'
  className?: string
}

export function TidelineCta({
  eyebrow,
  headline,
  sub,
  taken,
  action,
  href = '#',
  details = [],
  level = '{pct}% da agenda preenchida',
  theme = 'night',
  motion = 'full',
  className = '',
}: Props) {
  const root = useRef<HTMLElement>(null)
  const [h, setH] = useState(0)
  const [seen, setSeen] = useState(false)
  const [active, setActive] = useState(false)
  const [done, setDone] = useState(false)
  const target = Math.min(1, Math.max(0, taken))
  const pct = Math.round(target * 100)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const read = () => setH(el.offsetHeight)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setActive(e.isIntersecting)
        if (e.intersectionRatio >= 0.35) setSeen(true)
      },
      { threshold: [0, 0.35] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const face = (
    <>
      {eyebrow && <p className="tlc__eyebrow">{eyebrow}</p>}
      <h2 className="tlc__headline">{headline}</h2>
      <div className="tlc__body">
        {sub && <p className="tlc__sub">{sub}</p>}
        <p className="tlc__level">{level.replace('{pct}', String(pct))}</p>
      </div>
      {details.length > 0 && (
        <ul className="tlc__details">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </>
  )

  return (
    <section
      ref={root}
      className={`tlc tlc--${theme} ${className}`}
      data-motion={motion}
      data-seen={seen || undefined}
      data-active={active || undefined}
      data-done={done || undefined}
      style={{ '--tlc-target': target, '--tlc-h': `${h}px` } as CSSProperties}
    >
      <div className="tlc__layer tlc__layer--dry">{face}</div>

      <div
        className="tlc__water"
        aria-hidden="true"
        inert
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') setDone(true)
        }}
      >
        <div className="tlc__surface" />
        <div className="tlc__backwave" />
        <div className="tlc__inner">{face}</div>
      </div>

      <a
        href={href}
        className="tlc__buoy"
        target={/^https?:/i.test(href) ? '_blank' : undefined}
        rel={/^https?:/i.test(href) ? 'noopener noreferrer' : undefined}
      >
        {action}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </a>
    </section>
  )
}

export default TidelineCta

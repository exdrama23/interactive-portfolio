import {
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import type { MotionValue } from 'framer-motion'

function countChars(node: ReactNode): number {
  if (node === null || node === undefined || typeof node === 'boolean') return 0
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).length
  }
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, child) => sum + countChars(child), 0)
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return countChars(node.props.children)
  }
  return 0
}

export function WrittenText({
  progress,
  from,
  to,
  hostRef,
  children,
  reduced = false,
}: {
  progress: MotionValue<number>
  from: number
  to: number
  hostRef: RefObject<HTMLElement | null>
  children: ReactNode
  reduced?: boolean
}) {
  useEffect(() => {
    const host = hostRef.current
    if (!host || reduced) return

    const paint = (value: number) => {
      const span = to - from
      const p = span <= 0 ? 1 : Math.min(1, Math.max(0, (value - from) / span))
      host.style.setProperty('--tw', p.toFixed(4))
    }

    paint(progress.get())
    return progress.on('change', paint)
  }, [progress, from, to, hostRef, reduced])

  if (reduced) return <>{children}</>

  const total = countChars(children)
  let cursor = 0

  const renderNode = (node: ReactNode): ReactNode => {
    if (node === null || node === undefined || typeof node === 'boolean') {
      return null
    }

    if (typeof node === 'string' || typeof node === 'number') {
      return Array.from(String(node)).map((char, offset) => {
        const delay = total > 0 ? (cursor / total) * 0.82 : 0
        cursor += 1

        if (char === ' ') {
          return <Fragment key={`space-${cursor}-${offset}`}> </Fragment>
        }

        return (
          <span
            key={`char-${cursor}-${offset}`}
            className="tw-char"
            style={{ '--tw-d': delay.toFixed(4) } as CSSProperties}
          >
            {char}
          </span>
        )
      })
    }

    if (Array.isArray(node)) {
      return node.map((child, index) => (
        <Fragment key={`node-${index}`}>{renderNode(child)}</Fragment>
      ))
    }

    if (isValidElement<{ children?: ReactNode }>(node)) {
      const element = node as ReactElement<Record<string, unknown> & {
        children?: ReactNode
      }>
      const { children: inner, ...rest } = element.props
      return cloneElement(element, rest, renderNode(inner))
    }

    return null
  }

  return <>{renderNode(children)}</>
}

export default WrittenText

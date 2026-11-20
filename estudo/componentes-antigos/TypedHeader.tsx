import { useState, useEffect } from 'react'

interface TypedHeaderProps {
  text: string
  speed?: number
}

export function TypedHeader({ text, speed = 65 }: TypedHeaderProps) {
  const [displayed, setDisplayed] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    setDisplayed(0)
    setShowCursor(true)

    const interval = setInterval(() => {
      setDisplayed(prev => {
        if (prev >= text.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  useEffect(() => {
    if (displayed < text.length) return
    const blink = setInterval(() => setShowCursor(prev => !prev), 530)
    return () => clearInterval(blink)
  }, [displayed, text.length])

  return (
    <span className="typed-header text-white text-4xl md:text-7xl font-bold tracking-tight">
      {text.slice(0, displayed)}
      {(displayed < text.length || showCursor) && (
        <span className="ml-0.5 inline-block w-[2px] h-[1em] bg-white align-middle animate-pulse" />
      )}
    </span>
  )
}

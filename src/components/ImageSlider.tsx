import { useState, useRef, useCallback, useEffect } from 'react'
import { TypedHeader } from './TypedHeader'

interface Slide {
  image: string
  alt: string
  title: string
  description: string
  link: string
}

const slides: Slide[] = [
  {
    image: 'https://picsum.photos/seed/fullstack/1600/700',
    alt: 'Full stack developer',
    title: 'Full stack developer',
    description: 'Build production-ready applications with confidence with thoroughly designed artifacts and comprehensive verification tests.',
    link: '#',
  },
  {
    image: 'https://picsum.photos/seed/enterprise/1600/700',
    alt: 'Enterprise developer',
    title: 'Enterprise developer',
    description: 'Google Antigravity empowers the next era of enterprise builders.',
    link: '#',
  },
  {
    image: 'https://picsum.photos/seed/frontend/1600/700',
    alt: 'Frontend developer',
    title: 'Frontend developer',
    description: 'Streamline UX development by leveraging browser-in-the-loop agents to automate repetitive tasks.',
    link: '#',
  },
]

function useScrollReveal(ref: React.RefObject<HTMLDivElement | null>) {
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return isVisible
}

export function ImageSlider() {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null!)
  const trackRef = useRef<HTMLDivElement>(null!)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const cursorRef = useRef<HTMLDivElement>(null!)
  const [cursorVisible, setCursorVisible] = useState(false)
  const frameRef = useRef<number>(0)
  const isVisible = useScrollReveal(containerRef)

  const goNext = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, slides.length - 1))
  }, [])

  const goPrev = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    targetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  useEffect(() => {
    if (!cursorVisible) {
      currentRef.current = { x: 0, y: 0 }
      return
    }
    const animate = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.12
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.12
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(-50%, -50%) translate(${currentRef.current.x}px, ${currentRef.current.y}px)`
      }
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [cursorVisible])

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-5xl mx-auto transition-all duration-700 ease-out ${
  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
}`}
    >
      <div
        className="relative overflow-hidden group cursor-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setCursorVisible(true)}
        onMouseLeave={() => setCursorVisible(false)}
      >
        <div
          ref={trackRef}
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="min-w-full">
              <div className="aspect-[21/9] overflow-hidden bg-white/5">
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-12 md:p-20">
                <div className="text-left">
                  {activeIndex === i && (
                    <TypedHeader text={slide.title} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          ref={cursorRef}
          className={`absolute top-0 left-0 pointer-events-none z-10 transition-opacity duration-300 ${
            cursorVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-full px-6 py-3 text-base text-white whitespace-nowrap border border-white/10 shadow-xl">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="font-semibold tracking-wide">Watch case</span>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none" />
      </div>

      <div
        className={`px-8 md:px-16 pt-12 md:pt-16 transition-all duration-700 ease-out delay-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <div className="relative">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`transition-all duration-400 ease-out ${
                i === activeIndex
                  ? 'opacity-100 visible relative'
                  : 'opacity-0 invisible absolute inset-0'
              }`}
            >
              <strong className="block text-3xl md:text-5xl font-bold mb-4 text-black dark:text-white">
                {slide.title}
              </strong>
              <p className="text-lg md:text-xl text-[#a3a3a3] dark:text-zinc-400 leading-relaxed max-w-3xl mb-8">
                {slide.description}
              </p>
              <a
                href={slide.link}
                className="inline-flex items-center gap-2 text-base font-semibold text-black dark:text-white hover:underline underline-offset-4"
              >
                View case
                <span className="text-xl leading-none">→</span>
              </a>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-10">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center
              disabled:opacity-25 disabled:cursor-not-allowed
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
              text-black dark:text-white"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex === slides.length - 1}
            className="w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center
              disabled:opacity-25 disabled:cursor-not-allowed
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
              text-black dark:text-white"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-2 ml-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'bg-black dark:bg-white w-8'
                    : 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 w-2'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

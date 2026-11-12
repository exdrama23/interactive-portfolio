import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type Variants } from 'framer-motion'
import { EASE } from './easing'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
  once?: boolean
  amount?: number
}

/** Fade + subida quando o elemento entra na viewport (scroll reveal). */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 1,
  y = 30,
  once = true,
  amount = 0.2,
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount, margin: '-40px' }}
      transition={{ duration, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface GatedRevealProps {
  /** Controlado externamente (ex.: progresso do portal da hero). */
  shown: boolean
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
  rotate?: number
  scale?: number
}

/** Fade + subida disparado por um estado externo, não pela viewport. */
export function GatedReveal({
  shown,
  children,
  className,
  delay = 0,
  duration = 1.2,
  y = 40,
  rotate = 0,
  scale = 1,
}: GatedRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, rotate, scale }}
      animate={
        shown
          ? { opacity: 1, y: 0, rotate: 0, scale: 1 }
          : { opacity: 0, y, rotate, scale }
      }
      transition={{ duration, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  delayChildren?: number
}

/** Container que anima os filhos em sequência. */
export function StaggerGroup({
  children,
  className,
  staggerDelay = 0.1,
  delayChildren = 0,
}: StaggerGroupProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay, delayChildren } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  )
}

interface ParallaxImageProps {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  /** Deslocamento vertical (px) ao atravessar a viewport. */
  distance?: number
}

/**
 * Imagem com parallax suave. A escala extra evita que as bordas apareçam
 * durante o movimento.
 */
export function ParallaxImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  distance = 30,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ y }}
        className={`h-full w-full scale-110 object-cover will-change-transform ${imgClassName}`}
      />
    </div>
  )
}

import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { hero, media } from '../content'
import { useAutoplay } from '../useAutoplay'
import { ArrowUpRight } from './Icons'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // Only play the background video while it is on screen, and never for reduced-motion users.
  useAutoplay(videoRef, inView && !reduce)

  const lines = [...hero.lines.map((text) => ({ text, highlight: false })), { text: hero.highlight, highlight: true }]

  return (
    <section ref={ref} className="hero" id="top" aria-label="Introduction">
      <motion.div className="hero__media" style={reduce ? undefined : { scale: videoScale }}>
        <video
          ref={videoRef}
          src={media.heroVideo}
          poster={media.heroPoster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      </motion.div>
      <div className="hero__shade" />

      <motion.div
        className="container hero__content"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
        >
          {hero.eyebrow}
        </motion.span>

        <h1 className="hero__title">
          {lines.map((line, i) => (
            <span key={line.text} className="hero__line">
              <motion.span
                className={line.highlight ? 'hero__highlight' : undefined}
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.3 + i * 0.12, ease }}
              >
                {line.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="hero__bottom"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85, ease }}
        >
          <p className="hero__sub">{hero.sub}</p>
          <div className="hero__actions">
            <a href="#contact" className="btn btn--primary">
              Enquire Now <ArrowUpRight size={18} />
            </a>
            <a href="#work" className="btn btn--ghost">
              See our work
            </a>
          </div>
        </motion.div>
      </motion.div>

      <span className="hero__scroll" aria-hidden="true">
        Scroll to explore
      </span>
    </section>
  )
}

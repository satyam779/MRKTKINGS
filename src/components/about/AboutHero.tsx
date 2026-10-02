import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { about } from '../../content'
import { HeadTurn } from './HeadTurn'
import { ScrambleIn } from './Scramble'

const ease = [0.215, 0.61, 0.355, 1] as const

export function AboutHero() {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 800)
    return () => window.clearTimeout(t)
  }, [])

  const [left1, left2] = about.hero.left
  const [right1, right2] = about.hero.right

  return (
    <section className="about-hero" aria-labelledby="about-title">
      <div className="about-hero__ambient" style={{ backgroundImage: `url(${about.portraitBlur})` }} aria-hidden="true" />
      <div className="about-hero__dots" aria-hidden="true" />
      <div className="about-hero__watermark" aria-hidden="true">
        {about.watermark}
      </div>

      <div className="about-hero__portrait">
        {/* The head-turn canvas is decorative; this gives screen readers the photo's description. */}
        <span className="sr-only">{`Portrait of ${about.name}, ${about.role} of MRKTKings`}</span>
        <HeadTurn />
      </div>
      <div className="about-hero__shade" aria-hidden="true" />

      <motion.div
        className="container about-hero__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 1 }}
      >
        <span className="eyebrow">About · {about.role}</span>
        <div className="about-hero__spacer" />
        <div className="about-hero__row">
          <div>
            <h1 id="about-title" className="about-hero__title">
              <span className="about-hero__line">
                <ScrambleIn text={left1} delay={200} triggered={entered} />
              </span>
              <span className="about-hero__line">
                <ScrambleIn text={left2} delay={500} triggered={entered} />
              </span>
            </h1>
            <motion.p
              className="about-hero__intro"
              initial={{ opacity: 0, y: 25 }}
              animate={entered ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.9, delay: 0.2, ease }}
            >
              {about.hero.intro}
            </motion.p>
          </div>
          <p className="about-hero__title about-hero__title--right">
            <span className="about-hero__line">
              <ScrambleIn text={right1} delay={700} triggered={entered} />
            </span>
            <span className="about-hero__line about-hero__line--accent">
              <ScrambleIn text={right2} delay={1000} triggered={entered} />
            </span>
          </p>
        </div>
      </motion.div>
    </section>
  )
}

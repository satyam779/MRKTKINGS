import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useRef } from 'react'
import { intro, links } from '../content'
import { ArrowUpRight } from './Icons'
import { Reel } from './Reel'

// The card arrives the way eloqwnt.com's "Who we are" card does: it fades in while shrinking from 125%.
const shrinkIn = { duration: 1, ease: [0.165, 0.84, 0.44, 1] } as const

type WordProps = { word: string; className?: string; range: [number, number]; progress: MotionValue<number> }

function Word({ word, className, range, progress }: WordProps) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return (
    <motion.span className={className} style={{ opacity }}>
      {word}
    </motion.span>
  )
}

export function Intro() {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion()
  // Words light up one by one as the statement scrolls through the viewport.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = intro.statement.split(' ')
  const accent = (word: string) => (word === intro.accent ? 'accent' : undefined)

  return (
    <section className="intro" aria-labelledby="intro-heading">
      <div className="container">
        <motion.div
          className="intro__card"
          initial={reduce ? false : { opacity: 0, scale: 1.25 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={shrinkIn}
        >
          <div className="intro__head">
            <h2 id="intro-heading" className="intro__label">
              {intro.label}
            </h2>
            <span className="intro__tag">/ {intro.tag}</span>
          </div>

          <div className="intro__body">
            <p ref={ref} className="intro__statement">
              {words.map((word, i) =>
                reduce ? (
                  <span key={i} className={accent(word)}>
                    {word}
                  </span>
                ) : (
                  <Word
                    key={i}
                    word={word}
                    className={accent(word)}
                    progress={scrollYProgress}
                    range={[i / words.length, (i + 1) / words.length]}
                  />
                ),
              )}
            </p>
            <a href={links.about} className="btn btn--primary intro__cta">
              About us <ArrowUpRight size={18} />
            </a>
          </div>

          <Reel />
        </motion.div>
      </div>
    </section>
  )
}

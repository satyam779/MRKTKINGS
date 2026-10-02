import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useRef } from 'react'
import { intro } from '../content'
import { Reveal } from './Reveal'

function Word({ word, range, progress }: { word: string; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return <motion.span style={{ opacity }}>{word}</motion.span>
}

export function Intro() {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion()
  // Words light up one by one as the statement scrolls through the viewport.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = intro.statement.split(' ')

  return (
    <section className="intro" aria-labelledby="intro-heading">
      <div className="container">
        <div className="intro__head">
          <h2 id="intro-heading" className="eyebrow">
            {intro.label}
          </h2>
          <span className="intro__tag">/ {intro.tag}</span>
        </div>

        <p ref={ref} className="intro__statement">
          {words.map((word, i) =>
            reduce ? (
              <span key={i}>{word}</span>
            ) : (
              <Word key={i} word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
            ),
          )}
        </p>

        <ul className="pillars" style={{ listStyle: 'none', padding: 0 }}>
          {intro.pillars.map((p, i) => (
            <Reveal as="li" key={p.title} className="pillar" delay={i * 0.1}>
              <span className="pillar__num">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

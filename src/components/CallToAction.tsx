import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { cta, links } from '../content'
import { ArrowUpRight, WhatsApp } from './Icons'
import { Reveal } from './Reveal'

export function CallToAction() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  // The red glow swells as the section reaches the middle of the screen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const glowScale = useTransform(scrollYProgress, [0, 1], [0.4, 1])
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section ref={ref} className="cta" id="contact" aria-labelledby="cta-heading">
      <motion.div
        className="cta__glow"
        aria-hidden="true"
        style={reduce ? undefined : { scale: glowScale, opacity: glowOpacity }}
      />
      <div className="container cta__inner">
        <Reveal>
          <h2 id="cta-heading" className="cta__title">
            {cta.lead} <span className="accent">{cta.highlight}</span>?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="cta__sub">{cta.sub}</p>
          <div className="cta__actions">
            <a href={links.contact} className="btn btn--primary">
              Let&rsquo;s Connect <ArrowUpRight size={18} />
            </a>
            <a href={links.whatsapp} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
              <WhatsApp size={18} /> Chat on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

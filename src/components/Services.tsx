import { motion } from 'framer-motion'
import { useState } from 'react'
import { links, services } from '../content'
import { useMediaQuery } from '../useMediaQuery'
import { ArrowUpRight } from './Icons'
import { Reveal } from './Reveal'

const ease = [0.22, 1, 0.36, 1] as const

function ServiceRow({ service, index, touch }: { service: (typeof services)[number]; index: number; touch: boolean }) {
  // Touch screens have no hover, so the row crossing the middle of the screen lights up instead.
  const [lit, setLit] = useState(false)

  return (
    <motion.li
      className={`service${lit ? ' is-lit' : ''}`}
      initial="rest"
      animate={lit ? 'hover' : 'rest'}
      whileHover="hover"
      viewport={{ margin: '-45% 0px -45% 0px' }}
      onViewportEnter={touch ? () => setLit(true) : undefined}
      onViewportLeave={touch ? () => setLit(false) : undefined}
    >
      <motion.span
        className="service__fill"
        aria-hidden="true"
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.5, ease }}
      />
      <Reveal y={20}>
        <a className="service__row" href={`${links.services}#${service.slug}`}>
          <span className="service__num">{String(index + 1).padStart(2, '0')}</span>
          <motion.h3
            className="service__title"
            variants={{ rest: { x: 0 }, hover: { x: 12 } }}
            transition={{ duration: 0.4, ease }}
          >
            {service.title}
          </motion.h3>
          <p className="service__text">{service.tagline}</p>
          <span className="service__icon" aria-hidden="true">
            <ArrowUpRight size={20} />
          </span>
        </a>
      </Reveal>
    </motion.li>
  )
}

export function Services() {
  const touch = useMediaQuery('(hover: none)')

  return (
    <section className="services" id="services" aria-labelledby="services-heading">
      <div className="container">
        <div className="services__head">
          <Reveal>
            <span className="eyebrow">Services / Our expertise</span>
            <h2 id="services-heading" className="section-heading">
              We do what matters to your <span className="accent">Business</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <a href={links.services} className="btn btn--ghost">
              Know More <ArrowUpRight size={18} />
            </a>
          </Reveal>
        </div>

        <ul className="service-list">
          {services.map((s, i) => (
            <ServiceRow key={s.title} service={s} index={i} touch={touch} />
          ))}
        </ul>
      </div>
    </section>
  )
}

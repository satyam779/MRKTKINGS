import { motion } from 'framer-motion'
import { links, services } from '../content'
import { ArrowUpRight } from './Icons'
import { Reveal } from './Reveal'

export function Services() {
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
            <motion.li
              key={s.title}
              className="service"
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              <motion.span
                className="service__fill"
                aria-hidden="true"
                variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
              <Reveal y={20}>
                <a className="service__row" href={`${links.services}#${s.slug}`}>
                  <span className="service__num">{String(i + 1).padStart(2, '0')}</span>
                  <motion.h3
                    className="service__title"
                    variants={{ rest: { x: 0 }, hover: { x: 12 } }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {s.title}
                  </motion.h3>
                  <p className="service__text">{s.tagline}</p>
                  <span className="service__icon" aria-hidden="true">
                    <ArrowUpRight size={20} />
                  </span>
                </a>
              </Reveal>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

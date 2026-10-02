import { motion } from 'framer-motion'
import { services, servicesPage } from '../content'

const ease = [0.22, 1, 0.36, 1] as const

export function ServicesHero() {
  return (
    <section className="page-hero" aria-labelledby="services-title">
      <div className="container">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
        >
          {servicesPage.eyebrow}
        </motion.span>

        <h1 id="services-title" className="page-hero__title">
          {servicesPage.title.map((line, i) => (
            <span key={line} className="hero__line">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.2 + i * 0.12, ease }}
              >
                {i === servicesPage.title.length - 1 ? <span className="accent">{line}</span> : line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="page-hero__bottom"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
        >
          <div>
            <p className="page-hero__intro">{servicesPage.intro}</p>
            <p className="page-hero__promise">{servicesPage.promise}</p>
          </div>

          <nav aria-label="Jump to a service">
            <ol className="service-index">
              {services.map((s, i) => (
                <li key={s.slug}>
                  <a href={`#${s.slug}`}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </motion.div>
      </div>
    </section>
  )
}

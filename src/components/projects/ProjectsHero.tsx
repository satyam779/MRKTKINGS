import { motion } from 'framer-motion'
import { projects, projectsPage } from '../../content'

const ease = [0.22, 1, 0.36, 1] as const
const disciplines = new Set(projects.flatMap((p) => p.services)).size

export function ProjectsHero() {
  const last = projectsPage.title.length - 1

  return (
    <section className="page-hero" aria-labelledby="projects-title">
      <div className="container">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
        >
          {projectsPage.eyebrow}
        </motion.span>

        <h1 id="projects-title" className="page-hero__title">
          {projectsPage.title.map((line, i) => (
            <span key={line} className="hero__line">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.2 + i * 0.12, ease }}
              >
                {line}
                {i === last && <span className="accent"> {projectsPage.highlight}</span>}
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
          <p className="page-hero__intro">{projectsPage.intro}</p>
          <dl className="stats">
            <div>
              <dt>Brands</dt>
              <dd>{String(projects.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Disciplines</dt>
              <dd>{String(disciplines).padStart(2, '0')}</dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </section>
  )
}

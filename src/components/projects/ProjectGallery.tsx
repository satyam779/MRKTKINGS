import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { projects } from '../../content'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'
import { useProjectHash } from './useProjectHash'

const slugs = projects.map((p) => p.slug)
const filters = ['All', ...new Set(projects.flatMap((p) => p.services))]

export function ProjectGallery() {
  const [filter, setFilter] = useState('All')
  const { slug, morph, markOpened, close, go } = useProjectHash(slugs)

  const visible = useMemo(
    () => (filter === 'All' ? projects : projects.filter((p) => p.services.includes(filter))),
    [filter],
  )
  const openIndex = slug ? projects.findIndex((p) => p.slug === slug) : -1
  const open = openIndex >= 0 ? projects[openIndex] : null

  return (
    <section className="gallery" aria-labelledby="gallery-heading">
      <div className="container">
        {/* Keeps the outline H1 → H2 → H3 for screen readers; the cards' names are H3s. */}
        <h2 id="gallery-heading" className="sr-only">
          All projects
        </h2>
        <div className="filters" role="group" aria-label="Filter projects by service">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className="filter"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {filter === f && (
                <motion.span
                  layoutId="filter-pill"
                  className="filter__pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="filter__label">{f}</span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} {visible.length === 1 ? 'project' : 'projects'}
        </p>

        <LayoutGroup>
          <motion.ul className="pgrid" layout>
            <AnimatePresence mode="popLayout">
              {visible.map((p, i) => (
                <motion.li
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProjectCard
                    project={p}
                    number={projects.indexOf(p) + 1}
                    hidden={open?.slug === p.slug}
                    paused={!!open}
                    onOpen={markOpened}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          <AnimatePresence>
            {open && (
              <ProjectModal
                key="modal"
                project={open}
                index={openIndex}
                all={projects}
                morph={morph}
                onClose={close}
                onNavigate={go}
              />
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </section>
  )
}

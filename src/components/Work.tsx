import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { links, work } from '../content'
import { ArrowUpRight } from './Icons'
import { Reveal } from './Reveal'

type Project = (typeof work.projects)[number]

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const reduce = useReducedMotion()
  // Image drifts slightly slower than the page for a parallax feel.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '0%'])

  return (
    <Reveal delay={index * 0.1}>
      <a ref={ref} href={`${links.work}#${project.slug}`} className="project" aria-label={`${project.name}: view project`}>
        <div className="project__frame">
          <motion.img
            src={project.image}
            alt={`${project.name} campaign visual`}
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
            style={reduce ? undefined : { y: imageY }}
          />
          <span className="project__badge" aria-hidden="true">
            <ArrowUpRight size={24} />
          </span>
        </div>
        <div className="project__meta">
          <div>
            <h3 className="project__name">{project.name}.</h3>
            <p className="project__summary">{project.summary}</p>
          </div>
        </div>
        <ul className="tags">
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </a>
    </Reveal>
  )
}

export function Work() {
  return (
    <section className="work" id="work" aria-labelledby="work-heading">
      <div className="container">
        <div className="work__head">
          <Reveal>
            <span className="eyebrow">{work.label}</span>
            <h2 id="work-heading" className="section-heading">
              {work.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.1} as="p" className="work__text">
            {work.text}
          </Reveal>
        </div>

        <div className="projects">
          {work.projects.map((project, i) => (
            <ProjectCard key={project.name} project={project} index={i} />
          ))}
        </div>

        <div className="work__more">
          <a href={links.work} className="btn btn--primary">
            View More Work <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}

import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { PointerEvent } from 'react'
import { useRef, useState } from 'react'
import { links, projects, work } from '../content'
import type { Project } from '../content'
import { useAutoplay } from '../useAutoplay'
import { ArrowUpRight } from './Icons'
import { Reveal } from './Reveal'

const featured = work.featured.map((slug) => projects.find((p) => p.slug === slug)).filter((p): p is Project => !!p)

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.3 })
  // The poster loads only as the card nears the screen; the reel itself waits until the card is on it.
  const near = useInView(ref, { once: true, margin: '800px 0px' })
  const [hover, setHover] = useState(false)
  // Video drifts slightly slower than the page for a parallax feel.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const mediaY = useTransform(scrollYProgress, [0, 1], ['-6%', '0%'])

  // The reel plays only while the card is on screen.
  useAutoplay(videoRef, inView)

  // "View" badge that trails the pointer across the reel, same as the Projects page cards.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 350, damping: 30 })
  const y = useSpring(my, { stiffness: 350, damping: 30 })
  const track = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - rect.left)
    my.set(e.clientY - rect.top)
  }

  return (
    <Reveal delay={index * 0.1}>
      <a ref={ref} href={`${links.work}#${project.slug}`} className="project" aria-label={`${project.name}: view project`}>
        <div
          className="project__frame"
          onPointerMove={track}
          onPointerEnter={(e) => {
            track(e)
            setHover(true)
          }}
          onPointerLeave={() => setHover(false)}
        >
          <motion.video
            ref={videoRef}
            src={project.video}
            poster={near ? project.poster : undefined}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            style={reduce ? undefined : { y: mediaY }}
          />
          <motion.span
            className="pcard__cursor"
            aria-hidden="true"
            style={{ x, y }}
            animate={{ scale: hover ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            View
          </motion.span>
          <span className="pcard__tap" aria-hidden="true">
            View project <ArrowUpRight size={16} />
          </span>
        </div>
        <div className="project__meta">
          <div>
            <h3 className="project__name">{project.name}.</h3>
            <p className="project__summary">{project.summary}</p>
          </div>
        </div>
        <ul className="tags">
          {project.services.map((tag) => (
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
        </div>

        <div className="projects">
          {featured.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
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

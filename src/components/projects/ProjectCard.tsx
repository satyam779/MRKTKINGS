import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import type { PointerEvent } from 'react'
import { useRef, useState } from 'react'
import type { Project } from '../../content'
import { useAutoplay } from '../../useAutoplay'
import { ArrowUpRight } from '../Icons'

type Props = {
  project: Project
  number: number
  hidden: boolean
  onOpen: () => void
}

export function ProjectCard({ project, number, hidden, onOpen }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.45 })
  const [hover, setHover] = useState(false)

  // Reels play only while the card is mostly on screen (and never for reduced-motion users).
  useAutoplay(videoRef, inView && !reduce && !hidden)

  // "View" badge that trails the pointer across the media.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 350, damping: 30 })
  const y = useSpring(my, { stiffness: 350, damping: 30 })
  const track = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - rect.left)
    my.set(e.clientY - rect.top)
  }

  const num = String(number).padStart(2, '0')

  return (
    <a
      ref={ref}
      href={`#${project.slug}`}
      className="pcard"
      onClick={onOpen}
      aria-label={`${project.name}: view project details`}
    >
      <motion.div
        layoutId={`media-${project.slug}`}
        className="pcard__media"
        onPointerMove={track}
        onPointerEnter={(e) => {
          track(e)
          setHover(true)
        }}
        onPointerLeave={() => setHover(false)}
        style={{ borderRadius: 24, visibility: hidden ? 'hidden' : undefined }}
      >
        <video ref={videoRef} src={project.video} poster={project.poster} muted loop playsInline preload="none" />
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
      </motion.div>

      <div className="pcard__meta">
        <span className="pcard__num">{num}</span>
        <div>
          <h3 className="pcard__name">{project.name}</h3>
          <p className="pcard__industry">{project.industry}</p>
        </div>
      </div>
      <ul className="pcard__tags">
        {project.services.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </a>
  )
}

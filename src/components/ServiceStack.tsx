import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { services } from '../content'
import { useMediaQuery } from '../useMediaQuery'
import { ArrowUpRight } from './Icons'

type Service = (typeof services)[number]

const spring = { stiffness: 110, damping: 24, mass: 0.6 }

type CardProps = {
  service: Service
  index: number
  total: number
  stackProgress: MotionValue<number>
  stacked: boolean
}

function ServiceCard({ service, index, total, stackProgress, stacked }: CardProps) {
  const slotRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  // Entry: as the slot scrolls up into view, the card glides in from the right and rises into place.
  const { scrollYProgress: enter } = useScroll({
    target: slotRef,
    offset: stacked ? ['start end', 'start start'] : ['start end', 'start 0.45'],
  })
  const eased = useSpring(enter, spring)
  const x = useTransform(eased, [0, 1], ['55%', '0%'])
  const y = useTransform(eased, [0, 1], [140, 0])
  const rotate = useTransform(eased, [0, 1], [6, 0])
  const opacity = useTransform(eased, [0, 0.5], [0, 1])

  // Once the next card slides over it, this one shrinks back and dims slightly.
  const targetScale = 1 - (total - index - 1) * 0.04
  const scale = useTransform(stackProgress, [index / total, 1], [1, targetScale])
  const dim = useTransform(stackProgress, [index / total, 1], [0, index === total - 1 ? 0 : 0.45])

  const animated = !reduce
  const num = String(index + 1).padStart(2, '0')

  return (
    <>
      <div id={service.slug} className="stack__anchor" />
      <div ref={slotRef} className="stack__slot">
        <motion.article
          className="stack__card"
          aria-labelledby={`${service.slug}-title`}
          style={{
            top: stacked ? `calc(var(--stack-step) * ${index})` : undefined,
            ...(animated ? { x, y, rotate, opacity } : null),
            ...(animated && stacked ? { scale } : null),
          }}
        >
          <div className="stack__media">
            <img src={service.image} alt="" width={512} height={512} loading={index < 2 ? 'eager' : 'lazy'} />
            <span className="stack__num" aria-hidden="true">
              {num}
            </span>
          </div>

          <div className="stack__body">
            <span className="stack__count">
              {num} <span>/ {String(total).padStart(2, '0')}</span>
            </span>
            <div>
              <h2 id={`${service.slug}-title`} className="stack__title">
                {service.title}
              </h2>
              <p className="stack__tagline">{service.tagline}</p>
              <p className="stack__text">{service.text}</p>
              <p className="stack__closing">{service.closing}</p>
              <a href="#contact" className="btn btn--ghost stack__cta">
                Get started <ArrowUpRight size={18} />
              </a>
            </div>
          </div>

          {animated && stacked && <motion.span className="stack__dim" style={{ opacity: dim }} aria-hidden="true" />}
        </motion.article>
      </div>
    </>
  )
}

export function ServiceStack() {
  const ref = useRef<HTMLElement>(null)
  // Sticky stacking needs room to show a whole card. Phones use a compact card whose photo shrinks to fit,
  // so they stack from 520px of visible height (small phones like the iPhone SE in Safari); the two-column desktop card needs 760px. Shorter screens get a list.
  const stacked = useMediaQuery('(max-width: 899px) and (min-height: 520px), (min-width: 900px) and (min-height: 760px)')
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // The page renders client-side, so the browser can't find #service anchors on load; jump once mounted.
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }))
  }, [])

  return (
    <section
      ref={ref}
      className={`stack ${stacked ? 'stack--sticky' : ''}`}
      style={{ '--stack-count': services.length } as CSSProperties}
      aria-label="Our services"
    >
      <div className="container">
        {services.map((service, i) => (
          <ServiceCard
            key={service.slug}
            service={service}
            index={i}
            total={services.length}
            stackProgress={scrollYProgress}
            stacked={stacked}
          />
        ))}
      </div>
    </section>
  )
}

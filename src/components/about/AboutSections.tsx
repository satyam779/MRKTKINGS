import { useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { useEffect, useRef, type CSSProperties } from 'react'
import { about, links } from '../../content'
import { ArrowUpRight } from '../Icons'
import { Monogram } from './Monogram'

// Hidden until real numbers are added to `about.metrics` in content.ts.
export function Metrics() {
  if (about.metrics.length === 0) return null
  return (
    <section className="metrics" aria-labelledby="metrics-title">
      <div className="container">
        <h2 id="metrics-title" className="sr-only">
          By the numbers
        </h2>
        <dl className="metrics__grid">
          {about.metrics.map((m) => (
            <div key={m.label}>
              <dt className="metrics__label">{m.label}</dt>
              <dd className="metrics__value">{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

// Each service row opens its section on the Services page.
export function WhatIDo() {
  const { heading, text, items } = about.whatIDo
  return (
    <section className="whatido" aria-labelledby="whatido-title">
      <div className="container whatido__inner">
        <div className="whatido__intro">
          <h2 id="whatido-title" className="about-heading">
            {heading}
          </h2>
          <p className="whatido__text">{text}</p>
          <a href={links.services} className="btn btn--ghost">
            See all services <ArrowUpRight size={18} />
          </a>
        </div>
        <ul className="whatido__list">
          {items.map((item) => (
            <li key={item.title}>
              <a className="whatido__row" href={`${links.services}#${item.service}`}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ArrowUpRight size={22} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// A red line fills along the steps as they scroll past; each number lights up when the line reaches it.
export function Process() {
  const { heading, text, steps } = about.process
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 50%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })
  // Mirror the fill into a CSS variable; also set it once in case the page loads already scrolled past.
  useMotionValueEvent(fill, 'change', (v) => ref.current?.style.setProperty('--p', v.toFixed(4)))
  useEffect(() => ref.current?.style.setProperty('--p', fill.get().toFixed(4)), [fill])

  return (
    <section className="process" aria-labelledby="process-title">
      <div className="container">
        <div className="process__head">
          <h2 id="process-title" className="about-heading">
            {heading}
          </h2>
          <p className="process__text">{text}</p>
        </div>
        <ol ref={ref} className="process__steps">
          {steps.map((step, i) => (
            <li key={step.title} style={{ '--at': (i + 0.2) / steps.length } as CSSProperties}>
              <span className="process__num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// Personal sign-off; doubles as this page's #contact target. The footer below carries email and socials.
export function Signoff() {
  const { heading, note } = about.signoff
  return (
    <section className="signoff" id="contact" aria-labelledby="signoff-title">
      <div className="container">
        <div className="signoff__by">
          <Monogram initials={about.initials} size={48} />
          <p>
            <strong>{about.name}</strong>
            <span>{about.role}, MRKTKings</span>
          </p>
        </div>
        <h2 id="signoff-title" className="signoff__title">
          {heading}
        </h2>
        <div className="signoff__foot">
          <p className="signoff__note">{note}</p>
          <a href={links.whatsapp} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
            Message me on WhatsApp <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}

import type { MouseEvent } from 'react'
import { media, whyUs } from '../content'
import { Trophy, Users } from './Icons'
import { Reveal } from './Reveal'

// Feeds the cursor position to CSS so the card's red spotlight follows the pointer.
function trackPointer(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`)
}

const icons = [Users, Trophy]

export function WhyUs() {
  return (
    <section className="why" id="why-us" aria-labelledby="why-heading">
      <div className="container">
        <Reveal>
          <span className="eyebrow">{whyUs.label}</span>
          <h2 id="why-heading" className="section-heading">
            {whyUs.heading}
          </h2>
        </Reveal>

        <div className="bento">
          {whyUs.points.map((point, i) => {
            const Icon = icons[i % icons.length]
            return (
              <Reveal key={point.title} delay={i * 0.1}>
                <article className="card" onMouseMove={trackPointer} style={{ height: '100%' }}>
                  <span className="card__icon">
                    <Icon size={26} />
                  </span>
                  <div>
                    <h3>{point.title}</h3>
                    <p>{point.text}</p>
                  </div>
                </article>
              </Reveal>
            )
          })}

          <Reveal delay={0.2} className="card card--feature">
            <img className="card__crown" src={media.crown} alt="" width={120} height={120} />
            <p>{whyUs.closing}</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

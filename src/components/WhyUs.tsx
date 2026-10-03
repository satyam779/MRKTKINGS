import { links, projects, services, whyUs } from '../content'
import { RadialCarousel, type RadialItem } from './RadialCarousel'
import { Reveal } from './Reveal'

// Brand projects alternate with the services behind them, so the ring mixes proof and craft.
const projectItems: RadialItem[] = projects.map((p) => ({
  id: `project-${p.slug}`,
  image: p.poster,
  video: p.video,
  kind: 'Project',
  title: p.name,
  meta: p.industry,
  href: `${links.work}#${p.slug}`,
  cta: 'View project',
}))
const serviceItems: RadialItem[] = services.map((s) => ({
  id: `service-${s.slug}`,
  image: s.image,
  kind: 'Service',
  title: s.title,
  meta: s.tagline,
  href: `${links.services}#${s.slug}`,
  cta: 'Explore service',
}))
const items = Array.from({ length: Math.max(projectItems.length, serviceItems.length) }).flatMap((_, i) =>
  [projectItems[i], serviceItems[i]].filter((it) => it !== undefined),
)

export function WhyUs() {
  return (
    <section className="why" id="why-us" aria-labelledby="why-heading">
      <div className="container why__inner">
        <div className="why__copy">
          <Reveal>
            <span className="eyebrow">{whyUs.label}</span>
            <h2 id="why-heading" className="section-heading">
              {whyUs.heading}
            </h2>
          </Reveal>

          <ol className="why__points">
            {whyUs.points.map((point, i) => (
              <Reveal as="li" key={point.title} delay={0.1 + i * 0.1} y={20}>
                <span className="why__num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.3} y={20}>
            <p className="why__closing">{whyUs.closing}</p>
          </Reveal>
        </div>

        {/* Fade only: a moving parent would throw off the carousel's card-to-ring morph measurements. */}
        <Reveal className="why__gallery" delay={0.15} y={0}>
          <RadialCarousel items={items} label="Our work and services" />
        </Reveal>
      </div>
    </section>
  )
}

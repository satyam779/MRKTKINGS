import { links, media, projects } from '../content'

// Ticker of the brands we've worked with; each name opens that project on the Projects page. Hovering pauses it
// so a name is easy to click. It's a shortcut for mouse and touch only (hidden from screen readers and skipped by
// Tab), since the Work section and the Projects page list the same projects.
// Project names are short, so each copy runs the list twice to keep the band full on very wide screens.
// The wrapper clips the tilted band sideways so it can't cause horizontal scrolling.
export function Marquee() {
  const items = [...projects, ...projects]
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee__item">
              {items.map((project, i) => (
                <span key={`${project.slug}-${i}`} style={{ display: 'contents' }}>
                  <a href={`${links.work}#${project.slug}`} tabIndex={-1}>
                    {project.name}
                  </a>
                  <img src={media.crown} alt="" width={28} height={28} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

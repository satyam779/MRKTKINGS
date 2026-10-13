import { links, marquee, media, projects } from '../content'

const shown = projects.filter((p) => !marquee.hide.includes(p.slug))

// Ticker of the brands we've worked with, then the `extra` line; each name opens that project on the Projects
// page. Hovering pauses it so a name is easy to click. It's a shortcut for mouse and touch only (hidden from
// screen readers and skipped by Tab), since the Work section and the Projects page list the same projects.
// Project names are short, so each copy runs the list twice to keep the band full on very wide screens.
// The wrapper clips the tilted band sideways so it can't cause horizontal scrolling.
export function Marquee() {
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee__item">
              {[0, 1].map((run) => (
                <span key={run} style={{ display: 'contents' }}>
                  {shown.map((project) => (
                    <span key={project.slug} style={{ display: 'contents' }}>
                      <a href={`${links.work}#${project.slug}`} tabIndex={-1}>
                        {project.name}
                      </a>
                      <img src={media.crown} alt="" width={28} height={28} />
                    </span>
                  ))}
                  {marquee.extra && (
                    <>
                      <span>{marquee.extra}</span>
                      <img src={media.crown} alt="" width={28} height={28} />
                    </>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { media, services } from '../content'

// Decorative ticker of service names; the real list lives in the Services section.
// The wrapper clips the tilted band sideways so it can't cause horizontal scrolling.
export function Marquee() {
  const items = services.map((s) => s.title)
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee__item">
              {items.map((item) => (
                <span key={item} style={{ display: 'contents' }}>
                  <span>{item}</span>
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

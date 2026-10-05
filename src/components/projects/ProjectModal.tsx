import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { deliverables, links } from '../../content'
import type { Project } from '../../content'
import { ArrowUpRight, Play, Volume } from '../Icons'
import { VideoLightbox } from '../VideoLightbox'

type Props = {
  project: Project
  index: number
  all: Project[]
  morph: boolean
  onClose: () => void
  onNavigate: (slug: string) => void
}

const ease = [0.22, 1, 0.36, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')

export function ProjectModal({ project, index, all, morph, onClose, onNavigate }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // Set while the reel is open full size: where it was and its shape.
  const [watching, setWatching] = useState<{ at: number; ratio: number } | null>(null)

  const prev = all[(index - 1 + all.length) % all.length]
  const next = all[(index + 1) % all.length]

  // Lock page scroll, move focus into the dialog and hand it back to the card on close.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = ''
      returnTo?.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [project.slug])

  // Pick the reel up where its card left off, so the grow-in looks like one continuous video.
  const syncWithCard = (video: HTMLVideoElement) => {
    const card = document.querySelector<HTMLVideoElement>(`.pcard[href="#${project.slug}"] video`)
    if (card && card.currentTime > 0) video.currentTime = card.currentTime
  }

  // The reel in the popup rests while it plays full size, and carries on when that closes.
  const watch = () => {
    const video = videoRef.current
    setWatching({
      at: video?.currentTime ?? 0,
      ratio: video?.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 1,
    })
    video?.pause()
  }
  const stopWatching = () => {
    setWatching(null)
    videoRef.current?.play().catch(() => {})
  }

  useEffect(() => {
    // The full-size player handles the keyboard while it's open.
    if (watching) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNavigate(next.slug)
      else if (e.key === 'ArrowLeft') onNavigate(prev.slug)
      else if (e.key === 'Tab' && panelRef.current) {
        // Keep keyboard focus inside the dialog.
        const items = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, next.slug, prev.slug, watching])

  const details = [
    project.challenge && { title: 'The challenge', text: project.challenge },
    project.approach && { title: 'Our approach', text: project.approach },
  ].filter(Boolean) as { title: string; text: string }[]

  return createPortal(
    <motion.div className="pmodal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pmodal__backdrop" onClick={onClose} aria-hidden="true" />

      <motion.div
        ref={panelRef}
        className="pmodal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pmodal-title"
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <button ref={closeRef} type="button" className="pmodal__close" onClick={onClose} aria-label="Close project">
          <span aria-hidden="true" />
        </button>

        <div ref={scrollRef} className="pmodal__scroll">
          <div className="pmodal__grid">
            <div className="pmodal__media-col">
              <motion.div
                key={project.slug}
                layoutId={morph ? `media-${project.slug}` : undefined}
                className="pmodal__media"
                style={{ borderRadius: 24 }}
                initial={morph ? undefined : { opacity: 0, x: 40 }}
                animate={morph ? undefined : { opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease }}
              >
                <video
                  ref={(v) => {
                    videoRef.current = v
                    // React only sets `muted` as a property; iOS also wants the attribute before autoplaying.
                    if (v) v.defaultMuted = true
                  }}
                  src={project.video}
                  poster={project.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onLoadedMetadata={(e) => morph && syncWithCard(e.currentTarget)}
                />
                <button
                  type="button"
                  className="pmodal__watch"
                  onClick={watch}
                  aria-label={`Watch the ${project.name} reel ${project.fullVideo ? 'with sound' : 'full size'}`}
                >
                  <span className="pmodal__play" aria-hidden="true">
                    <Play size={22} />
                  </span>
                  <span className="pmodal__hint" aria-hidden="true">
                    {project.fullVideo ? (
                      <>
                        <Volume size={16} /> Watch with sound
                      </>
                    ) : (
                      'Watch full size'
                    )}
                  </span>
                </button>
              </motion.div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={project.slug}
                className="pmodal__info"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.15, ease } }}
                exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
              >
                <span className="eyebrow">
                  Project {pad(index + 1)} / {pad(all.length)} · {project.industry}
                </span>
                <h2 id="pmodal-title" className="pmodal__title">
                  {project.name}
                  <span className="accent">.</span>
                </h2>
                <p className="pmodal__summary">{project.summary}</p>

                <ul className="pcard__tags" aria-label="Services">
                  {project.services.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>

                {details.map((d) => (
                  <section key={d.title} className="pmodal__block">
                    <h3>{d.title}</h3>
                    <p>{d.text}</p>
                  </section>
                ))}

                <section className="pmodal__block">
                  <h3>What we delivered</h3>
                  <ol className="deliverables">
                    {project.services.map((s, i) => {
                      const d = deliverables[s]
                      return (
                        <motion.li
                          key={s}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + i * 0.07, duration: 0.5, ease }}
                        >
                          <span className="deliverables__num">{pad(i + 1)}</span>
                          <div>
                            <h4>{d?.label ?? s}</h4>
                            {d && <p>{d.text}</p>}
                            {d?.service && (
                              <a href={`${links.services}#${d.service}`} className="deliverables__link">
                                Explore the service <ArrowUpRight size={14} />
                              </a>
                            )}
                          </div>
                        </motion.li>
                      )
                    })}
                  </ol>
                </section>

                {project.results && project.results.length > 0 && (
                  <section className="pmodal__block">
                    <h3>Results</h3>
                    <ul className="pmodal__results">
                      {project.results.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="pmodal__cta">
                  <p>
                    Want this kind of <span className="accent">Wow</span> for your brand?
                  </p>
                  <div className="pmodal__cta-actions">
                    <a href={links.contact} className="btn btn--primary">
                      Let&rsquo;s Connect <ArrowUpRight size={18} />
                    </a>
                    {project.website && (
                      <a href={project.website} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
                        Visit site <ArrowUpRight size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <nav className="pmodal__pager" aria-label="More projects">
            <button type="button" onClick={() => onNavigate(prev.slug)}>
              <span>Previous</span>
              {prev.name}
            </button>
            <button type="button" onClick={() => onNavigate(next.slug)}>
              <span>Next</span>
              {next.name}
            </button>
          </nav>
        </div>
      </motion.div>

      <AnimatePresence>
        {watching && (
          <VideoLightbox
            src={project.fullVideo ?? project.video}
            poster={project.poster}
            startAt={watching.at}
            ratio={watching.ratio}
            label={`${project.name} reel`}
            sound={!!project.fullVideo}
            onClose={stopWatching}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}

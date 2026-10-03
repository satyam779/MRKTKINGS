import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import type { PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { projects, projectsPage } from '../../content'
import { useMediaQuery } from '../../useMediaQuery'
import { createInkEngine, type InkEngine } from './inkReveal'

const ease = [0.22, 1, 0.36, 1] as const
const disciplines = new Set(projects.flatMap((p) => p.services)).size
// Opening ink flood: starts this long after the page mounts, takes FLOOD_MS to cover the hero, and
// is skipped if the posters take longer than FLOOD_WAIT_MS to arrive.
const FLOOD_DELAY_MS = 400
const FLOOD_MS = 900
const FLOOD_WAIT_MS = 2000
// The headline sweep waits this long after the flood has filled, so it plays once the flood has dried.
const SWEEP_DELAY_MS = 1500

export function ProjectsHero() {
  const last = projectsPage.title.length - 1
  const sectionRef = useRef<HTMLElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const engine = useRef<InkEngine | null>(null)
  const reduce = useReducedMotion()
  const finePointer = useMediaQuery('(pointer: fine)')
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)

  // Brand label that rides along with the brush, naming the project under the ink.
  const lx = useMotionValue(0)
  const ly = useMotionValue(0)
  const x = useSpring(lx, { stiffness: 420, damping: 36 })
  const y = useSpring(ly, { stiffness: 420, damping: 36 })
  const [label, setLabel] = useState({ project: -1, on: false })

  // Hover ink: skipped entirely for reduced-motion visitors and browsers without WebGL.
  useEffect(() => {
    const host = inkRef.current
    if (reduce || !host) return
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    const ink = createInkEngine(host, {
      images: projects.map((p) => p.poster),
      videos: saveData ? undefined : projects.map((p) => p.video),
      onBrush: (bx, by, project, on) => {
        lx.set(bx)
        ly.set(by)
        // While hidden, snap instead of springing so the label never flies in from a stale spot.
        if (!on) {
          x.jump(bx)
          y.jump(by)
        }
        setLabel((prev) => (prev.project === project && prev.on === on ? prev : { project, on }))
      },
    })
    if (!ink) return
    engine.current = ink
    setReady(true)

    // On arrival the ink floods in from every edge until the whole hero shows the work and dries off in
    // patches, then one sweep through the headline introduces the brush. The flood waits for the
    // posters (skipped if they are slow, rather than landing late), and the sweep is measured once the
    // web fonts are in, so the path follows the real line breaks.
    let alive = true
    let sweepTimer = 0
    const intro = window.setTimeout(async () => {
      const posters = await Promise.race([
        ink.ready.then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), FLOOD_WAIT_MS)),
      ])
      if (!alive) return
      if (posters) ink.flood(FLOOD_MS)
      await document.fonts.ready
      sweepTimer = window.setTimeout(
        () => {
          const title = titleRef.current
          const section = sectionRef.current
          if (!alive || !title || !section) return
          const s = section.getBoundingClientRect()
          const t = title.getBoundingClientRect()
          const left = t.left - s.left
          const top = t.top - s.top
          const width = Math.min(t.width, s.width * 0.9)
          ink.sweep(
            (p) => ({
              x: left - 40 + (width + 80) * p,
              y: top + t.height * (0.5 + 0.3 * Math.sin(p * Math.PI * 2.1 + 0.4)),
            }),
            1700,
          )
        },
        posters ? FLOOD_MS + SWEEP_DELAY_MS : 0,
      )
    }, FLOOD_DELAY_MS)

    return () => {
      alive = false
      window.clearTimeout(intro)
      window.clearTimeout(sweepTimer)
      ink.destroy()
      engine.current = null
      setReady(false)
      setLabel({ project: -1, on: false })
    }
  }, [reduce, lx, ly, x, y])

  const local = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top] as const
  }
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!engine.current) return
    engine.current.move(...local(e), e.pointerType)
    if (!touched) setTouched(true)
  }
  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (!engine.current || e.button !== 0) return
    engine.current.blot(...local(e))
    if (!touched) setTouched(true)
  }

  const shown = label.project >= 0 ? projects[label.project] : null

  return (
    <section
      ref={sectionRef}
      className="page-hero page-hero--ink"
      aria-labelledby="projects-title"
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerLeave={() => engine.current?.leave()}
    >
      <div ref={inkRef} className="ink-layer" aria-hidden="true" />

      {shown && (
        <motion.div
          className="ink-label"
          aria-hidden="true"
          style={{ x, y }}
          initial={false}
          animate={{ opacity: label.on ? 1 : 0, scale: label.on ? 1 : 0.85 }}
          transition={{ duration: label.on ? 0.25 : 0.5, ease }}
        >
          <span className="ink-label__num">{String(label.project + 1).padStart(2, '0')}</span>
          <span className="ink-label__text">
            <motion.span
              key={shown.slug}
              className="ink-label__name"
              initial={{ y: '80%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ duration: 0.3, ease }}
            >
              {shown.name}
              <em>{shown.industry}</em>
            </motion.span>
          </span>
        </motion.div>
      )}

      <div className="container">
        <div className="page-hero__top">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            {projectsPage.eyebrow}
          </motion.span>
          <AnimatePresence>
            {ready && !touched && (
              <motion.span
                className="ink-hint"
                aria-hidden="true"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, delay: 0.2, ease }}
              >
                {finePointer ? 'Move your cursor to reveal the work' : 'Tap or swipe to reveal the work'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <h1 ref={titleRef} id="projects-title" className="page-hero__title">
          {projectsPage.title.map((line, i) => (
            <span key={line} className="hero__line">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.2 + i * 0.12, ease }}
              >
                {line}
                {i === last && <span className="accent"> {projectsPage.highlight}</span>}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="page-hero__bottom"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
        >
          <p className="page-hero__intro">{projectsPage.intro}</p>
          <dl className="stats">
            <div>
              <dt>Brands</dt>
              <dd>{String(projects.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Disciplines</dt>
              <dd>{String(disciplines).padStart(2, '0')}</dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </section>
  )
}

import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { links, media, services, servicesPage } from '../content'
import { useAutoplay } from '../useAutoplay'
import { videoSrc } from '../videoSrc'
import { ArrowUpRight } from './Icons'

const ease = [0.16, 1, 0.3, 1] as const
// How far the type zooms in: by this scale the camera is deep inside one letter and the film fills the screen.
const ZOOM = 46

// Scroll timeline across the pinned hero, as fractions of its scroll length.
const at = {
  copyOut: [0, 0.12],
  zoom: [0.04, 0.56],
  maskOut: [0.48, 0.58],
  indexIn: [0.6, 0.8],
}

// Opens on the suite's name set huge, with the brand film playing inside the letters. Scrolling flies
// the camera into the middle letter until the film fills the screen, then the six services surface over
// it as an index into the page below. (The brand film rather than the services reel: the reel's text
// cards and black stretches would blank out the letters.)
export function ServicesHero() {
  const ref = useRef<HTMLElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  const pivotRef = useRef<HTMLSpanElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src] = useState(() => videoSrc(media.heroVideo, media.heroVideoSmall))
  const reduce = useReducedMotion()
  const inView = useInView(ref)
  const [origin, setOrigin] = useState('50% 50%')

  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const copyOpacity = useTransform(p, at.copyOut, [1, 0])
  const copyY = useTransform(p, at.copyOut, [0, 48])
  // Scale geometrically so the zoom feels like constant speed rather than a slow start and a sudden rush.
  const scale = useTransform(p, (v) => ZOOM ** clamp01((v - at.zoom[0]) / (at.zoom[1] - at.zoom[0])))
  const maskOpacity = useTransform(p, at.maskOut, [1, 0])
  const scrim = useTransform(p, at.indexIn, [0, 1])
  const indexOpacity = useTransform(p, at.indexIn, [0, 1])
  const indexY = useTransform(p, at.indexIn, [48, 0])
  const copyEvents = useTransform(p, (v) => (v < at.copyOut[1] * 0.6 ? 'auto' : 'none'))
  const indexEvents = useTransform(p, (v) => (v > at.indexIn[0] + 0.05 ? 'auto' : 'none'))

  // The letters centre in the space above the copy, so reserve its height; then zoom around the centre of
  // the pivot letter, measured from layout so the transforms don't skew it.
  useLayoutEffect(() => {
    const mask = maskRef.current
    const pivot = pivotRef.current
    const copy = copyRef.current
    if (!mask || !pivot || !copy) return
    const measure = () => {
      mask.style.setProperty('--copy-h', `${copy.offsetHeight}px`)
      let x = pivot.offsetWidth / 2
      let y = pivot.offsetHeight / 2
      for (let el: HTMLElement | null = pivot; el && el !== mask; el = el.offsetParent as HTMLElement | null) {
        x += el.offsetLeft
        y += el.offsetTop
      }
      setOrigin(`${x}px ${y}px`)
    }
    measure()
    document.fonts.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(mask)
    ro.observe(copy)
    return () => ro.disconnect()
  }, [])

  // The film only runs while the hero is on screen.
  useAutoplay(videoRef, inView)

  // Keyboard users can reach links in either layer, so bring that layer on screen when it takes focus.
  const scrollToPhase = (phase: number) => {
    const el = ref.current
    if (!el || reduce) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * phase, behavior: 'instant' })
  }

  const [first, last] = servicesPage.mask
  const mid = Math.floor(last.length / 2)

  return (
    <section
      ref={ref}
      className={`svc-hero${reduce ? ' svc-hero--still' : ''}`}
      aria-labelledby="services-title"
    >
      <div className="svc-hero__pin">
        <video
          ref={videoRef}
          className="svc-hero__reel"
          src={src}
          poster={media.heroPoster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />

        {/* Black sheet with white type, multiplied over the film: the film only shows through the letters. */}
        <motion.div
          ref={maskRef}
          className="svc-hero__mask"
          aria-hidden="true"
          style={reduce ? undefined : { scale, opacity: maskOpacity, transformOrigin: origin }}
        >
          <span className="svc-hero__line">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.15, ease }}
            >
              {first}
            </motion.span>
          </span>
          <span className="svc-hero__line">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.27, ease }}
            >
              {last.slice(0, mid)}
              <span ref={pivotRef}>{last[mid]}</span>
              {last.slice(mid + 1)}
            </motion.span>
          </span>
        </motion.div>

        {!reduce && <motion.div className="svc-hero__scrim" aria-hidden="true" style={{ opacity: scrim }} />}

        <motion.div
          ref={copyRef}
          className="container svc-hero__copy"
          style={reduce ? undefined : { opacity: copyOpacity, y: copyY, pointerEvents: copyEvents }}
          onFocus={() => scrollToPhase(0)}
        >
          <h1 id="services-title" className="sr-only">
            {`${servicesPage.title} ${servicesPage.lead} ${servicesPage.words.join(' ')}`}
          </h1>
          <motion.p
            className="svc-hero__tagline"
            aria-hidden="true"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
          >
            {servicesPage.lead} <Rotator words={servicesPage.words} paused={!inView || !!reduce} />
          </motion.p>
          <motion.div
            className="svc-hero__foot"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease }}
          >
            <p className="svc-hero__sub">{servicesPage.intro}</p>
            <div className="svc-hero__ctas">
              <a href={links.contact} className="btn btn--primary">
                Let&rsquo;s Connect <ArrowUpRight size={18} />
              </a>
              <a href={`#${services[0].slug}`} className="btn btn--ghost">
                Explore services
              </a>
            </div>
          </motion.div>
        </motion.div>

        {!reduce && (
          <motion.nav
            className="container svc-hero__index"
            aria-label="Services"
            style={{ opacity: indexOpacity, y: indexY, pointerEvents: indexEvents }}
            onFocus={() => scrollToPhase(0.92)}
          >
            <p className="svc-hero__promise">{servicesPage.promises.map((s) => `${s}.`).join(' ')}</p>
            <ul>
              {services.map((s) => (
                <li key={s.slug}>
                  <a href={`#${s.slug}`}>
                    <span className="svc-hero__index-title">{s.title}</span>
                    <span className="svc-hero__index-line">{s.tagline}</span>
                    <ArrowUpRight size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </div>
    </section>
  )
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

// Swaps the last headline word every few seconds. The widest word reserves the space so nothing shifts.
function Rotator({ words, paused }: { words: string[]; paused: boolean }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2800)
    return () => window.clearInterval(id)
  }, [paused, words.length])

  return (
    <span className="rotator accent">
      {words.map((w) => (
        <span key={w} className="rotator__ghost">
          {w}
        </span>
      ))}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className="rotator__word"
          initial={{ y: '0.25em', opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: '0em', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-0.25em', opacity: 0, filter: 'blur(6px)', transition: { duration: 0.15, ease: 'easeIn' } }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

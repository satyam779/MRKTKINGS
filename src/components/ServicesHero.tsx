import type { MotionStyle, MotionValue, Variants } from 'framer-motion'
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { links, media, projects, services, servicesPage } from '../content'
import { ArrowUpRight } from './Icons'

const ease = [0.16, 1, 0.3, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')

const copy: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
}
const chip: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease } },
}
const card: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: 'blur(8px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease } },
}

// Fanned collage slots, back to front. `side` and `depth` drive how far each card fans out on scroll.
type Slot = { top: string; left?: string; right?: string; width: string; rotate: number; z: number; side: number; depth: number }
const slot = {
  L4: { top: '-30%', left: '-15%', width: '24%', rotate: -15, z: 1, side: -1, depth: 4 },
  R4: { top: '-30%', right: '-15%', width: '24%', rotate: 15, z: 1, side: 1, depth: 4 },
  L3: { top: '-10%', left: '-5%', width: '28%', rotate: -10, z: 2, side: -1, depth: 3 },
  R3: { top: '-10%', right: '-5%', width: '28%', rotate: 10, z: 2, side: 1, depth: 3 },
  L2: { top: '10%', left: '5%', width: '34%', rotate: -5, z: 3, side: -1, depth: 2 },
  R2: { top: '10%', right: '5%', width: '34%', rotate: 5, z: 3, side: 1, depth: 2 },
  L1: { top: '25%', left: '15%', width: '42%', rotate: -2, z: 4, side: -1, depth: 1 },
  R1: { top: '25%', right: '15%', width: '42%', rotate: 2, z: 4, side: 1, depth: 1 },
  front: { top: '40%', left: '24%', width: '52%', rotate: 0, z: 10, side: 0, depth: 0 },
  back: { top: '15%', left: '38%', width: '24%', rotate: 0, z: 0, side: 0, depth: 0 },
} satisfies Record<string, Slot>

type Tile = { key: string; href: string; image: string; label: string; num?: string; title: string; meta?: string; slot: Slot }

// Services take the inner slots (first service up front); projects frame the outside.
const serviceSlots = [slot.front, slot.L1, slot.R1, slot.L2, slot.R2, slot.back]
const projectSlots = [slot.L4, slot.R4, slot.L3, slot.R3]
const tiles: Tile[] = [
  ...services.slice(0, serviceSlots.length).map((s, i) => ({
    key: s.slug,
    href: `#${s.slug}`,
    image: s.image,
    label: `${s.title}: jump to service`,
    num: pad(i + 1),
    title: s.title,
    slot: serviceSlots[i],
  })),
  ...servicesPage.collageProjects
    .map((slug) => projects.find((p) => p.slug === slug))
    .filter((p) => p !== undefined)
    .slice(0, projectSlots.length)
    .map((p, i) => ({
      key: p.slug,
      href: `${links.work}#${p.slug}`,
      image: p.poster,
      label: `${p.name}: view project`,
      title: p.name,
      meta: p.industry,
      slot: projectSlots[i],
    })),
]

export function ServicesHero() {
  const ref = useRef<HTMLElement>(null)
  const collageRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref)

  // The fan opens up as the collage scrolls through the viewport.
  const { scrollYProgress } = useScroll({ target: collageRef, offset: ['start end', 'end start'] })
  const spread = useTransform(scrollYProgress, [0.25, 0.75], [0, 1])

  return (
    <section ref={ref} className="svc-hero" aria-labelledby="services-title">
      <div className="svc-hero__dots" aria-hidden="true" />
      <motion.div
        className="svc-hero__glow"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease }}
      />
      <div className="svc-hero__rings" aria-hidden="true">
        <span />
      </div>
      <div className="svc-hero__frame" aria-hidden="true">
        <span className="svc-hero__cross svc-hero__cross--tl" />
        <span className="svc-hero__cross svc-hero__cross--tr" />
        <span className="svc-hero__cross svc-hero__cross--bl" />
        <span className="svc-hero__cross svc-hero__cross--br" />
      </div>

      <div className="container svc-hero__inner">
        <motion.div className="svc-hero__copy" variants={copy} initial="hidden" animate="visible">
          <motion.span className="svc-hero__badge" variants={item}>
            <img src={media.crown} alt="" width={16} height={16} />
            {servicesPage.badge}
          </motion.span>

          <h1 id="services-title" className="svc-hero__title">
            <span className="sr-only">
              {`${servicesPage.title} ${servicesPage.lead} ${servicesPage.words.join(' ')}`}
            </span>
            <motion.span className="svc-hero__line" variants={item} aria-hidden="true">
              {servicesPage.title}
            </motion.span>
            <motion.span className="svc-hero__line" variants={item} aria-hidden="true">
              {servicesPage.lead} <Rotator words={servicesPage.words} paused={!inView || !!reduce} />
            </motion.span>
          </h1>

          <motion.p className="svc-hero__sub" variants={item}>
            {servicesPage.intro}
          </motion.p>

          <motion.div className="svc-hero__ctas" variants={item}>
            <a href={links.contact} className="btn btn--primary">
              Let&rsquo;s Connect <ArrowUpRight size={18} />
            </a>
            <a href={`#${services[0].slug}`} className="btn btn--ghost">
              Explore services
            </a>
          </motion.div>

          <motion.div className="svc-hero__proof" variants={item}>
            <p className="svc-hero__proof-label">{servicesPage.promiseLabel}</p>
            <motion.ul
              className="svc-hero__chips"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
            >
              {servicesPage.promises.map((p) => (
                <motion.li key={p} variants={chip}>
                  {p}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>

        <motion.div
          ref={collageRef}
          className="svc-collage"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.8 } } }}
        >
          {tiles.map((t) => (
            <CollageCard key={t.key} tile={t} spread={spread} still={!!reduce} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function CollageCard({ tile, spread, still }: { tile: Tile; spread: MotionValue<number>; still: boolean }) {
  const { slot: s } = tile
  const x = useTransform(spread, (v) => `${s.side * v * (s.depth * 5 + 4)}%`)
  const y = useTransform(spread, (v) => (s.side === 0 ? v * -24 : v * s.depth * -6))
  const rotate = useTransform(spread, (v) => s.rotate + s.side * v * (2 + s.depth * 1.5))

  const style: MotionStyle & { '--z': number } = {
    top: s.top,
    left: s.left,
    right: s.right,
    width: s.width,
    '--z': s.z,
    ...(still ? { rotate: s.rotate } : { x, y, rotate }),
  }

  return (
    <motion.div className="svc-collage__slot" style={style} variants={card}>
      <motion.a
        href={tile.href}
        className="svc-card"
        aria-label={tile.label}
        whileHover={{ scale: 1.05 }}
        whileFocus={{ scale: 1.05 }}
        transition={{ duration: 0.4, ease }}
      >
        {/* Title bar sits on top: in the fan, the card in front always covers the bottom edge. */}
        <span className="svc-card__cap">
          {tile.num && <span className="svc-card__num">{tile.num}</span>}
          <span className="svc-card__title">{tile.title}</span>
          {tile.meta && <em>{tile.meta}</em>}
          <ArrowUpRight size={14} />
        </span>
        <img src={tile.image} alt="" width={512} height={320} decoding="async" />
      </motion.a>
    </motion.div>
  )
}

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

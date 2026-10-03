import type { AnimationPlaybackControls, MotionValue, PanInfo, Variants } from 'framer-motion'
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import type { KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useAutoplay } from '../useAutoplay'
import { ArrowUpRight, ChevronLeft, ChevronRight } from './Icons'

export type RadialItem = {
  id: string
  image: string
  video?: string
  kind: string
  title: string
  meta: string
  href: string
  cta: string
}

const ease = [0.22, 1, 0.36, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')

type Sizes = { center: number; radius: number; thumb: number; height: number }
const measure = (width: number): Sizes => {
  const s = Math.min(width, 640)
  const center = Math.round(Math.min(420, s * 0.82))
  const radius = Math.round(s * 0.37)
  const thumb = Math.round(Math.max(58, s * 0.17))
  // A tilted thumbnail needs up to its diagonal, hence the 1.42x headroom around the ring.
  return { center, radius, thumb, height: Math.round(Math.max(center + 32, radius * 2 + thumb * 1.42)) }
}

// The big card slides sideways when stepping with the arrows (d = +1/-1); picked from the ring (d = 0)
// it morphs out of its thumbnail instead, so it must not slide.
const slide: Variants = {
  enter: (d: number) => (d === 0 ? { opacity: 1 } : { opacity: 0, x: d * 60, rotate: d * 3 }),
  center: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.55, ease } },
  exit: (d: number) =>
    d === 0
      ? { opacity: 0, transition: { duration: 0.2 } }
      : { opacity: 0, x: d * -60, rotate: d * -3, transition: { duration: 0.3, ease } },
}
const ring: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
}
// The track and the centre hint fade out first so they never sit on top of the card flying back in.
const hub: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.4, delay: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}
const thumb: Variants = {
  enter: { opacity: 0, scale: 0.8 },
  center: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.35, duration: 0.55 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
}

// Opens as a ring of thumbnails you can spin like a wheel; picking one (or "Open" for the one at the top)
// flies it into a big featured card, and "View all" fans everything back out into the ring.
export function RadialCarousel({ items, label }: { items: RadialItem[]; label: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState<Sizes>(() => measure(560))
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1)
  const reduce = useReducedMotion()
  const rotation = useMotionValue(0)
  const spin = useRef<AnimationPlaybackControls | null>(null)
  // Where a keyboard spin is heading, so quick repeated presses stack instead of restarting from mid-turn.
  const heading = useRef<number | null>(null)
  const pan = useRef({ angle: 0, moved: false, time: 0, velocity: 0 })
  // Which control gets keyboard focus in the view that mounts next, since the pressed button unmounts.
  const [focus, setFocus] = useState<Focus>(null)
  const step = 360 / items.length
  // The ring deals itself in once the section scrolls into view.
  const inView = useInView(stageRef, { once: true, amount: 0.3 })

  // Which item currently sits in the top slot, shown in the middle of the ring.
  const [top, setTop] = useState(0)
  useMotionValueEvent(rotation, 'change', (r) => {
    const i = (((Math.round(-r / step) % items.length) + items.length) % items.length)
    setTop((prev) => (prev === i ? prev : i))
  })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSizes(measure(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = (delta: number) => {
    setDir(delta)
    setFocus(delta > 0 ? 'next' : 'prev')
    setActive((i) => (i + delta + items.length) % items.length)
  }
  const openRing = () => {
    spin.current?.stop()
    rotation.jump(-active * step) // the current card takes the top slot of the ring
    setDir(0)
    setFocus('ring')
    setOpen(true)
  }
  const close = (index = active) => {
    setDir(0)
    setFocus('all')
    setActive(index)
    setOpen(false)
  }
  const rotateBy = (deg: number) => {
    spin.current?.stop()
    const target = Math.round(((heading.current ?? rotation.get()) + deg) / step) * step
    heading.current = target
    const done = () => {
      heading.current = null
    }
    spin.current = animate(
      rotation,
      target,
      reduce ? { duration: 0, onComplete: done } : { type: 'spring', stiffness: 160, damping: 24, onComplete: done },
    )
  }

  // Spin by dragging around the centre, measured as an angle so it feels like turning a wheel.
  const angleAt = (x: number, y: number) => {
    const r = stageRef.current!.getBoundingClientRect()
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI
  }
  const onPanStart = (e: PointerEvent) => {
    spin.current?.stop()
    heading.current = null
    pan.current = { angle: angleAt(e.clientX, e.clientY), moved: true, time: performance.now(), velocity: 0 }
  }
  const onPan = (e: PointerEvent) => {
    const angle = angleAt(e.clientX, e.clientY)
    let delta = angle - pan.current.angle
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    const now = performance.now()
    pan.current.velocity = (delta / Math.max(now - pan.current.time, 1)) * 1000
    pan.current.angle = angle
    pan.current.time = now
    rotation.set(rotation.get() + delta)
  }
  const onPanEnd = () => {
    if (reduce) return
    // Let it coast, then settle with a card squarely at the top.
    spin.current = animate(rotation, rotation.get(), {
      type: 'inertia',
      velocity: pan.current.velocity,
      power: 0.3,
      timeConstant: 320,
      modifyTarget: (t) => Math.round(t / step) * step,
    })
  }
  // A sideways swipe on the big card steps to the next (left) or previous (right) item.
  const onSwipe = (_: PointerEvent, info: PanInfo) => {
    const { x, y } = info.offset
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y) * 1.5) go(x < 0 ? 1 : -1)
  }
  const onRingKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') rotateBy(-step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') rotateBy(step)
    else return
    e.preventDefault()
  }

  const item = items[active]
  const topItem = items[top]

  return (
    <div
      ref={stageRef}
      className="radial"
      style={{ height: sizes.height }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        {!open ? (
          <motion.div
            key={item.id}
            className="radial__view radial__swipe"
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            onPanEnd={onSwipe}
          >
            <FeatureCard
              item={item}
              index={active}
              total={items.length}
              size={sizes.center}
              focus={focus}
              onOpen={openRing}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="ring"
            className="radial__view radial__ring"
            variants={ring}
            initial="enter"
            animate={inView ? 'center' : 'enter'}
            exit="exit"
            onPointerDown={() => {
              pan.current.moved = false
            }}
            onPanStart={onPanStart}
            onPan={onPan}
            onPanEnd={onPanEnd}
            onKeyDown={onRingKey}
          >
            <motion.span
              className="radial__track"
              aria-hidden="true"
              variants={hub}
              style={{ width: sizes.radius * 2, height: sizes.radius * 2 }}
            />
            {items.map((it, i) => (
              <Thumb
                key={it.id}
                item={it}
                index={i}
                total={items.length}
                rotation={rotation}
                radius={sizes.radius}
                size={sizes.thumb}
                focused={focus === 'ring' && i === active}
                onPick={() => {
                  if (!pan.current.moved) close(i)
                }}
              />
            ))}
            <motion.div
              className="radial__hub"
              variants={hub}
              style={{ maxWidth: Math.max(140, sizes.radius * 2 - sizes.thumb * 1.6) }}
            >
              <motion.div
                key={topItem.id}
                className="radial__now"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                <span className="radial__now-kind">{topItem.kind}</span>
                <span className="radial__now-title">{topItem.title}</span>
              </motion.div>
              <button type="button" className="radial__open" onClick={() => close(top)}>
                Open <ArrowUpRight size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {open
          ? `${topItem.kind}: ${topItem.title} at the top of the ring`
          : `${item.kind}: ${item.title}, ${active + 1} of ${items.length}`}
      </p>
    </div>
  )
}

type Focus = 'all' | 'prev' | 'next' | 'ring' | null

type FeatureCardProps = {
  item: RadialItem
  index: number
  total: number
  size: number
  focus: Focus
  onOpen: () => void
  onPrev: () => void
  onNext: () => void
}

function FeatureCard({ item, index, total, size, focus, onOpen, onPrev, onNext }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const allRef = useRef<HTMLButtonElement>(null)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  // Hold the reel back until the card has finished growing, so the bright poster carries the morph.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(true), 650)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const target = { all: allRef, prev: prevRef, next: nextRef, ring: null }[focus ?? 'ring']
    target?.current?.focus({ preventScroll: true })
  }, [focus])

  // Project reels play only while the card is on screen (never for reduced-motion visitors).
  useAutoplay(videoRef, settled && inView && !reduce)

  return (
    <motion.div
      ref={ref}
      layoutId={`radial-card-${item.id}`}
      layoutCrossfade={false}
      className="radial__card"
      style={{ width: size, height: size, borderRadius: 32 }}
    >
      <div className="radial__frame">
        <motion.img
          layoutId={`radial-img-${item.id}`}
          layoutCrossfade={false}
          className="radial__media"
          src={item.image}
          alt=""
          draggable={false}
          style={{ borderRadius: 24 }}
        />
        {item.video && (
          <video
            ref={videoRef}
            className="radial__media radial__video"
            src={item.video}
            poster={item.image}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onPlaying={() => setPlaying(true)}
            style={{ opacity: playing ? 1 : 0 }}
          />
        )}
        <span className="radial__shade" aria-hidden="true" />

        <div className="radial__bar">
          <div className="radial__arrows">
            <button ref={prevRef} type="button" onClick={onPrev} aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <button ref={nextRef} type="button" onClick={onNext} aria-label="Next">
              <ChevronRight size={18} />
            </button>
          </div>
          <button ref={allRef} type="button" className="radial__all" onClick={onOpen}>
            View all
          </button>
        </div>

        <div className="radial__caption">
          <span className="radial__kind">
            <b>{item.kind}</b> {pad(index + 1)} / {pad(total)}
          </span>
          <h3 className="radial__title">{item.title}</h3>
          <p className="radial__meta">{item.meta}</p>
          <a className="radial__link" href={item.href}>
            {item.cta} <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </motion.div>
  )
}

type ThumbProps = {
  item: RadialItem
  index: number
  total: number
  rotation: MotionValue<number>
  radius: number
  size: number
  focused: boolean
  onPick: () => void
}

function Thumb({ item, index, total, rotation, radius, size, focused, onPick }: ThumbProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focused) ref.current?.focus({ preventScroll: true })
  }, [focused])

  const base = (index / total) * 360 - 90
  const angle = (r: number) => ((base + r) * Math.PI) / 180
  const x = useTransform(rotation, (r) => Math.cos(angle(r)) * radius)
  const y = useTransform(rotation, (r) => Math.sin(angle(r)) * radius)
  const rotate = useTransform(rotation, (r) => base + r + 90)

  return (
    <motion.button
      ref={ref}
      type="button"
      className="radial__item"
      variants={thumb}
      style={{ x, y, rotate, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      onClick={onPick}
      aria-label={`${item.title} (${item.kind})`}
      whileHover={{ scale: 1.08 }}
    >
      <motion.span
        layoutId={`radial-card-${item.id}`}
        layoutCrossfade={false}
        className="radial__thumb"
        style={{ borderRadius: 18 }}
      >
        <motion.img
          layoutId={`radial-img-${item.id}`}
          layoutCrossfade={false}
          src={item.image}
          alt=""
          draggable={false}
          style={{ borderRadius: 13 }}
        />
      </motion.span>
    </motion.button>
  )
}

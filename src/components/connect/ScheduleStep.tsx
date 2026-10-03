import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { FormEvent, KeyboardEvent, MouseEvent, PointerEvent, RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { booking, links } from '../../content'
import { ArrowLeft, ChevronLeft, ChevronRight, WhatsApp } from '../Icons'
import type { SendStatus } from './ConnectPage'
import type { Day, Details, Slot } from './booking'
import {
  buildDays,
  dateLong,
  dateShort,
  formatStudioTime,
  formatTime,
  monthRange,
  onStudioTime,
  sameMinute,
  weekdayShort,
  zoneNote,
} from './booking'

const ease = [0.22, 1, 0.36, 1] as const
const pill = { type: 'spring', stiffness: 380, damping: 32 } as const

// Content slides out one way and in from the other, following the direction the date moved.
// Variants (not inline values) so the leaving content picks up the latest direction too.
const slide = (distance: number, blur: number) => ({
  enter: (dir: number) => ({ opacity: 0, x: dir * distance, filter: `blur(${blur}px)` }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -distance, filter: `blur(${blur}px)` }),
})
const labelSlide = slide(24, 4)
const slotsSlide = slide(40, 6)

// Scrolls the strip just enough to show a date, without ever moving the page itself.
function reveal(strip: HTMLElement, item: HTMLElement, behavior: ScrollBehavior) {
  const left = item.offsetLeft - 8
  const right = item.offsetLeft + item.offsetWidth + 8
  if (left < strip.scrollLeft) strip.scrollTo({ left, behavior })
  else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth, behavior })
}

const groupsFor = (day: Day) =>
  [
    { label: 'Morning', slots: day.slots.filter((s) => s.start.getHours() < 12) },
    { label: 'Afternoon', slots: day.slots.filter((s) => s.start.getHours() >= 12 && s.start.getHours() < 17) },
    { label: 'Evening', slots: day.slots.filter((s) => s.start.getHours() >= 17) },
  ].filter((g) => g.slots.length > 0)

// Mouse drag-to-scroll for the date strip, with a little momentum on release. Touch scrolls natively.
// A drag never counts as a click, so letting go over a date doesn't select it.
function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  const state = useRef({ down: false, moved: false, x: 0, left: 0, lastX: 0, lastT: 0, v: 0, raf: 0 })
  const reduce = useReducedMotion()

  useEffect(() => () => cancelAnimationFrame(state.current.raf), [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
    cancelAnimationFrame(state.current.raf)
    state.current = { ...state.current, down: true, moved: false, x: e.clientX, left: el.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, v: 0 }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = state.current
    const el = ref.current
    if (!s.down || !el) return
    const dx = e.clientX - s.x
    if (!s.moved && Math.abs(dx) > 5) {
      s.moved = true
      el.setPointerCapture(e.pointerId)
      el.classList.add('is-dragging')
    }
    if (!s.moved) return
    el.scrollLeft = s.left - dx
    const dt = e.timeStamp - s.lastT
    if (dt > 0) s.v = (e.clientX - s.lastX) / dt
    s.lastX = e.clientX
    s.lastT = e.timeStamp
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = state.current
    const el = ref.current
    if (!s.down || !el) return
    s.down = false
    el.classList.remove('is-dragging')
    // A held pointer (paused before letting go) stops dead; a flick glides on, capped so it can't fling to the end.
    if (!s.moved || reduce || e.timeStamp - s.lastT > 80) return
    let v = Math.max(-2.2, Math.min(2.2, s.v)) * 16
    const glide = () => {
      if (Math.abs(v) < 0.4) return
      el.scrollLeft -= v
      v *= 0.92
      s.raf = requestAnimationFrame(glide)
    }
    s.raf = requestAnimationFrame(glide)
  }
  const onClickCapture = (e: MouseEvent) => {
    if (!state.current.moved) return
    e.preventDefault()
    e.stopPropagation()
    state.current.moved = false
  }
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture }
}

type Props = {
  details: Details
  value: Date | null
  // Start times (ms) already booked by someone else.
  taken: ReadonlySet<number>
  onChange: (start: Date | null) => void
  onBack: () => void
  onSubmit: () => void
  status: SendStatus
  focusHeading: boolean
}

export function ScheduleStep({ details, value, taken, onChange, onBack, onSubmit, status, focusHeading }: Props) {
  // Worked out when the step opens, so slots that have just passed drop off. Booked times are left out.
  const [allDays] = useState(buildDays)
  const days = useMemo(
    () => (taken.size ? allDays.map((d) => ({ ...d, slots: d.slots.filter((s) => !taken.has(s.start.getTime())) })) : allDays),
    [allDays, taken],
  )
  const firstOpen = days.find((d) => d.slots.length > 0)
  const [dayKey, setDayKey] = useState(
    () => (value && days.find((d) => d.slots.some((s) => s.start.getTime() === value.getTime()))?.key) ?? firstOpen?.key,
  )
  const [dir, setDir] = useState(1)
  const day = days.find((d) => d.key === dayKey)
  const index = days.findIndex((d) => d.key === dayKey)

  const stripRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const drag = useDragScroll(stripRef)
  const [view, setView] = useState({ first: 0, last: 0, atStart: true, atEnd: false })

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true })
  }, [focusHeading])

  // Which dates are on screen: drives the month label and the arrow buttons.
  const measure = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const left = el.scrollLeft
    const right = left + el.clientWidth
    let first = -1
    let last = -1
    Array.from(el.children).forEach((child, i) => {
      const item = child as HTMLElement
      const mid = item.offsetLeft + item.offsetWidth / 2
      if (mid >= left && mid <= right) {
        if (first < 0) first = i
        last = i
      }
    })
    const next = { first: Math.max(first, 0), last: Math.max(last, 0), atStart: left <= 2, atEnd: right >= el.scrollWidth - 2 }
    setView((prev) =>
      prev.first === next.first && prev.last === next.last && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next,
    )
  }, [])

  useLayoutEffect(() => {
    const el = stripRef.current
    if (!el) return
    // Returning to this step with a time already picked: bring that date into view straight away.
    const picked = el.querySelector<HTMLElement>('[aria-checked="true"]')
    if (picked) reveal(el, picked, 'instant')
    measure()
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    const ro = new ResizeObserver(onScroll)
    ro.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [measure])

  const pickDay = (next: Day) => {
    if (next.key === dayKey) return
    setDir(days.indexOf(next) > index ? 1 : -1)
    setDayKey(next.key)
    // Keep the same time of day if it's free on the new date; otherwise clear the pick.
    const match = value ? next.slots.find((s) => sameMinute(s.start, value)) : undefined
    onChange(match?.start ?? null)
  }

  const scrollStrip = (direction: 1 | -1) => {
    const el = stripRef.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: 'smooth' })
  }

  // Arrow keys move between open dates (one tab stop for the whole strip).
  const onStripKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const open = days.filter((d) => d.slots.length > 0)
    const at = open.findIndex((d) => d.key === dayKey)
    const moves: Record<string, number> = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: open.length - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = open[Math.min(Math.max(moves[e.key], 0), open.length - 1)]
    if (!next) return
    pickDay(next)
    const strip = stripRef.current
    const button = strip?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)
    if (!strip || !button) return
    button.focus({ preventScroll: true })
    reveal(strip, button, 'smooth')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value && status !== 'sending') onSubmit()
  }

  const label = days.length ? monthRange(days[view.first].date, days[view.last].date) : ''
  const sending = status === 'sending'

  return (
    <form className="schedule" onSubmit={submit} noValidate>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Pick a time
      </h2>
      <p className="schedule__intro">
        A {booking.callMinutes}-minute call with the team for <strong>{details.name.trim()}</strong>
        {details.company.trim() && <>, {details.company.trim()}</>}.{' '}
        <button type="button" className="schedule__edit" onClick={onBack}>
          Edit details
        </button>
      </p>

      <div className="cal">
        <div className="cal__top">
          <div className="cal__month">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="cal__arrows">
            <button type="button" aria-label="Earlier dates" disabled={view.atStart} onClick={() => scrollStrip(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Later dates" disabled={view.atEnd} onClick={() => scrollStrip(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <motion.div
          ref={stripRef}
          layoutScroll
          className="cal__strip"
          role="radiogroup"
          aria-label="Date"
          onKeyDown={onStripKey}
          {...drag}
        >
          {days.map((d, i) => {
            const selected = d.key === dayKey
            const open = d.slots.length > 0
            return (
              <button
                key={d.key}
                type="button"
                role="radio"
                data-key={d.key}
                aria-checked={selected}
                aria-label={`${dateLong.format(d.date)}${open ? '' : ', no times available'}`}
                tabIndex={selected ? 0 : -1}
                disabled={!open}
                className={`cal__day${i === 0 ? ' cal__day--today' : ''}`}
                onClick={() => pickDay(d)}
              >
                {selected && <motion.span layoutId="cal-day" className="cal__pill" transition={pill} />}
                <span className="cal__dow">{weekdayShort.format(d.date)}</span>
                <span className="cal__num">{d.date.getDate()}</span>
                <span className="cal__dot" aria-hidden="true" />
              </button>
            )
          })}
        </motion.div>

        <div className="cal__panel">
          <div className="cal__panel-head">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.p
                key={dayKey}
                className="cal__day-label"
                custom={dir}
                variants={labelSlide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease }}
              >
                {day ? dateLong.format(day.date) : 'No times available'}
              </motion.p>
            </AnimatePresence>
            <span className="cal__zone">{zoneNote}</span>
          </div>

          <div className="cal__slots">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={dayKey}
                className="slots"
                custom={dir}
                variants={slotsSlide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease }}
              >
                {day && day.slots.length > 0 ? (
                  groupsFor(day).map((group, g) => (
                    <div key={group.label} className="slots__group">
                      <p className="slots__label" id={`slots-${day.key}-${g}`}>
                        {group.label}
                      </p>
                      <div className="slots__grid" role="radiogroup" aria-labelledby={`slots-${day.key}-${g}`}>
                        {group.slots.map((slot: Slot) => {
                          const on = value?.getTime() === slot.start.getTime()
                          return (
                            <motion.button
                              key={slot.key}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              className={`slot${on ? ' slot--on' : ''}`}
                              onClick={() => onChange(slot.start)}
                              whileTap={{ scale: 0.95 }}
                            >
                              {on && <motion.span layoutId="slot-pill" className="slot__pill" transition={pill} />}
                              <span className="slot__text">{formatTime(slot.start)}</span>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="slots__empty">
                    {firstOpen
                      ? 'Every time on this day is booked. Pick another date.'
                      : `No open times in the next ${booking.daysAhead} days. Message us on WhatsApp and we’ll find one.`}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {status === 'taken' && (
          <motion.div
            key="taken"
            className="booking__error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <p>Someone booked that time a moment ago. Pick another one and book again.</p>
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div
            key="error"
            className="booking__error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <p>
              The booking didn&rsquo;t send. Check your connection and try again, or{' '}
              <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                <WhatsApp size={15} /> message us on WhatsApp
              </a>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="booking__actions booking__actions--schedule">
        <button type="button" className="btn btn--ghost booking__back" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="picked" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            {value ? (
              <motion.p
                key={value.toISOString()}
                className="picked__on"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease }}
              >
                <strong>
                  {dateShort.format(value)}, {formatTime(value)}
                </strong>
                <span>{onStudioTime ? `${booking.callMinutes} minutes` : `${formatStudioTime(value)} in Bengaluru`}</span>
              </motion.p>
            ) : (
              <motion.p
                key="none"
                className="picked__none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Choose a time
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <button type="submit" className="btn btn--primary booking__confirm" disabled={!value || sending} aria-busy={sending}>
          <AnimatePresence mode="popLayout" initial={false}>
            {sending ? (
              <motion.span key="sending" className="booking__btn-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <span className="spinner" aria-hidden="true" /> Booking&hellip;
              </motion.span>
            ) : (
              <motion.span key="idle" className="booking__btn-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                Book the call
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </form>
  )
}

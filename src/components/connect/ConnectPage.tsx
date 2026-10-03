import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { booking, connectPage } from '../../content'
import { Check } from '../Icons'
import type { Details, Outcome } from './booking'
import { fetchTakenSlots, SlotTakenError, sendBooking } from './booking'
import { DetailsStep } from './DetailsStep'
import { DoneStep } from './DoneStep'
import { ScheduleStep } from './ScheduleStep'

const ease = [0.22, 1, 0.36, 1] as const
const DAY = 86_400_000
type Step = 0 | 1 | 2
export type SendStatus = 'idle' | 'sending' | 'error' | 'taken'

// "Get started" on a service links here with ?service=<slug>, which pre-selects that card.
function initialDetails(): Details {
  const service = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('service') : null
  const match = connectPage.interests.find((i) => i.service && i.service === service)
  return { name: '', company: '', email: '', phone: '', interests: match ? [match.label] : [], budget: '', message: '', website: '' }
}

// Steps slide sideways (forwards to the left, back to the right) and blur as they pass.
const stepSlide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, filter: 'blur(6px)' }),
}

// The panel eases to each step's height instead of snapping. Changes within a step (an error message,
// a different number of time slots) follow instantly, since those animate themselves.
function useStepHeight(step: Step) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [easing, setEasing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Ease for long enough to cover the old step leaving and the new one settling in.
  const [shown, setShown] = useState(step)
  if (shown !== step) {
    setShown(step)
    setEasing(true)
  }
  useEffect(() => {
    if (!easing) return
    const t = window.setTimeout(() => setEasing(false), 1200)
    return () => window.clearTimeout(t)
  }, [easing, shown])

  return { ref, height, easing }
}

const stepNames = ['Your details', 'Pick a time']
const swap = {
  initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
  transition: { duration: 0.3, ease },
}

// Panel header: both steps named, the current one lit, and a red line along the bottom edge that fills
// as the visitor moves through. Folds away once booked.
function PanelHead({ step, intro }: { step: Step; intro: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {step < 2 && (
        <motion.div
          className="panel__head"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <div className="panel__head-inner">
            <ol className="psteps" aria-label="Booking steps">
              {stepNames.map((name, i) => {
                const done = step > i
                return (
                  <li
                    key={name}
                    className={`pstep${step === i ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                    aria-current={step === i ? 'step' : undefined}
                  >
                    <span className="pstep__num" aria-hidden="true">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={done ? 'done' : 'num'} {...swap}>
                          {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className="pstep__name">{name}</span>
                  </li>
                )
              })}
            </ol>
            <p className="panel__meta" aria-hidden="true">
              <span className="panel__meta-text">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={step} {...swap}>
                    {step === 0 ? 'About 2 min' : `${booking.callMinutes}-min call`}
                  </motion.span>
                </AnimatePresence>
              </span>
            </p>
          </div>
          <span className="panel__track" aria-hidden="true">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: (step + 1) / stepNames.length }}
              transition={{ duration: intro ? 1 : 0.7, delay: intro ? 0.45 : 0, ease }}
            />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BookingFlow() {
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>(0)
  const [dir, setDir] = useState(1)
  const [moved, setMoved] = useState(false)
  const [details, setDetails] = useState(initialDetails)
  const [start, setStart] = useState<Date | null>(null)
  const [status, setStatus] = useState<SendStatus>('idle')
  const [outcome, setOutcome] = useState<Outcome>('sent')
  // Start times other people have already booked, so the calendar leaves them out.
  const [taken, setTaken] = useState<ReadonlySet<number>>(() => new Set())
  const { ref: bodyRef, height, easing } = useStepHeight(step)

  // Fetched in the background while the visitor fills in step one. If it fails the calendar shows every
  // time, and the database still refuses a second booking for the same slot.
  useEffect(() => {
    let live = true
    const now = Date.now()
    fetchTakenSlots(new Date(now), new Date(now + (booking.daysAhead + 2) * DAY))
      .then((times) => {
        if (!live) return
        setTaken(new Set(times))
        setStart((s) => (s && times.includes(s.getTime()) ? null : s))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const go = (next: Step) => {
    setDir(next > step ? 1 : -1)
    setMoved(true)
    setStatus('idle')
    setStep(next)
    // If the top of the panel has scrolled away, bring it back so the new step starts in view.
    const root = rootRef.current
    if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const submit = async () => {
    if (!start) return
    setStatus('sending')
    try {
      setOutcome(await sendBooking(details, start))
      go(2)
    } catch (err) {
      if (!(err instanceof SlotTakenError)) return setStatus('error')
      setTaken((t) => new Set(t).add(start.getTime()))
      setStart(null)
      setStatus('taken')
    }
  }

  const pickTime = (next: Date | null) => {
    setStart(next)
    if (status === 'error' || status === 'taken') setStatus('idle')
  }

  return (
    <motion.div
      ref={rootRef}
      className="panel"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.1, ease }}
    >
      <PanelHead step={step} intro={!moved} />

      <motion.div
        className="panel__body"
        animate={{ height }}
        transition={easing ? { duration: 0.55, ease } : { duration: 0 }}
      >
        <div ref={bodyRef} className="panel__inner">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepSlide}
              initial={moved ? 'enter' : false}
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease }}
            >
              {step === 0 && (
                <DetailsStep
                  value={details}
                  onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
                  onNext={() => go(1)}
                  focusHeading={moved}
                  intro={!moved}
                />
              )}
              {step === 1 && (
                <ScheduleStep
                  details={details}
                  value={start}
                  taken={taken}
                  onChange={pickTime}
                  onBack={() => go(0)}
                  onSubmit={submit}
                  status={status}
                  focusHeading={moved}
                />
              )}
              {step === 2 && start && <DoneStep details={details} start={start} outcome={outcome} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ConnectPage() {
  const last = connectPage.title.length - 1

  return (
    <section className="connect" aria-labelledby="connect-title">
      <div className="container connect__grid">
        <div className="connect__intro">
          <h1 id="connect-title" className="connect__title">
            {connectPage.title.map((line, i) => (
              <span key={line} className="hero__line">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1, delay: 0.15 + i * 0.12, ease }}
                >
                  {line}
                  {i === last && <span className="accent"> {connectPage.highlight}</span>}
                </motion.span>
              </span>
            ))}
          </h1>
        </div>

        <div className="connect__form">
          <BookingFlow />
        </div>
      </div>
    </section>
  )
}

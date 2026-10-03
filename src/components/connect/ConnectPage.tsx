import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { connectPage, contact, links } from '../../content'
import { Check, Mail, WhatsApp } from '../Icons'
import type { Details, Outcome } from './booking'
import { sendBooking } from './booking'
import { DetailsStep } from './DetailsStep'
import { DoneStep } from './DoneStep'
import { ScheduleStep } from './ScheduleStep'

const ease = [0.22, 1, 0.36, 1] as const
type Step = 0 | 1 | 2

// "Get started" on a service links here with ?service=<slug>, which pre-selects that chip.
function initialDetails(): Details {
  const service = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('service') : null
  const match = connectPage.interests.find((i) => i.service && i.service === service)
  return { name: '', company: '', email: '', phone: '', interests: match ? [match.label] : [], budget: '', message: '', website: '' }
}

// Steps slide sideways (forwards to the left, back to the right) and blur as they pass.
const stepSlide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 56, filter: 'blur(8px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56, filter: 'blur(8px)' }),
}

// The card eases to each step's height instead of snapping. Changes within a step (an error message,
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

function BookingFlow({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  const reduce = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [dir, setDir] = useState(1)
  const [moved, setMoved] = useState(false)
  const [details, setDetails] = useState(initialDetails)
  const [start, setStart] = useState<Date | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [outcome, setOutcome] = useState<Outcome>('sent')
  const { ref: bodyRef, height, easing } = useStepHeight(step)

  const go = (next: Step) => {
    setDir(next > step ? 1 : -1)
    setMoved(true)
    setStatus('idle')
    onStep(next)
    // If the top of the card has scrolled away, bring it back so the new step starts in view.
    const card = cardRef.current
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const submit = async () => {
    if (!start) return
    setStatus('sending')
    try {
      setOutcome(await sendBooking(details, start))
      go(2)
    } catch {
      setStatus('error')
    }
  }

  const labels = ['Your details', 'Pick a time', 'Booked']

  return (
    <div ref={cardRef} className="booking">
      <div className="booking__top">
        <p className="booking__step" aria-live="polite">
          <span className="booking__count">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={step}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.4, ease }}
              >
                {String(step + 1).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="booking__of">/ 03</span>
          <span className="sr-only">: </span>
          <span className="booking__label">{labels[step]}</span>
        </p>
        <div className="booking__bar" aria-hidden="true">
          <motion.span
            initial={false}
            animate={{ scaleX: (step + 1) / 3 }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          />
        </div>
      </div>

      <motion.div
        className="booking__body"
        animate={{ height }}
        transition={easing ? { duration: 0.55, ease } : { duration: 0 }}
      >
        <div ref={bodyRef} className="booking__inner">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepSlide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease }}
            >
              {step === 0 && (
                <DetailsStep
                  value={details}
                  onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
                  onNext={() => go(1)}
                  focusHeading={moved}
                />
              )}
              {step === 1 && (
                <ScheduleStep
                  details={details}
                  value={start}
                  onChange={setStart}
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
    </div>
  )
}

export function ConnectPage() {
  const [step, setStep] = useState<Step>(0)
  const last = connectPage.title.length - 1

  return (
    <section className="connect" aria-labelledby="connect-title">
      <div className="container connect__grid">
        <div className="connect__intro">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            {connectPage.eyebrow}
          </motion.span>

          <h1 id="connect-title" className="connect__title">
            {connectPage.title.map((line, i) => (
              <span key={line} className="hero__line">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.12, ease }}
                >
                  {line}
                  {i === last && <span className="accent"> {connectPage.highlight}</span>}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="connect__lead"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
          >
            {connectPage.intro}
          </motion.p>
        </div>

        <motion.div
          className="connect__form"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
        >
          <BookingFlow step={step} onStep={setStep} />
        </motion.div>

        {/* Sits under the intro on wide screens and after the form on phones. */}
        <div className="connect__aside">
          {/* What happens next; the current stage lights up as the visitor moves through the form. */}
          <ol className="how">
            {connectPage.steps.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'next'
              return (
                <motion.li
                  key={s.title}
                  className={`how__item how__item--${state}`}
                  aria-current={state === 'current' ? 'step' : undefined}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + i * 0.08, ease }}
                >
                  {state === 'current' && (
                    <motion.span layoutId="how-marker" className="how__marker" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                  )}
                  <span className="how__num" aria-hidden="true">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {state === 'done' ? (
                        <motion.span key="done" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                          <Check size={14} strokeWidth={2.4} />
                        </motion.span>
                      ) : (
                        <motion.span key="num" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          {String(i + 1).padStart(2, '0')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="how__body">
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </span>
                </motion.li>
              )
            })}
          </ol>

          <motion.div
            className="connect__direct"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease }}
          >
            <p>Rather talk right now?</p>
            <div className="connect__links">
              <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                <WhatsApp size={18} /> {contact.phone}
              </a>
              <a href={links.email}>
                <Mail size={18} /> {contact.email}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

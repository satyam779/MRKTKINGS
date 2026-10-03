import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { ComponentType, FormEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { connectPage } from '../../content'
import type { IconProps } from '../Icons'
import {
  ArrowLeft,
  ArrowRight,
  Browser,
  Camera,
  ChartUp,
  Chat,
  Check,
  Gem,
  Lock,
  Repeat,
  Sparkle,
  Star,
} from '../Icons'
import type { Details } from './booking'

const ease = [0.22, 1, 0.36, 1] as const
const thumb = { type: 'spring', stiffness: 420, damping: 34 } as const
// The card stack's spring: quick, heavy, no wobble.
const stackSpring = { type: 'spring', stiffness: 800, damping: 45, mass: 2 } as const

const serviceIcons: Record<string, ComponentType<IconProps>> = {
  chart: ChartUp,
  chat: Chat,
  gem: Gem,
  star: Star,
  browser: Browser,
  repeat: Repeat,
  camera: Camera,
  sparkle: Sparkle,
}

// ---------- Arrival and reveal ----------
// Rows lift in one after another and the service cards pop in. Used when the form first appears and
// again when the rest of the questions open up after the contact stack.
const reveal: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}
const group: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease, staggerChildren: 0.04, delayChildren: 0.08 } },
}
const pop: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 360, damping: 26 } },
}

// ---------- The contact questions, asked one card at a time ----------
type QuestionId = 'name' | 'company' | 'email' | 'phone'
type Question = {
  id: QuestionId
  ask: string
  help: string
  placeholder: string
  optional?: boolean
  type?: 'text' | 'email' | 'tel'
  inputMode?: 'text' | 'email' | 'tel'
  autoComplete: string
}
const questions: Question[] = [
  {
    id: 'name',
    ask: 'What’s your name?',
    help: 'So we know who we’re talking to.',
    placeholder: 'Your full name',
    autoComplete: 'name',
  },
  {
    id: 'company',
    ask: 'Which brand are you with?',
    help: 'Skip it if you’re still exploring.',
    placeholder: 'Brand or company',
    optional: true,
    autoComplete: 'organization',
  },
  {
    id: 'email',
    ask: 'Where do we send the invite?',
    help: 'The meeting link goes to this address.',
    placeholder: 'you@yourbrand.com',
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
  },
  {
    id: 'phone',
    ask: 'And a phone number?',
    help: 'Handy if plans change at the last minute.',
    placeholder: '+91 98765 43210',
    optional: true,
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
  },
]
const lastQuestion = questions.length - 1

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
const phoneOk = (phone: string) => phone.replace(/\D/g, '').length >= 7

// What's wrong with one answer, if anything.
function problem(id: QuestionId, raw: string): string | null {
  const v = raw.trim()
  if (id === 'name' && !v) return 'Tell us what to call you.'
  if (id === 'email' && !v) return 'We need an email to send the invite to.'
  if (id === 'email' && !emailOk(v)) return 'That email doesn’t look right.'
  if (id === 'phone' && v && !phoneOk(v)) return 'That number looks too short.'
  return null
}
const answered = (id: QuestionId, raw: string) => (id === 'email' ? emailOk(raw) : id === 'phone' ? phoneOk(raw) : Boolean(raw.trim()))
const contactDone = (d: Details) => questions.every((q) => !problem(q.id, d[q.id]))

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

// A small tick that draws itself once an answer looks right.
function AnswerOk({ show }: { show: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.svg
          className="qcard__ok"
          viewBox="0 0 16 16"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease }}
        >
          <motion.path
            d="M4 8.5 6.8 11.2 12 5.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.08, ease }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  )
}

// The question above the cards: the old one lifts away as the next rises in (the other way when going
// back), and the block eases between one- and two-line questions instead of snapping.
const askSwap: Variants = {
  enter: (dir: number) => ({ opacity: 0, y: dir * 22, filter: 'blur(6px)' }),
  center: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, y: dir * -22, filter: 'blur(6px)' }),
}

function QuestionHead({ question, index, dir }: { question: Question; index: number; dir: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div className="qhead" initial={false} animate={{ height }} transition={{ duration: 0.4, ease }}>
      <div ref={ref} className="qhead__inner">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={question.id}
            custom={dir}
            variants={askSwap}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease }}
          >
            <p className="qhead__count" aria-hidden="true">
              Question {index + 1} of {questions.length}
              {question.optional && ' (optional)'}
            </p>
            <p className="qhead__ask" aria-hidden="true">
              {question.ask}
            </p>
            <p className="qhead__help" id={`help-${question.id}`}>
              {question.help}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// A tile for the longer project answer: the label sits inside and floats up once it's focused or filled.
function Tile(props: { id: string; label: string; optional?: boolean; children: ReactNode }) {
  const { id, label, optional, children } = props
  return (
    <motion.div className="tile tile--area" variants={rise}>
      <div className="tile__box">
        {children}
        <label htmlFor={id} className="tile__label">
          {label}
        </label>
        {optional && (
          <span className="tile__hint" aria-hidden="true">
            Optional
          </span>
        )}
      </div>
    </motion.div>
  )
}

// The card's red wash spreads out from wherever it was pressed (from the middle for keyboard presses).
const fillFrom = (e: PointerEvent<HTMLButtonElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
}
const fillFromKeyboard = (e: MouseEvent<HTMLButtonElement>) => {
  if (e.detail !== 0) return
  e.currentTarget.style.setProperty('--x', '50%')
  e.currentTarget.style.setProperty('--y', '50%')
}

type Props = {
  value: Details
  onChange: (patch: Partial<Details>) => void
  onNext: () => void
  focusHeading: boolean
  // True on the first visit, when the form builds itself in.
  intro: boolean
}

export function DetailsStep({ value, onChange, onNext, focusHeading, intro }: Props) {
  const reduce = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLFormElement>()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // 'stack' while the contact questions are being answered; 'done' once they are, which opens up the rest.
  // Coming back from step two with everything filled in starts at 'done'.
  const [phase, setPhase] = useState<'stack' | 'done'>(() => (!intro && contactDone(value) ? 'done' : 'stack'))
  const [current, setCurrent] = useState(0)
  // Which way the questions are moving: 1 forwards, -1 back.
  const [dir, setDir] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [interacted, setInteracted] = useState(false)
  const picked = value.interests.length
  const q = questions[current]

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true })
  }, [focusHeading])

  // Each new card takes the cursor, once the visitor has started answering.
  useEffect(() => {
    if (!interacted || phase !== 'stack') return
    scope.current?.querySelector<HTMLInputElement>('.qcard--top input')?.focus({ preventScroll: true })
  }, [current, phase, interacted, scope])

  const shake = () => {
    if (!reduce) animate('.qstack', { x: [0, -10, 9, -6, 3, 0] }, { duration: 0.45, ease: 'easeOut' })
  }

  const nextQuestion = () => {
    setInteracted(true)
    const wrong = problem(q.id, value[q.id])
    if (wrong) {
      setError(wrong)
      shake()
      return
    }
    setError(null)
    setDir(1)
    if (current < lastQuestion) setCurrent(current + 1)
    else setPhase('done')
  }

  const previousQuestion = () => {
    setInteracted(true)
    setError(null)
    setDir(-1)
    setCurrent((c) => Math.max(0, c - 1))
  }

  const editContact = () => {
    setInteracted(true)
    setCurrent(0)
    setPhase('stack')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'stack') return nextQuestion()
    // Belt and braces: if anything slipped through, go back to the first card that needs it.
    const firstWrong = questions.findIndex((x) => problem(x.id, value[x.id]))
    if (firstWrong >= 0) {
      setCurrent(firstWrong)
      setPhase('stack')
      setError(problem(questions[firstWrong].id, value[questions[firstWrong].id]))
      return
    }
    onNext()
  }

  const toggle = (label: string) =>
    onChange({
      interests: value.interests.includes(label) ? value.interests.filter((i) => i !== label) : [...value.interests, label],
    })

  return (
    <motion.form
      ref={scope}
      className="details"
      onSubmit={submit}
      noValidate
      variants={reveal}
      initial={intro ? 'hidden' : false}
      animate="show"
    >
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Your details
      </h2>

      <motion.div className="contact" variants={rise}>
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'stack' ? (
            <motion.div
              key="stack"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease }}
            >
              <QuestionHead question={q} index={current} dir={dir} />

              {/* Answered cards shrink back and stay visible behind the one being asked; the space above
                  grows with the pile so their edges never crowd the header. */}
              <motion.div
                className="qstack__room"
                aria-hidden="true"
                initial={false}
                animate={{ height: current * 13 }}
                transition={stackSpring}
              />
              <div className="qstack">
                <AnimatePresence mode="popLayout" initial={false}>
                  {questions.map((item, i) => {
                    if (i > current) return null
                    const depth = current - i
                    const top = depth === 0
                    const id = `connect-${item.id}`
                    const describedBy = [`help-${item.id}`, error && 'contact-error'].filter(Boolean).join(' ')
                    return (
                      <motion.div
                        key={item.id}
                        className={`qcard${top ? ' qcard--top' : ''}${top && error ? ' qcard--error' : ''}`}
                        style={{ zIndex: questions.length - depth }}
                        initial={{ opacity: 0, scale: 1.12, y: 15 }}
                        animate={{ opacity: top ? 1 : Math.max(0.3, 0.75 - (depth - 1) * 0.2), scale: 1 - depth * 0.05, y: -depth * 13 }}
                        exit={{ opacity: 0, scale: 1.12, y: 15 }}
                        transition={stackSpring}
                        aria-hidden={top ? undefined : true}
                      >
                        <label htmlFor={id} className="sr-only">
                          {item.ask}
                          {item.optional ? ' (optional)' : ''}
                        </label>
                        <input
                          id={id}
                          className="qcard__input"
                          type={item.type ?? 'text'}
                          inputMode={item.inputMode}
                          autoComplete={item.autoComplete}
                          placeholder={item.placeholder}
                          value={value[item.id]}
                          tabIndex={top ? 0 : -1}
                          readOnly={!top}
                          aria-invalid={top && error ? true : undefined}
                          aria-describedby={top ? describedBy : undefined}
                          onChange={(e) => {
                            onChange({ [item.id]: e.target.value } as Partial<Details>)
                            if (error) setError(null)
                          }}
                        />
                        <AnswerOk show={answered(item.id, value[item.id])} />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    id="contact-error"
                    className="qerror"
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="qnav">
                <AnimatePresence initial={false}>
                  {current > 0 && (
                    <motion.button
                      type="button"
                      className="qnav__back"
                      aria-label="Previous question"
                      onClick={previousQuestion}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      whileTap={{ scale: 0.92 }}
                    >
                      <ArrowLeft size={20} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <div className="qnav__go">
                  <span className="qnav__hint" aria-hidden="true">
                    press <kbd>Enter ↵</kbd>
                  </span>
                  <motion.button type="submit" className="qnav__next" whileTap={{ scale: 0.95 }}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {current === lastQuestion ? (
                        <motion.span
                          key="done"
                          className="qnav__label"
                          initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                          exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          <Check size={18} strokeWidth={2.6} /> Done
                        </motion.span>
                      ) : (
                        <motion.span
                          key="next"
                          className="qnav__label"
                          initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                          exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          Next <ArrowRight size={18} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            // The answers fold into one card; Edit opens the stack again from the first question.
            <motion.div
              key="summary"
              className="qsummary"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <span className="qsummary__avatar" aria-hidden="true">
                {initials(value.name)}
              </span>
              <span className="qsummary__text">
                <strong>
                  {value.name.trim()}
                  {value.company.trim() && <span className="qsummary__company">, {value.company.trim()}</span>}
                </strong>
                <span>{[value.email.trim(), value.phone.trim()].filter(Boolean).join('  /  ')}</span>
              </span>
              <button type="button" className="qsummary__edit" onClick={editContact}>
                Edit
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* The rest of the questions open up once the contact card is done. */}
      <AnimatePresence initial={false}>
        {phase === 'done' && (
          <motion.div
            key="more"
            className="details__more"
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.55, ease }}
          >
            <motion.div variants={reveal} initial={interacted ? 'hidden' : false} animate="show">
              <motion.fieldset className="choice" variants={group}>
                <legend className="choice__legend">
                  What can we help with?
                  <span className="choice__count" aria-live="polite">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {picked > 0 && (
                        <motion.span
                          key={picked}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25, ease }}
                        >
                          {picked} selected
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </legend>
                <div className="needs">
                  {connectPage.interests.map(({ label, icon }) => {
                    const on = value.interests.includes(label)
                    const Icon = serviceIcons[icon] ?? Sparkle
                    return (
                      <motion.button
                        key={label}
                        type="button"
                        className="need"
                        aria-pressed={on}
                        onPointerDown={fillFrom}
                        onClick={(e) => {
                          fillFromKeyboard(e)
                          toggle(label)
                        }}
                        variants={pop}
                        whileTap={{ scale: 0.96 }}
                      >
                        <span className="need__wash" aria-hidden="true" />
                        <span className="need__icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span className="need__label">{label}</span>
                        <span className="need__check" aria-hidden="true">
                          <Check size={12} strokeWidth={2.8} />
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.fieldset>

              <motion.fieldset className="choice" variants={group}>
                <legend className="choice__legend">{connectPage.budgetLabel}</legend>
                {/* One track; the red thumb slides to the chosen range. */}
                <motion.div className="segments" variants={pop}>
                  {connectPage.budgets.map((budget) => {
                    const on = value.budget === budget
                    return (
                      <label key={budget} className={`segment${on ? ' segment--on' : ''}`}>
                        <input
                          type="radio"
                          name="budget"
                          value={budget}
                          checked={on}
                          onChange={() => onChange({ budget })}
                          className="sr-only"
                        />
                        {on && <motion.span layoutId="budget-thumb" className="segment__thumb" transition={thumb} />}
                        <span className="segment__text">{budget}</span>
                      </label>
                    )
                  })}
                </motion.div>
              </motion.fieldset>

              <Tile id="connect-message" label="About the project" optional>
                <textarea
                  id="connect-message"
                  className="tile__input"
                  rows={4}
                  placeholder="Where is the brand today, and where do you want it to be?"
                  value={value.message}
                  onChange={(e) => onChange({ message: e.target.value })}
                />
              </Tile>

              <motion.div className="booking__actions booking__actions--split" variants={rise}>
                <p className="booking__note">
                  <Lock size={15} /> We only use your details to arrange the call.
                </p>
                <button type="submit" className="btn btn--primary details__next is-ready">
                  Choose a time <ArrowRight size={18} />
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Honeypot for bots; people never see or reach it. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="connect-website">Website</label>
        <input
          id="connect-website"
          tabIndex={-1}
          autoComplete="off"
          value={value.website}
          onChange={(e) => onChange({ website: e.target.value })}
        />
      </div>
    </motion.form>
  )
}

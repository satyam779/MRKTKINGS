import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { FormEvent, InputHTMLAttributes, MouseEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { connectPage } from '../../content'
import { ArrowRight, Check, Plus } from '../Icons'
import type { Details } from './booking'

const ease = [0.22, 1, 0.36, 1] as const
const pill = { type: 'spring', stiffness: 420, damping: 34 } as const

type Errors = Partial<Record<'name' | 'email' | 'phone', string>>

function validate(d: Details): Errors {
  const errors: Errors = {}
  if (!d.name.trim()) errors.name = 'Tell us what to call you.'
  if (!d.email.trim()) errors.email = 'We need an email to send the invite to.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) errors.email = 'That email doesn’t look right.'
  if (d.phone.trim() && d.phone.replace(/\D/g, '').length < 7) errors.phone = 'That number looks too short.'
  return errors
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }

// Underlined input with a red line that draws across on focus, and an error that slides open beneath.
function Field({ id, label, error, required, ...input }: FieldProps) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="field__control">
        <input
          id={id}
          className="field__input"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...input}
        />
        <span className="field__line" aria-hidden="true" />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          className="field__error"
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -6 }}
          transition={{ duration: 0.3, ease }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

// The chip's red fill spreads out from wherever it was pressed (from the middle for keyboard presses).
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
}

export function DetailsStep({ value, onChange, onNext, focusHeading }: Props) {
  const [tried, setTried] = useState(false)
  const reduce = useReducedMotion()
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Errors show after the first try at Next, then update live as the visitor fixes them.
  const errors = tried ? validate(value) : {}

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true })
  }, [focusHeading])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    const found = validate(value)
    const first = (['name', 'email', 'phone'] as const).find((k) => found[k])
    if (first) {
      // Glide back to the first field that needs fixing, then put the cursor in it.
      const field = formRef.current?.querySelector<HTMLInputElement>(`#connect-${first}`)
      field?.focus({ preventScroll: true })
      field?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      return
    }
    onNext()
  }

  const toggle = (label: string) =>
    onChange({
      interests: value.interests.includes(label) ? value.interests.filter((i) => i !== label) : [...value.interests, label],
    })

  return (
    <form ref={formRef} className="details" onSubmit={submit} noValidate>
      <h2 ref={headingRef} tabIndex={-1} className="booking__heading">
        Tell us about you
      </h2>

      <div className="details__grid">
        <Field
          id="connect-name"
          label="Name"
          required
          autoComplete="name"
          placeholder="Your name"
          value={value.name}
          error={errors.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Field
          id="connect-company"
          label="Company"
          autoComplete="organization"
          placeholder="Your brand"
          value={value.company}
          onChange={(e) => onChange({ company: e.target.value })}
        />
        <Field
          id="connect-email"
          label="Your email"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@yourbrand.com"
          value={value.email}
          error={errors.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <Field
          id="connect-phone"
          label="Your phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={value.phone}
          error={errors.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>

      <fieldset className="choice">
        <legend className="field__label">I&rsquo;m interested in&hellip;</legend>
        <div className="chips">
          {connectPage.interests.map(({ label }, i) => {
            const on = value.interests.includes(label)
            return (
              <motion.button
                key={label}
                type="button"
                className="chip"
                aria-pressed={on}
                onPointerDown={fillFrom}
                onClick={(e) => {
                  fillFromKeyboard(e)
                  toggle(label)
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.04, ease }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="chip__fill" aria-hidden="true" />
                <span className="chip__icon" aria-hidden="true">
                  <Plus size={16} />
                  <Check size={16} strokeWidth={2.2} />
                </span>
                <span className="chip__label">{label}</span>
              </motion.button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="choice">
        <legend className="field__label">{connectPage.budgetLabel}</legend>
        <div className="budgets">
          {connectPage.budgets.map((budget) => {
            const on = value.budget === budget
            return (
              <label key={budget} className={`budget${on ? ' budget--on' : ''}`}>
                <input
                  type="radio"
                  name="budget"
                  value={budget}
                  checked={on}
                  onChange={() => onChange({ budget })}
                  className="sr-only"
                />
                {on && <motion.span layoutId="budget-pill" className="budget__pill" transition={pill} />}
                <span className="budget__text">{budget}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="field field--area">
        <label htmlFor="connect-message" className="field__label">
          Tell us about your project.
        </label>
        <div className="field__control">
          <textarea
            id="connect-message"
            className="field__input"
            rows={3}
            placeholder="Where is the brand today, and where do you want it to be?"
            value={value.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
          <span className="field__line" aria-hidden="true" />
        </div>
      </div>

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

      <div className="booking__actions">
        <p className="booking__hint">Next, pick a time for a quick call.</p>
        <button type="submit" className="btn btn--primary">
          Next <ArrowRight size={18} />
        </button>
      </div>
    </form>
  )
}

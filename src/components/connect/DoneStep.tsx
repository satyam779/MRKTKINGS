import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { booking, media } from '../../content'
import { ArrowUpRight, Calendar } from '../Icons'
import type { Details, Outcome } from './booking'
import { dateFull, formatStudioTime, formatTime, googleCalendarUrl, icsUrl, mailtoUrl, onStudioTime } from './booking'

const ease = [0.22, 1, 0.36, 1] as const

type Props = { details: Details; start: Date; outcome: Outcome }

export function DoneStep({ details, start, outcome }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const first = details.name.trim().split(/\s+/)[0]
  const emailed = outcome === 'email'

  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [])

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease },
  })

  return (
    <div className="done">
      {/* The one celebratory moment: a ring draws itself, the tick follows and the crown drops on top. */}
      <div className="done__mark" aria-hidden="true">
        <svg viewBox="0 0 96 96" className="done__svg">
          <g transform="rotate(-90 48 48)">
            <motion.circle
              cx="48"
              cy="48"
              r="44"
              className="done__ring"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease }}
            />
          </g>
          <motion.circle
            cx="48"
            cy="48"
            r="36"
            className="done__disc"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.5 }}
          />
          <motion.path
            d="M30 49.5 42.5 62 66 36"
            className="done__tick"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.7, ease }}
          />
        </svg>
        <motion.img
          src={media.crown}
          alt=""
          className="done__crown"
          width={40}
          height={40}
          initial={{ opacity: 0, y: -50, rotate: -25, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, rotate: -12, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1 }}
        />
      </div>

      <motion.h2 ref={headingRef} tabIndex={-1} className="done__title" {...rise(0.3)}>
        {emailed ? (
          'One last step.'
        ) : (
          `See you soon, ${first}.`
        )}
      </motion.h2>
      <motion.p className="done__text" {...rise(0.4)}>
        {emailed ? (
          <>Your email app should have opened with everything filled in. Send it and we&rsquo;ll confirm your call.</>
        ) : (
          <>
            We&rsquo;ll confirm the call and send a meeting link to <strong>{details.email.trim()}</strong>.
          </>
        )}
      </motion.p>

      <motion.dl className="done__details" {...rise(0.5)}>
        <div>
          <dt>Date</dt>
          <dd>{dateFull.format(start)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {formatTime(start)}
            {!onStudioTime && <span>{formatStudioTime(start)} in Bengaluru</span>}
          </dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{booking.callMinutes} minutes</dd>
        </div>
      </motion.dl>

      <motion.div className="done__actions" {...rise(0.6)}>
        {emailed ? (
          <a href={mailtoUrl(details, start)} className="btn btn--primary">
            Open the email again <ArrowUpRight size={18} />
          </a>
        ) : (
          <a href={googleCalendarUrl(start)} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
            <Calendar size={18} /> Add to Google Calendar
          </a>
        )}
        <a href={icsUrl(start)} download="mrktkings-call.ics" className="done__link">
          Other calendars (.ics)
        </a>
      </motion.div>
    </div>
  )
}

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { booking, links, media } from '../../content'
import { ArrowUpRight, Calendar } from '../Icons'
import type { Details, Outcome } from './booking'
import { dateFull, formatStudioTime, formatTime, googleCalendarUrl, icsUrl, mailtoUrl, onStudioTime } from './booking'

const ease = [0.22, 1, 0.36, 1] as const
const rays = Array.from({ length: 10 }, (_, i) => (i / 10) * 360)

type Props = { details: Details; start: Date; outcome: Outcome }

export function DoneStep({ details, start, outcome }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const first = details.name.trim().split(/\s+/)[0]
  const emailed = outcome === 'email'

  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [])

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, delay, ease },
  })

  return (
    <div className="done">
      {/* A ring draws itself, the tick follows, sparks burst and the crown drops on top. */}
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
        {rays.map((angle, i) => (
          // The outer span points the spark outwards; the inner one shoots along that line.
          <span key={angle} className="done__ray" style={{ transform: `rotate(${angle}deg)` }}>
            <motion.span
              initial={{ opacity: 0, scaleY: 0, y: -48 }}
              animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0.4], y: [-48, -64, -76] }}
              transition={{ duration: 0.8, delay: 0.9 + (i % 2) * 0.06, ease: 'easeOut' }}
            />
          </span>
        ))}
        <motion.img
          src={media.crown}
          alt=""
          className="done__crown"
          width={44}
          height={44}
          initial={{ opacity: 0, y: -60, rotate: -25, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, rotate: -12, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.05 }}
        />
      </div>

      <motion.h2 ref={headingRef} tabIndex={-1} className="done__title" {...rise(0.35)}>
        {emailed ? (
          <>
            One last <span className="accent">step.</span>
          </>
        ) : (
          <>
            See you soon, <span className="accent">{first}.</span>
          </>
        )}
      </motion.h2>
      <motion.p className="done__text" {...rise(0.45)}>
        {emailed ? (
          <>Your email app should have opened with everything filled in. Hit send and we&rsquo;ll confirm your slot.</>
        ) : (
          <>
            Your request is in. We&rsquo;ll confirm the call and send a meeting link to <strong>{details.email.trim()}</strong>.
          </>
        )}
      </motion.p>

      <motion.dl className="done__card" {...rise(0.55)}>
        <div>
          <dt>Date</dt>
          <dd>{dateFull.format(start)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {formatTime(start)}
            {!onStudioTime && <span> · {formatStudioTime(start)}</span>}
          </dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{booking.callMinutes} minutes</dd>
        </div>
      </motion.dl>

      <motion.div className="done__actions" {...rise(0.65)}>
        {emailed ? (
          <a href={mailtoUrl(details, start)} className="btn btn--primary">
            Open the email again <ArrowUpRight size={18} />
          </a>
        ) : (
          <a href={googleCalendarUrl(start)} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
            <Calendar size={18} /> Add to Google Calendar
          </a>
        )}
        <a href={icsUrl(start)} download="mrktkings-call.ics" className="btn btn--ghost">
          {emailed ? <Calendar size={18} /> : null}
          {emailed ? 'Save to calendar' : 'Apple / Outlook (.ics)'}
        </a>
      </motion.div>

      <motion.p className="done__more" {...rise(0.8)}>
        While you wait, <a href={links.work}>see what we&rsquo;ve built</a>.
      </motion.p>
    </div>
  )
}

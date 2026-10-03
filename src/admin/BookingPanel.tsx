import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Calendar, Close, WhatsApp } from '../components/Icons'
import type { BookingRow, BookingStatus } from '../lib/supabase'
import { formatDayLong, formatStamp, formatTime, fromNow, statuses, statusLabels, teamCalendarUrl, visitorTime, whatsappUrl } from './format'

type Props = {
  row: BookingRow | null
  now: number
  onClose: () => void
  onStatus: (status: BookingStatus) => Promise<boolean>
  onNotes: (notes: string | null) => Promise<boolean>
  onDelete: () => Promise<boolean>
}

// One booking in full, sliding in from the right (full screen on phones).
export function BookingPanel({ row, ...rest }: Props) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {row && (
        <motion.div key="panel" className="drawer-layer" initial="closed" animate="open" exit="closed">
          <motion.div
            className="drawer-backdrop"
            onClick={rest.onClose}
            variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            variants={{ closed: reduce ? { opacity: 0 } : { x: '100%' }, open: reduce ? { opacity: 1 } : { x: 0 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
          >
            <PanelBody key={row.id} row={row} {...rest} />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PanelBody({ row, now, onClose, onStatus, onNotes, onDelete }: Props & { row: BookingRow }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [notes, setNotes] = useState(row.notes ?? '')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const dirty = notes.trim() !== (row.notes ?? '').trim()
  const theirs = visitorTime(row)
  const whatsapp = row.phone ? whatsappUrl(row.phone) : null
  const started = new Date(row.call_start).getTime() <= now
  const closeLatest = useRef(onClose)
  useEffect(() => {
    closeLatest.current = onClose
  })

  // Focus moves into the panel, the page behind stops scrolling, Escape closes, and focus goes back to
  // whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLatest.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [])

  const saveNotes = async () => {
    setSaving('saving')
    const ok = await onNotes(notes.trim() || null)
    setSaving(ok ? 'saved' : 'idle')
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(row.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the address is still there to select by hand.
    }
  }

  const remove = async () => {
    setDeleting(true)
    if (!(await onDelete())) setDeleting(false)
  }

  return (
    <>
      <div className="drawer__bar">
        <span className={`status-tag is-${row.status}`}>{statusLabels[row.status]}</span>
        <button ref={closeRef} type="button" className="drawer__close" aria-label="Close" onClick={onClose}>
          <Close size={20} />
        </button>
      </div>

      <div className="drawer__scroll">
        <header className="drawer__head">
          <h2 id="drawer-title" className="drawer__name">
            {row.name}
          </h2>
          {row.company && <p className="drawer__company">{row.company}</p>}
        </header>

        <div className="seg" role="radiogroup" aria-label="Status">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={row.status === s}
              className={`seg__btn is-${s}`}
              onClick={() => {
                if (row.status !== s) void onStatus(s)
              }}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>

        <section className="drawer__section" aria-labelledby="drawer-call">
          <h3 id="drawer-call" className="drawer__label">
            Call
          </h3>
          <p className="drawer__big">
            {formatDayLong(row.call_start)}, {formatTime(row.call_start)} IST
          </p>
          <p className="drawer__sub">
            {row.call_minutes} minutes, {started ? 'started' : 'starts'} {fromNow(row.call_start, now)}
          </p>
          {theirs && <p className="drawer__sub">Their time: {theirs}</p>}
          <a className="abtn abtn--small" href={teamCalendarUrl(row)} target="_blank" rel="noopener noreferrer">
            <Calendar size={16} /> Add to Google Calendar
          </a>
        </section>

        <section className="drawer__section" aria-labelledby="drawer-contact">
          <h3 id="drawer-contact" className="drawer__label">
            Contact
          </h3>
          <div className="contact-line">
            <a className="contact-line__value" href={`mailto:${row.email}`}>
              {row.email}
            </a>
            <button type="button" className="linkbtn" onClick={() => void copyEmail()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {row.phone && (
            <div className="contact-line">
              <a className="contact-line__value" href={`tel:${row.phone.replace(/[^\d+]/g, '')}`}>
                {row.phone}
              </a>
              {whatsapp && (
                <a className="linkbtn" href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <WhatsApp size={15} /> WhatsApp
                </a>
              )}
            </div>
          )}
          <a className="abtn abtn--small" href={`mailto:${row.email}?subject=${encodeURIComponent('Your call with MRKTKings')}`}>
            Email {row.name.split(/\s+/)[0]} <ArrowUpRight size={16} />
          </a>
        </section>

        <section className="drawer__section" aria-labelledby="drawer-brief">
          <h3 id="drawer-brief" className="drawer__label">
            Brief
          </h3>
          <dl className="facts">
            <div>
              <dt>Services</dt>
              <dd>{row.interests.length ? row.interests.join(', ') : 'Not given'}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{row.budget ?? 'Not given'}</dd>
            </div>
          </dl>
          {row.message ? <p className="drawer__message">{row.message}</p> : <p className="drawer__sub">They didn&rsquo;t write about the project.</p>}
        </section>

        <section className="drawer__section">
          <h3 className="drawer__label">
            <label htmlFor="drawer-notes">Team notes</label>
          </h3>
          <textarea
            id="drawer-notes"
            className="notes"
            rows={4}
            placeholder="Only the team sees these."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setSaving('idle')
            }}
          />
          <div className="notes__foot">
            <span className="notes__state" aria-live="polite">
              {saving === 'saved' && !dirty ? 'Saved' : dirty ? 'Not saved yet' : ''}
            </span>
            <button type="button" className="abtn abtn--dark abtn--small" disabled={!dirty || saving === 'saving'} onClick={() => void saveNotes()}>
              {saving === 'saving' ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </section>

        <footer className="drawer__foot">
          <p>Received {formatStamp(row.created_at)} IST</p>
          {confirming ? (
            <div className="confirm" role="group" aria-label="Confirm delete">
              <span>Delete this booking for good?</span>
              <button type="button" className="abtn abtn--danger abtn--small" disabled={deleting} onClick={() => void remove()}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button type="button" className="abtn abtn--small" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="linkbtn linkbtn--danger" onClick={() => setConfirming(true)}>
              Delete booking
            </button>
          )}
        </footer>
      </div>
    </>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Search } from '../components/Icons'
import { connectPage } from '../content'
import type { BookingRow, BookingStatus } from '../lib/supabase'
import { BookingPanel } from './BookingPanel'
import {
  bookingsCsv,
  dayNote,
  download,
  formatDayLong,
  formatDayShort,
  formatStamp,
  formatTime,
  fromNow,
  statuses,
  statusLabels,
  studioDayKey,
} from './format'

type View = 'upcoming' | 'new' | 'past' | 'cancelled' | 'all'
const views: { id: View; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'new', label: 'New' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]
const emptyText: Record<View, string> = {
  upcoming: 'No calls coming up.',
  new: 'Nothing waiting to be confirmed.',
  past: 'No past calls yet.',
  cancelled: 'No cancelled bookings.',
  all: 'No bookings yet.',
}

const startOf = (r: BookingRow) => new Date(r.call_start).getTime()
const endOf = (r: BookingRow) => startOf(r) + r.call_minutes * 60_000
const receivedAt = (r: BookingRow) => new Date(r.created_at).getTime()

// Upcoming: still to happen and not cancelled. New: not confirmed yet. Past: over, and not cancelled.
function inView(r: BookingRow, view: View, now: number) {
  const over = endOf(r) < now
  if (view === 'upcoming') return (r.status === 'new' || r.status === 'confirmed') && !over
  if (view === 'new') return r.status === 'new'
  if (view === 'past') return r.status !== 'cancelled' && over
  if (view === 'cancelled') return r.status === 'cancelled'
  return true
}
const sortFor: Record<View, (a: BookingRow, b: BookingRow) => number> = {
  upcoming: (a, b) => startOf(a) - startOf(b),
  new: (a, b) => startOf(a) - startOf(b),
  past: (a, b) => startOf(b) - startOf(a),
  cancelled: (a, b) => receivedAt(b) - receivedAt(a),
  all: (a, b) => receivedAt(b) - receivedAt(a),
}
// Calls are listed under their day in the views that are about when calls happen.
const byDay = (view: View) => view === 'upcoming' || view === 'past'

// The current time, ticking over every minute so "in 2 hours" and the views stay current.
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

type Toast = { id: number; text: string }
type Patch = Partial<Pick<BookingRow, 'status' | 'notes'>>

export function Bookings({ db }: { db: SupabaseClient }) {
  const now = useNow()
  const [rows, setRows] = useState<BookingRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<View>('upcoming')
  const [query, setQuery] = useState('')
  const [service, setService] = useState('')
  const [budget, setBudget] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  // Bookings that arrived while the page was open, marked until they're opened.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const toast = useCallback((text: string) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, text }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  // The latest 1000 bookings; "Try again" bumps the counter to fetch again.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    db.from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!live) return
        if (error) return setLoadError(error.message)
        setRows(data as BookingRow[])
        setLoadError(null)
      })
    return () => {
      live = false
    }
  }, [db, attempt])

  // New bookings, and changes made by anyone else on the team, arrive without a refresh.
  useEffect(() => {
    const channel = db
      .channel(`admin-bookings-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (change) => {
        if (change.eventType === 'INSERT') {
          const row = change.new as BookingRow
          setRows((list) => (list && !list.some((r) => r.id === row.id) ? [row, ...list] : list))
          setFresh((f) => new Set(f).add(row.id))
          toast(`New booking from ${row.name}`)
        } else if (change.eventType === 'UPDATE') {
          const row = change.new as BookingRow
          setRows((list) => list?.map((r) => (r.id === row.id ? row : r)) ?? list)
        } else if (change.eventType === 'DELETE') {
          const id = (change.old as Partial<BookingRow>).id
          setRows((list) => list?.filter((r) => r.id !== id) ?? list)
        }
      })
      .subscribe()
    return () => {
      void db.removeChannel(channel)
    }
  }, [db, toast])

  // Changes show straight away and roll back if the database refuses them.
  const patch = async (id: string, values: Patch) => {
    const before = rows?.find((r) => r.id === id)
    setRows((list) => list?.map((r) => (r.id === id ? { ...r, ...values } : r)) ?? list)
    const { error } = await db.from('bookings').update(values).eq('id', id)
    if (!error) return true
    if (before) setRows((list) => list?.map((r) => (r.id === id ? before : r)) ?? list)
    toast(
      error.code === '23505'
        ? 'Another booking already has that time, so this one can’t be reopened.'
        : `Couldn’t save the change: ${error.message}`,
    )
    return false
  }

  const remove = async (id: string) => {
    const { error } = await db.from('bookings').delete().eq('id', id)
    if (error) {
      toast(`Couldn’t delete the booking: ${error.message}`)
      return false
    }
    setRows((list) => list?.filter((r) => r.id !== id) ?? list)
    setOpenId(null)
    toast('Booking deleted')
    return true
  }

  const openRow = (id: string) => {
    setOpenId(id)
    setFresh((f) => {
      if (!f.has(id)) return f
      const next = new Set(f)
      next.delete(id)
      return next
    })
  }

  const counts = useMemo(() => {
    const out = { upcoming: 0, new: 0, past: 0, cancelled: 0, all: 0 } as Record<View, number>
    for (const r of rows ?? []) for (const v of views) if (inView(r, v.id, now)) out[v.id]++
    return out
  }, [rows, now])

  const q = query.trim().toLowerCase()
  const filtering = Boolean(q || service || budget)
  const shown = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => inView(r, view, now))
        .filter((r) => !service || r.interests.includes(service))
        .filter((r) => !budget || r.budget === budget)
        .filter((r) => !q || [r.name, r.company, r.email, r.phone, r.message, r.notes].some((v) => v?.toLowerCase().includes(q)))
        .sort(sortFor[view]),
    [rows, view, now, service, budget, q],
  )
  const next = useMemo(() => (rows ?? []).filter((r) => inView(r, 'upcoming', now)).sort(sortFor.upcoming)[0], [rows, now])
  const open = rows?.find((r) => r.id === openId) ?? null

  useEffect(() => {
    document.title = `${counts.new ? `(${counts.new}) ` : ''}Bookings – MRKTKings`
  }, [counts.new])

  const clearFilters = () => {
    setQuery('')
    setService('')
    setBudget('')
  }

  const exportCsv = () => {
    const today = new Date().toISOString().slice(0, 10)
    download(`mrktkings-bookings-${view}-${today}.csv`, bookingsCsv(shown))
  }

  return (
    <main className="admin">
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Bookings</h1>
          <NextCall row={next} now={now} onOpen={openRow} />
        </div>
        <button type="button" className="abtn" onClick={exportCsv} disabled={!shown.length}>
          <Download size={17} /> Export CSV
        </button>
      </div>

      <div className="bar">
        <div className="views" role="group" aria-label="Show">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              className="views__btn"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
              <span className={`views__count${v.id === 'new' && counts.new ? ' views__count--alert' : ''}`}>{counts[v.id]}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <label className="search">
            <Search size={17} />
            <span className="sr-only">Search bookings</span>
            <input type="search" placeholder="Search name, email, notes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="pick" aria-label="Service" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All services</option>
            {connectPage.interests.map((i) => (
              <option key={i.label} value={i.label}>
                {i.label}
              </option>
            ))}
          </select>
          <select className="pick" aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">Any budget</option>
            {connectPage.budgets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="notice notice--error" role="alert">
          <p>Couldn&rsquo;t load the bookings: {loadError}</p>
          <button type="button" className="abtn" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : rows === null ? (
        <p className="notice">Loading bookings&hellip;</p>
      ) : shown.length === 0 ? (
        <div className="notice">
          {rows.length === 0 ? (
            <p>No bookings yet. They appear here as soon as someone books a call on the Let&rsquo;s Connect page.</p>
          ) : filtering ? (
            <>
              <p>Nothing here matches the search and filters.</p>
              <button type="button" className="abtn" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          ) : (
            <p>{emptyText[view]}</p>
          )}
        </div>
      ) : (
        <BookingList rows={shown} grouped={byDay(view)} fresh={fresh} now={now} onOpen={openRow} onStatus={(id, status) => void patch(id, { status })} />
      )}

      <BookingPanel
        row={open}
        now={now}
        onClose={() => setOpenId(null)}
        onStatus={(status) => (open ? patch(open.id, { status }) : Promise.resolve(false))}
        onNotes={(notes) => (open ? patch(open.id, { notes }) : Promise.resolve(false))}
        onDelete={() => (open ? remove(open.id) : Promise.resolve(false))}
      />

      <div className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.p
              key={t.id}
              layout
              className="toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </main>
  )
}

function NextCall({ row, now, onOpen }: { row: BookingRow | undefined; now: number; onOpen: (id: string) => void }) {
  if (!row) return <p className="admin__next">No calls coming up.</p>
  const started = startOf(row) <= now
  return (
    <p className="admin__next">
      {started ? 'On a call now: ' : `Next call ${fromNow(row.call_start, now)}: `}
      <button type="button" className="admin__next-link" onClick={() => onOpen(row.id)}>
        {formatDayShort(row.call_start)}, {formatTime(row.call_start)} with {row.name}
        {row.company ? `, ${row.company}` : ''}
      </button>
    </p>
  )
}

export function StatusSelect({ value, label, onChange }: { value: BookingStatus; label: string; onChange: (s: BookingStatus) => void }) {
  return (
    <span className={`status is-${value}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as BookingStatus)}>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
    </span>
  )
}

type ListProps = {
  rows: BookingRow[]
  grouped: boolean
  fresh: ReadonlySet<string>
  now: number
  onOpen: (id: string) => void
  onStatus: (id: string, status: BookingStatus) => void
}

function BookingList({ rows, grouped, fresh, now, onOpen, onStatus }: ListProps) {
  return (
    <table className="list">
      <thead>
        <tr>
          <th scope="col">Call (IST)</th>
          <th scope="col">Who</th>
          <th scope="col">Services</th>
          <th scope="col">Budget</th>
          <th scope="col">Status</th>
          <th scope="col">Received</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const day = studioDayKey(r.call_start)
          const newDay = grouped && (i === 0 || studioDayKey(rows[i - 1].call_start) !== day)
          const note = dayNote(r.call_start, now)
          return (
            <Fragment key={r.id}>
              {newDay && (
                <tr className="list__day">
                  <th colSpan={6} scope="colgroup">
                    {formatDayLong(r.call_start)}
                    {note && <span>{note}</span>}
                  </th>
                </tr>
              )}
              <tr className={`list__row is-${r.status}${fresh.has(r.id) ? ' is-fresh' : ''}`} onClick={() => onOpen(r.id)}>
                <td className="list__when">
                  <strong>{formatTime(r.call_start)}</strong>
                  {!grouped && <span>{formatDayShort(r.call_start)}</span>}
                </td>
                <td className="list__who">
                  <button
                    type="button"
                    className="list__name"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(r.id)
                    }}
                  >
                    {r.name}
                    {fresh.has(r.id) && <span className="list__fresh">Just in</span>}
                  </button>
                  {r.company && <span className="list__company">{r.company}</span>}
                  <span className="list__email">{r.email}</span>
                </td>
                <td className="list__services">{r.interests.length ? r.interests.join(', ') : <span className="list__none">Not given</span>}</td>
                <td className="list__budget">{r.budget ?? <span className="list__none">Not given</span>}</td>
                <td className="list__status" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect value={r.status} label={`Status for ${r.name}`} onChange={(s) => onStatus(r.id, s)} />
                </td>
                <td className="list__received" title={formatStamp(r.created_at)}>
                  {fromNow(r.created_at, now)}
                </td>
              </tr>
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

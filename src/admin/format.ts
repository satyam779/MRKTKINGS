import { booking } from '../content'
import type { BookingRow, BookingStatus } from '../lib/supabase'

// Everything on the admin page is shown in studio time (Bengaluru), whatever the viewer's own zone.
const zone = booking.timeZone
const fmt = (options: Intl.DateTimeFormatOptions, locale = 'en-GB') => new Intl.DateTimeFormat(locale, { timeZone: zone, ...options })

const dayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const dayShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const dayYear = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const time = fmt({ hour: 'numeric', minute: '2-digit' }, 'en-US')
const stampDate = fmt({ day: 'numeric', month: 'short', year: 'numeric' })
const keyFormat = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA')

export const formatTime = (iso: string) => time.format(new Date(iso))
export const formatDayLong = (iso: string) => dayLong.format(new Date(iso))
// "3 Oct 2026, 7:00 PM"
export const formatStamp = (iso: string) => `${stampDate.format(new Date(iso))}, ${time.format(new Date(iso))}`
// Short date, with the year only when it isn't this year.
export const formatDayShort = (iso: string) => {
  const d = new Date(iso)
  return d.getFullYear() === new Date().getFullYear() ? dayShort.format(d) : dayYear.format(d)
}
// The studio's calendar day, e.g. 2026-10-05, for grouping calls by day.
export const studioDayKey = (iso: string) => keyFormat.format(new Date(iso))

// "Today", "Tomorrow" or "Yesterday" for a call's day in studio time, otherwise nothing.
export function dayNote(iso: string, now = Date.now()) {
  const key = studioDayKey(iso)
  const near = (days: number) => keyFormat.format(new Date(now + days * 86_400_000))
  if (key === near(0)) return 'Today'
  if (key === near(1)) return 'Tomorrow'
  if (key === near(-1)) return 'Yesterday'
  return ''
}

// The same moment in the visitor's own zone, when their clock reads differently from Bengaluru's.
const momentOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true } as const
const studioMoment = new Intl.DateTimeFormat('en-GB', { ...momentOptions, timeZone: zone })
export function visitorTime(row: BookingRow) {
  const tz = row.visitor_time_zone
  if (!tz) return null
  try {
    const d = new Date(row.call_start)
    const local = new Intl.DateTimeFormat('en-GB', { ...momentOptions, timeZone: tz }).format(d)
    return local === studioMoment.format(d) ? null : `${local} (${tz.replace(/_/g, ' ')})`
  } catch {
    return null
  }
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400],
  ['month', 30 * 86_400],
  ['week', 7 * 86_400],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]
// "3 hours ago", "in 2 days", "just now".
export function fromNow(iso: string, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export const statusLabels: Record<BookingStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
export const statuses = Object.keys(statusLabels) as BookingStatus[]

// ---------- Links ----------
const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// A Google Calendar event for the team, with the lead already added as a guest.
export function teamCalendarUrl(row: BookingRow) {
  const start = new Date(row.call_start)
  const end = new Date(start.getTime() + row.call_minutes * 60_000)
  const who = row.company ? `${row.name} (${row.company})` : row.name
  const details = [
    row.interests.length ? `Interested in: ${row.interests.join(', ')}` : '',
    row.budget ? `Budget: ${row.budget}` : '',
    row.phone ? `Phone: ${row.phone}` : '',
    row.message ? `\n${row.message}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Discovery call: ${who}`,
    dates: `${gcalStamp(start)}/${gcalStamp(end)}`,
    details,
    add: row.email,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// wa.me needs the number with its country code and nothing else. Ten digits on their own are taken as Indian.
export function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10) digits = `91${digits}`
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

// ---------- CSV ----------
// Cells that a spreadsheet would read as a formula get a leading apostrophe, since visitors write this data.
const cell = (value: string | number | null | undefined) => {
  let v = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function bookingsCsv(rows: BookingRow[]) {
  const header = ['Call date (IST)', 'Call time (IST)', 'Minutes', 'Status', 'Name', 'Company', 'Email', 'Phone', 'Services', 'Budget', 'About the project', 'Notes', 'Visitor time zone', 'Received']
  const lines = rows.map((r) =>
    [
      studioDayKey(r.call_start),
      formatTime(r.call_start),
      r.call_minutes,
      statusLabels[r.status],
      r.name,
      r.company,
      r.email,
      r.phone,
      r.interests.join(', '),
      r.budget,
      r.message,
      r.notes,
      r.visitor_time_zone,
      formatStamp(r.created_at),
    ]
      .map(cell)
      .join(','),
  )
  // The byte-order mark lets Excel read ₹ and other non-ASCII characters correctly.
  return `﻿${[header.join(','), ...lines].join('\r\n')}`
}

export function download(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

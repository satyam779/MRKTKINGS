import { booking, contact } from '../../content'

export type Slot = { key: string; start: Date }
export type Day = { key: string; date: Date; slots: Slot[] }

export type Details = {
  name: string
  company: string
  email: string
  phone: string
  interests: string[]
  budget: string
  message: string
  // Honeypot: hidden from people, filled in by bots. Anything in it skips sending.
  website: string
}

const MINUTE = 60_000
const pad = (n: number) => String(n).padStart(2, '0')
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
// The visitor's own calendar day, e.g. 2026-10-08.
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Every bookable slot from now until `booking.daysAhead` out, grouped by the visitor's calendar day.
// Slots are laid out in Bengaluru time and converted, so a visitor abroad sees the same instants in their
// own hours (which can move a slot onto their previous or next day).
export function buildDays(now = new Date()): Day[] {
  const { utcOffsetMinutes: offset, callMinutes, daysAhead, noticeHours } = booking
  const earliest = now.getTime() + noticeHours * 60 * MINUTE
  const studioToday = new Date(now.getTime() + offset * MINUTE)
  const first = toMinutes(booking.from)
  const last = toMinutes(booking.until)

  const byDay = new Map<string, Slot[]>()
  for (let i = -1; i <= daysAhead + 1; i++) {
    const y = studioToday.getUTCFullYear()
    const m = studioToday.getUTCMonth()
    const d = studioToday.getUTCDate() + i
    if (!booking.days.includes(new Date(Date.UTC(y, m, d)).getUTCDay())) continue
    for (let t = first; t <= last; t += callMinutes) {
      const start = new Date(Date.UTC(y, m, d, 0, t - offset))
      if (start.getTime() < earliest) continue
      const key = dayKey(start)
      const list = byDay.get(key) ?? []
      list.push({ key: start.toISOString(), start })
      byDay.set(key, list)
    }
  }

  return Array.from({ length: daysAhead + 1 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const key = dayKey(date)
    return { key, date, slots: byDay.get(key) ?? [] }
  })
}

// ---------- Formatting ----------
const fmt = (options: Intl.DateTimeFormatOptions, locale = 'en-GB') => new Intl.DateTimeFormat(locale, options)
const timeLocal = fmt({ hour: 'numeric', minute: '2-digit' }, 'en-US')
const timeStudio = fmt({ hour: 'numeric', minute: '2-digit', timeZone: booking.timeZone }, 'en-US')
const dateStudio = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: booking.timeZone })
export const weekdayShort = fmt({ weekday: 'short' })
export const dateShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
export const dateLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
export const dateFull = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const formatTime = (d: Date) => timeLocal.format(d)
export const formatStudioTime = (d: Date) => `${timeStudio.format(d)} ${booking.zoneLabel}`
export const sameMinute = (a: Date, b: Date) => a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes()

// The visitor is on Bengaluru time if their UTC offset matches, so there's nothing to convert.
export const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone
export const onStudioTime = -new Date().getTimezoneOffset() === booking.utcOffsetMinutes
export const zoneNote = onStudioTime
  ? `Times in ${booking.zoneLabel} (Bengaluru)`
  : `Times in your time zone (${visitorZone.replace(/_/g, ' ')})`

// "October 2026", or "Oct – Nov 2026" when the visible dates span two months.
export function monthRange(a: Date, b: Date) {
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return fmt({ month: 'long', year: 'numeric' }).format(a)
  const month = fmt({ month: 'short' })
  if (a.getFullYear() === b.getFullYear()) return `${month.format(a)} – ${month.format(b)} ${b.getFullYear()}`
  return `${month.format(a)} ${a.getFullYear()} – ${month.format(b)} ${b.getFullYear()}`
}

// ---------- Add to calendar ----------
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const callEnd = (start: Date) => new Date(start.getTime() + booking.callMinutes * MINUTE)

export function googleCalendarUrl(start: Date) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: booking.eventTitle,
    dates: `${stamp(start)}/${stamp(callEnd(start))}`,
    details: booking.eventDetails,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// A one-event .ics file for Apple Calendar, Outlook and the rest.
export function icsUrl(start: Date) {
  const text = (s: string) => s.replace(/([\\,;])/g, '\\$1')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MRKTKings//Discovery call//EN',
    'BEGIN:VEVENT',
    `UID:${stamp(start)}-${Math.random().toString(36).slice(2, 10)}@mrktkings.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(callEnd(start))}`,
    `SUMMARY:${text(booking.eventTitle)}`,
    `DESCRIPTION:${text(booking.eventDetails)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}

// ---------- Sending ----------
// A form backend that accepts JSON POSTs (Formspree, Getform, Basin, a Zapier or Make webhook…), set in .env.
// Without one, the visitor's email app opens with everything filled in instead.
const endpoint: string | undefined = import.meta.env.VITE_CONTACT_ENDPOINT

function summary(d: Details, start: Date) {
  const when = `${dateStudio.format(start)}, ${formatStudioTime(start)}`
  const local = onStudioTime ? undefined : `${dateFull.format(start)}, ${formatTime(start)} (${visitorZone})`
  return {
    subject: `Discovery call: ${d.name}${d.company ? ` (${d.company})` : ''} – ${dateShort.format(start)}`,
    when,
    local,
    rows: [
      ['Name', d.name],
      ['Company', d.company],
      ['Email', d.email],
      ['Phone', d.phone],
      ['Interested in', d.interests.join(', ')],
      ['Budget', d.budget],
      ['Call', when],
      ['Their time', local],
      ['About the project', d.message],
    ].filter((row): row is [string, string] => Boolean(row[1])),
  }
}

export function mailtoUrl(d: Details, start: Date) {
  const { subject, rows } = summary(d, start)
  const body = rows.map(([k, v]) => `${k}: ${v}`).join('\n')
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export type Outcome = 'sent' | 'email'

export async function sendBooking(d: Details, start: Date): Promise<Outcome> {
  if (d.website) return 'sent'
  if (!endpoint) {
    window.location.href = mailtoUrl(d, start)
    return 'email'
  }
  const { subject, when, local } = summary(d, start)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: subject,
      name: d.name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      interests: d.interests.join(', '),
      budget: d.budget,
      message: d.message,
      call_time: when,
      call_time_visitor: local ?? when,
      call_start_utc: start.toISOString(),
      call_minutes: booking.callMinutes,
    }),
  })
  if (!res.ok) throw new Error(`Booking request failed with ${res.status}`)
  return 'sent'
}

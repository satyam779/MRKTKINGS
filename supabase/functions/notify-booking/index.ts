// Emails the team when someone books a call on Let's Connect.
//
// A Supabase Database Webhook calls this for every new row in public.bookings, and it sends the booking
// to NOTIFY_TO through Resend. Setup steps are in the README under "Booking emails".
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  required. From resend.com → API Keys.
//   WEBHOOK_SECRET  required. Any long random string; the webhook sends the same value in an
//                   x-webhook-secret header, so nobody else can make this function send email.
//   NOTIFY_TO       optional. Who gets the email (default mrktkings@gmail.com). Separate several with commas.
//   NOTIFY_FROM     optional. The sender. Defaults to Resend's test sender, which can only deliver to the
//                   address the Resend account was created with. Once mrktkings.com is verified in Resend,
//                   set it to e.g. "MRKTKings Bookings <bookings@mrktkings.com>".
//   SITE_URL        optional. The live site, for the admin link (default https://mrktkings.com).

type Booking = {
  id: string
  created_at: string
  name: string
  company: string | null
  email: string
  phone: string | null
  interests: string[] | null
  budget: string | null
  message: string | null
  call_start: string
  call_minutes: number
  visitor_time_zone: string | null
}

type Env = (name: string) => string | undefined
type Send = (url: string, init: RequestInit) => Promise<Response>

const STUDIO_ZONE = 'Asia/Kolkata'
const DEFAULT_TO = 'mrktkings@gmail.com'
const DEFAULT_FROM = 'MRKTKings Bookings <onboarding@resend.dev>'
const DEFAULT_SITE = 'https://mrktkings.com'

// ---------- Formatting ----------
const inZone = (zone: string, options: Intl.DateTimeFormatOptions, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { timeZone: zone, ...options })
const studioDay = inZone(STUDIO_ZONE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const studioDayShort = inZone(STUDIO_ZONE, { weekday: 'short', day: 'numeric', month: 'short' })
const studioTime = inZone(STUDIO_ZONE, { hour: 'numeric', minute: '2-digit' }, 'en-US')
const momentOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true } as const

// The visitor's own clock, when it reads differently from Bengaluru's.
function visitorTime(b: Booking) {
  if (!b.visitor_time_zone) return null
  try {
    const d = new Date(b.call_start)
    const theirs = inZone(b.visitor_time_zone, momentOptions).format(d)
    return theirs === inZone(STUDIO_ZONE, momentOptions).format(d) ? null : `${theirs} (${b.visitor_time_zone.replace(/_/g, ' ')})`
  } catch {
    return null
  }
}

// Everything visitors typed is escaped before it goes into the email's HTML.
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const oneLine = (v: string) => v.replace(/[\r\n]+/g, ' ').trim()
const firstName = (name: string) => oneLine(name).split(/\s+/)[0] || 'them'
const looksLikeEmail = (v: string) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/.test(v)

// wa.me needs the number with its country code and nothing else. Ten digits on their own are taken as Indian.
function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10) digits = `91${digits}`
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

// A Google Calendar event for the team, with the lead already added as a guest.
function calendarUrl(b: Booking) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const start = new Date(b.call_start)
  const end = new Date(start.getTime() + b.call_minutes * 60_000)
  const who = b.company ? `${oneLine(b.name)} (${oneLine(b.company)})` : oneLine(b.name)
  const details = [
    b.interests?.length ? `Interested in: ${b.interests.join(', ')}` : '',
    b.budget ? `Budget: ${b.budget}` : '',
    b.phone ? `Phone: ${b.phone}` : '',
    b.message ? `\n${b.message}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `Discovery call: ${who}`, dates: `${stamp(start)}/${stamp(end)}`, details })
  if (looksLikeEmail(b.email)) params.set('add', b.email)
  return `https://calendar.google.com/calendar/render?${params}`
}

// ---------- The email ----------
export function renderEmail(b: Booking, siteUrl = DEFAULT_SITE) {
  const start = new Date(b.call_start)
  const name = oneLine(b.name)
  const company = b.company ? oneLine(b.company) : ''
  const when = `${studioDayShort.format(start)}, ${studioTime.format(start)} IST`
  const theirs = visitorTime(b)
  const services = b.interests?.length ? b.interests.join(', ') : ''
  const admin = `${siteUrl.replace(/\/$/, '')}/admin/`
  const whatsapp = b.phone ? whatsappUrl(b.phone) : null

  const subject = `New call booked: ${name}${company ? ` (${company})` : ''}, ${when}`.slice(0, 180)

  const rows: [string, string][] = [
    ['Name', esc(name)],
    ['Company', company ? esc(company) : ''],
    ['Email', `<a href="mailto:${esc(b.email)}" style="color:#000;">${esc(b.email)}</a>`],
    [
      'Phone',
      b.phone
        ? `<a href="tel:${esc(b.phone.replace(/[^\d+]/g, ''))}" style="color:#000;">${esc(b.phone)}</a>` +
          (whatsapp ? ` &nbsp;<a href="${whatsapp}" style="color:#b30500;">WhatsApp</a>` : '')
        : '',
    ],
    ['Services', services ? esc(services) : ''],
    ['Budget', b.budget ? esc(b.budget) : ''],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  const font = "font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f3f1;${font}color:#000;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(`${name} booked a call for ${when}.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dcdcd7;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#000;padding:18px 28px;">
    <span style="font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:18px;letter-spacing:0.02em;color:#e10600;">MRKTKINGS</span>
  </td></tr>
  <tr><td style="padding:28px 28px 8px;">
    <p style="margin:0 0 6px;font-size:13px;color:#5b5b57;">New booking from Let&rsquo;s Connect</p>
    <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;">${esc(name)} booked a call</h1>
  </td></tr>
  <tr><td style="padding:16px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0;font-size:17px;font-weight:700;">${esc(studioDay.format(start))}</p>
        <p style="margin:4px 0 0;font-size:15px;">${esc(studioTime.format(start))} IST, ${b.call_minutes} minutes</p>
        ${theirs ? `<p style="margin:6px 0 0;font-size:13px;color:#5b5b57;">Their time: ${esc(theirs)}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:12px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14.5px;line-height:1.5;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td valign="top" style="width:92px;padding:9px 0;border-bottom:1px solid #ececea;color:#5b5b57;">${label}</td><td valign="top" style="padding:9px 0;border-bottom:1px solid #ececea;">${value}</td></tr>`,
        )
        .join('\n      ')}
    </table>
  </td></tr>
  ${
    b.message
      ? `<tr><td style="padding:20px 28px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:#5b5b57;">About the project</p>
    <div style="padding:14px 16px;border-radius:10px;background:#f3f3f1;font-size:14.5px;line-height:1.6;white-space:pre-wrap;">${esc(b.message)}</div>
  </td></tr>`
      : ''
  }
  <tr><td style="padding:26px 28px 6px;">
    <a href="${esc(admin)}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 20px;border-radius:999px;background:#e10600;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">Open bookings</a>
    <a href="${esc(calendarUrl(b))}" style="display:inline-block;margin:0 0 10px;padding:11px 19px;border-radius:999px;border:1px solid #cfcfca;color:#000;font-size:14px;font-weight:700;text-decoration:none;">Add to Google Calendar</a>
  </td></tr>
  <tr><td style="padding:4px 28px 26px;font-size:13.5px;color:#5b5b57;">
    Reply to this email to write to ${esc(firstName(name))} directly.
  </td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#8f8f8a;">Sent automatically when someone books a call on ${esc(siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))}.</p>
</td></tr>
</table>
</body>
</html>`

  // null marks a field that wasn't given (left out); '' is a deliberate blank line.
  const text = [
    `${name} booked a call`,
    '',
    `When: ${studioDay.format(start)}, ${studioTime.format(start)} IST (${b.call_minutes} minutes)`,
    theirs ? `Their time: ${theirs}` : null,
    '',
    `Name: ${name}`,
    company ? `Company: ${company}` : null,
    `Email: ${b.email}`,
    b.phone ? `Phone: ${b.phone}` : null,
    services ? `Services: ${services}` : null,
    b.budget ? `Budget: ${b.budget}` : null,
    ...(b.message ? ['', 'About the project:', b.message] : []),
    '',
    `Open bookings: ${admin}`,
    `Add to Google Calendar: ${calendarUrl(b)}`,
    '',
    `Reply to this email to write to ${firstName(name)} directly.`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  return { subject, html, text }
}

// ---------- The webhook ----------
const reply = (status: number, body: string) => new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })

export async function handle(req: Request, env: Env, send: Send = fetch): Promise<Response> {
  if (req.method !== 'POST') return reply(405, 'Method not allowed')

  const secret = env('WEBHOOK_SECRET')
  if (!secret) return reply(500, 'WEBHOOK_SECRET is not set')
  if (req.headers.get('x-webhook-secret') !== secret) return reply(401, 'Unauthorized')

  let payload: { type?: string; table?: string; record?: Booking }
  try {
    payload = await req.json()
  } catch {
    return reply(400, 'Expected a JSON body')
  }
  // Only new bookings; anything else the webhook might be pointed at is ignored.
  const b = payload.record
  if (payload.type !== 'INSERT' || payload.table !== 'bookings' || !b?.id || !b.name || !b.email || !b.call_start) {
    return reply(200, 'Ignored')
  }

  const key = env('RESEND_API_KEY')
  if (!key) return reply(500, 'RESEND_API_KEY is not set')

  const to = (env('NOTIFY_TO') || DEFAULT_TO)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  const { subject, html, text } = renderEmail(b, env('SITE_URL') || DEFAULT_SITE)

  const res = await send('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // If the webhook fires twice for the same booking, Resend sends only one email.
      'Idempotency-Key': `booking-${b.id}`,
    },
    body: JSON.stringify({
      from: env('NOTIFY_FROM') || DEFAULT_FROM,
      to,
      subject,
      html,
      text,
      // Replying goes straight to the lead. Left out if the address looks broken, so Resend still sends.
      ...(looksLikeEmail(b.email.trim()) ? { reply_to: b.email.trim() } : {}),
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error(`Resend refused the booking email (${res.status}): ${detail}`)
    return reply(502, `Resend error ${res.status}: ${detail}`)
  }
  console.log(`Booking email sent for ${b.id}`)
  return reply(200, 'Sent')
}

// Supabase runs this file on Deno. (Under Node, used for local previews, only the exports above apply.)
const deno = (globalThis as { Deno?: { serve: (h: (req: Request) => Promise<Response>) => void; env: { get: (name: string) => string | undefined } } }).Deno
if (deno) deno.serve((req) => handle(req, (name) => deno.env.get(name)))

# MRKTKings website

Marketing site for MRKTKings, a D2C growth agency in Bengaluru. Five pages built with React, TypeScript, Vite and Framer Motion, plus a team-only bookings page backed by Supabase:

| Page | URL | Entry |
| --- | --- | --- |
| Home | `/` | `index.html` → `src/main.tsx` |
| Services | `/services/` | `services/index.html` → `src/services.tsx` |
| Projects | `/our-work/` | `our-work/index.html` → `src/our-work.tsx` |
| About | `/about/` | `about/index.html` → `src/about.tsx` |
| Let's Connect | `/contact-us/` | `contact-us/index.html` → `src/contact.tsx` |
| Bookings (team only) | `/admin/` | `admin/index.html` → `src/admin.tsx` |

## Run it

Needs Node 20 or newer.

```sh
cp .env.example .env   # first time only, then fill in the values
npm install
npm run dev       # local dev server at http://localhost:5173
npm run build     # type-check and build the static site into dist/
npm run preview   # serve dist/ locally to check the production build
npm run lint
```

`.env` holds this machine's settings and is never committed (it's in `.gitignore`). `.env.example` lists every
setting with a description; keep it in step when adding one.

## Editing content

- **Copy, links and media paths:** `src/content.ts`. Almost every word on the site lives here.
- **Media:** `public/media/`. Keep file names in step with `content.ts`.
- **Page titles, descriptions and share previews:** the `<head>` of each page's `index.html`.
- **Share images:** `public/og-image.jpg` (all pages) and `public/og-about.jpg` (About), both 1200 × 630.
- **Let's Connect form:** interests, budgets and copy are in `connectPage` in `src/content.ts`. Call length, working days, hours (Bengaluru time) and how far ahead people can book are in `booking`. Visitors abroad see the slots in their own time zone.
- **Where bookings go:** Supabase (see below). Until `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in `.env`, pressing "Book the call" opens the visitor's email app with everything filled in, addressed to `contact.email`.
- **Site address:** `VITE_SITE_URL` in `.env`. It feeds canonical links, share previews, `robots.txt` and `sitemap.xml`, which are generated at build time (see `vite.config.ts`).

Footer "Privacy Policy" and "Disclaimer" links stay hidden while their URLs in `content.ts` are `'#'`.

## Bookings and the admin page (Supabase)

Let's Connect saves each booking to a `bookings` table in Supabase. The team reads and manages them at `/admin/`.

**One-time setup**

1. In `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API Keys → publishable key, or the legacy anon key). Never use the secret or `service_role` key here.
2. Supabase → SQL Editor → New query → paste all of `supabase/schema.sql` → Run. It creates the table, the access rules, the taken-slots lookup and live updates. It's safe to run again.
3. Supabase → Authentication → Sign In / Providers: turn off "Allow new users to sign up", so nobody can make their own account.
4. For each team member: Authentication → Users → Add user → Create new user (tick "Auto Confirm User"), then make them an admin with the `insert into public.admins …` lines at the end of `supabase/schema.sql`.

**What's protected, and how:** row-level security in the database, not the website. Visitors can only add a booking and see which call times are taken (never who booked them). Only signed-in accounts listed in `public.admins` can read, change or delete bookings. A time can only be booked once (a cancelled booking frees it), and the form hides times that are already taken.

**On the admin page:** upcoming calls grouped by day, new (unconfirmed) bookings, past and cancelled ones; search and filters by service and budget; status (New, Confirmed, Completed, Cancelled); team notes; email, WhatsApp and Google Calendar links; CSV export of whatever is on screen. New bookings appear without a refresh. All times are in IST. It loads the latest 1,000 bookings.

## Booking emails

Every new booking is emailed to **mrktkings@gmail.com**: call time in IST (and the visitor's own time), name, company,
email, phone with a WhatsApp link, services, budget and their message, plus "Open bookings" and "Add to Google Calendar"
buttons. Pressing Reply writes straight to the lead.

How it works: a Supabase Database Webhook calls the Edge Function in `supabase/functions/notify-booking/index.ts` for
each new row in `bookings`, and the function sends the email through [Resend](https://resend.com). The function only
acts on requests carrying the webhook's secret, so nobody else can make it send email.

**One-time setup (about 15 minutes, all in the browser)**

1. **Resend:** sign up at resend.com **with mrktkings@gmail.com**. (Until a domain is verified, Resend only delivers
   to the address the account was made with, so this lets it start straight away with no DNS changes.) Then
   API Keys → Create API Key (sending access) and copy it.
2. **Make a webhook secret:** any long random string. In PowerShell:
   `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`
3. **Deploy the function:** Supabase → Edge Functions → Deploy a new function → Via Editor. Name it `notify-booking`,
   replace the sample code with all of `supabase/functions/notify-booking/index.ts`, and deploy. Then, in the
   function's settings, turn **off** JWT verification ("Verify JWT"): the function checks its own secret instead.
4. **Add the secrets:** Edge Functions → Secrets. Add `RESEND_API_KEY` (from step 1) and `WEBHOOK_SECRET` (from
   step 2). Optional: `NOTIFY_TO` (default `mrktkings@gmail.com`), `SITE_URL` (default
   `https://mrktkings.com`).
5. **Create the webhook:** Supabase → Database Webhooks (under Integrations in newer dashboards; enable the feature
   if asked) → Create a new hook. Name `notify-booking`, table `bookings`, events **Insert** only, type
   **Supabase Edge Functions** → `notify-booking`, method POST. Under HTTP Headers add `x-webhook-secret` with the
   same value as `WEBHOOK_SECRET`. Create.
6. **Test:** book a call on `/contact-us/`. The email should arrive within seconds. Check Spam the first time and
   mark it "Not spam". If nothing arrives: Edge Functions → `notify-booking` → Logs shows why (wrong secret, bad API
   key and so on).

**Later, to send from your own address or to other inboxes:** in Resend, Domains → Add `mrktkings.com` and add the
DNS records it shows. Once verified, set the secret `NOTIFY_FROM` to `MRKTKings Bookings <bookings@mrktkings.com>`.
Emails then come from your domain and can go to any addresses, e.g. set the secret `NOTIFY_TO` to
`mrktkings@gmail.com, someone@example.com` (no code change or redeploy needed).

Prefer the command line? `npx supabase login`, then
`npx supabase functions deploy notify-booking --no-verify-jwt --project-ref zluccebaexoxuwvluzpx` and
`npx supabase secrets set RESEND_API_KEY=... WEBHOOK_SECRET=... --project-ref zluccebaexoxuwvluzpx`. The webhook
(step 5) is still made in the dashboard.

If an email ever fails, the booking itself is safe: it's saved before the email is attempted and always shows on
`/admin/`.

## Media

The hero film and the services reel each ship in two sizes: the 1080p file for screens 1024px and wider, and a
720p copy for phones and small tablets (`hero.mp4` 4.4 MB / `hero-720.mp4` 2.1 MB, `services-reel-1080.mp4`
5.2 MB / `services-reel-720.mp4` 3.7 MB). Every file in `public/media/` is used by the site. Everything is H.264,
which every phone decodes in hardware, so playback stays smooth.

The hero film has no separate master; the 720p copy is made from `hero.mp4`:

```sh
ffmpeg -i public/media/hero.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -an -movflags +faststart public/media/hero-720.mp4
```

The untouched 23 MB master isn't kept in the project any more; get it back from git history when you need to
re-export, then encode with ffmpeg:

```sh
git show 795f771:public/media/MRKTKings_Services_Reel_v2.mp4 > master.mp4
ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart public/media/services-reel-1080.mp4
ffmpeg -i master.mp4 -vf scale=1280:-2:flags=lanczos -c:v libx264 -preset slow -crf 23 -tune animation -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart public/media/services-reel-720.mp4
```

Portrait project reels (`work-glow-glossary`, `work-guugly-wuugly`, `work-saray-and-valley`) come from the client's
1080×1920 masters, which aren't kept in the project (ask the client for them). The reels always play muted, so the
audio is dropped. Each poster is one frame from the reel:

```sh
ffmpeg -i master.mp4 -vf scale=540:960:flags=lanczos -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -an -movflags +faststart public/media/work-<slug>.mp4
ffmpeg -ss <seconds> -i public/media/work-<slug>.mp4 -frames:v 1 -c:v libwebp -quality 78 public/media/work-<slug>-poster.webp
```

Tapping a reel in the project popup plays it full size with sound from `work-<slug>-full.mp4` (the project's
`fullVideo`): 720p with the audio, `work-glow-glossary-full.mp4` (7.9 MB, crf 25) and
`work-saray-and-valley-full.mp4` (7.4 MB, crf 24). The Guugly Wuugly master has no audio, so its popup opens the
muted reel full size.

The client's untouched masters aren't kept in the project (ask the client for them). To re-export, put a master
in a `masters/` folder at the project root (it's in `.gitignore`, so it's never committed or shipped) and run:

```sh
ffmpeg -i masters/<slug>.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart public/media/work-<slug>-full.mp4
```

The square project reels (`work-sereneve`, `work-baindemer`, `work-my-natural-detox`, `work-ethik`) have no
masters either; they were re-encoded from the previous files at crf 24–26 (about half the size, VMAF 93+). The
originals are in git history (`git show 6c6ccc4:public/media/work-<slug>.mp4`).

## Keeping Supabase awake

Supabase pauses free-plan projects after a week without activity, and bookings would fail while it's paused. The GitHub
Action in `.github/workflows/supabase-keepalive.yml` prevents that: every Monday and Thursday it asks Supabase which
call times are taken (no personal data), using the Supabase URL and public key. Because `.env` isn't committed, give
them to GitHub once: repository **Settings → Secrets and variables → Actions**, then add the variable `SUPABASE_URL`
(Variables tab) and the secret `SUPABASE_PUBLISHABLE_KEY` (Secrets tab), with the same values as in `.env`. Check it
from the Actions tab; if a run fails, the project may already be paused, so restore it from the Supabase dashboard.

GitHub switches off scheduled workflows in a public repository after 60 days without any commits. If the repository is
public and goes quiet, re-enable the workflow from the Actions tab (or move to Supabase's paid plan, which never pauses).

## Deploying

`npm run build` produces a fully static site in `dist/`. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, cPanel and so on).

The live site is on Vercel, which builds it from GitHub on every push to `main`. Its settings (Project → Settings →
Environment Variables) hold `SITE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, the same values as in `.env`;
the build accepts these names with or without `VITE_`. The build stops without the site address, and warns if the
Supabase settings are missing. Changing a value takes effect on the next deployment (Deployments → ⋯ → Redeploy).

- `dist/404.html` is the not-found page; most static hosts use it automatically.
- Files in `dist/assets/` have hashed names and can be cached for a year (`Cache-Control: public, max-age=31536000, immutable`). Cache HTML and `/media/` for a shorter time.
- Videos must be served with byte-range support (all the hosts above do it), or iPhones won't play them.

## Before launch

Checked and ready: production build, type-check, lint, `npm audit` (0 vulnerabilities), every page free of console
errors and broken media at desktop and phone widths, titles/descriptions/share tags/canonical links on every public
page, sitemap and robots.txt, the 404 page, `/admin/` hidden from search, and only the public Supabase key in the build.

Still to do:

- [ ] Supabase: run `supabase/schema.sql` once more (it now also removes visitors' read access to the bookings table as
      a second safeguard), turn off "Allow new users to sign up", add the team as admins, then send a test booking and
      check it on `/admin/`.
- [ ] Set up booking emails to mrktkings@gmail.com (see Booking emails) and check the test booking's email arrives.
- [ ] Confirm where "Careers" should go (`links.careers` in `content.ts`). It points at `mrktkings.com/careers/`, which
      won't exist once this site replaces the old one.
- [ ] Confirm the Let's Connect budget ranges and call hours in `content.ts`. Calls can be booked every day of the week.
- [ ] Add Privacy Policy and Disclaimer URLs, or leave them hidden.
- [ ] Get sign-off on the About page copy and the project `industry` labels (flagged in `content.ts`).
- [ ] Add the `SUPABASE_URL` variable and `SUPABASE_PUBLISHABLE_KEY` secret to the GitHub repository, then open the
      Actions tab → "Keep Supabase awake" → Run workflow once, and check it goes green (see Keeping Supabase awake).
- [ ] After going live, submit `https://<domain>/sitemap.xml` in Google Search Console.

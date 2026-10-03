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
npm install
npm run dev       # local dev server at http://localhost:5173
npm run build     # type-check and build the static site into dist/
npm run preview   # serve dist/ locally to check the production build
npm run lint
```

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

## Media

The services reel ships in two sizes: `services-reel-1080.mp4` (5.2 MB) for screens 1024px and wider and
`services-reel-720.mp4` (3.7 MB) for phones and small tablets. Every file in `public/media/` is used by the site.

The untouched 23 MB master isn't kept in the project any more; get it back from git history when you need to
re-export, then encode with ffmpeg:

```sh
git show 795f771:public/media/MRKTKings_Services_Reel_v2.mp4 > master.mp4
ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart public/media/services-reel-1080.mp4
ffmpeg -i master.mp4 -vf scale=1280:-2:flags=lanczos -c:v libx264 -preset slow -crf 23 -tune animation -profile:v high -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart public/media/services-reel-720.mp4
```

## Keeping Supabase awake

Supabase pauses free-plan projects after a week without activity, and bookings would fail while it's paused. The GitHub
Action in `.github/workflows/supabase-keepalive.yml` prevents that: every Monday and Thursday it asks Supabase which
call times are taken (no personal data), using the URL and public key from `.env`. Check it from the Actions tab; if
a run fails, the project may already be paused, so restore it from the Supabase dashboard.

GitHub switches off scheduled workflows in a public repository after 60 days without any commits. If the repository is
public and goes quiet, re-enable the workflow from the Actions tab (or move to Supabase's paid plan, which never pauses).

## Deploying

`npm run build` produces a fully static site in `dist/`. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, cPanel and so on).

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
- [ ] Decide how the team hears about new bookings. Right now they only show up on `/admin/`; nobody is emailed. A
      Supabase Database Webhook on inserts into `bookings` can post to Slack, Zapier/Make or an email service.
- [ ] Confirm where "Careers" should go (`links.careers` in `content.ts`). It points at `mrktkings.com/careers/`, which
      won't exist once this site replaces the old one.
- [ ] Confirm the Let's Connect budget ranges, call hours and working days in `content.ts`.
- [ ] Add Privacy Policy and Disclaimer URLs, or leave them hidden.
- [ ] Get sign-off on the About page copy and the project `industry` labels (flagged in `content.ts`).
- [ ] Push to GitHub, then open the repository's Actions tab → "Keep Supabase awake" → Run workflow once, and check it
      goes green (see Keeping Supabase awake).
- [ ] After going live, submit `https://<domain>/sitemap.xml` in Google Search Console.

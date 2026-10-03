# MRKTKings website

Marketing site for MRKTKings, a D2C growth agency in Bengaluru. Five pages built with React, TypeScript, Vite and Framer Motion:

| Page | URL | Entry |
| --- | --- | --- |
| Home | `/` | `index.html` → `src/main.tsx` |
| Services | `/services/` | `services/index.html` → `src/services.tsx` |
| Projects | `/our-work/` | `our-work/index.html` → `src/our-work.tsx` |
| About | `/about/` | `about/index.html` → `src/about.tsx` |
| Let's Connect | `/contact-us/` | `contact-us/index.html` → `src/contact.tsx` |

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
- **Where bookings go:** set `VITE_CONTACT_ENDPOINT` in `.env` to a form backend that accepts JSON POSTs (for example a Formspree form URL, `https://formspree.io/f/xxxxxxx`, or a Zapier/Make webhook). Each booking arrives with the visitor's details and the call time in IST and UTC. Until it's set, pressing "Confirm booking" opens the visitor's email app with everything filled in, addressed to `contact.email`.
- **Site address:** `VITE_SITE_URL` in `.env`. It feeds canonical links, share previews, `robots.txt` and `sitemap.xml`, which are generated at build time (see `vite.config.ts`).

Footer "Privacy Policy" and "Disclaimer" links stay hidden while their URLs in `content.ts` are `'#'`.

## Deploying

`npm run build` produces a fully static site in `dist/`. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, cPanel and so on).

- `dist/404.html` is the not-found page; most static hosts use it automatically.
- Files in `dist/assets/` have hashed names and can be cached for a year (`Cache-Control: public, max-age=31536000, immutable`). Cache HTML and `/media/` for a shorter time.
- Videos must be served with byte-range support (all the hosts above do it), or iPhones won't play them.

## Before launch

- [ ] Confirm `VITE_SITE_URL` in `.env` is the live domain.
- [ ] Set `VITE_CONTACT_ENDPOINT` in `.env` so Let's Connect bookings are delivered (see Editing content), and send a test booking.
- [ ] Confirm the Let's Connect budget ranges, call hours and working days in `content.ts`.
- [ ] Confirm where "Careers" should go (`links.careers` in `content.ts`).
- [ ] Add Privacy Policy and Disclaimer URLs, or leave them hidden.
- [ ] Get sign-off on the About page copy and the project `industry` labels (flagged in `content.ts`).
- [ ] Compress `public/media/MRKTKings_Services_Reel_v2.mp4` (24 MB). 1280px H.264 at CRF 26 with `-movflags +faststart` should land around 5–8 MB.
- [ ] After going live, submit `https://<domain>/sitemap.xml` in Google Search Console.

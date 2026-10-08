import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Connect, Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'

const root = import.meta.dirname

// One HTML entry per page. Each is served at its folder: services/index.html is /services/.
const entries = {
  main: 'index.html',
  services: 'services/index.html',
  work: 'our-work/index.html',
  about: 'about/index.html',
  contact: 'contact-us/index.html',
  // Team-only, so it's left out of the sitemap.
  admin: 'admin/index.html',
}
const pagePaths = new Set(Object.values(entries).map((file) => `/${file.replace(/index\.html$/, '')}`))

// Public pages, for the sitemap.
const pages = ['/', '/services/', '/our-work/', '/about/', '/contact-us/']

// Makes `npm run dev` and `npm run preview` answer like the live static host: /admin redirects to /admin/,
// and an address that isn't a page gets the not-found page with a 404 status, instead of the home page.
function pageRoutes(): Plugin {
  const notFound = resolve(root, 'public/404.html')
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    const url = new URL(req.url ?? '/', 'http://localhost')
    let path = url.pathname
    try {
      path = decodeURIComponent(path)
    } catch {
      // A malformed address is simply not a page.
    }
    // Files (scripts, styles, media, .html) and the dev server's own routes are left to Vite.
    if (/\.[a-z0-9]+$/i.test(path) || path.startsWith('/@') || path.startsWith('/__')) return next()
    if (pagePaths.has(path)) return next()
    if (pagePaths.has(`${path}/`)) {
      res.writeHead(301, { Location: `${path}/${url.search}` })
      return res.end()
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(req.method === 'HEAD' ? undefined : readFileSync(notFound))
  }
  return {
    name: 'page-routes',
    configureServer: (server) => {
      server.middlewares.use(handle)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(handle)
    },
  }
}

// Writes robots.txt and sitemap.xml into the build from VITE_SITE_URL, so the domain is set in one place.
function seoFiles(site: string): Plugin {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      const urls = pages.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
      })
    },
  }
}

// Settings the pages read. Each can be named with or without VITE_ (Vercel's settings use the names without
// it). Vite only hands VITE_ names to the pages, so a name without it is copied across. Only these three are
// copied, so nothing else set on the host (a secret key, say) can end up in the browser.
const publicSettings = ['SITE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, root, '')
  for (const name of publicSettings) {
    const value = env[`VITE_${name}`] || env[name]
    if (value) process.env[`VITE_${name}`] = value
  }

  const site = process.env.VITE_SITE_URL?.replace(/\/$/, '')
  if (!site) {
    throw new Error(
      'Set SITE_URL (the live site address, e.g. https://mrktkings.com) in the host\'s environment variables, or VITE_SITE_URL in .env. See .env.example.',
    )
  }
  // Without these the site still builds, but Let's Connect only opens the visitor's email app and /admin/ can't load.
  if (command === 'build' && !(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    console.warn(
      '\n⚠ SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing: bookings will not be saved and /admin/ will not work. See .env.example.\n',
    )
  }

  return {
    // Separate pages, not a single-page app: no falling back to the home page for unknown addresses.
    appType: 'mpa',
    plugins: [react(), seoFiles(site), pageRoutes()],
    build: {
      rollupOptions: {
        input: Object.fromEntries(Object.entries(entries).map(([name, file]) => [name, resolve(root, file)])),
      },
    },
  }
})

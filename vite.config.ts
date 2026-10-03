import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'

// Public pages, for the sitemap. Keep in step with the HTML entries below.
const pages = ['/', '/services/', '/our-work/', '/about/']

// Writes robots.txt and sitemap.xml into the build from VITE_SITE_URL, so the domain lives only in .env.
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const site = loadEnv(mode, import.meta.dirname, 'VITE_').VITE_SITE_URL?.replace(/\/$/, '')
  if (!site) throw new Error('Set VITE_SITE_URL in .env (the live site address, e.g. https://mrktkings.com).')

  return {
    plugins: [react(), seoFiles(site)],
    build: {
      rollupOptions: {
        // One HTML entry per page: /, /services/, /our-work/ and /about/
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          services: resolve(import.meta.dirname, 'services/index.html'),
          work: resolve(import.meta.dirname, 'our-work/index.html'),
          about: resolve(import.meta.dirname, 'about/index.html'),
        },
      },
    },
  }
})

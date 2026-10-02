import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})

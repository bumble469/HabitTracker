import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const base = '/Habit-Tracker-Web-App/'

// Keep direct app/tool URLs working on static hosts, including GitHub Pages.
function applicationEntries() {
  return {
    name: 'habit-tracker-entries',
    enforce: 'post',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (/^\/(?:app|pratik)(?:\/(?:index\.html)?)?(?:\?.*)?$/.test(request.url || '')) {
          request.url = `${base.slice(0, -1)}${request.url}`
        }
        next()
      })
    },
    generateBundle(_options, bundle) {
      const entry = bundle['index.html']
      if (!entry) return
      for (const directory of ['app', 'pratik']) {
        this.emitFile({ type: 'asset', fileName: `${directory}/index.html`, source: entry.source })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), applicationEntries()],
  base,
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        landing: fileURLToPath(new URL('./landing.html', import.meta.url)),
      },
    },
  },
})

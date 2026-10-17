import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

const root = path.resolve(__dirname, '../..')

/** Standalone design documents that live outside apps/web, served at fixed URLs (dev) and shipped
 *  with the build, so the app links to the one canonical copy of each instead of duplicating it. */
const DOCS: { url: string; file: string; type: string; rewrite?: (html: string) => string }[] = [
  { url: '/case-study.html', file: 'bizznex-case-study.html', type: 'text/html; charset=utf-8',
    rewrite: (h) => h.replace('src="image.png"', 'src="/brand/reference.png"') },
  // the adopted logo and the two earlier explorations
  { url: '/brand/skyline.html', file: 'design-style-guides/bizznex-identity-skyline.html', type: 'text/html; charset=utf-8',
    rewrite: (h) => h.replace('src="../image.png"', 'src="reference.png"') },
  { url: '/brand/identity.html', file: 'design-style-guides/bizznex-identity.html', type: 'text/html; charset=utf-8' },
  { url: '/brand/logo-options.html', file: 'design-style-guides/bizznex-logo-options.html', type: 'text/html; charset=utf-8' },
  { url: '/brand/reference.png', file: 'image.png', type: 'image/png' },
]

function designDocs(): Plugin {
  /** null when the document isn't there (e.g. a build context without it): the app still builds. */
  const read = (d: (typeof DOCS)[number]) => {
    const file = path.join(root, d.file)
    if (!fs.existsSync(file)) return null
    const buf = fs.readFileSync(file)
    return d.rewrite ? d.rewrite(buf.toString('utf8')) : buf
  }
  return {
    name: 'bizznex-design-docs',
    configureServer(server) {
      for (const d of DOCS) {
        server.middlewares.use(d.url, (_req, res) => {
          const body = read(d)
          res.statusCode = body ? 200 : 404
          res.setHeader('Content-Type', body ? d.type : 'text/plain')
          res.end(body ?? `${d.file} not found`)
        })
      }
    },
    generateBundle() {
      for (const d of DOCS) {
        const source = read(d)
        if (source) this.emitFile({ type: 'asset', fileName: d.url.slice(1), source })
        else this.warn(`design doc ${d.file} not found; ${d.url} will 404`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designDocs()],
  resolve: {
    alias: {
      '@bizznex/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 3005,
  },
  build: {
    rollupOptions: {
      output: {
        // vendor code changes rarely: separate chunks stay cached across app releases
        manualChunks: {
          react: ['react', 'react-dom'],
          state: ['@reduxjs/toolkit', 'react-redux'],
          intl: ['react-intl'],
        },
      },
    },
  },
})

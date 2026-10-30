import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const root = path.resolve(__dirname, '../..')

/** Standalone design documents that live outside apps/web, served at fixed URLs (dev) and shipped
 *  with the build, so the app links to the one canonical copy of each instead of duplicating it. */
/** The case study's transitions player gets the app's timings, so it can't drift from them
 *  (its in-file copy is only the fallback for opening it from disk; designDrift.test.ts checks it). */
const caseStudyTiming = (html: string) => {
  const t = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/ui/transition-timing.json'), 'utf8')) as Record<string, { in: number; hold: number; out: number }>;
  const arr = (k: string) => `[${t[k].in}, ${t[k].hold}, ${t[k].out}]`;
  return html.replace(/var TIMING = \{[^}]*\};/, `var TIMING = { skyline: ${arr('skyline')}, aurora: ${arr('aurora')}, compact: ${arr('compact')}, calm: ${arr('calm')} };`);
};

const DOCS: { url: string; file: string; type: string; rewrite?: (html: string) => string }[] = [
  { url: '/case-study.html', file: 'bizznex-case-study.html', type: 'text/html; charset=utf-8',
    rewrite: (h) => caseStudyTiming(h.replace('src="image.png"', 'src="/brand/reference.png"')) },
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

/** The app's Content-Security-Policy, shipped as a <meta> in the built index.html so it holds on
 *  any host (nginx, a static host) without per-host header rules. Inline scripts are allowed by
 *  sha256, computed here from the final HTML, so editing the theme script needs no hash upkeep.
 *  connect-src: the API is a separate origin baked in at build time (VITE_API_URL), so any https
 *  origin is allowed, plus localhost for docker compose. img-src: company logos from the business
 *  lookup (Wikimedia Commons). frame-ancestors can't be set from a <meta>; hosts send
 *  X-Frame-Options: DENY instead. Build only: the dev server injects its own inline scripts. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'bizznex-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
          .filter((m) => m[1].trim()) // an empty inline script needs no hash
          .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`)
        const policy = [
          "default-src 'self'",
          ['script-src', "'self'", ...hashes].join(' '),
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://commons.wikimedia.org https://upload.wikimedia.org",
          "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designDocs(), contentSecurityPolicy()],
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

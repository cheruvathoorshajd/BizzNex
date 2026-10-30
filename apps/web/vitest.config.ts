import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@bizznex/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**'], // e2e/ is Playwright's (npm run test:e2e)
  },
})

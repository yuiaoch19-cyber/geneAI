import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Pure algorithm tests run in Node so they do not need the Playwright browser
 * fixture used by the component tests in vite.config.ts.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/dna.test.ts'],
  },
})

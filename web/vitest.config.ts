import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Separate from vite.config.ts (dev/build) so tests skip the Tailwind
// plugin entirely — jsdom never renders CSS, and Tailwind's Vite plugin
// adds nothing but overhead to a test run. Mirrors backend/vitest.config.ts's
// own choice to keep the test runner's config independent of the app's.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // apiClient.ts reads import.meta.env.VITE_API_URL at module-eval time.
  // Defining it here (rather than via a `.env.test` file) keeps the test
  // suite self-contained: `.env*` is gitignored repo-wide, so a dotenv
  // file wouldn't exist in CI and every apiClient-dependent test would
  // silently hit `undefined/...` instead of the mocked base URL.
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://test.local/api/v1'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: false,
  },
})

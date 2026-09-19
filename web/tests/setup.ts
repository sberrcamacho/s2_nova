import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'
import { apiClient } from '@/lib/apiClient'
import { resetCategoryCache } from '@/lib/backendCategories'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  // Module-level state that would otherwise leak between test files sharing
  // the same Vitest worker — same reasoning as backend/tests/setup.ts
  // truncating tables between tests.
  apiClient.setAccessToken(null)
  resetCategoryCache()
})

afterAll(() => server.close())

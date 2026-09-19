import { setupServer } from 'msw/node'

// Individual test files register their own handlers via `server.use(...)` —
// there's no shared default handler set, since almost every suite needs a
// different response shape for the same endpoints (e.g. authService vs.
// AuthContext restore-on-mount both hit /auth/refresh + /me differently).
export const server = setupServer()

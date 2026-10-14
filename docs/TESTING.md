# S2 Nova — Testing

S2 Nova handles real money, so the three suites run before any push
(backend, Web, Android). Passing one of them, or building the app, says
nothing about the other two.

Last full run, 2026-10-13: backend 229, Web 208 and Android 72 unit tests,
all passing.

## Running

```bash
cd backend
docker compose up -d   # Postgres; the suite creates, migrates and seeds s2nova_test
pnpm test              # watch: pnpm test:watch

cd web
pnpm test              # jsdom + MSW; no backend or network
pnpm typecheck

cd android
./gradlew testDebugUnitTest   # JVM unit tests; no emulator
```

CI (`.github/workflows/backend-ci.yml`, `web-ci.yml`, `android-ci.yml`)
runs each app's suite on pushes and pull requests that touch it. The
deploys (`deploy.yml`, Render) don't wait for CI.

## Backend (`backend/tests/`)

- Vitest against the real Fastify app through `app.inject()`
  (`tests/helpers/app.ts` wraps `buildApp()`) and a real Postgres
  database, `s2nova_test`. This is integration testing of route → Zod →
  Prisma → Postgres, not mocked Prisma.
- `tests/globalSetup.ts` creates the database, applies the migrations and
  seeds the categories once per run. `tests/setup.ts` truncates tables
  between tests. Files run one at a time (`fileParallelism: false`)
  because they share the database.
- Helpers: `tests/helpers/testUser.ts` (`createTestUser`, `authHeader`:
  a real user and access token, bypassing the register rate limit) and
  `tests/helpers/factories.ts` (`categoryBySlug`, `createAccount`).
- Money rules are tested at the route level. For example,
  `routes/goals.spec.ts` covers the goal cap (422
  `GOAL_EXCEEDS_REMAINING`), concurrent and idempotent Abonar, and the
  capped plan contributions.

## Web (`web/tests/`)

- Vitest, Testing Library and jsdom; `web/vitest.config.ts` is separate
  from `vite.config.ts`.
- MSW (`msw/node`) answers every `fetch()`; each test registers its own
  handlers with `server.use(...)`. `VITE_API_URL` is defined in the config
  (`http://test.local/api/v1`) because `.env*` files are gitignored.
- `tests/setup.ts` resets handlers, the access token and the category
  cache after each test.
- `tests/utils/renderApp.tsx` provides `renderApp()` (router, theme,
  toast, auth, app data) and `mockSession()` (a signed-in user plus empty
  lists).
- `tests/unit/guestApi.spec.ts` runs the guest mirror through the real
  services, so it checks that guest mode follows the backend's rules
  (balances, budgets, the goal cap) without the network.

## Android (`android/app/src/test/`)

- JUnit4, kotlinx-coroutines-test, MockWebServer and `kotlin.test`; no
  Robolectric or Espresso.
- Every network-backed repository takes `api: ApiService = ApiClient.api`,
  so tests pass a MockWebServer-backed `ApiService`
  (`MockWebServer.apiService()` in `testutil/MockApiService.kt`). `AuthRepository` needs a real `SessionStore`
  (Android `Context`), so only its pure mappers are tested.
- Pure logic is tested directly: overdraft, Inicio figures, splash
  routing (`splashDestinationFor()`), recurring dates, the guest seed, and
  DTO mappers widened to `internal`.

## Writing tests

- Never depend on the day the suite runs: pass `today`, fake the clock
  (`vi.setSystemTime`) or build dates relative to a fixed one. A test that
  hard-codes the current month breaks when the month changes.
- A fixed bug gets a regression test that fails without the fix.
- A business rule shared by both clients is tested in the backend, plus
  the guest mirrors when they reimplement it.

## Not covered

- No end-to-end browser tests (Playwright) and no Android UI tests
  (Compose/Espresso). Visual checks follow the screenshot loop in
  `CLAUDE.md`.
- `AuthRepository`'s network flow on Android (it needs Robolectric).
- No load or security scanning.

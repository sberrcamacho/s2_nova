# S2 Nova — Testing

S2 Nova handles real money (transactions, budgets, goals, loans, recurring
series) across two independently-built clients sharing one backend. This
document tracks the QA pass adding automated tests to the project, phase by
phase: **Backend → Web → Android**. Each phase is a full
audit → test-infra → test → fix → regress cycle before moving to the next.

Status key: **PASS** (implemented and green), **NOT RUN** (not started —
never claim NOT RUN work as passing).

## Current status (2026-09-26, after the v2 taxonomy/multi-currency work)

The phase write-ups below describe the original QA pass; their per-file
counts predate v2. Since then:

- **Web**: `cd web && pnpm test` — 118 tests in 22 files, **14 failing**
  in 7 files (`forms/NewTransactionPanel`, `pages/AjustesPage`,
  `pages/InicioPage`, `pages/ReportesPage`, `services/userService`,
  `unit/currency`, `unit/backendCategories`). They use fixtures and
  expectations written before the v2 data layer (pre-taxonomy category
  ids like `'other'`, the old COP/USD currency switch) and need rewriting
  against the taxonomy ids and `lib/currency.ts`'s `fmtCur` format; check
  each one before assuming its screen is fine. `pages/PlanesPage` covers
  the v2 Planes modals (budgets, goals, loans, abonos) and passes.
- **Backend**: v2 added `tests/routes/v2.spec.ts` (taxonomy, currencies,
  scheduled/repeating movements, custom budgets, goal plans); the counts in
  Phase 1 were not re-taken.
- **Android**: unchanged since Phase 3.

## Phase 1 — Backend: PASS

### Test infrastructure

- **Vitest**, run via `cd backend && pnpm test` (watch mode: `pnpm test:watch`).
- Every test hits the real Fastify app through `app.inject()` (`tests/helpers/app.ts`,
  wrapping `buildApp()` from `src/app.ts` — split out from `src/server.ts`
  precisely so tests can build a fully-wired instance without binding a
  port) — this is an **integration suite against a real Postgres database**
  (`s2nova_test`), not mocked-Prisma unit tests, exercising the actual
  route → Zod → Prisma → Postgres path.
- `tests/globalSetup.ts` creates the `s2nova_test` database (on the same
  Postgres container `docker compose up -d` starts for local dev),
  applies every migration, and seeds the global categories — once per test
  run.
- `tests/setup.ts` truncates the relevant tables between individual tests
  so cases never leak state into each other.
- Test helpers: `tests/helpers/testUser.ts` (`createTestUser`/`authHeader` —
  creates a real user directly via Prisma and mints a real access token,
  bypassing `/auth/register`'s rate limit), `tests/helpers/factories.ts`
  (`categoryBySlug`, `createAccount`).
- `fileParallelism: false` in `vitest.config.ts` — every test file shares
  one physical test database, so files run sequentially to avoid stomping
  on each other's data.
- **CI**: `.github/workflows/backend-ci.yml` (new) — runs on push/PR
  touching `backend/**`, separate from `deploy.yml` (which only builds/
  deploys `web/`). Starts Postgres via the repo's own
  `docker compose up -d` (so `globalSetup.ts`'s `docker compose exec`
  call works unmodified), then `pnpm typecheck` + `pnpm test`. **This
  workflow has not been run for real in this session** — GitHub Actions
  can't be triggered from here, so treat its first real run as the actual
  verification and fix anything environment-specific that only shows up
  there (see "Known gaps" below).

### Suites (`cd backend && pnpm test` — 143 tests, 10 files, all passing)

| File | Tests | Covers |
|---|---|---|
| `tests/routes/auth.spec.ts` | 24 | register, login, Google Sign-In (mocked `verifyGoogleIdToken`), refresh rotation + reuse-detection, logout, rate limiting |
| `tests/routes/me.spec.ts` | 17 | `GET/PATCH /me`, `POST /me/password`, `POST /me/verify-password`, preferences |
| `tests/routes/accounts.spec.ts` | 10 | wallet CRUD, delete-with-reassignment |
| `tests/routes/transactions.spec.ts` | 28 | income/expense/transfer creation, update, delete, settle-loan (full + partial + concurrency), filters |
| `tests/routes/budgets.spec.ts` | 18 | CRUD, duplicate rejection, status thresholds, 50/30/20 recommendations |
| `tests/routes/goals.spec.ts` | 12 | CRUD, progress computation, delete-with-return-to-account |
| `tests/routes/recurringSeries.spec.ts` | 17 | CRUD, confirm/materialize, paused-series rejection, month-rollover |
| `tests/routes/categories.spec.ts` | 2 | seeded categories + subcategories |
| `tests/routes/health.spec.ts` | 2 | liveness + DB round-trip |
| `tests/unit/dates.spec.ts` | 13 | `addInterval` (pure function, no DB) |

Pure-function unit tests (`allocateByPercentage` in `budgets.ts`,
`paymentMethodForAccountType` in `transactions.ts`) are covered through
their route's integration tests above rather than separate unit test
files, consistent with `vitest.config.ts`'s own stated approach (real
Postgres, not mocked units) — `allocateByPercentage`'s exact-sum property
is asserted directly in `budgets.spec.ts`, and every account-type →
payment-method mapping is exercised across the transaction/recurring-series
suites.

### Bugs found and fixed, each with its regression test

1. **`dates.ts`'s `addInterval` month/day rollover** (Jan 31 → drifted to
   Mar 3 instead of Feb 28/29) — fixed by clamping to the target month's
   last valid day. Test: `tests/unit/dates.spec.ts` (pure function) +
   `tests/routes/recurringSeries.spec.ts`'s "clamps to the last valid day
   of the month..." (end-to-end through `/confirm`).
2. **TRANSFER cross-field validation on update** — superseded during
   development: `updateTransactionSchema` no longer accepts
   `transferToAccountId` at all (it's immutable after creation), and a
   manual check rejects patching `accountId` to equal the transfer's own
   `transferToAccountId`. Test: `tests/routes/transactions.spec.ts`'s
   "rejects patching a TRANSFER's accountId...".
3. **Budget recommendations' `!== 100` float equality check** rejected
   mathematically-valid splits (e.g. 33.33/33.33/33.34) — fixed with an
   epsilon comparison. Test: `tests/routes/budgets.spec.ts`'s "accepts a
   split whose floats sum to ~100...".
4. **Budget recommendation amounts not reconciling to `monthlyIncome`** —
   three independent `Math.round`s could under/overshoot the total; fixed
   with `allocateByPercentage`, a largest-remainder allocation. Test:
   `tests/routes/budgets.spec.ts`'s "returns needs/wants/savings amounts
   that sum exactly...".
5. **Duplicate-budget double-counting** — nothing stopped two `Budget`
   rows for the same category/month, both counting the same unlinked
   transactions; fixed by rejecting the duplicate in `POST /budgets`.
   Test: `tests/routes/budgets.spec.ts`'s "rejects creating a second
   budget...".
6. **`settle-loan` on a never-disbursed (`PLANNED`) loan** — fixed by
   requiring `status === "COMPLETED"` before settling. Test:
   `tests/routes/transactions.spec.ts`'s "rejects settling a loan that's
   still PLANNED...".
7. **`settle-loan` TOCTOU race** — two concurrent settlements could both
   read the same `paidSoFar` and jointly overpay; fixed with a
   `SELECT ... FOR UPDATE` row lock inside the transaction (this also
   became the basis for a bigger, intentional feature: partial loan
   settlements via `parentLoanId`, not just a bug fix). Test:
   `tests/routes/transactions.spec.ts`'s "does not allow two concurrent
   partial settlements...".
8. **No cross-field validation between `type` and `loanKind`** at
   transaction creation — fixed with a `.refine()` requiring
   LENT↔EXPENSE / BORROWED↔INCOME. Test:
   `tests/routes/transactions.spec.ts`'s "rejects a loanKind that doesn't
   match its required transaction type" (both directions).
9. **`dateOnly`/`monthKeySchema` regexes accepted calendar-invalid dates**
   (`2026-02-30`) that then silently rolled over — fixed with
   `lib/validation.ts`'s shared `dateOnlySchema`/`monthKeySchema`, which
   round-trip the parsed date and reject overflow. Test:
   `tests/routes/transactions.spec.ts`'s "rejects a syntactically-valid
   but calendar-invalid date...".
10. **Refresh-token reuse had no session-family revocation** — replaying
    an already-revoked refresh token just 401'd without revoking the
    user's other active sessions, so a stolen-and-already-used token gave
    no reason to stop trying and a genuine hijack left the victim's other
    sessions untouched. Fixed in `auth.ts`'s `POST /auth/refresh`: reusing
    a revoked (not just expired) token now revokes every other active
    refresh token for that user (standard rotation-reuse-detection
    mitigation). Test: `tests/routes/auth.spec.ts`'s "revokes every other
    active session when a revoked refresh token is reused" — also updated
    the pre-existing rotation test, since a token legitimately rotated
    from a since-reused token is now correctly revoked too, not usable.

### Findings documented only, not changed (explicit product/design decisions)

- Goal progress counts every linked transaction type — correct today
  because Android's own "Abonar" contribution flow creates an
  `EXPENSE`-type transaction to represent a contribution; there's simply
  no "withdraw from goal" feature yet, so this isn't a bug in isolation.
- `Account.type` changes not propagating to existing transactions'/series'
  `paymentMethod` — historical record, plausibly intentional.
- Dead `Budget.endDate` column, unimplemented `GET/POST /products*`,
  fixed FX rate (COP has no subunit, explicit in `ARCHITECTURE.md`).
- `JWT_SECRET` minimum length (16 chars) is on the weak side for a
  production secret, flagged here rather than silently changed since it
  may break an already-deployed secret.

### Known gaps in this phase

- The new `backend-ci.yml` workflow has not actually run on GitHub yet —
  verify the first real run and fix anything that only surfaces there
  (Docker availability/timing on the runner, etc.).
- No OpenAPI docs generated from the Zod schemas yet (pre-existing gap,
  unrelated to this QA pass).

## Phase 2 — Web (`web/`): PASS at the time (see Current status)

### Test infrastructure

- **Vitest** + **@testing-library/react** + **jsdom**, run via
  `cd web && pnpm test` (watch mode: `pnpm test:watch`). Configured in its
  own `web/vitest.config.ts` (separate from `vite.config.ts`, same reason
  `backend/vitest.config.ts` is separate: the app's Tailwind Vite plugin
  adds nothing to a jsdom test run).
- **MSW** (`msw/node`'s `setupServer`) intercepts every `fetch()` call —
  no real backend or network access needed to run the suite. Each test
  file registers its own handlers via `server.use(...)` rather than a
  shared default set, since almost every suite needs a different response
  shape for the same endpoints.
- `web/vitest.config.ts` defines `import.meta.env.VITE_API_URL` directly
  (`http://test.local/api/v1`) rather than via a `.env.test` file — `.env*`
  is gitignored repo-wide, so a dotenv file wouldn't exist in CI and every
  `apiClient`-dependent test would silently hit `undefined/...` instead of
  the mocked base URL.
- `web/tests/setup.ts`: starts the MSW server once, resets its handlers
  and clears `apiClient`'s access token + the category cache after every
  test (module-level state that would otherwise leak between tests in the
  same file, same reasoning as `backend/tests/setup.ts` truncating
  tables), and closes the server at the end.
- `web/tests/utils/render.tsx`: `renderWithProviders()` wraps a component
  in `MemoryRouter` + `ThemeProvider` + `ToastProvider` + `AuthProvider`
  (no `AppDataProvider` — only Overview/Transactions need it, neither of
  which is under test here).
- **CI**: `.github/workflows/web-ci.yml` (new) — runs on push/PR touching
  `web/**`, separate from `deploy.yml` (which only deploys on push to
  `main` and runs no tests). Installs, typechecks, runs `pnpm test`, then
  `pnpm build`. **Not run for real in this session** — same caveat as
  `backend-ci.yml`: verify its first real GitHub Actions run.

### Suites (`cd web && pnpm test` — 89 tests, 15 files, all passing)

| File | Tests | Covers |
|---|---|---|
| `tests/unit/currency.spec.ts` | 11 | `formatCOP`/`formatUSD`/compact variants, rounding, signed prefixes |
| `tests/unit/apiClient.spec.ts` | 10 | base URL, Bearer header, error-message mapping, 204 handling, 401 refresh-and-retry, concurrent-refresh de-dup, refresh-failure and `/auth/refresh`-itself-401 edge cases, `skipAuthRetry` |
| `tests/unit/backendCategories.spec.ts` | 4 | slug↔id caching, unknown-id→'other' fallback, unknown-slug throw, cache-wedge regression |
| `tests/services/authService.spec.ts` | 6 | login/register/Google session completion, `skipAuthRetry` on auth's own 401, logout swallowing failures |
| `tests/services/userService.spec.ts` | 6 | `mapMeResponse` full/defaulted preferences + avatar initials, `updatePreferences` partial-patch + no-op skip, `changePassword`, `getCurrentUser` |
| `tests/services/transactionService.spec.ts` | 6 | wire-shape casing mapping, `addTransaction` uppercasing + category resolution, client-side paymentMethod filter, `_snapshot` cache semantics, date-range query building |
| `tests/services/analyticsService.spec.ts` | 8 | monthly summary/history, category breakdown percentages, weekly buckets, savings trend accumulation, period comparison (null baseline, real pct, year-boundary) |
| `tests/services/insightsService.spec.ts` | 13 | `getInsights` (budgetPace, subscriptions, categorySpike, goalTarget, upcomingExpenses) and `getFinancialHealth` (savings/budget/debt/goals status thresholds) |
| `tests/services/readOnlyServices.spec.ts` | 5 | `accountService`/`goalService`/`budgetService`/`recurringService` wire-shape mapping and casing |
| `tests/state/AuthContext.spec.tsx` | 5 | session restore-on-mount (success/failure), `updateUser` shallow merge, logout-despite-backend-failure, login error surfacing |
| `tests/state/AppDataContext.spec.tsx` | 3 | signed-out no-op, load-on-auth, clear-on-logout |
| `tests/components/CategoryIcon.spec.tsx` | 3 | every seeded category resolves a real icon (regression guard), renders, unknown-category fallback |
| `tests/forms/LoginPage.spec.tsx` | 2 | client-side validation blocks submission, backend error surfaced |
| `tests/forms/RegisterPage.spec.tsx` | 4 | password/email/terms validation, happy path |
| `tests/forms/SettingsPage.spec.tsx` | 3 | ChangePasswordModal validation regression, notifications-toggle revert-on-failure regression |

### Bugs found and fixed, each with its regression test

1. **`useTranslation.ts`'s `setLanguage`** only updated local state via
   `updateUser`, never called `userService.updatePreferences({ language })`
   — the language choice was silently lost on the next session restore.
   Fixed by persisting it the same way `useCurrency.setCurrency` already
   did. Not directly regression-tested at the hook level (no test renders
   a component that both changes language and remounts to observe the
   loss) — the fix mirrors `useCurrency`'s already-tested pattern
   one-for-one.
2. **`backendCategories.ts`'s `load()` cached a rejected promise forever**
   on first failure, permanently breaking category mapping for the rest
   of the session. Fixed by clearing the cache in a `.catch()` before
   rethrowing, so the next call retries instead of replaying the same
   rejection. Test: `tests/unit/backendCategories.spec.ts`'s "does not
   wedge the cache forever after a failed first fetch (regression)".
3. **`TransactionsPage.tsx` always rendered a "Completed" badge**
   regardless of the transaction's actual `status`. Fixed to render
   "Próximo"/"Upcoming" for `status === 'planned'` (added the
   `txn.statusPlanned` translation key). Not covered by a component
   render test (`TransactionsPage` needs `AppDataProvider` + seeded
   transaction data — judged not worth the setup weight for a one-line
   conditional); verified by direct code inspection instead.
4. **Fire-and-forget preference updates** (`useCurrency.setCurrency`,
   `SettingsPage`'s theme/notifications/hide-amounts toggles) never caught
   a failed `PATCH` — the UI kept the optimistic value even when the save
   failed, silently. Fixed by catching, reverting the optimistic state,
   and toasting an error, matching the pattern the password-change/
   profile-save flows already used. Test:
   `tests/forms/SettingsPage.spec.tsx`'s "reverts the optimistic
   'notifications' toggle when the backend PATCH fails" (the
   `hideAmounts` toggle turned out to have no backend field at all — see
   `userService.updatePreferences`'s doc comment — so it can never
   exercise this failure path; `notifications` does).
5. **`ChangePasswordModal`'s new-password validation** (`minLength=6`
   only) was weaker than Register's policy (8+ chars, 1 uppercase,
   1 digit) for the same account. Fixed by adding the identical check
   before submission and raising `minLength` to 8. Test:
   `tests/forms/SettingsPage.spec.tsx`'s "rejects a new password under 8
   characters..." and "accepts a password meeting Register's own policy".

### Findings documented only, not changed (explicit product/design decisions)

- `AnalyticsPage`'s three independently-scoped date ranges on one page —
  a real product-level inconsistency, but which scope should "win" is a
  design call, not a bug fix to invent.
- Reports/Settings' intentional "Coming soon"/simulated stubs (active
  sessions management, data export, account deletion).
- `productService.ts` being dead code — out of scope to delete during a
  QA pass.
- The "remember me" checkbox (Login) being a functional no-op, and the
  "forgot password" button being an inert pre-launch placeholder.

### Known gaps in this phase

- The new `web-ci.yml` workflow has not actually run on GitHub yet —
  verify the first real run.
- No Playwright e2e coverage — was explicitly stretch scope in the
  original plan and wasn't reached.
- No component-level render test for the `TransactionsPage` status-badge
  fix or the `useTranslation.setLanguage` persistence fix (see bugs 1 and
  3 above) — both were judged correct by code inspection and by the
  already-tested pattern they now mirror, rather than adding a new
  provider-heavy render test for a one-line change.
- No manual browser smoke test was possible in this (headless, background)
  session — verification here is `pnpm test` (89/89), `pnpm typecheck`
  (clean), and `pnpm build` (succeeds) only. A future session with browser
  access should still click through login, one dashboard page, and the
  settings language-persistence fix per the original plan's exit
  criteria.

## Phase 3 — Android (`android/`), JVM-only: PASS

Before writing anything, the Android codebase was re-audited against the
original plan, since a large amount of unrelated, uncommitted feature work
(subcategories, `PlanesScreen`, `GoalPaySheet`, `AppLockGate`, etc.) had
landed in `android/` since the plan was written. All four originally-listed
bugs were confirmed still present against the current code before fixing
them; nothing else in that in-flight feature work was touched.

### Test infrastructure

- **JUnit4** + **kotlinx-coroutines-test** + **Turbine** (added but not
  yet needed by name — no `StateFlow`-sequence assertions turned out to
  need it beyond what `.value` snapshots already covered) + **MockWebServer**
  + `kotlin.test` assertions, added as `testImplementation` deps in
  `app/build.gradle.kts` (versions pinned in `gradle/libs.versions.toml`).
  Run via `cd android && ./gradlew test` (both `testDebugUnitTest` and
  `testReleaseUnitTest`). No Robolectric/Espresso — no emulator in this
  environment, matching the plan's own scoping.
- **Testability seam, not a DI framework**: every network-backed repository
  (`GoalRepository`, `WalletRepository`, `TransactionRepository`,
  `BudgetRepository`, `RecurringSeriesRepository`, `CategoryRepository`)
  gained a constructor parameter `api: ApiService = ApiClient.api` —
  defaults to the real singleton, so every production call site
  (`AppContainer`) is unchanged, while tests pass a `MockWebServer`-backed
  `ApiService` instead. This is a plain default-argument, not Hilt or a
  ViewModel — `android/AGENTS.md`'s "no DI framework" rule is unaffected.
  `AuthRepository` was **not** given this treatment: its constructor also
  requires a concrete `SessionStore`, whose factory (`SessionStore
  .getInstance(context)`) needs a real Android `Context` to build its
  DataStore file — genuinely not constructible in a pure JVM test without
  Robolectric, which is out of scope this pass (see "Known gaps" below).
  Its pure `MeResponse.toUser()` mapping function (previously
  file-`private`, now `internal`) is tested directly instead, since it
  needs neither `SessionStore` nor the network.
- A few `private fun ...toX()` DTO mappers were widened to `internal` (no
  behavior change) so tests in the same Gradle module can call them
  directly instead of only indirectly through a repository.
- The Compose-Navigation splash routing decision (`loggedIn`/
  `onboardingDone` → destination) was extracted out of
  `LaunchedSplashNavigation`'s suspend body into a pure top-level function,
  `splashDestinationFor()` (`ui/nav/NovaNavGraph.kt`), so it's unit-testable
  without a `NavController` — behavior is unchanged, just relocated.
- **CI**: `.github/workflows/android-ci.yml` (new) — runs on push/PR
  touching `android/**`, separate from `deploy.yml`/`backend-ci.yml`/
  `web-ci.yml`. `./gradlew test` then `./gradlew assembleDebug`, both run
  and passing locally in this session; **the workflow itself has not run
  on GitHub yet** — same caveat as the other two CI workflows.

### Suites (`cd android && ./gradlew test` — 36 tests, 11 files, all passing)

| File | Tests | Covers |
|---|---|---|
| `data/CurrencyUtilsTest.kt` | 5 | `formatCOP` grouping/rounding/signed prefix, `formatUSD` fixed-rate conversion, `formatCurrency` dispatch |
| `ui/ThousandsGroupingVisualTransformationTest.kt` | 3 | thousands grouping, empty input, cursor offset mapping across an inserted separator |
| `data/AnalyticsHelpersTest.kt` | 4 | `monthlyHistory`/`categoryBreakdown`/`weeklySpending`/`savingsTrend` all exclude `PLANNED` transactions (bug #2 regression) |
| `data/repository/GoalRepositoryTest.kt` | 3 | `refresh()` carries `percentage`/`remaining` through untouched (bug #1 regression), `create()` mapping, demo-mode no-op |
| `data/repository/WalletRepositoryTest.kt` | 3 | balance/type mapping, unrecognized `WalletType` falls back to `OTHER`, demo-mode no-op |
| `data/repository/TransactionRepositoryTest.kt` | 4 | DTO→domain mapping via the category bridge, unknown-category silent-drop (existing, documented behavior), `paidSoFar`/`outstandingFor` pure logic, demo-mode no-op |
| `data/repository/BudgetRepositoryTest.kt` | 2 | server-computed spent/remaining/percentage/status passthrough, demo-mode no-op |
| `data/repository/RecurringSeriesRepositoryTest.kt` | 2 | derived `paymentMethod`/`interval` mapping, demo-mode no-op |
| `data/repository/CategoryRepositoryTest.kt` | 3 | every `CategoryId` enum value resolves to a backend-seeded slug (regression guard against the silent-drop bug), `backendIdFor`/`categoryIdForBackendId` inverse, `subcategoriesFor` parent-matching |
| `data/repository/AuthMappingTest.kt` | 4 | `MeResponse.toUser()` full mapping, all-preferences-absent defaulting, unrecognized currency/language fallback, avatar-initials derivation |
| `ui/nav/NovaNavGraphTest.kt` | 3 | `splashDestinationFor()`'s three routing outcomes (not logged in / logged in but not onboarded / fully in) |

### Bugs found and fixed, each with its regression test

1. **`GoalRepository.toGoal()` discarded the backend's own rounded
   `percentage`/`remaining`**, forcing `GoalsScreen` and
   `NotificationRepository` to each recompute a truncated percentage
   client-side from `currentAmount`/`targetAmount` — contradicting the
   project's own rule that progress is server-computed, never recomputed
   client-side (already followed correctly for budgets). Fixed by adding
   both fields to the `Goal` model, mapping them through in `toGoal()`,
   and switching both call sites to read `goal.percentage`/`goal.remaining`
   directly. Test: `GoalRepositoryTest`'s "refresh carries the backend's
   percentage and remaining through untouched" (uses `percentage = 999`,
   a value a naive client recompute could never produce, to prove it's
   passthrough and not a recalculation).
2. **`HomeScreen`'s hero balance and every `AnalyticsHelpers.kt` aggregate
   summed `PLANNED` ("Upcoming") transactions**, contradicting
   `TransactionStatus`'s own documented semantics ("don't move money
   yet"). Fixed `HomeScreen` to sum `wallets.currentBalance` instead of
   re-deriving a balance from the transaction list (the backend already
   excludes `PLANNED` effects there), and added a `completedOnly()` filter
   inside `AnalyticsHelpers` applied before every aggregation. Test:
   `AnalyticsHelpersTest`'s four cases, each asserting a `PLANNED`
   transaction is excluded from income/expenses, category breakdown,
   weekly buckets, and the savings trend.
3. **`LoansScreen.kt`'s `outstanding.toInt().toString()`** (three call
   sites: the edit-draft prefill, the payment sheet's initial amount, and
   its "pay in full" shortcut) truncated a `Double` through `Int`,
   overflowing silently above ~2.1B COP. Fixed by using `.toLong()`
   instead — Android has no automated test harness for this specific
   overflow without a Compose UI test (the bug lives in a
   `remember { mutableStateOf(...) }` initializer), so this is verified
   by code inspection and the type change itself rather than a dedicated
   unit test; `GoalsScreen.kt` has an analogous `targetAmount.toInt()
   .toString()` left untouched — same overflow class, but outside this
   bug's stated scope (see "documented only" below).
4. **`AndroidManifest.xml`'s `allowBackup="true"` had no exclusion
   rules**, risking the plaintext refresh-token `SessionStore` DataStore
   file ending up in Android Auto Backup or a device-to-device transfer.
   Fixed with a new `res/xml/data_extraction_rules.xml` (the minSdk-31+
   backup mechanism — no legacy `fullBackupContent` needed) excluding
   `datastore/s2nova_session.preferences_pb` from both cloud backup and
   device transfer, wired up via `android:dataExtractionRules`. Not
   unit-testable (it's manifest/OS-level backup behavior); verified by
   `./gradlew assembleDebug` succeeding with the new manifest attribute
   and resource in place.

### Findings documented only, not changed (explicit product/design or environment-scope decisions)

- `GoalsScreen.kt`'s `goal.targetAmount.toInt().toString()` prefill has
  the same `Int`-truncation shape as bug #3 above, but on a goal's target
  amount rather than a loan's outstanding balance — left as-is since it
  wasn't in the plan's stated bug list; flagged here for a future pass.
- The 200-row transaction fetch cap (`ApiService.getTransactions`'
  `limit = 200` default) silently truncates Home/Reports aggregates for a
  high-volume user — a real gap, but a full pagination rework is a
  feature change, not a bug fix to invent here.
- `AppContainer`/`ApiClient` init-ordering (repositories are constructed
  as `object` property initializers before `AppContainer.init(context)`
  ever runs, relying on `ApiClient.api`'s `by lazy` to defer the actual
  `Context` access) is fragile in the sense that a repository's default
  `ApiService` argument is only evaluated *when a method is called*, not
  at construction — today's actual behavior, not restructured.

### Known gaps in this phase

- The new `android-ci.yml` workflow has not actually run on GitHub yet —
  verify the first real run (in particular, whether the runner's
  preinstalled Android SDK already has `compileSdk 36` or needs AGP's
  auto-download path, which requires pre-accepted licenses).
- `AuthRepository`'s network-calling methods (`login`, `register`,
  `loginWithGoogle`, `bootstrap`, `logout`, and the several methods that
  only touch `ApiClient.api` but still require a real `SessionStore`
  instance to construct the repository at all) are **not unit-tested** —
  `SessionStore`'s factory needs a real Android `Context`, which no JVM
  test in this pass can provide without Robolectric (explicitly out of
  scope, see `android/AGENTS.md`'s architecture notes and the original
  plan). Only its pure `MeResponse.toUser()` mapping is covered.
- No real Compose UI/instrumented tests (navigation, process-death
  recovery, the `AppLockGate` timeout challenge) — explicitly deferred per
  the original plan; run via `./gradlew connectedAndroidTest` once a
  device/emulator is available.
- No manual on-device/emulator smoke test was possible in this headless,
  background session — verification here is `./gradlew test` (36/36) and
  `./gradlew assembleDebug` (succeeds) only.

## Running the suite

```
cd backend
docker compose up -d      # Postgres, if not already running
pnpm install
pnpm test                 # creates/migrates/seeds s2nova_test automatically
```

```
cd web
pnpm install
pnpm test                 # jsdom + MSW, no backend or network needed
```

```
cd android
./gradlew test             # JVM unit tests only, no emulator needed
./gradlew assembleDebug    # confirms the app still builds
```

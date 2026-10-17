# S2 Nova — Backend & Sync Architecture

How S2 Nova's two clients share one backend, one database and one user
identity. `backend/prisma/schema.prisma` is the source of truth for the
exact schema and `backend/src/routes/` for the exact API; this document
keeps the design and the rules behind them. How each client is built is
in `android/AGENTS.md` and `web/AGENTS.md`. The backend runs on Render +
Aiven for PostgreSQL (§16).

Neither client merges with the other: Android stays Kotlin + Compose, Web
stays React + TS + Vite.

## 1. Backend technology

**Node.js + TypeScript + Fastify.**

- Same language as `web/`, so the one engineer working across this repo
  isn't context-switching runtimes. (Kotlin stays Android-only — a
  Kotlin backend was considered but rejected: it would fragment the
  toolchain without a matching benefit, since nothing here needs JVM
  performance characteristics.)
- Fastify over NestJS/Express: this repo's existing apps are deliberately
  light on framework ceremony (`web/AGENTS.md` — no Redux, no heavy
  abstractions; `android/AGENTS.md` — no DI framework yet). NestJS's
  decorator-heavy, module-graph style would be the first "large framework"
  in the repo with no precedent. Fastify gives schema validation, a plugin
  system, and good TS support without that jump. Express was rejected for
  lacking first-class TS/schema validation.
- Validation: **Zod**, schemas doubling as the request/response contract
  and (via `zod-to-openapi` later) the source for OpenAPI docs.

## 2. Database technology

**PostgreSQL.** Per the task brief's own preference and confirmed by
inspection: the domain is relational and FK-heavy by nature (a
transaction belongs to exactly one user, one account, one category,
optionally one product), needs real transactional integrity for balance
updates, and has no document-shaped or high-write-fanout access pattern
that would justify Firestore. Firestore was rejected — no denormalized
read pattern in this app benefits from it, and it would fight the
FK/constraint requirements in the brief.

**Prisma ORM** — TypeScript-native schema, generates a typed client,
first-class migration tooling (`prisma migrate`), good Fastify ecosystem
support. Alternative considered: Drizzle (lighter, more SQL-like) — a
reasonable choice too, but Prisma's migration workflow and studio/inspection
tooling are a better fit for a solo engineer standing up a schema from
scratch and iterating on it across 12 phases.

## 3. Authentication solution

**Self-issued JWT access tokens + rotating refresh tokens, argon2 password
hashing, provider-agnostic identity table.**

Rejected managed alternatives: Firebase Auth (would pull in Firebase SDKs
on both clients and a GCP dependency the rest of the stack doesn't share)
and Auth0/Clerk (recurring cost + external dependency for a project with
no backend yet at all). A self-issued JWT scheme is standard, well
understood, costs nothing to run, and — per the brief — must support
adding passkeys later without a redesign, which a normalized identity
table gives for free (see §4).

- Passwords: **argon2id** hash, never plaintext, never logged.
- Access token: short-lived (15 min) JWT, `Authorization: Bearer`.
- Refresh token: opaque random token, stored **hashed** server-side in
  `refresh_tokens`, rotated on every use (old token revoked, new one
  issued, atomically) — limits replay damage if one leaks. A login lasts
  at most 30 days however often it refreshes. Replaying a *rotated* token
  more than 30 s after its rotation is treated as theft and revokes every
  session of the user; within 30 s it's a client race and is just
  rejected. A token revoked by logout/"Cerrar sesión"/idle is simply
  rejected.
- Every access token carries its session (`sid`) and the auth plugin
  checks that session is still open on each request, so logout, closing a
  session, changing the password or idling out take effect immediately.
  Its 401s carry a `code`: `token_invalid` (refresh and retry),
  `session_ended` / `session_idle` (sign out); other 401s (a wrong current
  password) are the route's own answer and never trigger a refresh.
- "Cierre automático" (`autoLockMinutes`, 0 = never): a real logout after
  that long without the user touching the app. Both clients enforce it and
  report activity (`POST /auth/activity`, at most once a minute); the
  server ends a session idle longer than the setting + 1 min on its own
  (`lib/sessions.ts`), which covers a killed or offline client.
- Web: refresh token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie
  (never readable by JS, so an XSS can't exfiltrate it). Access token kept
  in memory only.
- Android: both tokens in DataStore, AES-GCM encrypted with a
  non-exportable Android Keystore key (`SessionStore`); the Activity sets
  `FLAG_SECURE`.
- No backend secret (DB URL, JWT signing key, Google OAuth client secret)
  ever ships in an Android or Web build artifact — see §14.

## 4. Database schema

Core entities per the brief, plus the identity split needed for §6/§7,
plus `budget_recommendations` to keep suggestions separate from real
budgets per the brief's explicit requirement.

```
users
  id                 uuid pk
  name               text
  email              citext unique
  email_verified_at  timestamptz null
  phone              text null
  city               text null
  created_at         timestamptz
  updated_at         timestamptz

auth_identities                         -- one user, many login methods
  id                 uuid pk
  user_id            uuid fk -> users.id
  provider           text            -- 'password' | 'google' | (future) 'passkey'
  provider_user_id   text null       -- Google's `sub`; null for 'password'
  credential_hash    text null       -- argon2 hash; only set for 'password'
  created_at         timestamptz
  unique (provider, provider_user_id)
  unique (user_id, provider)

refresh_tokens
  id                 uuid pk
  user_id            uuid fk -> users.id
  token_hash         text unique     -- sha256 of the opaque token
  device_label       text null
  expires_at         timestamptz
  revoked_at         timestamptz null
  created_at         timestamptz

user_preferences
  user_id            uuid pk fk -> users.id
  language           text default 'es'
  currency           text default 'COP'
  theme              text default 'system'
  notifications      boolean default true
  biometric_login    boolean default false
  blur_balance       boolean default false   -- Android: blurs Home's total balance until tapped
  auto_lock_minutes  integer default 5       -- Android: 0 = never; password-only re-entry, see android/AGENTS.md
  onboarding_completed_at  timestamptz null   -- drives first-launch gating
  tutorial_completed_at    timestamptz null   -- re-openable from Settings
  updated_at         timestamptz

accounts                                -- "wallets": cash, bank, savings...
  id                 uuid pk
  user_id            uuid fk -> users.id
  name               text
  type               text            -- 'cash' | 'bank_debit' | 'bank_credit' | 'savings' | 'crypto' | 'nequi' | 'daviplata' | 'other'
  initial_balance_minor  bigint      -- COP has no subunit; stored as integer minor units, see §"monetary values"
  current_balance_minor  bigint
  created_at         timestamptz
  updated_at         timestamptz

categories
  id                 uuid pk
  user_id            uuid null fk -> users.id   -- null = global/system category
  name               text
  icon               text
  color              text
  kind               text            -- 'income' | 'expense' | 'both'
  created_at         timestamptz

products
  id                 uuid pk
  barcode            text unique
  name               text
  brand              text null
  category_id        uuid null fk -> categories.id
  description        text null
  image_url          text null
  created_at         timestamptz
  updated_at         timestamptz

transactions
  id                 uuid pk
  user_id            uuid fk -> users.id
  account_id         uuid fk -> accounts.id
  type               text            -- 'income' | 'expense'
  amount_minor       bigint          -- always positive; sign implied by type
  category_id        uuid fk -> categories.id
  product_id         uuid null fk -> products.id
  payment_method     text            -- server-derived from account.type, never client-chosen; see backend/src/routes/transactions.ts's paymentMethodForAccountType
  description        text
  merchant           text null
  note               text null
  transaction_date   date
  created_at         timestamptz
  updated_at         timestamptz

budgets                                 -- user's actual, active budgets
  id                 uuid pk
  user_id            uuid fk -> users.id
  category_id        uuid fk -> categories.id
  amount_minor       bigint
  period             text            -- 'monthly' (only period both clients use today)
  start_date         date
  end_date           date null
  created_at         timestamptz
  updated_at         timestamptz

budget_recommendations                  -- 50/30/20-style suggestions, never auto-applied
  id                 uuid pk
  user_id            uuid fk -> users.id
  strategy           text            -- e.g. '50-30-20'
  needs_pct          numeric(5,2)
  wants_pct          numeric(5,2)
  savings_pct        numeric(5,2)
  based_on_income_minor  bigint null
  accepted_at        timestamptz null   -- set only if user turns it into real `budgets` rows
  created_at         timestamptz
```

Relationships: `users 1—N accounts/transactions/budgets/auth_identities`;
`accounts 1—N transactions`; `categories 1—N transactions/budgets`
(`categories.user_id NULL` = system-seeded, shared, read-only category
every user sees, matching today's fixed category list in
`web/src/data/categories.ts` / `MockCategories.kt`); `products 1—N
transactions` via nullable `product_id`, global (not per-user) per the
brief ("same barcode = same product globally").

Indexes: every `user_id` FK column (all list/filter queries are
user-scoped — this is also the enforcement backstop, see §"financial data
integrity"), `transactions(user_id, transaction_date)` for range queries,
`products(barcode)` unique, `auth_identities(provider, provider_user_id)`
unique.

**Monetary values**: stored as `bigint` minor units (COP has no
subunit in practice, but storing as integer "cents" keeps the column type
uniform and avoids float rounding entirely, per the brief's explicit
requirement). API responses convert to the same `number` shape
(`amount`) the clients already use today, so client-side code barely
changes.

## 5. API architecture

REST, JSON, versioned path prefix `/api/v1`. Chosen over GraphQL: the
access patterns are simple CRUD + a handful of aggregate endpoints for
Web's analytics, not the deep/variable nested-query shape GraphQL earns
its complexity for.

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/google
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout                -- ends the whole session
POST   /api/v1/auth/activity              -- "Cierre automático" heartbeat
POST   /api/v1/auth/biometric             -- issues a device credential ("Ingreso biométrico")
POST   /api/v1/auth/biometric/login       -- trades that credential for a session

GET    /api/v1/me
PATCH  /api/v1/me/preferences
POST   /api/v1/me/password               -- keeps the caller's session, closes the rest
GET    /api/v1/me/sessions               -- one row per login (refresh_tokens.session_id)
DELETE /api/v1/me/sessions               -- close every session but the caller's
DELETE /api/v1/me/sessions/:id
GET    /api/v1/me/footprint              -- counts shown before deleting the account
GET    /api/v1/me/export                 -- CSV: movimientos, presupuestos, metas, préstamos
DELETE /api/v1/me                        -- {password} or, with no password, {googleIdToken} (fresh, same Google account); erases the account and its data

GET    /api/v1/accounts
POST   /api/v1/accounts
PATCH  /api/v1/accounts/:id

GET    /api/v1/categories

GET    /api/v1/transactions?type=&category=&from=&to=&search=
POST   /api/v1/transactions
PATCH  /api/v1/transactions/:id
DELETE /api/v1/transactions/:id

GET    /api/v1/budgets
POST   /api/v1/budgets
PATCH  /api/v1/budgets/:id                  -- also moves it to another free category
DELETE /api/v1/budgets/:id
POST   /api/v1/budgets/recommendations        -- compute a 50/30/20-style suggestion
POST   /api/v1/budgets/recommendations/:id/accept

GET    /api/v1/goals                          -- also records due "Automático" plan contributions
POST   /api/v1/goals
PATCH  /api/v1/goals/:id
DELETE /api/v1/goals/:id                      -- {returnToAccountId | returnToOrigin} when it has money
POST   /api/v1/goals/:id/contribute           -- "Abonar"; Idempotency-Key header
PUT    /api/v1/goals/:id/plan                 -- "Aporte periódico"
DELETE /api/v1/goals/:id/plan
POST   /api/v1/goals/:id/plan/confirm         -- "Confirmar aporte"; Idempotency-Key header
POST   /api/v1/goals/:id/plan/skip            -- "Omitir esta vez"

GET    /api/v1/products/:barcode              -- 404 is a normal, expected response
POST   /api/v1/products                       -- register an unknown product

GET    /api/v1/summary/months               -- income/expenses per month (Inicio)
GET    /api/v1/summary/categories           -- the month's spending per category
GET    /api/v1/summary/report?range=3|6|12  -- every Reportes figure, both clients
```

Every route except `auth/*` and the `GET /products/:barcode` lookup
requires a valid access token; the server derives `user_id` from the
token — **never** from a client-supplied field. All list/detail queries
are scoped with `WHERE user_id = :fromToken` at the query-builder level,
not filtered after the fact.

### Goal contributions

A goal holds no money of its own: its progress is its "Monto inicial" plus
every COMPLETED movement linked to it (`goalId`), in the principal
currency (`backend/src/lib/goalProgress.ts`). An "Abonar" is a real
EXPENSE out of a wallet, so it moves that wallet's balance.

No contribution may pass what the goal still needs (`target − saved`).
`POST /goals/:id/contribute`, `plan/confirm` with an explicit amount, and
`POST`/`PATCH /transactions` that link a completed movement to a goal
answer **422** `{ code: "GOAL_EXCEEDS_REMAINING", remaining }` instead of
charging the wallet. The check runs inside the write transaction under a
row lock on the goal (`lockGoalRemaining`), so two concurrent requests
can't both pass. A plan's contribution, confirmed or automatic, is cut to
what is left, and a reached goal ends its plan. Lowering the target below
what is saved is still allowed (the percentage caps at 999). Taking the
wallet below zero is not blocked; the clients only warn. The guest mirrors
(`web/src/lib/guestApi.ts`, Android's `GoalRepository`/`DemoLedger`) apply
the same rule.

"Abonar" and "Confirmar aporte" carry an `Idempotency-Key` header
(stored as `transactions.client_request_id`), so a retried request is
recorded once.

## 6. Authentication flow (email/password)

```
Client                         Backend                          DB
  │  POST /auth/register          │                               │
  │  {name, email, password} ────>│                               │
  │                                │ argon2id(password)            │
  │                                │ INSERT users, auth_identities ─>│
  │                                │ issue access+refresh tokens   │
  │<─── {accessToken, user} ───────│  (refresh: httpOnly cookie/   │
  │                                │   encrypted store)            │
  │  ... later ...                 │                               │
  │  POST /auth/login              │                               │
  │  {email, password} ──────────>│ lookup auth_identities         │
  │                                │  where provider='password'     │
  │                                │ argon2.verify(hash, password) │
  │<─── {accessToken, user} ───────│                               │
  │  POST /auth/refresh            │                               │
  │  (refresh token) ─────────────>│ verify hash, not expired/     │
  │                                │  revoked; rotate               │
  │<─── {accessToken} ─────────────│                               │
```

## 7. Google Sign-In flow

```
Android/Web              Google                    Backend                DB
  │ Sign in with Google      │                          │                    │
  │─────────────────────────>│                          │                    │
  │<──── ID token (JWT) ─────│                          │                    │
  │  POST /auth/google                                   │                    │
  │  {idToken} ─────────────────────────────────────────>│                    │
  │                                    verify signature+audience via          │
  │                                    Google's public keys (google-auth-     │
  │                                    library); extract `sub`, `email`       │
  │                                                        │                    │
  │                                    SELECT auth_identities                 │
  │                                     WHERE provider='google'                │
  │                                       AND provider_user_id=sub ──────────>│
  │                                    found?  → use its user_id              │
  │                                    not found, but a users row with        │
  │                                      that verified email exists?          │
  │                                       → link: INSERT auth_identities      │
  │                                         for the EXISTING user (this is    │
  │                                         the step that prevents a second,  │
  │                                         duplicate identity for the same   │
  │                                         person)                           │
  │                                    neither? → INSERT users +              │
  │                                       auth_identities (new account)       │
  │<──────── {accessToken, user} ─────────────────────────│                    │
```

- **Android**: Credential Manager API (`androidx.credentials` +
  `googleid`) — the current-generation replacement for the deprecated
  One Tap/Sign-In SDK, retrieves a Google ID token natively.
- **Web**: Google Identity Services JS SDK (`accounts.google.com/gsi/client`),
  renders the button, returns an ID token client-side, which is POSTed to
  the same `/auth/google` endpoint Android uses — one server-side
  verification path for both platforms.
- The Google OAuth **client secret** (for the web flow, if the authorization
  code flow is used instead of the implicit ID-token flow) stays
  server-side only; the Android and Web **client IDs** are public by
  design (they identify the app, not a secret) and are safe to embed in
  each client's build config.

## 8. Android integration

```
Compose screens
    │ collectAsStateWithLifecycle()
Repositories in AppContainer       (StateFlow-backed; no DI framework, no ViewModels)
    │ suspend calls
ApiClient                          (Retrofit + kotlinx.serialization, OkHttp with an
    │                               auth interceptor that refreshes once on 401)
Backend
```

- Screens read repository `StateFlow`s and call their suspend methods; a
  repository refreshes its list after a mutation.
- The session (access and refresh token) is stored in DataStore,
  encrypted with an AES-GCM key held in the Android Keystore
  (`data/local/SessionStore.kt`). Onboarding and preferences flags also
  live in DataStore.
- No local database or offline queue: without a connection a write fails
  with a message. Guest mode swaps the repositories to in-memory data
  (`DemoModeFlag`, `DemoLedger`) that mirror the backend's rules.

## 9. Web integration

```
Pages / components
    │
services/*.ts                      (thin wrappers mapping wire shapes to Web types)
    │
lib/apiClient.ts                   (fetch; base URL from VITE_API_URL; in-memory
    │                               access token; one /auth/refresh retry on 401)
Backend
```

- The refresh token is an httpOnly cookie the page never reads;
  `AuthContext` restores the session through `/auth/refresh` on load.
- React Context holds app-wide state; there is no state library.
- Guest mode installs `lib/guestApi.ts` behind `apiClient`, an in-memory
  stand-in for the backend with the same wire shapes and rules.

## 10. Data synchronization strategy

Not real-time/websocket for v1 — no requirement in the brief demands
sub-second cross-device sync, and it would be the single largest added
complexity for the least product value at this stage.

- **Every mutation (`POST`/`PATCH`/`DELETE`) refetches the affected list**
  client-side immediately after a successful response — both apps
  already re-render from a single reactive source (`StateFlow` /
  Context), so this is a small change to each repository/service, not a
  new pattern.
- **Web**: refetch dashboard aggregate queries when the filter/date-range
  context changes — implemented, now against the real backend.
- **Android**: pull-to-refresh on Inicio plus refetch when a screen
  opens, so an expense logged and a
  moment later checked on Web is only as stale as the next Android
  screen visit — acceptable for a personal-finance app used by one
  person across their own two devices.
- Not built: push notifications or SSE for live updates. The schema/API don't preclude
  adding this later (e.g., an SSE endpoint over the same REST resources).

## 11. Barcode/product architecture

Scanner implementation (CameraX + ML Kit) is unchanged — only the
lookup source changes.

```
CameraX preview → ML Kit decode → barcode string   (unchanged)
        │
        ▼
GET /api/v1/products/:barcode
        │
   200 Product found ──────────► pre-fill purchase form → confirm → POST /transactions
        │
   404 Not found ───────────────► manual entry form (name/category/price required,
                                    brand/image optional) → confirm
                                       │
                                       ├─ POST /products (register barcode→product globally)
                                       │    then
                                       └─ POST /transactions
```

`ProductRepository`/`productService` keep their existing function
signature (`lookup(barcode): Product?`) — only the implementation moves
from `MockProducts.kt`/`data/products.ts` array lookup to an API call. A
404 is a normal, expected response, not an error state — the manual-entry
path is not gated behind any error handling, matching the brief's "do not
make barcode lookup prevent manual transaction creation."

## 12. Onboarding

Both clients have a 2-step first run (moneda principal → primera
billetera), gated by the server's `UserPreferences.onboardingCompleted`.
The principal currency is saved with the first wallet
(`PUT /me/currencies/principal` only works before any wallet exists).

The tutorial is a set of in-place product tours (`DESIGN-SYSTEM.md`
§6.13): a general one on Inicio and one per main screen. Their completion
lives server-side in `UserPreferences.guidesSeen` (`tour.welcome`,
`tour.movimientos`, …), so a tour finished on one client doesn't repeat on
the other; Ajustes › "Ver los recorridos otra vez" clears it.
`tutorialCompleted` is only set at the end of first run and gates nothing.

## 13. Guest mode

"Continuar como invitado" runs both clients on the same example account
(`scripts/gen-guest-seed.mjs` writes it to each), entirely in memory:
nothing reaches the backend. Each client mirrors the backend's balance,
budget, goal and alert rules locally, so a guest sees the same effects a
real account would.

## 14. Security model

- **Authorization is enforced server-side, on every query**, by scoping
  to the `user_id` derived from the verified access token — never by a
  client-supplied `userId` field, never by frontend filtering alone (per
  the brief's explicit requirement).
- Passwords: argon2id, never logged, never returned in any API response.
- Secrets (`DATABASE_URL`, `JWT_SECRET`, Google OAuth client secret)
  live in backend-only environment variables (`.env`, gitignored),
  **never** in Android `BuildConfig`/`local.properties` committed values
  or Web `VITE_*` env vars (anything prefixed `VITE_` ships in the
  client bundle — only the public Google client ID goes there).
- Rate limiting on `/auth/*` (`@fastify/rate-limit`) to blunt credential
  stuffing.
- Input validation (Zod schemas) on every endpoint before it touches
  Prisma — rejects malformed/oversized payloads before a query runs.
- Foreign keys with `ON DELETE CASCADE` from `users` down to owned rows,
  so deleting a user can't orphan financial data.
- HTTPS-only in any non-local environment; refresh cookie
  `Secure; HttpOnly; SameSite=Lax`.

## 15. Local development setup

```
backend/
  .env.example        # DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_IDS, PORT
  docker-compose.yml   # single `postgres:16` service, local-only
  prisma/schema.prisma
  src/
```

```bash
cd backend
cp .env.example .env
docker compose up -d          # starts local Postgres on :5432
pnpm install
pnpm prisma migrate dev       # applies schema, generates client
pnpm dev                      # Fastify on :3000 with reload
```

Web: `VITE_API_URL=http://localhost:3000/api/v1` in `web/.env.local`.
Android: `local.properties` gains `API_BASE_URL=http://10.0.2.2:3000/api/v1`
(emulator's host-loopback address) surfaced via `BuildConfig`, already the
pattern this project uses for local-only, gitignored config
(`sdk.dir`).

## 16. Deployment strategy

Chosen setup: **Aiven for PostgreSQL** (free plan, always-on, no sleep) +
**Render** (free Web Service, Docker runtime, `backend/Dockerfile`) — the
app is a plain Fastify server with no platform-specific code, so this was a
config choice, not an architecture one. An Oracle Cloud Always Free VM
(self-hosted Postgres + backend together) was considered first but dropped
after repeated "out of host capacity" errors provisioning the free ARM
shape, and to keep that VM free for other uses. Render's free tier sleeps
after 15 minutes idle; a periodic ping keeps it awake. See
`backend/AGENTS.md`'s "Production deployment" section for the deploy
steps.

- **Web**: GitHub Pages via `.github/workflows/deploy.yml`, built with the
  `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` repository variables pointed
  at the deployed backend. Live at `https://sberrcamacho.github.io/s2_nova/`.
- **Backend**: Render, config-only (env vars), no platform-specific code;
  redeploys on every push to `main`.
- **Android**: the staging APK, built locally and published as a GitHub
  Release asset that the web landing links to (`RELEASE_ANDROID.md`). No
  Play Store listing.

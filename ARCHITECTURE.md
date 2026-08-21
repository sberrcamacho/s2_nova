# S2 Nova — Backend & Sync Architecture Proposal

Status: **Phases 1–3 implemented and verified** (backend foundation,
schema/migrations, auth). Phase 5's domain layer (accounts/transactions/
categories/budgets) and a Goal entity are also implemented, extending the
§4 schema below — `backend/prisma/schema.prisma` is the current source of
truth for the exact schema (it now also has `TransactionType.TRANSFER`,
`TransactionStatus`, `RecurrenceInterval`, `LoanKind`, a `Budget.name`
field, and a `Goal` model beyond what's written here); this document's
prose is kept for the original design rationale, not re-synced line by
line on every schema change. Android (Phase 8) now calls this backend for
real; Web (Phase 9) does not yet — see `web/AGENTS.md`. This document is
the reference for moving S2 Nova from two independent mock-data apps to
two apps sharing one backend, one database, and one user identity. It
does not replace `android/AGENTS.md` / `web/AGENTS.md` — those stay the
source of truth for how each client app is built; this document covers
`backend/` and how both clients integrate with it.

Nothing in this document changes `android/` or `web/`'s existing
architecture, navigation, or design system. Android stays Kotlin +
Compose with manual DI evolving to Hilt + ViewModels only where a real
network/async boundary requires it; Web stays React + TS + Vite. Neither
app merges with the other.

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
  `refresh_tokens`, long-lived (30 days), rotated on every use (old token
  revoked, new one issued) — limits replay damage if one leaks.
- Web: refresh token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie
  (never readable by JS, so an XSS can't exfiltrate it). Access token kept
  in memory only.
- Android: refresh token in `EncryptedSharedPreferences` (or the DataStore
  equivalent wrapped with Jetpack Security) — never plaintext
  `SharedPreferences`.
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
  onboarding_completed_at  timestamptz null   -- drives first-launch gating
  tutorial_completed_at    timestamptz null   -- re-openable from Settings
  updated_at         timestamptz

accounts                                -- "wallets": cash, bank, savings...
  id                 uuid pk
  user_id            uuid fk -> users.id
  name               text
  type               text            -- 'cash' | 'bank' | 'savings' | 'other'
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
  payment_method     text
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
POST   /api/v1/auth/logout

GET    /api/v1/me
PATCH  /api/v1/me/preferences

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
PATCH  /api/v1/budgets/:id
POST   /api/v1/budgets/recommendations        -- compute a 50/30/20-style suggestion
POST   /api/v1/budgets/recommendations/:id/accept

GET    /api/v1/products/:barcode              -- 404 is a normal, expected response
POST   /api/v1/products                       -- register an unknown product

GET    /api/v1/analytics/monthly-summary
GET    /api/v1/analytics/category-breakdown
```

Every route except `auth/*` and the `GET /products/:barcode` lookup
requires a valid access token; the server derives `user_id` from the
token — **never** from a client-supplied field. All list/detail queries
are scoped with `WHERE user_id = :fromToken` at the query-builder level,
not filtered after the fact.

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

## 8. Android architecture (integration, not a rewrite)

Today: `AppContainer` holds `StateFlow`-backed in-memory repositories;
screens call repository methods directly; no DI framework, no
ViewModels, no persistence (per `android/AGENTS.md`, explicitly
described as intentional "for the mock-data stage").

Change, introduced only as real endpoints land (§ Phase 8), one
repository at a time:

```
Compose UI
    │ collectAsStateWithLifecycle()
ViewModel                          (new — only where a repo becomes network-backed)
    │
Repository interface               (existing — e.g. TransactionRepository)
    │  same public method signatures where possible, now suspend/Flow over network
ApiClient (Retrofit + kotlinx.serialization or Moshi, OkHttp w/ auth interceptor)
    │
Backend
```

- Add **Retrofit + OkHttp** (new deps — the only reasonable choice absent
  from a repo that currently has zero networking dependencies; no
  existing HTTP client to reuse).
- Add a small **Room** database as a local cache/offline buffer per
  repository as it's migrated (keeps the "instant, no-spinner" feel the
  brief wants for daily logging) — introduced incrementally, not
  up front for every entity.
- Add **DataStore** (`androidx.datastore:datastore-preferences`) for:
  onboarding/tutorial-completed flags (§ Onboarding architecture) and the
  stored refresh token (via an `EncryptedFile`/Jetpack Security wrapper,
  not plain DataStore, since it's a credential).
- **ViewModels introduced only for screens whose repository becomes
  network-backed** — screens still on mock data keep today's direct
  `AppContainer` pattern until their turn in the phase plan. This avoids
  a blanket rewrite the brief explicitly prohibits.
- `AuthRepository` becomes the first real ViewModel-backed, DataStore-
  persisted piece (Phase 3), since login state gates everything else.

## 9. Web architecture (integration, not a rewrite)

Today: `src/services/*.ts` are in-memory CRUD modules; `src/state/*`
(React Context) calls them directly. `web/AGENTS.md` already documents
this as a deliberate seam: *"A real implementation would swap this
module for one backed by fetch() calls... every other layer only talks
to the exported functions below, so the swap is transparent."*

This seam is exactly what makes the Web migration low-risk: each
`services/*.ts` file's exported function signatures stay the same;
only the implementation changes from array mutation to `fetch()`.

```
Dashboard pages / components
    │  (unchanged — still call services/*.ts functions)
services/*.ts                      (existing files, bodies replaced)
    │  fetch() via a small ApiClient wrapper (adds Authorization header,
    │  handles 401 → refresh-and-retry once, then logout)
Backend
```

- New `src/lib/apiClient.ts`: thin `fetch` wrapper — base URL from
  `import.meta.env.VITE_API_URL`, attaches the in-memory access token,
  and on a 401 attempts one `/auth/refresh` (cookie-based) before
  retrying.
- `AuthContext` stops auto-hydrating a mock user; adds a real login
  screen (today's Web app has none — `web/AGENTS.md`: *"no login/mobile
  screens of its own"*), matching Android's existing Login/Register UI
  patterns for visual consistency.
- No new state management library — React Context stays, per existing
  convention.

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
  context changes (already the trigger today, just against mock data).
- **Android**: pull-to-refresh on list screens (Home, Transactions,
  Budgets) plus refetch-on-screen-focus, so an expense logged and a
  moment later checked on Web is only as stale as the next Android
  screen visit — acceptable for a personal-finance app used by one
  person across their own two devices.
- Left explicitly for a later phase, not part of this proposal: push
  notifications or SSE for live updates. The schema/API don't preclude
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

## 12. Onboarding architecture

Android-only for now (Web has no first-run concept — it's an
already-authenticated dashboard). Persisted via **DataStore Preferences**
(`android/AGENTS.md` already names DataStore as the intended mechanism
for this kind of flag):

```
OnboardingRepository (DataStore-backed)
  onboardingCompleted: Flow<Boolean>
  tutorialCompleted:   Flow<Boolean>
  markOnboardingComplete()
  markTutorialComplete()
```

- `NovaNavGraph`'s start destination becomes conditional: read
  `onboardingCompleted` once at cold start (before the nav graph is
  built, same place `SplashScreen`'s theme-read pattern already lives) →
  route to `Onboarding` graph if false, `Auth`/`Home` graph if true.
- Onboarding screens: Welcome → (optional) Income → Create first account
  → (optional) Budget suggestion → Interactive tutorial (3–5 steps, a
  `HorizontalPager` with progress dots, Back/Next/Skip, matching the
  brief's flow) → Home.
- Every optional step has a visible **Skip**; the flow never blocks
  reaching Home. Declining income/budget setup simply leaves those
  `POST` calls unmade — the user can always add an account/income/budget
  later from their normal screens.
- The account and any accepted budget/recommendation created during
  onboarding are real `POST /accounts`, `POST /budgets/recommendations`
  calls — onboarding is a guided first use of the real API, not a
  separate mock flow.
- **Settings** gets a "Replay tutorial" action that resets only
  `tutorialCompleted` (not `onboardingCompleted` — replaying the tutorial
  should not re-trigger account/income setup).

## 13. Migration strategy from mock data

Incremental, per-entity, both apps stay shippable at every step — this is
the direct implementation of the brief's phase plan (§ below) and its
explicit "do not rewrite" constraint.

1. Backend stands alone first (Phases 1–2), verified via its own tests/
   `curl`, with **zero client changes**.
2. Auth lands next (Phase 3) — both apps grow real login screens/flows
   *alongside* (not replacing) their mock auth, switched over once
   verified.
3. Each domain repository/service (`accounts`, `transactions`,
   `categories`, `budgets`, `products`) is migrated **one at a time**:
   swap its implementation to call the API, verify that screen/flow still
   works end-to-end, commit, move to the next. At every intermediate
   commit the app builds and the non-migrated repositories keep working
   on mock data — nothing is broken mid-migration.
4. Mock data files (`data/mock/*.kt`, `src/data/*.ts`) are deleted only
   after the corresponding backend entity is seeded with equivalent data
   and the repository fully migrated — not before, and not all at once.

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
  .env.example        # DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, PORT
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

This machine doesn't currently have Docker installed — see the open
question below before Phase 1 work starts, since it decides how
"local Postgres" actually gets stood up here.

## 16. Deployment strategy

Not executed as part of this task (no cloud accounts/credentials are
available to provision), but the architecture is chosen to keep the
options open and cheap:

- **Web**: unchanged — GitHub Pages via the existing
  `.github/workflows/deploy.yml`, now also given `VITE_API_URL` pointed
  at the deployed backend.
- **Backend**: any Node-hosting platform with a managed Postgres add-on
  (Railway, Render, Fly.io) — the app is a plain Fastify server with no
  platform-specific code, so this is a config choice, not an
  architecture one.
- **Android**: unchanged local build/install; a release pipeline is out
  of scope for this task (already noted as a gap in `PROJECT_STATE.md`).

---

## Implementation phases (this task)

Following the brief's explicit instruction not to implement all phases
blindly in one pass — each phase below is built and verified before the
next starts:

1. Backend foundation (Fastify + TS project, health check, structure)
2. Database schema + Prisma migrations
3. Authentication (email/password + Google Sign-In + sessions)
4. User preferences + onboarding persistence
5. Accounts + transactions + categories
6. Budgets + budget recommendations
7. Product + barcode database
8. Android API integration
9. Web API integration
10. Data refresh strategy (refetch-on-mutation, pull-to-refresh)
11. Security/validation hardening pass
12. Testing + deployment docs

## Open questions before Phase 1 starts

1. **Local Postgres**: this machine has no Docker installed. Options:
   install Docker (this proposal's default assumption), install
   PostgreSQL natively, or point local dev at a free managed instance
   (e.g. Neon/Supabase) instead of running Postgres locally at all.
2. **Google OAuth credentials**: Phase 3 needs a real Google Cloud
   OAuth client ID (Web + Android) to test Google Sign-In end-to-end.
   This isn't needed until Phase 3, but whoever owns Google Cloud access
   for this project will need to create one when we get there.
3. **Scope for this session**: given the size of the full plan, confirm
   starting with Phases 1–2 (backend foundation + schema, no client
   changes yet) now, and checking back in before Phase 3 (auth) — which
   is the first phase that touches either app's UI.

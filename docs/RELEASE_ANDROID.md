# Releasing the Android app

The Android app is distributed as an APK attached to a GitHub Release of
`sberrcamacho/s2_nova`. The web landing page (`web/src/landing/LandingPage.tsx`,
`ANDROID_APK_URL`) links to
`https://github.com/sberrcamacho/s2_nova/releases/latest/download/s2-nova.apk`,
which always resolves to the newest release, so a new APK needs no web
change. A Google Play release is ready from the `release` build type but
on hold (the developer account costs US$25); see "Google Play" below.
The GitHub APK is the way to install the app.

The app tells people about new versions itself: `data/UpdateChecker.kt`
asks GitHub's API for the latest release (once a day in the background,
at most every 6 hours when the app opens) and, when its tag is newer than
the installed `versionName`, shows a sheet with "Descargar" once per
version and posts a notification. After an update, the app shows that
version's Novedades once (both clients; Ajustes › Novedades lists them
all).

## What gets published

The **staging** build type (`android/app/build.gradle.kts`):

- R8-shrunk, not debuggable, screenshots blocked (`FLAG_SECURE`).
- Signed with the **debug keystore of the release machine**
  (`~/.android/debug.keystore`). The Android OAuth client in Google Cloud is
  registered with that keystore's SHA-1, which is why Google Sign-In works
  in the published APK. Two consequences:
  - Build releases on that machine. An APK signed with any other key
    (a CI runner's, another laptop's) fails Google Sign-In and can't
    install over the published one.
  - If that keystore is lost, users must uninstall before installing the
    next APK, and the new SHA-1 must be added to the OAuth client.
- `API_BASE_URL` and `GOOGLE_WEB_CLIENT_ID` come from
  `android/local.properties` (gitignored) and are baked into `BuildConfig`.
  For a release they must point at production
  (`https://s2-nova.onrender.com/api/v1`).
- `minSdk` 31, so Android 12 or later.
- No notification listener: Google Play Protect's enhanced fraud
  protection blocks installing a sideloaded app that declares
  `BIND_NOTIFICATION_LISTENER_SERVICE` (also SMS and accessibility
  permissions), and 1.2.0 was blocked on a phone in Colombia for it. So
  `src/staging/AndroidManifest.xml` removes `NotificationCaptureService`
  and `BuildConfig.NOTIFICATION_CAPTURE` is false, which hides
  "Registrar desde notificaciones". Debug and the Play `release` build keep
  it. Never add one of those permissions to this build.

## Steps

1. Bump `versionCode` (always +1, or the install over the old one fails)
   and `versionName` in `android/app/build.gradle.kts`.
2. Write the version's Novedades: add an entry on top of
   `scripts/changelog.json` (`version` = the new `versionName`, the date,
   one item per feature with es/en title and body, and `also` lines for
   smaller changes). Each item needs an image in both themes for both
   clients. Capture the feature (`s2-nova-screenshoots/`), then frame it
   with `scripts/whatsnew/compose-app.sh` (into
   `android/app/src/main/res/drawable-nodpi/whatsnew_<image>_<theme>.webp`)
   and `scripts/whatsnew/compose-web.sh` (into
   `web/src/assets/whatsnew/<image>-<theme>.webp`), and add the new image
   name to `imageFor` in `ui/screens/whatsnew/WhatsNew.kt`. Run
   `node scripts/gen-changelog.mjs`, which copies the JSON to both clients
   and fails if an image is missing. Commit.
3. Run the three test suites (`docs/TESTING.md`). `ChangelogTest` fails
   when the new `versionName` has no Novedades.
4. Build: `cd android && ./gradlew :app:assembleStaging`. The APK is
   `android/app/build/outputs/apk/staging/app-staging.apk`.
5. Publish it under the file name the landing links to. GitHub names an
   asset after the uploaded file (a `#label` suffix only sets a label), so
   copy it first:

   ```bash
   cp android/app/build/outputs/apk/staging/app-staging.apk /tmp/s2-nova.apk
   gh release create v<versionName> /tmp/s2-nova.apk \
     --title "S2 Nova <versionName>" --notes "<what changed>"
   ```

   Push `main` first, so the tag lands on the commit the APK was built
   from. The asset must be named `s2-nova.apk`, the tag must be
   `v<versionName>` (the update check compares it), and the release must
   be the latest (the default). The notes are what people read on GitHub:
   write them for users, in Spanish, from the Novedades.
6. Check the landing's "Descargar para Android" link downloads the new
   file, and install it over the previous version on a phone.

Installing an APK from the browser asks the user to allow installs from
that source; the landing's caption says so.

## Google Play

### The release build

The **release** build type is what goes to Play, as an Android App Bundle:

- R8 shrinking and resource shrinking, not debuggable, `FLAG_SECURE`.
- Signed with the **upload key** `android/keystore/s2nova-upload.jks`
  (alias `upload`), read from `android/keystore.properties`
  (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Both are
  gitignored. Without that file the build is unsigned and the release
  check refuses it.
- `bundleRelease` and `assembleRelease` refuse to build unless
  `API_BASE_URL` is `https://`, `GOOGLE_WEB_CLIENT_ID` is set, and the
  upload key is present.

Build with `cd android && ./gradlew :app:bundleRelease`. The bundle is
`android/app/build/outputs/bundle/release/app-release.aab`.

Upload key fingerprints (created 2026-10-17, RSA 4096):

- SHA-1 `A5:EA:E5:7D:92:15:FB:D8:5B:8E:91:B8:B3:5A:93:DE:02:07:65:55`
- SHA-256 `63:C9:D3:C1:A2:E0:E6:17:CB:E4:62:91:A3:EC:5F:E0:39:2D:19:1C:AE:ED:C8:F4:EC:6F:03:F4:C0:33:E6:77`

Keep a copy of the `.jks` and `keystore.properties` outside this machine,
for example in a password manager. With Play App Signing a lost upload key
can be reset through Play Console support, but that takes days.

### Signing and Google Sign-In

Play App Signing re-signs the app with Google's **app signing key**. Google
Sign-In checks the signature of the installed app. An Android OAuth client
in Google Cloud holds one SHA-1, so there is one Android client (package
`com.s2nova.app`) for each of these:

- The **app signing key** SHA-1, from Play Console › Test and release ›
  App integrity. Builds installed from Play carry this one.
- The upload key SHA-1 above, for testing a locally built release.
- The release machine's debug keystore SHA-1 (already there) for the
  GitHub APK.

If the SHA-1 isn't there, Google Sign-In fails in that build with no other
symptom. Password sign-in still works.

The GitHub APK is signed with a different key, so it can't update to the
Play build. People who installed it uninstall it once before installing
from Play. Their data stays on the server.

### Play Console steps

These need the owner's Play Console account.

1. A developer account (a one-time US$25 fee) with identity verification.
   A personal account created after November 2023 must run a **closed
   test with at least 12 testers opted in for 14 days in a row** before it
   can apply for production. An organization account is exempt.
2. Create the app: name "S2 Nova", default language Spanish (Latin
   America), app (not game), free.
3. App content:
   - Privacy policy: `https://sberrcamacho.github.io/s2_nova/privacy.html`.
   - Account deletion: `https://sberrcamacho.github.io/s2_nova/delete-account.html`.
     Deletion is also in the app (Ajustes › Zona de riesgo).
   - Ads: none.
   - App access: give a test account (email and password) with data in
     it, because every screen but the guest mode needs sign-in.
   - Content rating questionnaire: finance utility, no user-generated
     content shared with other people, no gambling.
   - Target audience: 18 and over.
   - Financial features: personal budgeting and expense tracking only.
     The app doesn't lend money, process payments, hold funds or give
     investment advice. The loans feature records loans between people.
   - Data safety: see below.
4. Store listing: short description, full description, 512×512 icon,
   1024×500 feature graphic, and 2 to 8 phone screenshots (take them from
   `s2-nova-screenshoots/app-light` and `app-dark`).
5. Upload the `.aab` to the **closed testing** track, add the testers'
   emails (or a Google Group), and share the opt-in link.
6. After the upload, add the app signing key SHA-1 to the OAuth client
   (above).
7. After 14 days with 12 or more testers, apply for production access, then
   promote the build.

### Data safety answers

Data is encrypted in transit (HTTPS). Users can ask for deletion (in the
app and through the deletion URL). Nothing is sold or used for ads.

| Data type | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Name | Yes | No | Account management | No |
| Email address | Yes | No | Account management | No |
| User IDs (Google account ID) | Yes | No | Account management | Yes (Google sign-in) |
| Financial info › Other financial info (transactions, balances, budgets, loans) | Yes | No | App functionality | No |
| Photos (receipt attachments) | Yes | No | App functionality | Yes |
| App activity › Other user-generated content (assistant questions) | Yes, processed only | Yes, Google Gemini | App functionality | Yes |
| Financial info › Other financial info (bank notification text, from "Registrar desde notificaciones") | Yes, processed ephemerally (not stored) | Yes, Google Gemini, only with "Usar IA…" on and digits masked | App functionality | Yes |
| Device or other IDs | No | | | |
| Location, contacts, SMS, call logs | No | | | |

Service providers that process data for the app (Render, Aiven, GitHub
Pages, Resend) don't count as "sharing" in Play's definition. Google Gemini
also acts as a processor, but the free tier lets Google use content to
improve its products, so it is declared as shared to stay on the safe
side.

### Notification access

`NotificationCaptureService` uses `BIND_NOTIFICATION_LISTENER_SERVICE`.
It is off by default. Before Android's settings open, the app shows its own
disclosure sheet (Ajustes › Registrar desde notificaciones), which the user
has to accept. It only reads the apps the user checks, and never SMS or
messaging apps. Before filing, check Play's current "Permissions and APIs
that Access Sensitive Information" policy for whether notification access
needs a declaration form. If review asks for it, record a short video of
the disclosure, the app picker and a suggestion being confirmed.

## Release readiness (review of 2026-10-17)

Verdict: **ready for the closed test, not yet for production.**
Production needs the 14-day closed test anyway, and the items below.

The review covered the 1.2.0 changes (loan interest, lock screen, Reportes
range, notification capture, assistant), a security review, and a manual
audit of the whole app. What it found and fixed:

- fastify 5.12.1 had published advisories, including an auth bypass
  through malformed URLs. Updated to 5.12.7.
- On Android, the lock screen's "Cerrar sesión" left the previous
  account's notification capture in place, so its queued bank
  notifications could be sent as the next account. Now cleared, and a
  queue is only sent by its owner.
- Unlocking with another Google account could create a new account or
  link Google to a different one. `/auth/google` now takes
  `expectedUserId` and refuses those.
- Assistant: movements reached the model without their category, one long
  answer broke the rest of the conversation, timeouts used up the daily
  quota, and the tool reads of all users shared one rate-limit bucket.
- Suggestions: a re-posted bank notification became a second suggestion,
  and two identical posts at once returned a 500.

What was checked and found sound:

- Every user-data query is scoped by `userId`. That includes the
  suggestion confirm/dismiss routes, the assistant's tools (GETs with the
  caller's token, fixed paths, encoded query) and settle-loan.
- zod validation on every new body and query, and no raw SQL beyond the
  existing parameterized `FOR UPDATE`.
- The AI can't write: `propose_movement` only returns a draft. Digits are
  masked before Gemini, and the key is server-side only.
- No `dangerouslySetInnerHTML`. Refresh cookie `httpOnly`, and the access
  token is in memory on web.
- Android exports only `MainActivity` and the notification listener
  (system-only permission). Cleartext is off (targetSdk 36, no network
  config). Session, lock and capture-queue stores are excluded from
  backups.
- No secrets in git history. `local.properties`, `keystore.properties`
  and the keystore are gitignored.
- Production probes: `/auth/google` answers 401 for a bad token (so Google
  is configured), and CORS doesn't allow foreign origins.

Accepted for now:

- `pnpm audit` still lists deepmerge-ts and source-map-js under the
  Prisma CLI (build tooling, DoS only), and uuid under google-auth-library
  (a buffer API this code doesn't use).

Open before production:

1. **Rate limits on Render see the proxy, not the user.** Fastify runs
   without `trustProxy`, so `request.ip` is Render's proxy and all users
   share each per-IP bucket (100/min overall, plus the auth limits). With
   real traffic, logins start failing for everyone. Render appends to a
   client-supplied `X-Forwarded-For` rather than replacing it, so
   `trustProxy: true` would let anyone fake their IP. Set a fixed hop count
   instead, after checking the header chain on one real request.
2. After pushing: Render applies the two new migrations on deploy. Set
   `GEMINI_API_KEY` there for the assistant and the AI parser, created in
   Google AI Studio in a project **without billing**, so it can only use
   the free tier (past the quota requests fail and nothing is charged). The
   assistant stays hidden without it. Remove `ANTHROPIC_API_KEY` from
   Render if it is set: no paid AI is used.
3. Add the Play app signing SHA-1 and the upload SHA-1 to the Android
   OAuth client (see "Signing and Google Sign-In").
4. Not tried on a phone yet: Google unlock on the Android lock screen, and
   the capture owner check after a real sign-out and sign-in.

## Releases

| Version | Code | Date | Notes |
|---|---|---|---|
| 1.1.0 | 2 | 2026-10-13 | First published APK: Abonar capped at what the goal needs, "Completar" chip, one-line chip rows in Más opciones. |
| 1.2.0 | 3 | 2026-10-18 | Loan interest, lock screen, custom Reportes range, notification capture, assistant, Novedades and the update check. Blocked by Play Protect (notification listener). |
| 1.2.1 | 4 | 2026-10-18 | 1.2.0 without "Registrar desde notificaciones", so it installs. |

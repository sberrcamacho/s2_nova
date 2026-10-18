# Releasing the Android app

The Android app is distributed as an APK attached to a GitHub Release of
`sberrcamacho/s2_nova`. The web landing page (`web/src/landing/LandingPage.tsx`,
`ANDROID_APK_URL`) links to
`https://github.com/sberrcamacho/s2_nova/releases/latest/download/s2-nova.apk`,
which always resolves to the newest release, so a new APK needs no web
change. A Google Play release is being prepared from the `release` build
type; see "Google Play" below. Until it is live, the GitHub APK is the
only way to install the app.

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

## Steps

1. Bump `versionCode` (always +1, or the install over the old one fails)
   and `versionName` in `android/app/build.gradle.kts`, and commit.
2. Run the three test suites (`docs/TESTING.md`).
3. Build: `cd android && ./gradlew :app:assembleStaging`. The APK is
   `android/app/build/outputs/apk/staging/app-staging.apk`.
4. Publish it under the file name the landing links to. GitHub names an
   asset after the uploaded file (a `#label` suffix only sets a label), so
   copy it first:

   ```bash
   cp android/app/build/outputs/apk/staging/app-staging.apk /tmp/s2-nova.apk
   gh release create v<versionName> /tmp/s2-nova.apk \
     --title "S2 Nova <versionName>" --notes "<what changed>"
   ```

   Push `main` first, so the tag lands on the commit the APK was built
   from. The asset must be named `s2-nova.apk`, and the release must be
   the latest (the default).
5. Check the landing's "Descargar para Android" link downloads the new
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
Sign-In checks the signature of the installed app, so the Android OAuth
client in Google Cloud (package `com.s2nova.app`) must list:

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

## Releases

| Version | Code | Date | Notes |
|---|---|---|---|
| 1.1.0 | 2 | 2026-10-13 | First published APK: Abonar capped at what the goal needs, "Completar" chip, one-line chip rows in Más opciones. |
| 1.2.0 | 3 | not yet | Loan interest, lock screen, custom Reportes range, notification capture, assistant. First signed `release` bundle for Play. |

# Releasing the Android app

The Android app is distributed as an APK attached to a GitHub Release of
`sberrcamacho/s2_nova`. The web landing page (`web/src/landing/LandingPage.tsx`,
`ANDROID_APK_URL`) links to
`https://github.com/sberrcamacho/s2_nova/releases/latest/download/s2-nova.apk`,
which always resolves to the newest release, so a new APK needs no web
change. There is no Play Store listing.

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
4. Publish it under the name the landing links to:

   ```bash
   gh release create v<versionName> \
     "android/app/build/outputs/apk/staging/app-staging.apk#s2-nova.apk" \
     --title "S2 Nova <versionName>" --notes "<what changed>"
   ```

   The `#s2-nova.apk` suffix sets the asset's name; it must stay
   `s2-nova.apk`. Mark it as the latest release (the default).
5. Check the landing's "Descargar para Android" link downloads the new
   file, and install it over the previous version on a phone.

Installing an APK from the browser asks the user to allow installs from
that source; the landing's caption says so.

## Releases

| Version | Code | Date | Notes |
|---|---|---|---|
| 1.1.0 | 2 | 2026-10-13 | First published APK: Abonar capped at what the goal needs, "Completar" chip, one-line chip rows in Más opciones. |

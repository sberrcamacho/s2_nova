import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

private val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) FileInputStream(localPropertiesFile).use { load(it) }
}
private val apiBaseUrl: String = localProperties.getProperty("API_BASE_URL", "http://10.0.2.2:3000/api/v1")

// Google Cloud Console "Web application" OAuth client ID — Credential
// Manager's Sign-In-with-Google flow always issues its ID token audienced
// to the *Web* client, even when called from Android (a separate
// Android-type OAuth client, registered with this app's package name +
// signing SHA-1, is what authorizes this app to call Sign-In at all; see
// docs/ARCHITECTURE.md's Google Sign-In section). Empty by default — Google
// Sign-In is simply not offered until this is set in local.properties.
private val googleWebClientId: String = localProperties.getProperty("GOOGLE_WEB_CLIENT_ID", "")

// Google Play upload key (docs/RELEASE_ANDROID.md › Google Play):
// android/keystore.properties (gitignored) with storeFile, storePassword,
// keyAlias and keyPassword. Without it a release build is unsigned.
private val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) FileInputStream(file).use { load(it) }
}

android {
    namespace = "com.s2nova.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.s2nova.app"
        minSdk = 31
        targetSdk = 36
        versionCode = 4
        versionName = "1.2.1"

        // 10.0.2.2 is the emulator's alias for the host machine's localhost —
        // reaches `backend/` running via `pnpm dev` on the dev machine.
        // Override by adding API_BASE_URL=... to local.properties (gitignored)
        // once a deployed backend exists.
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
        // "Registrar desde notificaciones" (a notification listener). Off in
        // the APK installed from the web (staging): Play Protect blocks
        // sideloaded apps that can read notifications (src/staging/AndroidManifest.xml).
        buildConfigField("boolean", "NOTIFICATION_CAPTURE", "true")
    }

    signingConfigs {
        if (keystoreProperties.getProperty("storeFile") != null) {
            create("upload") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        // What goes to Google Play (`./gradlew :app:bundleRelease`): shrunk
        // by R8 and signed with the upload key; Play re-signs it with the
        // app signing key.
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("upload")
        }
        // Optimized build for trying the app on a real phone: not
        // debuggable, shrunk by R8 and signed with the debug key so it
        // installs over the debug APK (same package, so Google Sign-In keeps
        // working). Motion and scrolling on low-end devices must be judged
        // on this build, never on debug.
        create("staging") {
            initWith(getByName("release"))
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("debug")
            matchingFallbacks += listOf("release")
            buildConfigField("boolean", "NOTIFICATION_CAPTURE", "false")
        }
    }

    // A Play build must talk to the deployed API over HTTPS and offer Google
    // Sign-In, and be signed: fail early instead of uploading a broken one.
    tasks.matching { it.name == "bundleRelease" || it.name == "assembleRelease" }.configureEach {
        val url = apiBaseUrl
        val clientId = googleWebClientId
        val signed = keystoreProperties.getProperty("storeFile") != null
        doFirst {
            check(url.startsWith("https://")) { "API_BASE_URL must be the deployed HTTPS API for a release build (local.properties)." }
            check(clientId.isNotBlank()) { "GOOGLE_WEB_CLIENT_ID must be set in local.properties for a release build." }
            check(signed) { "android/keystore.properties is missing: see docs/RELEASE_ANDROID.md › Google Play." }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-opt-in=androidx.compose.foundation.layout.ExperimentalLayoutApi",
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.splashscreen)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    debugImplementation(libs.androidx.ui.tooling)

    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)

    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.androidx.biometric)
    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.converter.kotlinx.serialization)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.kotlinx.serialization.json)

    // JVM-only unit tests (no Robolectric/Espresso — no emulator in this
    // pass; see android/AGENTS.md and docs/TESTING.md's Phase 3 section).
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(kotlin("test"))
}

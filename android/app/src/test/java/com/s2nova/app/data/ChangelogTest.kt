package com.s2nova.app.data

import com.s2nova.app.BuildConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ChangelogTest {
    private val versions = Changelog.parse(File("src/main/assets/changelog.json").readText())

    @Test
    fun `compares versions by number, not text`() {
        assertTrue(compareVersions("1.10.0", "1.9.2") > 0)
        assertTrue(compareVersions("v1.3.0", "1.2.0") > 0)
        assertEquals(0, compareVersions("v1.2.0", "1.2.0"))
        assertTrue(compareVersions("1.2", "1.2.1") < 0)
    }

    @Test
    fun `this build has its Novedades`() {
        val current = versions.firstOrNull { it.version == BuildConfig.VERSION_NAME }
        assertNotNull("changelog.json needs an entry for ${BuildConfig.VERSION_NAME}", current)
        assertTrue(current!!.items.isNotEmpty())
    }

    @Test
    fun `versions are newest first`() {
        versions.zipWithNext().forEach { (newer, older) -> assertTrue(compareVersions(newer.version, older.version) > 0) }
    }

    @Test
    fun `every item has a capture in both themes`() {
        val res = File("src/main/res/drawable-nodpi")
        versions.flatMap { it.items }.forEach { item ->
            listOf("light", "dark").forEach { theme ->
                assertTrue("missing whatsnew_${item.image}_$theme", File(res, "whatsnew_${item.image}_$theme.webp").exists())
            }
        }
    }
}

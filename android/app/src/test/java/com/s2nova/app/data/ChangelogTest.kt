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
    }

    @Test
    fun `an update shows every version since the one last seen`() {
        fun v(version: String, vararg images: String) =
            ChangelogVersion(version, "2026-10-18", images.map { ChangelogItem(it, LocalizedText(it, it), LocalizedText(it, it)) })
        val list = listOf(v("1.3.0"), v("1.2.1", "a", "b"), v("1.1.0", "c"))
        // From 1.1.0: 1.3.0 has no items of its own, 1.2.1's show.
        assertEquals(listOf("a", "b"), WhatsNewStore.since(list, "1.1.0", "1.3.0")!!.items.map { it.image })
        assertEquals("1.3.0", WhatsNewStore.since(list, "1.1.0", "1.3.0")!!.version)
        // From 1.2.1: nothing new to page through.
        assertEquals(null, WhatsNewStore.since(list, "1.2.1", "1.3.0"))
        assertEquals(null, WhatsNewStore.since(list, "1.3.0", "1.3.0"))
        assertEquals(listOf("a", "b", "c"), WhatsNewStore.since(list, "1.0.0", "1.3.0")!!.items.map { it.image })
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

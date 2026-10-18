package com.s2nova.app.ui.screens.whatsnew

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.BuildConfig
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Changelog
import com.s2nova.app.data.ChangelogItem
import com.s2nova.app.data.ChangelogVersion
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.UpdateChecker
import com.s2nova.app.data.WhatsNewStore
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.NovaCard
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.longDateLabel
import com.s2nova.app.ui.nav.NovaDestinations
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.screens.settings.SecurityFrame
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch

// "Novedades": after an update, a sheet walks through what's new in this
// version, one feature per page with a capture of it; Ajustes › Novedades
// lists every version. And when GitHub has a newer APK, a sheet offers it.

// Each changelog image is a capture of the feature in both themes. Named
// here (not looked up by string) so resource shrinking keeps them.
@DrawableRes
private fun imageFor(key: String, dark: Boolean): Int? = when (key) {
    "assistant" -> if (dark) R.drawable.whatsnew_assistant_dark else R.drawable.whatsnew_assistant_light
    "loans" -> if (dark) R.drawable.whatsnew_loans_dark else R.drawable.whatsnew_loans_light
    "reports" -> if (dark) R.drawable.whatsnew_reports_dark else R.drawable.whatsnew_reports_light
    "lock" -> if (dark) R.drawable.whatsnew_lock_dark else R.drawable.whatsnew_lock_light
    "titles" -> if (dark) R.drawable.whatsnew_titles_dark else R.drawable.whatsnew_titles_light
    "home" -> if (dark) R.drawable.whatsnew_home_dark else R.drawable.whatsnew_home_light
    "goals" -> if (dark) R.drawable.whatsnew_goals_dark else R.drawable.whatsnew_goals_light
    else -> null
}

@Composable
private fun isDark(): Boolean {
    val override by ThemeController.darkOverride.collectAsStateWithLifecycle()
    return override ?: isSystemInDarkTheme()
}

// The capture, 3:2, framed like a card. Decorative: the title next to it
// says what it shows.
@Composable
private fun FeatureImage(key: String, modifier: Modifier = Modifier) {
    val res = imageFor(key, isDark())
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier
            .aspectRatio(3f / 2f)
            .clip(shape)
            .background(NovaColors.current.surfaceSunken)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape),
    ) {
        if (res != null) Image(painterResource(res), contentDescription = null, contentScale = ContentScale.Crop, alignment = Alignment.TopCenter, modifier = Modifier.matchParentSize())
    }
}

// Shown on Inicio: this version's Novedades once after an update, else a
// newer version on GitHub (once per version, until "Más tarde").
@Composable
fun WhatsNewHost(route: String?, onSeeAll: () -> Unit) {
    val context = LocalContext.current
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val release by UpdateChecker.available.collectAsStateWithLifecycle()
    var pending by remember { mutableStateOf(WhatsNewStore.pending(context)) }
    var promptClosed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { runCatching { UpdateChecker.check(context) } }
    if (route != NovaDestinations.HOME || user == null) return

    pending?.let { version ->
        val close = {
            WhatsNewStore.markSeen(context)
            pending = null
        }
        WhatsNewSheet(version, onClose = close, onSeeAll = {
            close()
            onSeeAll()
        })
        return
    }
    val newer = release ?: return
    if (promptClosed || !UpdateChecker.shouldPrompt(context, newer)) return
    UpdateSheet(
        release = newer,
        onDownload = {
            promptClosed = true
            UpdateChecker.dismiss(context, newer)
            UpdateChecker.download(context, newer)
        },
        onLater = {
            promptClosed = true
            UpdateChecker.dismiss(context, newer)
        },
    )
}

@Composable
fun WhatsNewSheet(version: ChangelogVersion, onClose: () -> Unit, onSeeAll: () -> Unit) {
    val colors = NovaColors.current
    val language = rememberAppLanguage()
    val pager = rememberPagerState { version.items.size }
    val scope = rememberCoroutineScope()
    val page = pager.currentPage
    val last = page == version.items.lastIndex
    NovaDraftSheet(onDismiss = onClose) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                tr(StringKey.WHATS_NEW_OVERLINE).format(version.version).uppercase(),
                style = NovaType.overline,
                color = colors.accentText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
            Text(tr(StringKey.WHATS_NEW_PAGE).format(page + 1, version.items.size), style = NovaType.caption, color = colors.textDim, maxLines = 1)
        }
        HorizontalPager(state = pager, pageSpacing = 16.dp, modifier = Modifier.padding(top = 12.dp)) { index ->
            val item = version.items[index]
            Column(Modifier.fillMaxWidth()) {
                FeatureImage(item.image, Modifier.fillMaxWidth())
                Text(
                    item.title.of(language),
                    style = NovaType.title,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp),
                )
                // Four lines kept for every page, so the sheet doesn't jump.
                Text(
                    item.body.of(language),
                    style = NovaType.body,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    minLines = 4,
                    modifier = Modifier.padding(top = 4.dp, start = 4.dp, end = 4.dp),
                )
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 16.dp).clearAndSetSemantics {},
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        ) {
            repeat(version.items.size) { i ->
                Box(
                    Modifier
                        .height(6.dp)
                        .width(if (i == page) 18.dp else 6.dp)
                        .background(if (i == page) colors.accentText else MaterialTheme.colorScheme.outline, CircleShape),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SecondaryButton(
                tr(if (page == 0) StringKey.COMMON_CLOSE else StringKey.WHATS_NEW_PREV),
                Modifier.weight(1f),
            ) { if (page == 0) onClose() else scope.launch { pager.animateScrollToPage(page - 1) } }
            DraftSheetPrimaryButton(
                tr(if (last) StringKey.WHATS_NEW_DONE else StringKey.WHATS_NEW_NEXT),
                enabled = true,
                modifier = Modifier.weight(1f),
                onClick = { if (last) onClose() else scope.launch { pager.animateScrollToPage(page + 1) } },
            )
        }
        Text(
            tr(StringKey.WHATS_NEW_ALL),
            style = NovaType.label,
            color = colors.link,
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .heightIn(min = 48.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(role = Role.Button, onClick = onSeeAll)
                .padding(vertical = 14.dp),
        )
    }
}

@Composable
private fun SecondaryButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .height(52.dp)
            .clip(shape)
            .border(1.dp, NovaColors.current.borderInput, shape)
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        Text(label, style = NovaType.label, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false)
    }
}

@Composable
fun UpdateSheet(release: UpdateChecker.Release, onDownload: () -> Unit, onLater: () -> Unit) {
    val colors = NovaColors.current
    NovaDraftSheet(onDismiss = onLater) {
        Row(Modifier.padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Image(
                painterResource(if (isDark()) R.drawable.logo_mark_dark else R.drawable.logo_mark_light),
                contentDescription = null,
                modifier = Modifier.size(56.dp),
            )
            Column(Modifier.weight(1f)) {
                Text(tr(StringKey.UPDATE_SHEET_TITLE), style = NovaType.title, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.semantics { heading() })
                Text(tr(StringKey.WHATS_NEW_VERSION).format(release.version), style = NovaType.bodySm, color = colors.textDim)
            }
        }
        Text(
            tr(StringKey.UPDATE_SHEET_BODY),
            style = NovaType.body,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp, end = 4.dp, top = 16.dp, bottom = 20.dp),
        )
        DraftSheetPrimaryButton(tr(StringKey.UPDATE_DOWNLOAD), enabled = true, onClick = onDownload)
        Text(
            tr(StringKey.UPDATE_LATER),
            style = NovaType.label,
            color = colors.link,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .heightIn(min = 48.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(role = Role.Button, onClick = onLater)
                .padding(vertical = 14.dp),
        )
    }
}

// Ajustes › Novedades: this build and whether a newer one is out, then
// every version, newest first.
@Composable
fun WhatsNewScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val colors = NovaColors.current
    val language = rememberAppLanguage()
    val versions = remember { Changelog.versions(context) }
    val release by UpdateChecker.available.collectAsStateWithLifecycle()
    var checking by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    SecurityFrame(title = tr(StringKey.WHATS_NEW_TITLE), onBack = onBack) {
        NovaCard(modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(tr(StringKey.WHATS_NEW_VERSION).format(BuildConfig.VERSION_NAME), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        when {
                            failed -> tr(StringKey.UPDATE_CHECK_FAILED)
                            release != null -> tr(StringKey.UPDATE_STATUS_NEW).format(release!!.version)
                            else -> tr(StringKey.UPDATE_STATUS_LATEST)
                        },
                        style = NovaType.bodySm,
                        color = when {
                            failed -> colors.negative
                            release != null -> colors.accentText
                            else -> colors.textDim
                        },
                    )
                }
                val newer = release
                Text(
                    when {
                        newer != null -> tr(StringKey.UPDATE_DOWNLOAD)
                        checking -> tr(StringKey.UPDATE_CHECKING)
                        else -> tr(StringKey.UPDATE_CHECK)
                    },
                    style = NovaType.label,
                    color = colors.link,
                    maxLines = 1,
                    softWrap = false,
                    modifier = Modifier
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .clickable(enabled = !checking, role = Role.Button) {
                            if (newer != null) {
                                UpdateChecker.download(context, newer)
                            } else {
                                checking = true
                                failed = false
                                scope.launch {
                                    failed = runCatching { UpdateChecker.check(context, force = true) }.isFailure
                                    checking = false
                                }
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 14.dp),
                )
            }
        }
        versions.forEach { version ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Text(
                        tr(StringKey.WHATS_NEW_VERSION).format(version.version),
                        style = NovaType.title,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.semantics { heading() },
                    )
                    if (version.version == BuildConfig.VERSION_NAME) {
                        Text(
                            tr(StringKey.WHATS_NEW_CURRENT),
                            style = NovaType.caption,
                            color = colors.accentText,
                            maxLines = 1,
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .border(1.dp, colors.primaryBorder, RoundedCornerShape(999.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
                Text(longDateLabel(version.date, language), style = NovaType.bodySm, color = colors.textDim)
                version.items.forEach { item -> HistoryItem(item) }
                if (version.also.isNotEmpty()) {
                    Text(tr(StringKey.WHATS_NEW_ALSO), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                    version.also.forEach { line ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("•", style = NovaType.bodySm, color = colors.textDim)
                            Text(line.of(language), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryItem(item: ChangelogItem) {
    val language = rememberAppLanguage()
    NovaCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FeatureImage(item.image, Modifier.width(108.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title.of(language), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface)
                Text(item.body.of(language), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}


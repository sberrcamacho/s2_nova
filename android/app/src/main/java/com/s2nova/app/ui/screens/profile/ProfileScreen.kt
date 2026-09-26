package com.s2nova.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.ui.components.categoryColor
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.monthYearShortLabel
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.stringFor
import com.s2nova.app.ui.theme.NovaColors

// Bordered boxes carry +1dp padding: the mockup's borders add to its
// padding (no box-sizing), Compose draws them inside.
// Perfil (Android v2 mockup): who you are, then Billeteras, Programados and
// Ajustes, then "Cerrar sesión". Reached from Inicio's avatar.
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenWallets: () -> Unit,
    onOpenRecurring: () -> Unit,
    onLogout: () -> Unit,
) {
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val recurringSeries by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val colors = NovaColors.current
    val language = user?.preferences?.language ?: AppLanguage.ES

    val subscriptionsColor = com.s2nova.app.ui.components.categoryColor("inc.transfers")
    val billsColor = com.s2nova.app.ui.components.categoryColor("exp.utilities")

    val walletsDetail = "${wallets.size} ${t(StringKey.PROFILE_WALLETS_DETAIL)} · ${format(wallets.sumOf { it.currentBalance })}"
    val activeSeriesCount = recurringSeries.count { it.active }
    val recurringDetail = if (activeSeriesCount > 0) "$activeSeriesCount ${t(StringKey.PROFILE_RECURRING_DETAIL)}" else t(StringKey.PROFILE_RECURRING_DETAIL_EMPTY)

    // "Bogotá, D.C. · desde nov 2024"
    val placeAndSince = remember(user?.memberSince, user?.city, language) {
        val since = user?.memberSince?.let { formatMemberSince(it, language) }
        val city = user?.city?.takeIf { it.isNotBlank() }
        when {
            city != null && since != null -> "$city · $since"
            city != null -> city
            else -> since?.replaceFirstChar { it.uppercase() }
        }
    }

    // The app shell's Scaffold already applies the status-bar inset.
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = t(StringKey.TITLE_PROFILE), onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                ProfileCard {
                    Row(modifier = Modifier.padding(19.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(54.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(user?.avatarInitials ?: "", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                        }
                        Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                            Text(user?.name ?: "", fontSize = 15.5.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.155).sp, color = MaterialTheme.colorScheme.onBackground)
                            Text(user?.email ?: "", fontSize = 11.5.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                            if (placeAndSince != null) Text(placeAndSince, fontSize = 11.sp, color = colors.textDim)
                        }
                    }
                }

                ProfileCard {
                    Column {
                        // The mockup's Billeteras chip colour is `var(--accent)29`,
                        // invalid CSS, so that circle never paints — only its glyph.
                        ProfileRow(MockupIcons.Billeteras, MaterialTheme.colorScheme.primary, chipFill = false, t(StringKey.WALLETS_TITLE), walletsDetail, onOpenWallets)
                        ProfileRow(MockupIcons.Programados, subscriptionsColor, chipFill = true, t(StringKey.RECURRING_TITLE), recurringDetail, onOpenRecurring)
                        ProfileRow(MockupIcons.Ajustes, billsColor, chipFill = true, t(StringKey.TITLE_SETTINGS), t(StringKey.PROFILE_SETTINGS_DETAIL), onOpenSettings)
                    }
                }

                Text(
                    t(StringKey.PROFILE_LOGOUT),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.negative,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0x4DFF6262), RoundedCornerShape(16.dp))
                        .clickable(onClick = onLogout)
                        .padding(15.dp),
                )
            }
        }
    }
}

@Composable
private fun ProfileCard(content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape),
    ) { content() }
}

// Every row keeps its bottom rule, the last one included, as in the mockup.
@Composable
private fun ProfileRow(icon: ImageVector, color: Color, chipFill: Boolean, label: String, detail: String, onClick: () -> Unit) {
    val colors = NovaColors.current
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 15.dp, horizontal = 19.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(34.dp).background(if (chipFill) color.copy(alpha = 0x29 / 255f) else Color.Transparent, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
            }
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                Text(detail, fontSize = 11.sp, color = colors.textDim)
            }
            Text("›", fontSize = 15.sp, color = colors.grip2, modifier = Modifier.padding(start = 14.dp))
        }
        HorizontalDivider(color = colors.dividerSubtle)
    }
}

// "desde nov 2024"
private fun formatMemberSince(memberSince: String, language: AppLanguage): String? {
    val label = runCatching { monthYearShortLabel(memberSince, language) }.getOrNull() ?: return null
    return "${stringFor(StringKey.PROFILE_MEMBER_SINCE, language)} $label"
}

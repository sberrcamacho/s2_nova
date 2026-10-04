package com.s2nova.app.ui.screens.profile

import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.novaRise
import com.s2nova.app.ui.theme.appCanvas
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType

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

    val walletsDetail = "${wallets.size} ${t(StringKey.PROFILE_WALLETS_DETAIL)} · ${format(wallets.sumOf { it.principalBalance })}"
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
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
        modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = t(StringKey.TITLE_PROFILE), onBack = onBack)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ProfileCard(0) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(56.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(user?.avatarInitials ?: "", style = NovaType.title, color = MaterialTheme.colorScheme.onPrimary)
                        }
                        Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                            Text(user?.name ?: "", style = NovaType.title, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(user?.email ?: "", style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            if (placeAndSince != null) Text(placeAndSince, style = NovaType.bodySm, color = colors.textDim)
                        }
                    }
                }

                ProfileCard(1) {
                    Column {
                        ProfileRow(MockupIcons.Billeteras, NovaColors.current.link, chipFill = false, t(StringKey.WALLETS_TITLE), walletsDetail, onOpenWallets)
                        ProfileRow(MockupIcons.Programados, subscriptionsColor, chipFill = true, t(StringKey.RECURRING_TITLE), recurringDetail, onOpenRecurring)
                        ProfileRow(MockupIcons.Ajustes, billsColor, chipFill = true, t(StringKey.TITLE_SETTINGS), t(StringKey.PROFILE_SETTINGS_DETAIL), onOpenSettings, last = true)
                    }
                }

                // Destructive, outlined: 52 dp, apart from the navigation rows.
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(50))
                        .border(1.dp, colors.negative, RoundedCornerShape(50))
                        .clickable(role = Role.Button, onClick = onLogout),
                ) {
                    Text(t(StringKey.PROFILE_LOGOUT), style = NovaType.label, color = colors.negative, maxLines = 1, softWrap = false)
                }
            }
        }
    }
}

@Composable
private fun ProfileCard(index: Int, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Box(
        modifier = Modifier
            .novaRise(index)
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .cardAurora()
            .border(1.dp, MaterialTheme.colorScheme.outline, shape),
    ) { content() }
}

// ListRow: icon 40, title and detail, chevron; at least 64 dp tall, with a
// `divider` between rows.
@Composable
private fun ProfileRow(icon: ImageVector, color: Color, chipFill: Boolean, label: String, detail: String, onClick: () -> Unit, last: Boolean = false) {
    val colors = NovaColors.current
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).clickable(role = Role.Button, onClick = onClick).padding(vertical = 12.dp, horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(color.copy(alpha = 0x29 / 255f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(label, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(detail, style = NovaType.bodySm.copy(fontFeatureSettings = "tnum"), color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            V2Icon(V2Icons.chevronRight, colors.textDim, 20.dp, modifier = Modifier.padding(start = 8.dp))
        }
        if (!last) HorizontalDivider(color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
    }
}

// "desde nov 2024"
private fun formatMemberSince(memberSince: String, language: AppLanguage): String? {
    val label = runCatching { monthYearShortLabel(memberSince, language) }.getOrNull() ?: return null
    return "${stringFor(StringKey.PROFILE_MEMBER_SINCE, language)} $label"
}

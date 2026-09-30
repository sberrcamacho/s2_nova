package com.s2nova.app.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.formatApprox
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.AppLanguage
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.MonthlySummary
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.remote.UpdatePreferencesRequest
import com.s2nova.app.data.repository.homeAlertOf
import com.s2nova.app.ui.AlertTarget
import com.s2nova.app.ui.CurrencyFormatter
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.IconCircle
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.presentAlert
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.screens.notifications.resolveGoalPlan
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaExtraColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.theme.heroSurface
import com.s2nova.app.ui.tr
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.util.Calendar
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

private val TileShape = RoundedCornerShape(20.dp)

// Inicio as a bento summary (DESIGN-SYSTEM.md §5.1 / §5.3): the balance
// hero, this month's Ingresos / Gastos tiles, the top unread alert with its
// action, Presupuestos (the three riskiest) beside the next Programado, then
// the 5 most recent movements as a flat list.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenProfile: () -> Unit,
    onOpenTransactions: () -> Unit,
    onOpenTransactionDetail: (String) -> Unit,
    onOpenBudgets: () -> Unit,
    onOpenRecurring: () -> Unit,
    onOpenWallets: () -> Unit,
    onOpenAlertTarget: (AlertTarget) -> Unit,
    onCreateAccount: () -> Unit = {},
) {
    var showNotifications by remember { mutableStateOf(false) }
    var peek by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var syncFailed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val user by AppContainer.authRepository.currentUser.collectAsStateWithLifecycle()
    val notices by AppContainer.notificationRepository.notifications.collectAsStateWithLifecycle()
    val alerts by AppContainer.alertRepository.alerts.collectAsStateWithLifecycle()
    val readAlertIds by AppContainer.alertRepository.readIds.collectAsStateWithLifecycle()
    val dismissedAlertIds by AppContainer.alertRepository.dismissedIds.collectAsStateWithLifecycle()
    val months by AppContainer.summaryRepository.months.collectAsStateWithLifecycle()
    val budgetProgress by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val recurringSeries by AppContainer.recurringSeriesRepository.series.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val language = rememberAppLanguage()
    val darkOverride by ThemeController.darkOverride.collectAsStateWithLifecycle()
    val isDark = darkOverride ?: isSystemInDarkTheme()

    // Everything Inicio shows, refetched on every visit (and on pull), so
    // the alert card and the month figures never go stale between logins.
    // A failure keeps the last loaded data on screen behind the sync banner.
    suspend fun refreshHome() {
        val results = listOf(
            runCatching { AppContainer.walletRepository.refresh() },
            runCatching { AppContainer.summaryRepository.refresh() },
            runCatching { AppContainer.alertRepository.refresh() },
            runCatching { AppContainer.budgetRepository.refresh() },
            runCatching { AppContainer.recurringSeriesRepository.refresh() },
            runCatching { AppContainer.transactionRepository.refresh() },
        )
        syncFailed = results.any { it.isFailure }
    }

    LaunchedEffect(Unit) { refreshHome() }

    // Σ wallet balance converted to the principal currency. The backend
    // already leaves PLANNED movements out of each wallet's balance.
    val balance = wallets.sumOf { it.principalBalance }
    val thisMonth = months.lastOrNull()
    val lastMonth = months.getOrNull(months.size - 2)
    // The shared "hide amounts" preference (Web's eye button flips the same
    // one). Tapping a hidden balance peeks at it without changing it.
    val hidePref = user?.preferences?.blurBalance ?: false
    val hidden = hidePref && !peek
    fun toggleHidden() {
        val next = !hidePref
        peek = false
        AppContainer.authRepository.updateUser { u -> u.copy(preferences = u.preferences.copy(blurBalance = next)) }
        scope.launch { AppContainer.authRepository.persistPreferences(UpdatePreferencesRequest(blurBalance = next)) }
    }
    val unreadCount = alerts.count { it.id !in readAlertIds } + notices.count { !it.read }
    val homeAlert = homeAlertOf(alerts, readAlertIds, dismissedAlertIds)
    val today = LocalDate.now()
    val upcoming = remember(recurringSeries, today) { upcomingWithin(recurringSeries, today) }
    val walletNames = remember(wallets) { wallets.associate { it.id to it.name } }
    val greetingKey = remember {
        when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 5..11 -> StringKey.HOME_GREETING_MORNING
            in 12..18 -> StringKey.HOME_GREETING_AFTERNOON
            else -> StringKey.HOME_GREETING_EVENING
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Header stays fixed above the scrollable content. The two round
        // buttons are 40 dp visuals inside 48 dp touch targets.
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
        ) {
            Image(
                painter = painterResource(if (isDark) R.drawable.logo_mark_dark else R.drawable.logo_mark_light),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp)),
            )
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(t(greetingKey), style = NovaType.caption, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    user?.name?.substringBefore(" ") ?: "",
                    style = NovaType.title,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .clickable(onClickLabel = t(StringKey.SETTINGS_NOTIFICATIONS), role = Role.Button) { showNotifications = true }
                    .semantics { contentDescription = t(StringKey.SETTINGS_NOTIFICATIONS) },
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(MaterialTheme.colorScheme.surface, CircleShape)
                        .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
                ) {
                    Icon(
                        MockupIcons.Bell,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp).align(Alignment.Center),
                    )
                    if (unreadCount > 0) {
                        // Unread dot with a 2 dp surface ring.
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = (-8).dp, y = 8.dp)
                                .size(11.dp)
                                .background(MaterialTheme.colorScheme.surface, CircleShape)
                                .padding(2.dp)
                                .background(colors.negative, CircleShape),
                        )
                    }
                }
            }
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .clickable(role = Role.Button, onClick = onOpenProfile)
                    .semantics { contentDescription = t(StringKey.TITLE_PROFILE) },
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(40.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
                ) {
                    Text(user?.avatarInitials ?: "", style = NovaType.label, color = Color.White, maxLines = 1)
                }
            }
        }

        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = {
                scope.launch {
                    refreshing = true
                    refreshHome()
                    refreshing = false
                }
            },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (syncFailed) {
                    item {
                        SyncErrorBanner(
                            message = t(StringKey.HOME_SYNC_ERROR),
                            action = t(StringKey.COMMON_RETRY),
                            onRetry = { scope.launch { refreshHome() } },
                        )
                    }
                }

                if (AppContainer.isGuest) {
                    item { GuestBanner(onCreateAccount) }
                }

                // 2×1 hero.
                item {
                    BalanceHero(
                        balance = format(balance),
                        walletCount = wallets.size,
                        hidden = hidden,
                        canPeek = hidePref,
                        onPeek = { peek = !peek },
                        onToggleHidden = ::toggleHidden,
                        onOpenWallets = onOpenWallets,
                    )
                }

                // Ingresos / Gastos, 1×1 + 1×1.
                item {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                    ) {
                        StatTile(
                            label = t(StringKey.HOME_INCOME),
                            a11yLabel = t(StringKey.HOME_MONTH_INCOME),
                            value = thisMonth?.income,
                            previous = lastMonth?.income,
                            previousMonth = lastMonth?.month,
                            income = true,
                            hidden = hidden,
                            format = format,
                            language = language,
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                        )
                        StatTile(
                            label = t(StringKey.HOME_EXPENSES),
                            a11yLabel = t(StringKey.HOME_MONTH_EXPENSES),
                            value = thisMonth?.expenses,
                            previous = lastMonth?.expenses,
                            previousMonth = lastMonth?.month,
                            income = false,
                            hidden = hidden,
                            format = format,
                            language = language,
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                        )
                    }
                }

                // 2×1 alert with its action.
                if (homeAlert != null) {
                    item(key = homeAlert.id) {
                        HomeAlertCard(
                            alert = homeAlert,
                            format = format,
                            onOpen = {
                                AppContainer.alertRepository.markRead(homeAlert.id)
                                onOpenAlertTarget(presentAlert(homeAlert, t, format).target)
                            },
                            onDismiss = { AppContainer.alertRepository.dismissFromHome(homeAlert.id) },
                        )
                    }
                }

                // Presupuestos / Próximo pago, 1×1 + 1×1.
                item {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                    ) {
                        BudgetsTile(
                            budgets = homeBudgets(budgetProgress),
                            language = language,
                            onClick = onOpenBudgets,
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                        )
                        NextPaymentTile(
                            upcoming = upcoming,
                            language = language,
                            onClick = onOpenRecurring,
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                        )
                    }
                }

                // Movimientos recientes: a flat list. A new account has none,
                // so the section is left out.
                if (transactions.isNotEmpty()) item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(TileShape)
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outline, TileShape),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 4.dp),
                        ) {
                            Text(
                                t(StringKey.HOME_RECENT_TXNS),
                                style = NovaType.title,
                                color = MaterialTheme.colorScheme.onBackground,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                            LinkButton(t(StringKey.HOME_SEE_ALL), onOpenTransactions)
                        }
                        val recent = transactions.take(5)
                        recent.forEachIndexed { index, txn ->
                            RecentRow(
                                transaction = txn,
                                walletName = walletNames[txn.walletId],
                                dateLabel = recentDateLabel(txn.date, today, t, language),
                                onClick = { onOpenTransactionDetail(txn.id) },
                            )
                            if (index < recent.lastIndex) {
                                HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showNotifications) {
        com.s2nova.app.ui.screens.notifications.NotificationsSheet(
            onDismiss = { showNotifications = false },
            onOpenAlertTarget = onOpenAlertTarget,
        )
    }
}

// The app's own month abbreviations — the JDK's es-CO short months
// ("sept.") don't match Web's.
private val MONTHS_ES = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
private val MONTHS_EN = listOf("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")

private fun monthAbbr(monthValue: Int, language: AppLanguage): String =
    (if (language == AppLanguage.EN) MONTHS_EN else MONTHS_ES)[monthValue - 1]

private fun monthFull(month: YearMonth, language: AppLanguage): String =
    month.month.getDisplayName(java.time.format.TextStyle.FULL, if (language == AppLanguage.EN) Locale.ENGLISH else Locale.forLanguageTag("es"))

// "94 %" in Spanish, "94%" in English.
private fun percentText(value: Int, language: AppLanguage): String =
    if (language == AppLanguage.EN) "$value%" else "$value %"

private fun recentDateLabel(iso: String, today: LocalDate, t: (StringKey) -> String, language: AppLanguage): String {
    val date = runCatching { LocalDate.parse(iso) }.getOrNull() ?: return iso
    return when (date) {
        today -> t(StringKey.TXN_LIST_TODAY)
        today.minusDays(1) -> t(StringKey.TXN_LIST_YESTERDAY)
        else -> "${date.dayOfMonth} ${monthAbbr(date.monthValue, language)}"
    }
}

// A row's amount in its own currency, with its typographic sign
// ("−US$5,99" / "+$4.400.000") kept as one unbreakable unit, plus the
// "≈" principal-currency line for a foreign movement — the same rule as
// Movimientos' TransactionRow. The column never shrinks; the title does.
@Composable
private fun AmountColumn(amount: Double, currency: String, income: Boolean, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val principal = AppContainer.currencyRepository.principal
    Column(horizontalAlignment = Alignment.End, modifier = modifier) {
        Text(
            (if (income) "+" else "−") + formatMoney(abs(amount), currency),
            style = NovaType.amount,
            color = if (income) colors.positive else colors.negative,
            maxLines = 1,
            softWrap = false,
        )
        if (currency != principal) {
            Text(
                "≈ " + formatApprox(abs(amount) * AppContainer.currencyRepository.rate(currency, principal), principal),
                style = NovaType.caption.copy(fontFeatureSettings = "tnum"),
                color = colors.textDim,
                maxLines = 1,
                softWrap = false,
            )
        }
    }
}

@Composable
internal fun SyncErrorBanner(message: String, action: String, onRetry: () -> Unit) {
    val colors = NovaColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, colors.negativeBorder, RoundedCornerShape(16.dp))
            .padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
    ) {
        Text(message, style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        LinkButton(action, onRetry)
    }
}

// A text button ("Ver todos", "Reintentar"): `label` in `link`, one line,
// on a 48 dp touch target.
@Composable
private fun LinkButton(text: String, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp),
    ) {
        Text(text, style = NovaType.label, color = NovaColors.current.link, maxLines = 1, softWrap = false)
    }
}

// A tonal button (DESIGN-SYSTEM.md §6.3): 40 dp visual, 48 dp target.
@Composable
private fun TonalButton(text: String, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .height(40.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp))
                .padding(horizontal = 16.dp),
        ) {
            Text(text, style = NovaType.label, color = MaterialTheme.colorScheme.onPrimaryContainer, maxLines = 1, softWrap = false)
        }
    }
}

// A bento tile: `surface`, 1 dp `border`, 20 dp radius, 16 dp padding.
private fun Modifier.tile(surface: Color, border: Color): Modifier =
    this.clip(TileShape).background(surface).border(1.dp, border, TileShape)

@Composable
private fun TileHeader(text: String, showChevron: Boolean = false) {
    val colors = NovaColors.current
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(
            text.uppercase(),
            style = NovaType.overline,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        if (showChevron) V2Icon(V2Icons.chevronRight, colors.textDim, 16.dp, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
private fun BalanceHero(
    balance: String,
    walletCount: Int,
    hidden: Boolean,
    canPeek: Boolean,
    onPeek: () -> Unit,
    onToggleHidden: () -> Unit,
    onOpenWallets: () -> Unit,
) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val shape = TileShape
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, shape, ambientColor = Color.Black.copy(alpha = 0.08f), spotColor = Color.Black.copy(alpha = 0.16f))
            .heroSurface(shape)
            .padding(start = 20.dp, end = 12.dp, top = 8.dp, bottom = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(
                t(StringKey.HOME_BALANCE),
                style = NovaType.overline,
                color = colors.heroOverline,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            // Eye toggle for the shared "hide amounts" preference; it
            // announces its on/off state.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .padding(start = 4.dp)
                    .size(48.dp)
                    .clip(CircleShape)
                    .toggleable(value = hidden, role = Role.Switch, onValueChange = { onToggleHidden() })
                    .semantics { contentDescription = t(StringKey.HOME_HIDE_AMOUNTS) },
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(40.dp).background(colors.heroTile, CircleShape)) {
                    V2Icon(if (hidden) V2Icons.eyeOff else V2Icons.eye, Color.White, 20.dp)
                }
            }
        }
        Text(
            balance,
            style = NovaType.display,
            color = Color.White,
            maxLines = 1,
            softWrap = false,
            // The balance never wraps: it steps down to fit narrow screens
            // and large font scales.
            autoSize = TextAutoSize.StepBased(minFontSize = 24.sp, maxFontSize = 40.sp),
            modifier = Modifier
                .padding(top = 4.dp, end = 8.dp)
                // Unbounded, so the blur fades past the text box instead of
                // stopping at a hard rectangle.
                .then(if (hidden) Modifier.blur(12.dp, BlurredEdgeTreatment.Unbounded) else Modifier)
                .clickable(enabled = canPeek, onClick = onPeek)
                // A hidden balance is never read out.
                .then(if (hidden) Modifier.clearAndSetSemantics { contentDescription = t(StringKey.AMOUNT_HIDDEN) } else Modifier),
        )
    if (walletCount > 0) {
            // "4 billeteras ›": a tonal pill on hero-tile, 48 dp tall target.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .height(48.dp)
                    .offset(x = (-4).dp)
                    .clip(RoundedCornerShape(50))
                    .clickable(role = Role.Button, onClick = onOpenWallets),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(colors.heroTile, RoundedCornerShape(50))
                        .padding(start = 12.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                ) {
                    Text(
                        "$walletCount ${t(if (walletCount == 1) StringKey.HOME_WALLET_ONE else StringKey.HOME_WALLET_MANY)}",
                        style = NovaType.label,
                        color = colors.heroLabel,
                        maxLines = 1,
                        softWrap = false,
                    )
                    V2Icon(V2Icons.chevronRight, colors.heroLabel, 16.dp, modifier = Modifier.padding(start = 2.dp))
                }
            }
        }
        if (walletCount == 0) {
            // Empty state: $0 plus a way to the wallet list, since the
            // balance is the sum of wallets.
            Text(
                t(StringKey.HOME_ADD_FIRST_WALLET),
                style = NovaType.label,
                color = colors.heroLabel,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .clickable(role = Role.Button, onClick = onOpenWallets),
            )
        }
    }
}

// StatTile (DESIGN-SYSTEM.md §6.7): overline label, the month's figure with
// its sign in `title`, and the change against last month with an arrow.
// Whether the change is good or bad decides its color, not its sign.
@Composable
private fun StatTile(
    label: String,
    a11yLabel: String,
    value: Double?,
    previous: Double?,
    previousMonth: String?,
    income: Boolean,
    hidden: Boolean,
    format: CurrencyFormatter,
    language: AppLanguage,
    modifier: Modifier = Modifier,
) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val figure = value?.let { (if (income) "+" else "−") + format(it) }
    val prevMonth = previousMonth?.let { runCatching { YearMonth.parse(it) }.getOrNull() }
    val change = if (value != null && previous != null && previous > 0) ((value - previous) / previous * 100).roundToInt() else null
    val favorable = change != null && (if (income) change > 0 else change < 0)
    val changeColor = when {
        change == null || change == 0 -> colors.textDim
        favorable -> colors.positive
        else -> colors.negative
    }
    val changeText = if (change != null && prevMonth != null) {
        val arrow = when {
            change > 0 -> "↑ "
            change < 0 -> "↓ "
            else -> ""
        }
        arrow + percentText(abs(change), language) + " " + t(StringKey.HOME_VS).format(monthAbbr(prevMonth.monthValue, language))
    } else {
        t(StringKey.HOME_THIS_MONTH)
    }
    // "Ingresos del mes, +$4.288.500, 3 % más que agosto, favorable".
    val description = buildList {
        add(a11yLabel)
        add(if (hidden) t(StringKey.AMOUNT_HIDDEN) else figure ?: "")
        if (change != null && change != 0 && prevMonth != null) {
            add(t(if (change > 0) StringKey.HOME_STAT_MORE else StringKey.HOME_STAT_LESS).format(abs(change), monthFull(prevMonth, language)))
            add(t(if (favorable) StringKey.HOME_FAVORABLE else StringKey.HOME_UNFAVORABLE))
        }
    }.filter { it.isNotEmpty() }.joinToString(", ")

    Column(
        modifier = modifier
            .tile(MaterialTheme.colorScheme.surface, MaterialTheme.colorScheme.outline)
            .clearAndSetSemantics { contentDescription = description }
            .padding(16.dp),
    ) {
        Text(label.uppercase(), style = NovaType.overline, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (figure != null) {
            Text(
                figure,
                style = NovaType.title.copy(fontFeatureSettings = "tnum"),
                color = if (income) colors.positive else colors.negative,
                maxLines = 1,
                softWrap = false,
                autoSize = TextAutoSize.StepBased(minFontSize = 14.sp, maxFontSize = 20.sp),
                modifier = Modifier
                    .padding(top = 4.dp)
                    .then(if (hidden) Modifier.blur(8.dp, BlurredEdgeTreatment.Unbounded) else Modifier),
            )
        } else {
            // Loading skeleton where the amount goes.
            Box(
                modifier = Modifier
                    .padding(top = 6.dp, bottom = 2.dp)
                    .fillMaxWidth(0.7f)
                    .height(20.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(colors.surfaceSunken),
            )
        }
        Text(
            changeText,
            style = NovaType.caption.copy(fontFeatureSettings = "tnum"),
            color = changeColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

// The alert's semantic tone, shown as the card's leading bar: overdue and
// over-budget are `negative`, pending payments `warning`, goal news
// `positive`.
internal fun alertTone(alert: AppAlert, colors: NovaExtraColors): Color = when (alert) {
    is AppAlert.SeriesDue -> if (alert.overdue) colors.negative else colors.warning
    is AppAlert.LoanOpen -> if (alert.overdue) colors.negative else colors.warning
    is AppAlert.BudgetAtRisk -> if (alert.percentage > 100) colors.negative else colors.warning
    is AppAlert.GoalNear, is AppAlert.GoalPlanAuto -> colors.positive
    is AppAlert.GoalPlanDue, is AppAlert.TxPlanned -> colors.warning
}

// Alert card (DESIGN-SYSTEM.md §6.10): a 4 dp leading bar in the semantic
// tone, the icon tile, a one-line title, a two-line body and an explicit
// action ("Confirmar aporte" + "Omitir" for a due goal plan, "Revisar"
// otherwise), plus a 48 dp dismiss button.
@Composable
private fun HomeAlertCard(alert: AppAlert, format: CurrencyFormatter, onOpen: () -> Unit, onDismiss: () -> Unit) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val copy = presentAlert(alert, t, format)
    val tone = alertTone(alert, colors)
    Row(
        verticalAlignment = Alignment.Top,
        modifier = Modifier
            .fillMaxWidth()
            .clip(TileShape)
            .background(MaterialTheme.colorScheme.surface)
            .drawBehind { drawRect(tone, size = Size(4.dp.toPx(), size.height)) }
            .border(1.dp, MaterialTheme.colorScheme.outline, TileShape)
            .clickable(onClick = onOpen)
            .padding(start = 16.dp, end = 4.dp, top = 12.dp, bottom = 4.dp),
    ) {
        IconCircle(icon = copy.icon, color = copy.color, size = CategoryIconSize.MD)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp, top = 2.dp)) {
            Text(copy.title, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(copy.body, style = NovaType.bodySm, color = colors.textDim, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                val goalId = copy.confirmGoalId
                if (goalId != null) {
                    TonalButton(t(StringKey.PLAN_CONFIRM)) { resolveGoalPlan(goalId, alert.id, confirm = true) }
                    LinkButton(t(StringKey.PLAN_SKIP)) { resolveGoalPlan(goalId, alert.id, confirm = false) }
                } else {
                    TonalButton(t(StringKey.HOME_ALERT_REVIEW), onOpen)
                }
            }
        }
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable(onClick = onDismiss, role = Role.Button)
                .semantics { contentDescription = t(StringKey.COMMON_DISMISS) },
            contentAlignment = Alignment.Center,
        ) {
            V2Icon(V2Icons.close, colors.textDim, 20.dp)
        }
    }
}

internal fun toneColor(tone: BudgetTone, colors: NovaExtraColors): Color = when (tone) {
    BudgetTone.NEGATIVE -> colors.negative
    BudgetTone.WARNING -> colors.warning
    BudgetTone.POSITIVE -> colors.positive
}

// Presupuestos, 1×1: the three riskiest budgets as compact BudgetBars
// (name, percentage and state icon over an 8 dp bar). The whole tile opens
// Planes › Presupuestos.
@Composable
private fun BudgetsTile(budgets: List<BudgetProgress>, language: AppLanguage, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val t = rememberStrings()
    Column(
        modifier = modifier
            .tile(MaterialTheme.colorScheme.surface, MaterialTheme.colorScheme.outline)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(16.dp),
    ) {
        TileHeader(t(StringKey.TITLE_BUDGETS))
        if (budgets.isEmpty()) {
            Text(t(StringKey.HOME_BUDGETS_NONE), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(top = 8.dp))
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 12.dp)) {
                budgets.forEach { CompactBudgetBar(it, language) }
            }
        }
    }
}

@Composable
private fun CompactBudgetBar(progress: BudgetProgress, language: AppLanguage) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val label = progress.budget.name ?: categoryName(progress.budget.category)
    val tone = budgetTone(progress.percentage)
    val color = toneColor(tone, colors)
    val icon = when (tone) {
        BudgetTone.NEGATIVE -> V2Icons.alertCircle
        BudgetTone.WARNING -> V2Icons.warn
        BudgetTone.POSITIVE -> V2Icons.check
    }
    val state = t(
        when {
            progress.percentage > 100 -> StringKey.BUDGET_STATUS_OVER
            tone == BudgetTone.POSITIVE -> StringKey.BUDGET_STATUS_ON_TRACK
            else -> StringKey.BUDGET_STATUS_NEAR
        },
    )
    Column(modifier = Modifier.fillMaxWidth().clearAndSetSemantics { contentDescription = "$label, ${percentText(progress.percentage, language)}, $state" }) {
        Text(label, style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(8.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceSunken),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.percentage.coerceIn(0, 100) / 100f)
                        .fillMaxHeight()
                        .clip(CircleShape)
                        .background(color),
                )
            }
            Text(
                percentText(progress.percentage, language),
                style = NovaType.label.copy(fontFeatureSettings = "tnum"),
                color = color,
                maxLines = 1,
                softWrap = false,
                modifier = Modifier.padding(start = 8.dp),
            )
            V2Icon(icon, color, 16.dp, modifier = Modifier.padding(start = 4.dp))
        }
    }
}

// Próximo pago, 1×1: the next Programado within 7 days (due-today first),
// with a count of the rest. The tile opens Programados.
@Composable
private fun NextPaymentTile(upcoming: List<UpcomingItem>, language: AppLanguage, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val next = upcoming.firstOrNull()
    Column(
        modifier = modifier
            .tile(MaterialTheme.colorScheme.surface, MaterialTheme.colorScheme.outline)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(16.dp),
    ) {
        TileHeader(t(StringKey.HOME_NEXT_PAYMENT))
        if (next == null) {
            Text(t(StringKey.HOME_UPCOMING_EMPTY), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(top = 8.dp))
        } else {
            Text(
                if (next.dueToday) t(StringKey.HOME_UPCOMING_TODAY) else "${next.date.dayOfMonth} ${monthAbbr(next.date.monthValue, language)}",
                style = NovaType.overline,
                color = if (next.dueToday) colors.warning else colors.textDim,
                maxLines = 1,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                next.series.name,
                style = NovaType.titleSm,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
            AmountColumn(
                amount = next.series.amount,
                currency = next.series.currency,
                income = next.series.type == TransactionType.INCOME,
                modifier = Modifier.padding(top = 2.dp),
            )
            if (upcoming.size > 1) {
                Text(
                    t(StringKey.HOME_UPCOMING_MORE).format(upcoming.size - 1),
                    style = NovaType.caption,
                    color = colors.textDim,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}

// ListRow (DESIGN-SYSTEM.md §6.2): icon 40, one-line title and meta, and an
// intrinsic-width amount column; at least 64 dp tall.
@Composable
private fun RecentRow(
    transaction: Transaction,
    walletName: String?,
    dateLabel: String,
    onClick: () -> Unit,
) {
    val colors = NovaColors.current
    val income = transaction.type == TransactionType.INCOME
    val subtitle = listOfNotNull(transaction.merchant?.takeIf { it.isNotBlank() }, dateLabel, walletName).joinToString(" · ")
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        CategoryIcon(category = transaction.category, subcategoryId = transaction.subcategoryId, size = CategoryIconSize.MD)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(transaction.description, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, style = NovaType.bodySm, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        AmountColumn(amount = transaction.amount, currency = transaction.currency, income = income, modifier = Modifier.padding(start = 12.dp))
    }
}

// "Modo invitado" banner.
@Composable
private fun GuestBanner(onCreateAccount: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.primaryContainer)
            .border(1.dp, NovaColors.current.primaryBorder.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
            .padding(start = 16.dp, end = 12.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(tr(StringKey.GUEST_TITLE), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground)
            Text(tr(StringKey.GUEST_BODY), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        }
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .heightIn(min = 48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(primary)
                .clickable(role = Role.Button, onClick = onCreateAccount)
                .padding(horizontal = 16.dp),
        ) {
            Text(tr(StringKey.AUTH_CREATE), style = NovaType.label, color = Color.White, maxLines = 1, softWrap = false)
        }
    }
}

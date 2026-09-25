package com.s2nova.app.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.R
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.ThemeController
import com.s2nova.app.data.mock.categoryMap
import com.s2nova.app.data.model.AppAlert
import com.s2nova.app.data.model.BudgetProgress
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.repository.homeAlertOf
import com.s2nova.app.ui.AlertTarget
import com.s2nova.app.ui.CurrencyFormatter
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.components.CategoryIconSize
import com.s2nova.app.ui.components.IconCircle
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.presentAlert
import com.s2nova.app.ui.rememberAppLanguage
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaExtraColors
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.util.Calendar
import kotlin.math.abs

// Inicio, per S2 Nova Android v2 › Inicio and STAGE-2-INICIO §1/§3: balance
// hero (sum of wallets + this month's income/expenses from the backend
// summary), the top unread alert, the three riskiest budgets, the next 7
// days of Programados and the 5 most recent movements.
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
) {
    var showNotifications by remember { mutableStateOf(false) }
    var balanceRevealed by remember { mutableStateOf(false) }
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

    // Sums each wallet's own currentBalance rather than re-deriving it from
    // the transaction list — the backend already excludes PLANNED ("Upcoming")
    // transactions' effects from that balance (they haven't moved money yet).
    val balance = wallets.sumOf { it.currentBalance }
    val thisMonth = months.lastOrNull()
    val blurBalancePref = user?.preferences?.blurBalance ?: false
    val isBalanceBlurred = blurBalancePref && !balanceRevealed
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
        // Header stays fixed above the scrollable content (mockup: flex none).
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 14.dp),
        ) {
            Image(
                painter = painterResource(if (isDark) R.drawable.logo_mark_dark else R.drawable.logo_mark_light),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp)),
            )
            Column(modifier = Modifier.weight(1f).padding(start = 11.dp)) {
                Text(t(greetingKey), fontSize = 11.sp, color = colors.textDim)
                Text(
                    user?.name?.substringBefore(" ") ?: "",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.24).sp,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                    .clickable(onClickLabel = t(StringKey.SETTINGS_NOTIFICATIONS), role = Role.Button) { showNotifications = true }
                    .semantics { contentDescription = t(StringKey.SETTINGS_NOTIFICATIONS) },
            ) {
                Icon(
                    MockupIcons.Bell,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(17.dp).align(Alignment.Center),
                )
                if (unreadCount > 0) {
                    // 7dp dot with a 2dp --surface ring, at top 9 / right 10
                    // inside the 1dp border.
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = (-11).dp, y = 10.dp)
                            .size(11.dp)
                            .background(MaterialTheme.colorScheme.surface, CircleShape)
                            .padding(2.dp)
                            .background(colors.negative, CircleShape),
                    )
                }
            }
            Box(
                modifier = Modifier
                    .padding(start = 10.dp)
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onOpenProfile)
                    .semantics { contentDescription = t(StringKey.TITLE_PROFILE) },
                contentAlignment = Alignment.Center,
            ) {
                Text(user?.avatarInitials ?: "", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
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
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
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

                item {
                    BalanceHero(
                        balance = format(balance),
                        walletCount = wallets.size,
                        monthIncome = thisMonth?.let { format(it.income) },
                        monthExpenses = thisMonth?.let { format(it.expenses) },
                        blurred = isBalanceBlurred,
                        canToggleBlur = blurBalancePref,
                        onToggleReveal = { balanceRevealed = !balanceRevealed },
                        onOpenWallets = onOpenWallets,
                    )
                }

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

                if (budgetProgress.isNotEmpty()) {
                    item {
                        HomeCard {
                            CardHeader(title = t(StringKey.TITLE_BUDGETS), link = t(StringKey.HOME_SEE_ALL), onLink = onOpenBudgets)
                            Column(
                                verticalArrangement = Arrangement.spacedBy(13.dp),
                                modifier = Modifier.padding(top = 14.dp),
                            ) {
                                homeBudgets(budgetProgress).forEach { progress ->
                                    HomeBudgetRow(progress = progress, format = format, onClick = onOpenBudgets)
                                }
                            }
                        }
                    }
                }

                item {
                    HomeCard {
                        CardHeader(title = t(StringKey.HOME_UPCOMING_7_DAYS), link = t(StringKey.HOME_UPCOMING_LINK), onLink = onOpenRecurring)
                        Column(modifier = Modifier.padding(top = 10.dp)) {
                            upcoming.forEachIndexed { index, item ->
                                UpcomingRow(
                                    item = item,
                                    format = format,
                                    language = language,
                                    showDivider = index < upcoming.lastIndex,
                                    onClick = onOpenRecurring,
                                )
                            }
                            if (upcoming.isEmpty()) {
                                Text(
                                    t(StringKey.HOME_UPCOMING_EMPTY),
                                    fontSize = 12.sp,
                                    color = colors.textDim,
                                    modifier = Modifier.padding(top = 6.dp, bottom = 2.dp),
                                )
                            }
                        }
                    }
                }

                // The mockup has no empty variant for this list, so a new
                // account simply doesn't show the section.
                if (transactions.isNotEmpty()) item {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                        ) {
                            CardTitle(t(StringKey.HOME_RECENT_TXNS), Modifier.weight(1f))
                            CardLink(t(StringKey.HOME_SEE_ALL), onOpenTransactions)
                        }
                        transactions.take(5).forEach { txn ->
                            RecentRow(
                                transaction = txn,
                                walletName = walletNames[txn.walletId],
                                dateLabel = recentDateLabel(txn.date, today, t, language),
                                format = format,
                                onClick = { onOpenTransactionDetail(txn.id) },
                            )
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

// The mockup's own abbreviations (MONTHS_ABBR) — the JDK's es-CO short
// months ("sept.") don't match them.
private val MONTHS_ES = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
private val MONTHS_EN = listOf("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")

private fun monthAbbr(date: LocalDate, language: com.s2nova.app.data.model.AppLanguage): String =
    (if (language == com.s2nova.app.data.model.AppLanguage.EN) MONTHS_EN else MONTHS_ES)[date.monthValue - 1]

// Mockup money format with its typographic minus: "−$168.500" / "+$4.400.000".
private fun signedAmount(format: CurrencyFormatter, amount: Double, income: Boolean): String =
    (if (income) "+" else "−") + format(abs(amount))

private fun recentDateLabel(iso: String, today: LocalDate, t: (StringKey) -> String, language: com.s2nova.app.data.model.AppLanguage): String {
    val date = runCatching { LocalDate.parse(iso) }.getOrNull() ?: return iso
    return when (date) {
        today -> t(StringKey.TXN_LIST_TODAY)
        today.minusDays(1) -> t(StringKey.TXN_LIST_YESTERDAY)
        else -> "${date.dayOfMonth} ${monthAbbr(date, language)}"
    }
}

@Composable
internal fun SyncErrorBanner(message: String, action: String, onRetry: () -> Unit) {
    val colors = NovaColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, colors.negativeBorder, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(message, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(
            action,
            fontSize = 12.sp,
            fontWeight = FontWeight.ExtraBold,
            color = colors.accentText,
            modifier = Modifier
                .clickable(onClick = onRetry)
                .padding(start = 12.dp, top = 4.dp, bottom = 4.dp),
        )
    }
}

@Composable
private fun BalanceHero(
    balance: String,
    walletCount: Int,
    monthIncome: String?,
    monthExpenses: String?,
    blurred: Boolean,
    canToggleBlur: Boolean,
    onToggleReveal: () -> Unit,
    onOpenWallets: () -> Unit,
) {
    val colors = NovaColors.current
    val t = rememberStrings()
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(
                // linear-gradient(150deg, hero-a 0%, hero-b 60%, hero-c 100%)
                Brush.linearGradient(
                    0f to colors.heroFrom,
                    0.6f to colors.heroMid,
                    1f to colors.heroTo,
                ),
            )
            .border(1.dp, colors.heroBorder, RoundedCornerShape(24.dp))
            // Glow toward the top-right corner (mockup: a 170px circle at
            // top -56 / right -30, blur 46). Drawn behind the content rather
            // than as a child so it never takes part in the card's layout; a
            // radial gradient reads as the blurred circle without
            // Modifier.blur's hard rectangular clip.
            .drawBehind {
                val center = Offset(size.width - 55.dp.toPx(), 29.dp.toPx())
                val radius = (85 + 46).dp.toPx()
                drawCircle(
                    brush = Brush.radialGradient(listOf(Color(0x6B6C5CE7), Color(0x006C5CE7)), center = center, radius = radius),
                    radius = radius,
                    center = center,
                )
            },
    ) {
        Column(modifier = Modifier.padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(
                    t(StringKey.HOME_BALANCE),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = colors.accentText,
                    modifier = Modifier.weight(1f),
                )
                if (walletCount > 0) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color.White.copy(alpha = 0.08f))
                            .clickable(onClick = onOpenWallets)
                            .padding(start = 10.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
                    ) {
                        Text(
                            "$walletCount ${t(if (walletCount == 1) StringKey.HOME_WALLET_ONE else StringKey.HOME_WALLET_MANY)}",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            "›",
                            fontSize = 12.sp,
                            lineHeight = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 4.dp),
                        )
                    }
                }
            }
            Text(
                balance,
                fontSize = 34.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1.02).sp,
                color = Color.White,
                modifier = Modifier
                    .padding(top = 10.dp)
                    // Unbounded: the mockup's CSS blur fades past the text box
                    // instead of stopping at a hard rectangle.
                    .then(if (blurred) Modifier.blur(11.dp, BlurredEdgeTreatment.Unbounded) else Modifier)
                    .clickable(enabled = canToggleBlur, onClick = onToggleReveal)
                    // A blurred balance must never be read out.
                    .then(if (blurred) Modifier.clearAndSetSemantics { contentDescription = t(StringKey.AMOUNT_HIDDEN) } else Modifier),
            )
            if (blurred) {
                Text(
                    t(StringKey.HOME_BALANCE_TAP_TO_REVEAL),
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.accentText,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clickable(onClick = onToggleReveal),
                )
            }
            if (walletCount == 0) {
                // Empty state (STAGE-2-INICIO §4): $0 plus a way to the
                // wallet list, since the balance is the sum of wallets.
                Text(
                    t(StringKey.HOME_ADD_FIRST_WALLET),
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.accentText,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clickable(onClick = onOpenWallets),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 18.dp)) {
                HeroStatTile(label = t(StringKey.HOME_MONTH_INCOME), value = monthIncome, valueColor = colors.positive, modifier = Modifier.weight(1f))
                HeroStatTile(label = t(StringKey.HOME_MONTH_EXPENSES), value = monthExpenses, valueColor = colors.negative, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HeroStatTile(label: String, value: String?, valueColor: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(horizontal = 13.dp, vertical = 11.dp),
    ) {
        Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (value != null) {
            Text(value, fontSize = 14.5.sp, fontWeight = FontWeight.ExtraBold, color = valueColor, modifier = Modifier.padding(top = 3.dp))
        } else {
            // Loading skeleton: a 60%-width bar where the amount goes.
            Box(
                modifier = Modifier
                    .padding(top = 5.dp)
                    .fillMaxWidth(0.6f)
                    .height(14.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color.White.copy(alpha = 0.10f)),
            )
        }
    }
}

@Composable
private fun HomeAlertCard(alert: AppAlert, format: CurrencyFormatter, onOpen: () -> Unit, onDismiss: () -> Unit) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val copy = presentAlert(alert, t, format)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
            .clickable(onClick = onOpen)
            .padding(start = 16.dp, end = 12.dp, top = 14.dp, bottom = 14.dp),
    ) {
        IconCircle(icon = copy.icon, color = copy.color, size = CategoryIconSize.ALERT)
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(copy.title, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            Text(copy.body, fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
        }
        Box(
            modifier = Modifier
                .padding(start = 12.dp)
                .size(32.dp)
                .clip(CircleShape)
                .clickable(onClick = onDismiss)
                .semantics { contentDescription = t(StringKey.COMMON_DISMISS) },
            contentAlignment = Alignment.Center,
        ) {
            Text("✕", fontSize = 15.sp, color = colors.textDim)
        }
    }
}

@Composable
private fun HomeCard(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
            .padding(18.dp),
    ) {
        content()
    }
}

@Composable
private fun CardTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, modifier = modifier)
}

@Composable
private fun CardLink(text: String, onClick: () -> Unit) {
    Text(
        text,
        fontSize = 11.5.sp,
        fontWeight = FontWeight.Bold,
        color = NovaColors.current.accentText,
        modifier = Modifier.clickable(onClick = onClick),
    )
}

@Composable
private fun CardHeader(title: String, link: String, onLink: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        CardTitle(title, Modifier.weight(1f))
        CardLink(link, onLink)
    }
}

internal fun toneColor(tone: BudgetTone, colors: NovaExtraColors): Color = when (tone) {
    BudgetTone.NEGATIVE -> colors.negative
    BudgetTone.WARNING -> colors.warning
    BudgetTone.POSITIVE -> colors.positive
}

@Composable
private fun HomeBudgetRow(progress: BudgetProgress, format: CurrencyFormatter, onClick: () -> Unit) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val label = progress.budget.name ?: categoryMap[progress.budget.category]?.let { t(categoryStringKey(it.id)) } ?: ""
    val tone = toneColor(budgetTone(progress.percentage), colors)
    Column(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Text("${progress.percentage}%", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = tone)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(MaterialTheme.colorScheme.outline),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth((progress.percentage.coerceIn(0, 100)) / 100f)
                    .height(6.dp)
                    .background(tone),
            )
        }
        Text(
            "${format(progress.spent)} / ${format(progress.budget.limit)}",
            fontSize = 11.sp,
            color = colors.textDim,
            modifier = Modifier.padding(top = 5.dp),
        )
    }
}

@Composable
private fun UpcomingRow(item: UpcomingItem, format: CurrencyFormatter, language: com.s2nova.app.data.model.AppLanguage, showDivider: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    val t = rememberStrings()
    val income = item.series.type == TransactionType.INCOME
    Column(modifier = Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 10.dp)) {
            Column(modifier = Modifier.width(42.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    if (item.dueToday) t(StringKey.HOME_UPCOMING_TODAY) else monthAbbr(item.date, language).uppercase(),
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (item.dueToday) colors.warning else colors.textDim,
                )
                Text(
                    item.date.dayOfMonth.toString().padStart(2, '0'),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(item.series.name, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    if (item.dueToday) {
                        t(StringKey.HOME_UPCOMING_DUE_TODAY)
                    } else {
                        t(StringKey.HOME_UPCOMING_SCHEDULED).format(intervalLabel(item.series.interval, t).lowercase())
                    },
                    fontSize = 11.sp,
                    color = colors.textDim,
                )
            }
            Text(
                signedAmount(format, item.series.amount, income),
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (income) colors.positive else colors.negative,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
        if (showDivider) {
            HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle)
        }
    }
}

@Composable
private fun RecentRow(
    transaction: Transaction,
    walletName: String?,
    dateLabel: String,
    format: CurrencyFormatter,
    onClick: () -> Unit,
) {
    val colors = NovaColors.current
    val income = transaction.type == TransactionType.INCOME
    val subtitle = listOfNotNull(transaction.merchant?.takeIf { it.isNotBlank() }, dateLabel, walletName).joinToString(" · ")
    Column(modifier = Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 11.dp)) {
            CategoryIcon(category = transaction.category, subcategoryId = transaction.subcategoryId, size = CategoryIconSize.ROW)
            Column(modifier = Modifier.weight(1f).padding(start = 13.dp)) {
                Text(
                    transaction.description,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(subtitle, fontSize = 11.sp, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(
                signedAmount(format, transaction.amount, income),
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (income) colors.positive else colors.negative,
                modifier = Modifier.padding(start = 13.dp),
            )
        }
        HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle)
    }
}

private fun intervalLabel(interval: RecurrenceInterval, t: (StringKey) -> String): String = when (interval) {
    RecurrenceInterval.WEEKLY -> t(StringKey.RECURRENCE_WEEKLY)
    RecurrenceInterval.MONTHLY -> t(StringKey.RECURRENCE_MONTHLY)
    RecurrenceInterval.YEARLY -> t(StringKey.RECURRENCE_YEARLY)
}

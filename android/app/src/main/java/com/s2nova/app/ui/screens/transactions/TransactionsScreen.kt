package com.s2nova.app.ui.screens.transactions

import com.s2nova.app.ui.tour.tourTarget
import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.theme.ctaBrush
import com.s2nova.app.ui.theme.novaRise
import com.s2nova.app.ui.theme.novaItem
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.width
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.theme.NovaType
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.formatApprox
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.data.formatDayGroupDate
import com.s2nova.app.data.todayISO
import com.s2nova.app.data.matchesSearch
import com.s2nova.app.ui.components.categoryColor
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.components.TransactionRow
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import java.time.LocalDate
import com.s2nova.app.ui.tr
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.CatMark
import androidx.compose.foundation.selection.toggleable
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Pill

private enum class TypeFilter(val key: StringKey) {
    ALL(StringKey.TXN_LIST_FILTER_ALL),
    EXPENSE(StringKey.HOME_EXPENSES),
    INCOME(StringKey.HOME_INCOME),
    PENDING(StringKey.TXN_LIST_FILTER_PENDING),
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun TransactionsScreen(
    onOpenRecurring: () -> Unit,
    onOpenDetail: (String) -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    var filter by rememberSaveable { mutableStateOf(TypeFilter.ALL) }
    var cats by rememberSaveable { mutableStateOf(listOf<String>()) }
    var query by rememberSaveable { mutableStateOf("") }
    var showFilters by remember { mutableStateOf(false) }
    val categories = AppContainer.categoryRepository
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current
    val today = todayISO()
    val yesterday = remember(today) { LocalDate.parse(today).minusDays(1).toString() }

    // Same rule as Web: type, then category, then the text typed in the search
    // box against title, merchant, counterparty, category and wallet, ignoring
    // accents and case.
    val filtered = transactions.filter { txn ->
        val typeOk = when (filter) {
            TypeFilter.ALL -> true
            TypeFilter.INCOME -> txn.type == TransactionType.INCOME
            TypeFilter.EXPENSE -> txn.type == TransactionType.EXPENSE
            TypeFilter.PENDING -> txn.status == TransactionStatus.PLANNED
        }
        typeOk && (cats.isEmpty() || txn.category in cats) && (
            query.isBlank() || matchesSearch(
                listOfNotNull(
                    txn.description, txn.merchant, txn.counterpartyName,
                    categories.label(if (txn.type == TransactionType.TRANSFER) CategoryRepository.TRANSFER else txn.subcategoryId ?: txn.category),
                    wallets.firstOrNull { it.id == txn.walletId }?.name,
                ).joinToString(" "),
                query,
            )
        )
    }
    val activeFilters = (if (filter != TypeFilter.ALL) 1 else 0) + cats.size
    val clearAll = { filter = TypeFilter.ALL; cats = emptyList(); query = "" }
    // The day cards rise in once per visit (web .nova-card); scrolling or
    // filtering afterwards never replays it.
    var introPlayed by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(900); introPlayed = true }

    Scaffold(
        // Movimientos is a bottom-bar tab: headline title, no back arrow, and
        // the Programados screen on the right.
        topBar = { MovimientosHeader(title = t(StringKey.TITLE_TRANSACTIONS), programados = t(StringKey.HOME_UPCOMING_LINK), onOpenRecurring = onOpenRecurring) },
        containerColor = Color.Transparent,
        modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background),
    ) { padding ->
        // Top only: the app's bottom bar already covers the navigation-bar
        // inset, so applying it again here left an empty band above the bar.
        Column(modifier = Modifier.padding(top = padding.calculateTopPadding())) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SearchBox(value = query, onValueChange = { query = it }, modifier = Modifier.weight(1f).tourTarget("mov.search", 14.dp))
                Box(Modifier.tourTarget("mov.filters", 14.dp)) { FiltersButton(count = activeFilters, onClick = { showFilters = true }) }
            }

            val loaded by AppContainer.dataLoaded.collectAsStateWithLifecycle()
            if (!loaded && filtered.isEmpty()) {
                com.s2nova.app.ui.components.NovaSkeletonRows(count = 6, modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp))
            } else if (filtered.isEmpty()) {
                val narrowed = transactions.isNotEmpty()
                Text(
                    tr(if (narrowed) StringKey.MV_NO_RESULTS else StringKey.MV_EMPTY),
                    style = NovaType.bodySm, color = colors.textDim, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 28.dp, bottom = if (narrowed) 4.dp else 28.dp),
                )
                if (narrowed) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.align(Alignment.CenterHorizontally).heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp))
                            .clickable(role = Role.Button, onClick = clearAll).padding(horizontal = 16.dp),
                    ) {
                        Text(tr(StringKey.MV_CLEAR_FILTERS), style = NovaType.label, color = colors.accentText, maxLines = 1, softWrap = false)
                    }
                }
            } else {
                // Flat layout (DESIGN-SYSTEM.md §5.1): one `surface` card per day
                // with `divider` between rows. The bottom padding clears the FAB.
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 56.dp)) {
                    val principal = AppContainer.currencyRepository.principal
                    val scheduled = filtered.filter { it.status == TransactionStatus.PLANNED }.sortedBy { it.date + it.time }
                    val groups = buildList {
                        if (scheduled.isNotEmpty()) add("sched" to scheduled)
                        filtered.filter { it.status != TransactionStatus.PLANNED }.sortedByDescending { it.date + it.time }
                            .groupBy { it.date }.forEach { (d, list) -> add(d to list) }
                    }
                    var seq = 0
                    groups.forEachIndexed { index, (key, txns) ->
                        val headSeq = seq++
                        item(key = "h-$key") {
                            // Transfers stay inside the user's wallets, so they don't move the day's net.
                            val netTotal = txns.sumOf {
                                val v = it.amount * AppContainer.currencyRepository.rate(it.currency, principal)
                                when (it.type) {
                                    TransactionType.INCOME -> v
                                    TransactionType.EXPENSE -> -v
                                    TransactionType.TRANSFER -> 0.0
                                }
                            }
                            val sched = key == "sched"
                            val dayLabel = when (key) {
                                "sched" -> tr(StringKey.MV_SCHEDULED)
                                today -> t(StringKey.TXN_LIST_TODAY)
                                yesterday -> t(StringKey.TXN_LIST_YESTERDAY)
                                else -> formatDayGroupDate(key)
                            }.uppercase()
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 4.dp, end = 4.dp, top = if (index == 0) 8.dp else 20.dp, bottom = 8.dp)
                                    .novaRise(headSeq, enabled = !introPlayed)
                                    .semantics(mergeDescendants = true) { heading() },
                            ) {
                                Text(
                                    dayLabel,
                                    style = NovaType.overline,
                                    color = if (sched) colors.warning else colors.textDim,
                                    maxLines = 1,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    (if (netTotal >= 0) "+" else "\u2212") + formatApprox(kotlin.math.abs(netTotal), principal),
                                    style = NovaType.overline.copy(fontFeatureSettings = "tnum"),
                                    color = if (sched) colors.warning else if (netTotal >= 0) colors.positive else colors.textDim,
                                    maxLines = 1,
                                    softWrap = false,
                                    modifier = Modifier.padding(start = 12.dp),
                                )
                            }
                        }
                        val rowSeq = seq
                        seq += txns.size
                        itemsIndexed(txns, key = { _, it -> it.id }) { i, txn: Transaction ->
                            val walletName = wallets.firstOrNull { it.id == txn.walletId }?.name?.let { shortWallet(it) }
                            val subtitle = if (txn.status == TransactionStatus.PLANNED) {
                                listOfNotNull(fmtDate(txn.date), walletName).joinToString(" · ")
                            } else {
                                listOfNotNull((txn.merchant ?: txn.counterpartyName)?.takeIf { it.isNotBlank() }, walletName).joinToString(" · ")
                            }
                            val first = i == 0
                            val last = i == txns.lastIndex
                            val shape = RoundedCornerShape(
                                topStart = if (first) 20.dp else 0.dp, topEnd = if (first) 20.dp else 0.dp,
                                bottomStart = if (last) 20.dp else 0.dp, bottomEnd = if (last) 20.dp else 0.dp,
                            )
                            Column(
                                modifier = novaItem()
                                    .novaRise(rowSeq + i, enabled = !introPlayed)
                                    .then(if (index == 0 && i == 0) Modifier.tourTarget("mov.row", 20.dp) else Modifier)
                                    .fillMaxWidth()
                                    .clip(shape)
                                    .background(MaterialTheme.colorScheme.surface)
                                    .cardBorder(MaterialTheme.colorScheme.outline, first, last),
                            ) {
                                TransactionRow(transaction = txn, subtitle = subtitle, onClick = { onOpenDetail(txn.id) })
                                if (!last) HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFilters) {
        // The sheet has two pages: the filters, and the category list that the
        // Categoría field opens.
        var picking by remember { mutableStateOf(false) }
        NovaDraftSheet(onDismiss = { showFilters = false }) {
            if (!picking) {
                SheetHeader(t(StringKey.MV_FILTERS))
                FieldLabel(t(StringKey.MV_TYPE))
                Box(Modifier.selectableGroup()) {
                    PillRow {
                        TypeFilter.entries.forEach { f ->
                            // A category belongs to one type, so changing the type resets them.
                            V2Pill(t(f.key), filter == f, { filter = f; cats = emptyList() })
                        }
                    }
                }
                FieldLabel(t(StringKey.BUD_CATEGORY), Modifier.padding(top = 16.dp))
                val fieldShape = RoundedCornerShape(12.dp)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 52.dp)
                        .clip(fieldShape)
                        .border(1.dp, colors.borderInput, fieldShape)
                        .clickable(role = Role.DropdownList) { picking = true }
                        .padding(horizontal = 14.dp),
                ) {
                    if (cats.size == 1) CatMark(cats.first(), 32.dp)
                    Text(
                        if (cats.isEmpty()) t(StringKey.MV_ALL_CATEGORIES) else cats.joinToString(", ") { categories.label(it) },
                        style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                    )
                    V2Icon(V2Icons.chevronDown, MaterialTheme.colorScheme.onSurfaceVariant, 20.dp)
                }
                V2Button(tr(StringKey.MV_SHOW_RESULTS, filtered.size), onClick = { showFilters = false }, modifier = Modifier.padding(top = 20.dp))
                if (activeFilters > 0) {
                    SheetTextAction(
                        t(StringKey.MV_CLEAR_FILTERS), MaterialTheme.colorScheme.onSurfaceVariant,
                        { filter = TypeFilter.ALL; cats = emptyList() },
                        modifier = Modifier.padding(top = 8.dp).heightIn(min = 48.dp),
                    )
                }
            } else {
                val back = t(StringKey.COMMON_BACK)
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button) { picking = false }.semantics { contentDescription = back },
                    ) { V2Icon(V2Icons.back, MaterialTheme.colorScheme.onBackground, 22.dp) }
                    Text(
                        t(StringKey.BUD_CATEGORY), style = NovaType.title, color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.padding(start = 4.dp).semantics { heading() },
                    )
                }
                val kinds = when (filter) {
                    TypeFilter.INCOME -> listOf(true)
                    TypeFilter.EXPENSE -> listOf(false)
                    else -> listOf(false, true)
                }
                // Several categories can be on at once; "Todas" clears them.
                // Wrapping chips keep both kinds on one screen with no scroll
                // (the scroll is only the large-font fallback).
                Column(
                    Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    com.s2nova.app.ui.components.PillRow {
                        CheckChip(t(StringKey.MV_ALL_CATEGORIES), checked = cats.isEmpty(), onToggle = { cats = emptyList() })
                    }
                    // With both kinds, a Gastos | Ingresos switch shows one
                    // group at a time so the page fits; picks in both stay.
                    var showIncome by remember { mutableStateOf(false) }
                    if (kinds.size > 1) {
                        com.s2nova.app.ui.components.SegmentedChoice(
                            listOf(
                                com.s2nova.app.ui.components.SegmentOption(false, t(StringKey.HOME_EXPENSES), listOf("M7 17 17 7", "M8 7h9v9")),
                                com.s2nova.app.ui.components.SegmentOption(true, t(StringKey.HOME_INCOME), listOf("M17 7 7 17", "M16 17H7V8")),
                            ),
                            showIncome,
                        ) { showIncome = it }
                    }
                    kinds.filter { kinds.size == 1 || it == showIncome }.forEach { income ->
                        com.s2nova.app.ui.components.PillRow {
                            categories.parents(income, includeHidden = false).forEach { n ->
                                CheckChip(
                                    categories.displayName(n),
                                    checked = n.id in cats,
                                    onToggle = { cats = if (n.id in cats) cats - n.id else cats + n.id },
                                    glyph = categories.glyph(n.id),
                                    color = Color(n.color),
                                )
                            }
                        }
                    }
                }
                V2Button(t(StringKey.NM_DONE), onClick = { picking = false }, modifier = Modifier.padding(top = 16.dp))
            }
        }
    }
}

// A checkable chip of the category filter: 40 dp on a 48 dp target, the
// toned glyph (or a check when on) and the name, so being selected is not
// carried by color alone.
@Composable
private fun CheckChip(label: String, checked: Boolean, onToggle: () -> Unit, glyph: List<String>? = null, color: Color = Color.Unspecified) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(10.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .minimumInteractiveComponentSize()
            .heightIn(min = 40.dp)
            .clip(shape)
            .background(if (checked) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)
            .border(if (checked) 2.dp else 1.dp, if (checked) colors.primaryBorder else colors.borderInput, shape)
            .toggleable(value = checked, role = Role.Checkbox, onValueChange = { onToggle() })
            .padding(start = 10.dp, end = 14.dp),
    ) {
        when {
            checked -> V2Icon(V2Icons.check, colors.accentText, 18.dp, strokeWidth = 2.6f)
            glyph != null -> V2Icon(glyph, com.s2nova.app.ui.components.categoryTone(color), 18.dp, strokeWidth = 2f)
        }
        Text(label, style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis)
    }
}

// Search field: 48 dp, `surface` with a `border-input` outline that becomes a
// 2 dp `primary` border on focus. The placeholder is also its accessible name.
@Composable
private fun SearchBox(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = NovaColors.current
    val shape = RoundedCornerShape(12.dp)
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val focus = LocalFocusManager.current
    val placeholder = tr(StringKey.MV_SEARCH)
    val clear = tr(StringKey.MV_SEARCH_CLEAR)
    val style = NovaType.bodySm.copy(color = MaterialTheme.colorScheme.onSurface)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .height(48.dp)
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(if (focused) 2.dp else 1.dp, if (focused) colors.primaryBorder else colors.borderInput, shape)
            .padding(start = 16.dp),
    ) {
        V2Icon(V2Icons.search, MaterialTheme.colorScheme.onSurfaceVariant, 20.dp)
        Box(Modifier.weight(1f).padding(start = 10.dp)) {
            if (value.isEmpty()) Text(placeholder, style = style.copy(color = MaterialTheme.colorScheme.onSurfaceVariant), maxLines = 1, overflow = TextOverflow.Ellipsis)
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = style,
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                interactionSource = interaction,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = placeholder },
            )
        }
        if (value.isNotEmpty()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button) { onValueChange("") }.semantics { contentDescription = clear },
            ) { V2Icon(V2Icons.close, MaterialTheme.colorScheme.onSurfaceVariant, 18.dp) }
        } else {
            Spacer(Modifier.width(14.dp))
        }
    }
}

// Opens the filters sheet. With filters applied it fills with `primary` and
// shows how many, so the state is not carried by color alone.
@Composable
private fun FiltersButton(count: Int, onClick: () -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    val active = count > 0
    val label = if (active) tr(StringKey.MV_FILTERS_ACTIVE, count) else tr(StringKey.MV_FILTERS)
    // Active fills with the brand gradient (web's selected chip), white ink.
    val ink = if (active) Color.White else MaterialTheme.colorScheme.onSurface
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        modifier = Modifier
            .height(48.dp)
            .widthIn(min = 48.dp)
            .clip(shape)
            .then(if (active) Modifier.background(ctaBrush()) else Modifier.background(MaterialTheme.colorScheme.surface))
            .border(1.dp, if (active) Color.Transparent else NovaColors.current.borderInput, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 13.dp)
            .semantics(mergeDescendants = true) { contentDescription = label },
    ) {
        V2Icon(V2Icons.sliders, ink, 20.dp)
        if (active) Text("$count", style = NovaType.label.copy(fontFeatureSettings = "tnum"), color = ink, maxLines = 1, softWrap = false)
    }
}

// A day card is split across lazy items (one per row), so each item draws
// its part of the card's 1 dp border: both sides, plus the rounded top edge
// on the first row and the rounded bottom edge on the last. A one-row card
// uses a plain border.
private fun Modifier.cardBorder(color: Color, first: Boolean, last: Boolean): Modifier =
    if (first && last) this.border(1.dp, color, RoundedCornerShape(16.dp)) else this.drawWithContent {
        drawContent()
        val w = 1.dp.toPx()
        val r = 20.dp.toPx()
        val t = w / 2
        val x0 = t
        val x1 = size.width - t
        val h = size.height
        val y = h - t
        val path = Path().apply {
            when {
                first -> {
                    moveTo(x0, h)
                    lineTo(x0, t + r)
                    arcTo(Rect(x0, t, x0 + 2 * r, t + 2 * r), 180f, 90f, false)
                    lineTo(x1 - r, t)
                    arcTo(Rect(x1 - 2 * r, t, x1, t + 2 * r), 270f, 90f, false)
                    lineTo(x1, h)
                }
                last -> {
                    moveTo(x0, 0f)
                    lineTo(x0, y - r)
                    arcTo(Rect(x0, y - 2 * r, x0 + 2 * r, y), 180f, -90f, false)
                    lineTo(x1 - r, y)
                    arcTo(Rect(x1 - 2 * r, y - 2 * r, x1, y), 90f, -90f, false)
                    lineTo(x1, 0f)
                }
                else -> {
                    moveTo(x0, 0f); lineTo(x0, h)
                    moveTo(x1, 0f); lineTo(x1, h)
                }
            }
        }
        drawPath(path, color, style = Stroke(w))
    }

// The title keeps its full width: when it and the labeled Programados button
// don't fit on one line (narrow phones, large text), the button drops to an
// icon-only 48 dp button with the same accessible name.
@Composable
private fun MovimientosHeader(title: String, programados: String, onOpenRecurring: () -> Unit) {
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp)) {
        val titleWidth = with(density) { measurer.measure(title, NovaType.headline).size.width.toDp() }
        val labelWidth = with(density) { measurer.measure(programados, NovaType.label).size.width.toDp() }
        // 14 + 18 icon + 8 + label + 14, plus a 16 dp gap after the title.
        val labeled = titleWidth + 16.dp + 54.dp + labelWidth <= maxWidth
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                title,
                style = NovaType.headline,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
            // Secondary button (§6.3) at the tonal height: 40 dp on a 48 dp target.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .height(48.dp)
                    .tourTarget("mov.scheduled", 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(role = Role.Button, onClick = onOpenRecurring)
                    .then(if (labeled) Modifier else Modifier.width(48.dp).semantics { contentDescription = programados }),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .height(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, NovaColors.current.borderInput, RoundedCornerShape(10.dp))
                        .padding(horizontal = if (labeled) 14.dp else 10.dp),
                ) {
                    V2Icon(V2Icons.repeat, MaterialTheme.colorScheme.onSurface, 18.dp)
                    if (labeled) Text(programados, style = NovaType.label, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, softWrap = false)
                }
            }
        }
    }
}

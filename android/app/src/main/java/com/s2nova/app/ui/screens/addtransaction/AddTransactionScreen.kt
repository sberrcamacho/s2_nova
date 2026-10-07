package com.s2nova.app.ui.screens.addtransaction

import com.s2nova.app.ui.tour.tourTarget
import com.s2nova.app.ui.theme.appCanvas
import android.content.Context
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.semantics.stateDescription
import com.s2nova.app.ui.theme.NovaType
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.WalletType
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.CounterpartyKind
import com.s2nova.app.data.model.LoanKind
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.RecurrenceInterval
import com.s2nova.app.data.model.RecurringSeries
import com.s2nova.app.data.model.RepeatRule
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.GlyphMark
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.OverdraftDialog
import com.s2nova.app.ui.components.OptionTile
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
import com.s2nova.app.ui.components.SuggestedTag
import com.s2nova.app.ui.components.categoryName
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.components.toneOf
import com.s2nova.app.ui.theme.BrandColors
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.amountSurface
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import kotlin.math.roundToInt
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.dayMonthLabel

// "Nuevo movimiento" (design_handoff_s2_nova_v2/docs/NEW_MOVEMENT.md): the
// category sheet opens first, picking a leaf opens the amount pad, and
// everything else is optional behind the option tiles. The same screen
// edits an existing movement (editTransactionId), opening on the form, and
// a Programados series (editSeriesId): its template and its Repetir rule,
// the date being its next occurrence.

enum class NmSheet { CATEGORY, SUB, PAD, WHEN, REPEAT, CURRENCY, ATTACH, FROM, BPICK, MORE }

enum class Freq(val interval: RecurrenceInterval, private val labelKey: StringKey, private val everyKey: StringKey) {
    DAILY(RecurrenceInterval.DAILY, StringKey.NM_FREQ_DAILY, StringKey.NM_EVERY_DAILY),
    WEEKLY(RecurrenceInterval.WEEKLY, StringKey.NM_FREQ_WEEKLY, StringKey.NM_EVERY_WEEKLY),
    MONTHLY(RecurrenceInterval.MONTHLY, StringKey.NM_FREQ_MONTHLY, StringKey.NM_EVERY_MONTHLY),
    YEARLY(RecurrenceInterval.YEARLY, StringKey.NM_FREQ_YEARLY, StringKey.NM_EVERY_YEARLY);

    val label: String get() = tr(labelKey)
    val every: String get() = tr(everyKey)
}

enum class RepeatEnd { COUNT, UNTIL, NEVER }

data class RepeatDraft(val freq: Freq? = Freq.MONTHLY, val end: RepeatEnd = RepeatEnd.COUNT, val count: Int = 12, val until: String = "", val auto: Boolean = false)

// `existing`: the receipt the movement already has (editing) — only its
// name, type and size are known here.
data class AttachDraft(val name: String, val mime: String, val bytes: ByteArray, val existing: Boolean = false, val size: Long = bytes.size.toLong()) {
    val isPhoto: Boolean get() = mime.startsWith("image/")
    val sizeLabel: String get() = sizeLabel(size)
}

fun sizeLabel(size: Long): String = if (size >= 1_000_000) String.format(java.util.Locale.forLanguageTag("es-CO"), "%.1f MB", size / 1_000_000.0) else "${(size / 1000).coerceAtLeast(1)} KB"

fun addFreq(date: LocalDate, freq: Freq, k: Long): LocalDate = when (freq) {
    Freq.DAILY -> date.plusDays(k)
    Freq.WEEKLY -> date.plusWeeks(k)
    Freq.MONTHLY -> date.plusMonths(k)
    Freq.YEARLY -> date.plusYears(k)
}

// repeatSummary: "Cada semana × 4 · del 21 ago al 11 sep".
fun repeatSummary(r: RepeatDraft?, start: LocalDate): String {
    val f = r?.freq ?: return tr(StringKey.NM_NO_REPEAT)
    val u = f.every
    return when (r.end) {
        RepeatEnd.COUNT -> tr(StringKey.NM_REPEAT_COUNT, u, r.count, fmtDate(start.toString()), fmtDate(addFreq(start, f, (r.count - 1).toLong()).toString()))
        RepeatEnd.UNTIL -> tr(StringKey.NM_REPEAT_UNTIL, u, if (r.until.isNotBlank()) fmtDate(r.until) else "…")
        RepeatEnd.NEVER -> tr(StringKey.NM_REPEAT_NEVER, u)
    }
}

fun repeatOf(rs: RecurringSeries) = RepeatDraft(
    freq = Freq.entries.first { it.interval == rs.interval },
    end = if (rs.occurrences != null) RepeatEnd.COUNT else if (rs.endDate != null) RepeatEnd.UNTIL else RepeatEnd.NEVER,
    count = rs.occurrences ?: 12,
    until = rs.endDate.orEmpty(),
    auto = rs.autoConfirm,
)

fun repeatShort(r: RepeatDraft?): String = r?.freq?.let { it.label + if (r.end == RepeatEnd.COUNT) " ×${r.count}" else "" } ?: tr(StringKey.NM_REPEAT)

fun shortWallet(name: String): String = name.split('—').first().trim()

// Where an expense or transfer leaves its source wallet, or null when it
// doesn't push it below zero (or deeper) — Guardar's overdraft warning.
// Credit-card wallets live below zero, and a scheduled movement doesn't move
// the balance yet, so neither warns. `refund` is what the edited movement
// had already taken from this same wallet, in the wallet's currency.
fun overdraftAfter(balance: Double, spend: Double, refund: Double, credit: Boolean, future: Boolean): Double? {
    if (credit || future || spend <= 0) return null
    val after = Math.round((balance + refund - spend) * 100) / 100.0
    return after.takeIf { it < 0 && it < balance }
}

// Local, per-device preferences: last pad mode and the last manually chosen
// date/time ("Como el anterior").
object NmPrefs {
    private fun prefs(context: Context) = context.getSharedPreferences("nuevo_movimiento", Context.MODE_PRIVATE)
    fun padMode(context: Context): Boolean = prefs(context).getBoolean("calc", false)
    fun setPadMode(context: Context, calc: Boolean) = prefs(context).edit().putBoolean("calc", calc).apply()
    fun lastWhen(context: Context): Pair<String, String>? = prefs(context).getString("lastWhen", null)?.split(' ')?.let { it[0] to it[1] }
    fun setLastWhen(context: Context, date: String, time: String) = prefs(context).edit().putString("lastWhen", "$date $time").apply()
}

class NmState(initialCalc: Boolean) {
    var type by mutableStateOf(TransactionType.EXPENSE)
    var category by mutableStateOf("exp.food")
    var sub by mutableStateOf<String?>(null)
    var catPicked by mutableStateOf(false)
    var subSheetFor by mutableStateOf<String?>(null)
    var expr by mutableStateOf("")
    var title by mutableStateOf("")
    // The title starts as a suggestion (generic the first time, then the one
    // used last) until the user types their own.
    var titleTouched by mutableStateOf(false)
    // True while the title in the field is one the app suggested (shows the
    // "Sugerido" tag); typing your own clears it.
    var titleSuggested by mutableStateOf(true)
    var titleHints by mutableStateOf<List<String>>(emptyList())
    var note by mutableStateOf("")
    val openedAt: LocalDateTime = LocalDateTime.now()
    val nowTime: String = openedAt.toLocalTime().toString().take(5)
    var date by mutableStateOf(openedAt.toLocalDate())
    var time by mutableStateOf(nowTime)
    var cal by mutableStateOf(openedAt.toLocalDate().withDayOfMonth(1))
    var whenBack by mutableStateOf<NmSheet?>(null)
    var repeat by mutableStateOf<RepeatDraft?>(null)
    var rpDraft by mutableStateOf<RepeatDraft?>(null)
    var currency by mutableStateOf<String?>(null)
    var attach by mutableStateOf<AttachDraft?>(null)
    var from by mutableStateOf("")
    var fromKind by mutableStateOf<CounterpartyKind?>(null)
    var customBudgetId by mutableStateOf<String?>(null)
    var walletId by mutableStateOf<String?>(null)
    var transferTo by mutableStateOf<String?>(null)
    var loan by mutableStateOf(false)
    var goalId by mutableStateOf<String?>(null)
    var sheet by mutableStateOf<NmSheet?>(NmSheet.CATEGORY)
    var calc by mutableStateOf(initialCalc)
    var saving by mutableStateOf(false)
    // Editing a saved movement: its type and loan flag are fixed.
    var editing = false
    // Editing a recurring series rather than a movement.
    var seriesMode = false

    val isIncome get() = type == TransactionType.INCOME
    val isTransfer get() = type == TransactionType.TRANSFER
    val value: Double get() = AmountPad.eval(expr)
    val leaf: String get() = sub ?: category
    val future: Boolean get() = date.atTime(LocalTime.parse(time)).isAfter(openedAt)
    val today: LocalDate get() = openedAt.toLocalDate()
    val whenOn: Boolean get() = !(date == today && time == nowTime)
    val valid: Boolean get() = (isTransfer || catPicked) && value > 0 && (!isTransfer || transferTo != null) && title.isNotBlank()

    fun switchType(t: TransactionType) {
        type = t
        category = if (t == TransactionType.INCOME) "inc.work" else if (t == TransactionType.EXPENSE) "exp.food" else category
        sub = null
        catPicked = false
        subSheetFor = null
        from = ""
        fromKind = null
        customBudgetId = null
        sheet = if (t == TransactionType.TRANSFER) (if (expr.isNotEmpty()) null else NmSheet.PAD) else NmSheet.CATEGORY
    }
}

@Composable
fun AddTransactionScreen(
    onSaved: (future: Boolean) -> Unit,
    onBack: () -> Unit,
    onAddWallet: () -> Unit,
    onOpenCategories: (income: Boolean) -> Unit = {},
    onOpenCurrencies: () -> Unit = {},
    editTransactionId: String? = null,
    editSeriesId: String? = null,
    state: NmState? = null,
) {
    val context = LocalContext.current
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val budgets by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val currencies by AppContainer.currencyRepository.currencies.collectAsStateWithLifecycle()
    AppContainer.categoryRepository.nodes.collectAsStateWithLifecycle().value
    val principal = AppContainer.currencyRepository.principal
    val scope = rememberCoroutineScope()

    if (wallets.isEmpty()) {
        NoWalletState(onAddWallet, onBack)
        return
    }

    val s = state ?: remember(editTransactionId, editSeriesId) {
        NmState(NmPrefs.padMode(context)).also { st ->
            val rs = editSeriesId?.let { id -> AppContainer.recurringSeriesRepository.series.value.firstOrNull { it.id == id } }
            if (rs != null) {
                st.editing = true
                st.seriesMode = true
                st.type = rs.type
                st.category = rs.category
                st.sub = rs.subcategoryId
                st.catPicked = true
                st.expr = AmountPad.numStr(rs.amount)
                st.title = rs.name
                st.date = LocalDate.parse(rs.nextOccurrenceDate)
                st.cal = st.date.withDayOfMonth(1)
                st.currency = rs.currency.takeIf { c -> c != wallets.firstOrNull { it.id == rs.walletId }?.currency }
                st.walletId = rs.walletId
                st.repeat = repeatOf(rs)
                st.sheet = null
            }
            val tx = editTransactionId?.let { AppContainer.transactionRepository.getById(it) }
            if (tx != null) {
                st.editing = true
                st.type = tx.type
                st.category = tx.category
                st.sub = tx.subcategoryId
                st.catPicked = true
                st.expr = AmountPad.numStr(tx.amount)
                st.title = tx.description
                st.note = tx.note.orEmpty()
                st.date = LocalDate.parse(tx.date)
                st.time = tx.time
                st.cal = st.date.withDayOfMonth(1)
                st.currency = tx.currency.takeIf { c -> c != wallets.firstOrNull { it.id == tx.walletId }?.currency }
                st.from = tx.counterpartyName.orEmpty()
                st.fromKind = tx.counterpartyKind
                st.customBudgetId = tx.customBudgetId
                st.walletId = tx.walletId
                st.transferTo = tx.transferToWalletId
                st.loan = tx.loanKind != null
                st.goalId = tx.goalId
                // Editing keeps what the option tiles showed: its Repetir
                // (from its series) and its receipt.
                st.repeat = tx.recurringSeriesId
                    ?.let { sid -> AppContainer.recurringSeriesRepository.series.value.firstOrNull { it.id == sid && it.active } }
                    ?.let(::repeatOf)
                st.attach = tx.attachment?.let { AttachDraft(it.name, it.mime, ByteArray(0), existing = true, size = it.size) }
                st.sheet = null
            }
        }
    }
    // Suggested title: with no category the generic one for the type; with a
    // category (and subcategory) the title last used for that exact pair, else
    // its name.
    androidx.compose.runtime.LaunchedEffect(s.type, s.category, s.sub, s.catPicked) {
        if (s.editing) return@LaunchedEffect
        val cat = if (s.catPicked && s.type != TransactionType.TRANSFER) s.category else null
        if (!s.titleTouched) {
            s.title = if (cat != null) categoryName(s.sub ?: cat) else tr(when (s.type) {
                TransactionType.INCOME -> StringKey.NM_TITLE_GENERIC_INCOME
                TransactionType.TRANSFER -> StringKey.NM_TITLE_GENERIC_TRANSFER
                else -> StringKey.NM_TITLE_GENERIC_EXPENSE
            })
            s.titleSuggested = true
        }
        val res = AppContainer.transactionRepository.titleSuggestions(s.type, cat, if (cat != null) s.sub else null)
        s.titleHints = res.titles
        if (cat != null && res.last != null && !s.titleTouched) s.title = res.last
    }
    if (s.walletId == null || wallets.none { it.id == s.walletId }) s.walletId = wallets.first().id
    val wallet = wallets.first { it.id == s.walletId }
    val wcur = wallet.currency
    val cur = s.currency ?: wcur
    val rateTo = { from: String, to: String -> AppContainer.currencyRepository.rate(from, to) }
    val rate = rateTo(cur, wcur)
    val value = s.value
    val colors = NovaColors.current
    val repo = AppContainer.categoryRepository

    // Budget line (expenses only): the automatic category budget and/or
    // the custom one picked, with this expense counted.
    val autoBudget = if (!s.seriesMode && !s.isTransfer && !s.isIncome && s.catPicked) AppContainer.budgetRepository.autoBudgetFor(s.leaf, s.walletId) else null
    val customBudgets = budgets.filter { it.budget.kind == BudgetKind.CUSTOM }
    val pickedBudget = if (!s.seriesMode && !s.isIncome && !s.isTransfer) customBudgets.firstOrNull { it.budget.id == s.customBudgetId } else null
    // Editing: the budget already counts the saved movement, so only the change adds.
    val counted = remember(editTransactionId) {
        editTransactionId?.let { AppContainer.transactionRepository.getById(it) }
            ?.takeIf { it.status == com.s2nova.app.data.model.TransactionStatus.COMPLETED && it.type == TransactionType.EXPENSE }
            ?.let { it.amount * rateTo(it.currency, principal) } ?: 0.0
    }
    val valP = (if (s.future) 0.0 else value * rateTo(cur, principal)) - counted

    // Expenses and transfers out that would leave the wallet below zero ask
    // first; saving anyway is allowed. Editing gives back what the saved
    // movement had already taken from this same wallet.
    val refund = remember(editTransactionId, wallet.id) {
        editTransactionId?.let { AppContainer.transactionRepository.getById(it) }
            ?.takeIf { it.status == com.s2nova.app.data.model.TransactionStatus.COMPLETED && it.walletId == wallet.id }
            ?.let { when (it.type) { TransactionType.EXPENSE -> it.walletAmount ?: it.amount; TransactionType.TRANSFER -> it.amount; else -> 0.0 } } ?: 0.0
    }
    val overdraft = if (s.seriesMode || s.isIncome) null
        else overdraftAfter(wallet.currentBalance, if (s.isTransfer) value else value * rate, refund, wallet.type == WalletType.BANK_CREDIT, s.future)
    var overdraftAsk by remember { mutableStateOf<Double?>(null) }

    val guest = AppContainer.isGuest
    var deleting by remember { mutableStateOf(false) }
    val t = rememberStrings()

    // Series mode: the template and rule are saved on the series; turning
    // Repetir off pauses it (Programados › Reanudar brings it back).
    fun saveSeries(id: String) {
        val f = s.repeat?.freq
        val r = s.repeat
        scope.launch {
            runCatching {
                val repo = AppContainer.recurringSeriesRepository
                if (f == null || r == null) repo.setActive(id, false)
                else repo.edit(
                    id = id, name = s.title.trim(), amount = value, currency = cur, walletId = wallet.id,
                    category = s.category, subcategoryId = s.sub, interval = f.interval, nextOccurrenceDate = s.date.toString(),
                    occurrences = if (r.end == RepeatEnd.COUNT) r.count else null,
                    endDate = if (r.end == RepeatEnd.UNTIL) r.until.ifBlank { null } else null,
                    autoConfirm = r.auto,
                )
                runCatching { AppContainer.alertRepository.refresh() }
            }.onSuccess {
                Snack.show(tr(if (f == null) StringKey.NM_SERIES_PAUSED else StringKey.NM_SERIES_SAVED))
                onSaved(false)
            }.onFailure {
                s.saving = false
                Snack.show(tr(StringKey.NM_SERIES_ERR))
            }
        }
    }

    fun save(confirmed: Boolean = false) {
        if (!s.valid || s.saving) return
        if (overdraft != null && !confirmed) {
            overdraftAsk = overdraft
            return
        }
        overdraftAsk = null
        s.saving = true
        if (editSeriesId != null) return saveSeries(editSeriesId)
        val r = s.repeat
        val input = NewTransactionInput(
            walletId = wallet.id,
            transferToWalletId = if (s.isTransfer) s.transferTo else null,
            description = s.title.trim(),
            amount = value,
            type = s.type,
            category = if (s.isTransfer) null else s.category,
            subcategoryId = if (s.isTransfer) null else s.sub,
            date = s.date.toString(),
            time = s.time,
            currency = if (s.isTransfer) null else cur,
            note = s.note.trim().ifBlank { null },
            customBudgetId = if (!s.isIncome && !s.isTransfer) s.customBudgetId else null,
            goalId = if (!s.isTransfer) s.goalId else null,
            loanKind = if (s.loan && !s.isTransfer) (if (s.isIncome) LoanKind.BORROWED else LoanKind.LENT) else null,
            counterpartyName = if (s.isIncome) s.from.trim().ifBlank { null } else null,
            counterpartyKind = if (s.isIncome && s.from.isNotBlank()) s.fromKind else null,
            repeat = r?.freq?.let { f ->
                RepeatRule(
                    interval = f.interval,
                    occurrences = if (r.end == RepeatEnd.COUNT) r.count else null,
                    endDate = if (r.end == RepeatEnd.UNTIL) r.until.ifBlank { null } else null,
                    autoConfirm = r.auto,
                )
            },
        )
        scope.launch {
            runCatching {
                if (s.whenOn) NmPrefs.setLastWhen(context, s.date.toString(), s.time)
                val saved = if (editTransactionId != null) {
                    AppContainer.transactionRepository.edit(editTransactionId, input); AppContainer.transactionRepository.getById(editTransactionId)
                } else AppContainer.transactionRepository.add(input)
                val a = s.attach
                // A failed receipt doesn't undo the saved movement (retrying would duplicate it).
                if (saved != null && a != null && !a.existing) {
                    runCatching { AppContainer.transactionRepository.attach(saved.id, a.name, a.mime, a.bytes) }
                        .onFailure { Snack.show(tr(StringKey.NM_ERR_RECEIPT_UPLOAD)) }
                }
                // Its receipt was removed while editing.
                if (saved != null && a == null && saved.attachment != null) AppContainer.transactionRepository.removeAttachment(saved.id)
                if (!guest) {
                    runCatching { AppContainer.walletRepository.refresh() }
                    runCatching { AppContainer.budgetRepository.refresh() }
                    runCatching { AppContainer.goalRepository.refresh() }
                    runCatching { AppContainer.recurringSeriesRepository.refresh() }
                }
            }.onSuccess {
                Snack.show(if (s.future) tr(StringKey.NM_TOAST_SCHEDULED, fmtDate(s.date.toString())) else tr(StringKey.NM_TOAST_SAVED))
                onSaved(s.future)
            }.onFailure {
                s.saving = false
                Snack.show(tr(StringKey.NM_ERR_SAVE))
            }
        }
    }

    // Progressive disclosure (DESIGN-SYSTEM.md §5.3): type, amount,
    // category, wallet, the budget line and the title up front; everything
    // optional behind "Más opciones", which starts open when an option is
    // already set (editing). Guardar stays fixed at the bottom.
    var moreOpen by remember { mutableStateOf(s.whenOn || s.repeat != null || s.attach != null || s.note.isNotBlank() || s.from.isNotBlank() || s.customBudgetId != null || s.loan || s.goalId != null) }

    Column(Modifier.fillMaxSize().appCanvas(MaterialTheme.colorScheme.background).imePadding()) {
        Row(
            // 48 dp back target.
            Modifier.padding(start = 4.dp, end = 16.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            val backLabel = tr(StringKey.COMMON_BACK)
            Box(
                Modifier.size(48.dp).clip(CircleShape).clickable(onClick = onBack, role = Role.Button)
                    .semantics { contentDescription = backLabel },
                contentAlignment = Alignment.Center,
            ) {
                V2Icon(V2Icons.back, MaterialTheme.colorScheme.onSurfaceVariant, 24.dp)
            }
            Text(
                tr(if (editSeriesId != null) StringKey.NM_EDIT_SERIES else if (editTransactionId != null) StringKey.NM_EDIT else StringKey.NM_TITLE),
                style = NovaType.title, color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
            )
        }
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(Modifier.tourTarget("nm.type", 14.dp)) { TypeSegmented(s, typeLocked = s.editing) }
            Box(Modifier.tourTarget("nm.amount", 16.dp)) { AmountHero(s, cur, wcur, rate, value, wallet.name) }
            Box(Modifier.tourTarget("nm.category", 16.dp)) { CategoryRow(s) }

            Column {
                FieldLabel(tr(if (s.isIncome) StringKey.NM_WALLET_IN else if (s.isTransfer) StringKey.NM_WALLET_FROM else StringKey.NM_WALLET))
                PillRow {
                    wallets.forEach { w ->
                        V2Pill(shortWallet(w.name) + if (w.currency != principal) " · " + w.currency else "", w.id == s.walletId, {
                            s.walletId = w.id
                            if (s.transferTo == w.id) s.transferTo = null
                        })
                    }
                }
            }
            if (s.isTransfer) {
                Column {
                    FieldLabel(tr(StringKey.NM_WALLET_TO))
                    PillRow {
                        wallets.filter { it.id != s.walletId }.forEach { w ->
                            V2Pill(shortWallet(w.name), s.transferTo == w.id, { s.transferTo = w.id })
                        }
                    }
                }
            }

            val lineBudget = autoBudget ?: pickedBudget
            if (lineBudget != null) {
                val b = lineBudget.budget
                val n = if (b.limit > 0) ((lineBudget.spent + valP) / b.limit * 100).roundToInt() else 0
                val (tone, bg) = toneOf(n)
                val label = b.name ?: repo.name(b.category)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (b.kind == BudgetKind.CUSTOM) PlanMark(b.icon, 40.dp) else CatMark(b.category, 40.dp)
                    Column(Modifier.weight(1f)) {
                        val pickedLabel = pickedBudget?.let { it.budget.name ?: "" }
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                if (autoBudget != null && pickedBudget != null) tr(StringKey.NM_BUDGET_ADDS_TWO, label, pickedLabel) else tr(StringKey.NM_BUDGET_ADDS, label),
                                style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 2, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f).padding(top = 2.dp),
                            )
                            Row(
                                Modifier.padding(start = 8.dp).clip(RoundedCornerShape(6.dp)).background(bg).padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                // The state icon, so the tone isn't carried by color alone.
                                V2Icon(if (n >= 90) V2Icons.alertCircle else if (n >= 65) V2Icons.warn else V2Icons.check, tone, 14.dp)
                                Text("$n%", style = NovaType.label.copy(fontFeatureSettings = TNUM), color = tone, maxLines = 1, softWrap = false)
                            }
                        }
                        Text(
                            tr(if (autoBudget != null) StringKey.NM_BUDGET_BY_CATEGORY else StringKey.NM_BUDGET_CUSTOM, formatMoney(lineBudget.spent + valP, principal), formatMoney(b.limit, principal)) +
                                (if (s.future) tr(StringKey.NM_BUDGET_WHEN_RECORDED) else if (value > 0) tr(StringKey.NM_BUDGET_WITH_THIS) else ""),
                            style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = colors.textDim, modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
            }

            Column {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    FieldLabel(tr(StringKey.NM_TITLE_PH))
                    if (!s.editing && s.titleSuggested && s.title.isNotBlank()) SuggestedTag(tr(StringKey.NM_TITLE_SUGGESTED))
                }
                InputBox(height = 52.dp) {
                    V2Icon(V2Icons.title, colors.textDim, 20.dp)
                    BareField(s.title, { s.titleTouched = true; s.titleSuggested = false; s.title = it.take(60) }, tr(StringKey.NM_TITLE_EXAMPLE))
                }
                val hints = s.titleHints.filter { it != s.title }
                if (hints.isNotEmpty()) {
                    Row(
                        modifier = Modifier.padding(top = 8.dp).horizontalScroll(androidx.compose.foundation.rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        hints.forEach { h -> com.s2nova.app.ui.components.V2Pill(h, selected = false, onClick = { s.titleTouched = true; s.titleSuggested = false; s.title = h }, role = Role.Button) }
                    }
                }
            }

            Box(Modifier.tourTarget("nm.more", 16.dp)) { MoreOptions(s, open = moreOpen, onToggle = { moreOpen = !moreOpen }, pickedBudgetLabel = pickedBudget?.budget?.name, goalName = goals.firstOrNull { it.id == s.goalId }?.name) }

            if (editSeriesId != null) {
                DraftSheetDeleteRow(label = t(StringKey.RECURRING_DELETE), onClick = { deleting = true })
            }
        }
        // Guardar, fixed above the gesture bar.
        Box(
            Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background)
                .navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 12.dp),
        ) {
            V2Button(
                label = tr(if (s.seriesMode) StringKey.NM_SAVE_SERIES else if (s.future) StringKey.NM_SAVE_SCHEDULED else if (s.repeat != null) StringKey.NM_SAVE_REPEAT else StringKey.NM_SAVE),
                enabled = s.valid && !s.saving,
                onClick = { save() },
                verticalPadding = 16.dp,
                fontSize = 14.sp,
                glow = true,
            )
        }
    }

    overdraftAsk?.let { left ->
        // What the wallet has to spend (including what an edited movement
        // gives back), what this movement takes, and where it leaves it.
        val available = wallet.currentBalance + refund
        OverdraftDialog(
            title = t(StringKey.NM_OVERDRAFT_TITLE),
            body = tr(StringKey.NM_OVERDRAFT_BODY, shortWallet(wallet.name)),
            availableLabel = t(StringKey.NM_OVERDRAFT_AVAILABLE),
            available = formatMoney(available, wallet.currency),
            spendLabel = t(StringKey.NM_OVERDRAFT_SPEND),
            spend = formatMoney(left - available, wallet.currency),
            leftLabel = t(StringKey.NM_OVERDRAFT_LEFT),
            left = formatMoney(left, wallet.currency),
            review = t(StringKey.NM_OVERDRAFT_REVIEW),
            confirm = t(StringKey.NM_OVERDRAFT_CONFIRM),
            onReview = { overdraftAsk = null },
            onConfirm = { save(confirmed = true) },
        )
    }

    if (deleting && editSeriesId != null) {
        AlertDialog(
            onDismissRequest = { deleting = false },
            title = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_TITLE)) },
            text = { Text(t(StringKey.RECURRING_DELETE_CONFIRM_BODY)) },
            confirmButton = {
                TextButton(onClick = {
                    deleting = false
                    scope.launch {
                        runCatching { AppContainer.recurringSeriesRepository.delete(editSeriesId) }
                            .onSuccess {
                                runCatching { AppContainer.alertRepository.refresh() }
                                onSaved(false)
                            }
                            .onFailure { Snack.show(tr(StringKey.COMMON_DELETE_ERROR)) }
                    }
                }) { Text(t(StringKey.COMMON_DELETE), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = false }) { Text(t(StringKey.COMMON_CANCEL)) } },
        )
    }

    NmSheets(
        s = s,
        cur = cur,
        wcur = wcur,
        walletName = shortWallet(wallet.name),
        currencies = currencies.map { it.code }.ifEmpty { listOf(principal) },
        rateTo = rateTo,
        autoBudgetLabel = autoBudget?.let { it.budget.name ?: repo.name(it.budget.category) },
        customBudgets = customBudgets,
        principal = principal,
        goals = goals,
        onOpenCategories = { onOpenCategories(s.isIncome) },
        onOpenCurrencies = onOpenCurrencies,
    )
}

// Segmented control (DESIGN-SYSTEM.md §6.5): a `surface-sunken` track; the
// selected segment is `surface` with weight 600. 44 dp tall, tab semantics.
@Composable
private fun TypeSegmented(s: NmState, typeLocked: Boolean) {
    val colors = NovaColors.current
    Row(
        Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(14.dp)).background(colors.surfaceSunken).padding(4.dp).selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        // Equal thirds, unless the text is scaled up: then each segment is
        // sized by its label so "Transferencia" isn't cut off.
        val bigText = androidx.compose.ui.platform.LocalDensity.current.fontScale > 1.15f
        listOf(TransactionType.EXPENSE to tr(StringKey.NM_TYPE_EXPENSE), TransactionType.INCOME to tr(StringKey.NM_TYPE_INCOME), TransactionType.TRANSFER to tr(StringKey.NM_TYPE_TRANSFER)).forEach { (t, label) ->
            val on = s.type == t
            Box(
                Modifier.weight(if (bigText) label.length.toFloat() + 4f else 1f).fillMaxHeight()
                    .then(if (on) Modifier.shadow(2.dp, RoundedCornerShape(10.dp)) else Modifier)
                    .clip(RoundedCornerShape(10.dp)).background(if (on) MaterialTheme.colorScheme.surface else Color.Transparent)
                    // The border keeps the selected segment visible in dark
                    // theme, where surface and the track are close.
                    .then(if (on) Modifier.border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(10.dp)) else Modifier)
                    // A movement's type is fixed once saved.
                    .alpha(if (typeLocked && !on) 0.38f else 1f)
                    .selectable(selected = on, enabled = !typeLocked, role = Role.Tab) { s.switchType(t) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label, style = NovaType.label.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
                    color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }
    }
}

// The amount card: "MONTO", the figure in `display-sm` and the currency
// pill; then the conversion line and the Programado chip.
@Composable
private fun AmountHero(s: NmState, cur: String, wcur: String, rate: Double, value: Double, walletName: String) {
    val colors = NovaColors.current
    val ink = MaterialTheme.colorScheme.onBackground
    val padOpen = s.sheet == NmSheet.PAD
    Column(
        Modifier.fillMaxWidth()
            .amountSurface(RoundedCornerShape(16.dp), active = padOpen)
            .clickable(role = Role.Button, onClickLabel = tr(StringKey.NM_AMOUNT)) { s.sheet = NmSheet.PAD }
            .padding(start = 20.dp, end = 12.dp, top = 12.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(tr(StringKey.NM_AMOUNT).uppercase(), style = NovaType.overline, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            // Currency pill: 40 dp visual in a 48 dp target.
            Box(
                Modifier.height(48.dp).clip(RoundedCornerShape(10.dp)).clickable(enabled = !s.isTransfer, role = Role.Button) { s.sheet = NmSheet.CURRENCY },
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    Modifier.height(36.dp).clip(RoundedCornerShape(8.dp)).background(colors.surfaceSunken).padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(cur, style = NovaType.label, color = ink, maxLines = 1, softWrap = false)
                    if (!s.isTransfer) V2Icon(V2Icons.chevronDown, ink, 16.dp, 2.4f)
                }
            }
        }
        Text(
            formatMoney(value, cur), style = NovaType.displaySm, color = ink, maxLines = 1, softWrap = false,
            autoSize = TextAutoSize.StepBased(minFontSize = 20.sp, maxFontSize = 28.sp),
            modifier = Modifier.padding(end = 8.dp),
        )
        if (cur != wcur) {
            Text(
                if (value > 0) tr(StringKey.NM_FX_APPROX, formatMoney(value * rate, wcur), wcur, shortWallet(walletName), cur, formatMoney(rate, wcur))
                else tr(StringKey.NM_FX_LATER, wcur, shortWallet(walletName)),
                style = NovaType.caption.copy(fontFeatureSettings = TNUM), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 8.dp),
            )
        }
        if (s.future) {
            Row(
                Modifier.padding(top = 4.dp).clip(RoundedCornerShape(8.dp)).background(colors.surfaceSunken).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                V2Icon(V2Icons.cal, ink, 16.dp)
                Text(tr(StringKey.NM_SCHEDULED_CHIP) + " · ${fmtDate(s.date.toString())}" + if (s.seriesMode) "" else " · ${s.time}", style = NovaType.label, color = ink, maxLines = 1)
            }
        }
    }
}

// Category row: the picked category (or "Elige una categoría" behind a
// dashed mark), opening the category sheet. Transfers show their own row.
@Composable
private fun CategoryRow(s: NmState) {
    val colors = NovaColors.current
    val repo = AppContainer.categoryRepository
    val open = s.sheet == NmSheet.CATEGORY || s.sheet == NmSheet.SUB
    val picked = s.catPicked || s.isTransfer
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
            .border(if (open) 2.dp else 1.dp, if (open) colors.primaryBorder else MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .clickable(enabled = !s.isTransfer, role = Role.Button) { s.sheet = NmSheet.CATEGORY }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (s.isTransfer) {
            GlyphMark(listOf("M4 8h14l-3-3", "M20 16H6l3 3"), colors.link, 40.dp)
        } else if (picked) {
            CatMark(s.leaf, 40.dp)
        } else {
            Box(
                Modifier.size(40.dp).drawBehind {
                    drawCircle(colors.borderInput, radius = size.minDimension / 2 - 0.75.dp.toPx(), style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx()))))
                },
                contentAlignment = Alignment.Center,
            ) { V2Icon(repo.glyph(s.leaf), colors.textDim, 20.dp) }
        }
        Column(Modifier.weight(1f)) {
            Text(tr(StringKey.NM_CATEGORY), style = NovaType.overline, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                if (s.isTransfer) tr(StringKey.NM_TRANSFER_BETWEEN) else if (s.catPicked) repo.label(s.leaf) else tr(StringKey.NM_PICK_CATEGORY),
                style = NovaType.titleSm, color = if (picked) MaterialTheme.colorScheme.onBackground else colors.link,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp),
            )
        }
        if (!s.isTransfer) V2Icon(V2Icons.chevronRight, colors.textDim, 20.dp)
    }
}

// "Más opciones": a disclosure row with a summary of what is set, and when
// open, one full-width row per option (label + current value), the note
// field and the receipt. Each row opens its sheet.
@Composable
private fun MoreOptions(s: NmState, open: Boolean, onToggle: () -> Unit, pickedBudgetLabel: String?, goalName: String?) {
    val colors = NovaColors.current
    data class Opt(val sheet: NmSheet, val label: String, val value: String?, val icon: List<String>)
    val whenShort = if (s.date == s.today) (if (s.time == s.nowTime) tr(StringKey.NM_NOW) else tr(StringKey.NM_TODAY_AT, s.time)) else fmtDate(s.date.toString()) + if (s.seriesMode) "" else " · ${s.time}"
    val loanOrGoal = listOfNotNull(if (s.loan) tr(StringKey.NM_LOAN) else null, goalName).joinToString(" · ").ifBlank { null }
    val opts = buildList {
        add(Opt(NmSheet.WHEN, tr(StringKey.NM_SECTION_WHEN), whenShort.takeIf { s.whenOn } ?: tr(StringKey.NM_NOW), if (s.future) V2Icons.cal else V2Icons.clock))
        add(Opt(NmSheet.REPEAT, tr(StringKey.NM_REPEAT), s.repeat?.let { repeatSummary(it, s.date) + " · " + tr(if (it.auto) StringKey.NM_AUTOMATIC else StringKey.NM_WITH_CONFIRMATION) } ?: tr(StringKey.NM_NO_REPEAT), V2Icons.repeat))
        // A series has no receipt, payer, budget or goal of its own.
        if (s.seriesMode) return@buildList
        add(Opt(NmSheet.ATTACH, tr(StringKey.NM_ATTACH), s.attach?.name ?: tr(StringKey.NM_OPTIONAL), V2Icons.clip))
        if (s.isIncome) add(Opt(NmSheet.FROM, tr(StringKey.NM_FROM), s.from.ifBlank { tr(StringKey.NM_OPTIONAL) }, V2Icons.person))
        if (!s.isIncome && !s.isTransfer) add(Opt(NmSheet.BPICK, tr(StringKey.NM_BUDGET), pickedBudgetLabel ?: tr(StringKey.NM_BPICK_NONE_DETAIL), V2Icons.target))
        if (!s.isTransfer) add(Opt(NmSheet.MORE, tr(StringKey.NM_SECTION_MORE), loanOrGoal ?: tr(StringKey.NM_NONE_M), V2Icons.more))
    }
    val summary = listOfNotNull(
        whenShort.takeIf { s.whenOn },
        s.repeat?.let { repeatShort(it) },
        s.note.takeIf { it.isNotBlank() }?.let { tr(StringKey.NM_NOTE_LABEL) },
        s.attach?.let { tr(StringKey.NM_ONE_ATTACHMENT) },
        s.from.takeIf { it.isNotBlank() && s.isIncome },
        pickedBudgetLabel.takeIf { !s.isIncome && !s.isTransfer },
        loanOrGoal,
    ).joinToString(" · ")
    val stateLabel = tr(if (open) StringKey.NM_EXPANDED else StringKey.NM_COLLAPSED)

    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)),
    ) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(role = Role.Button, onClick = onToggle)
                .semantics { stateDescription = stateLabel }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(tr(StringKey.NM_MORE_OPTIONS), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (summary.isNotBlank()) {
                    Text(summary, style = NovaType.bodySm, color = colors.link, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            V2Icon(V2Icons.chevronDown, colors.textDim, 20.dp, modifier = Modifier.padding(start = 8.dp).rotate(if (open) 180f else 0f))
        }
        if (open) {
            opts.forEach { o ->
                HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(role = Role.Button) {
                        when (o.sheet) {
                            NmSheet.WHEN -> { s.cal = s.date.withDayOfMonth(1); s.whenBack = null; s.sheet = NmSheet.WHEN }
                            NmSheet.REPEAT -> { s.rpDraft = s.repeat ?: RepeatDraft(); s.sheet = NmSheet.REPEAT }
                            else -> s.sheet = o.sheet
                        }
                    }.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    V2Icon(o.icon, colors.link, 20.dp)
                    Column(Modifier.weight(1f)) {
                        Text(o.label, style = NovaType.label, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (o.value != null) Text(o.value, style = NovaType.bodySm.copy(fontFeatureSettings = TNUM), color = colors.textDim, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    if (o.sheet == NmSheet.ATTACH && s.attach != null) {
                        val a = s.attach!!
                        val removeLabel = tr(StringKey.COMMON_DELETE) + " " + a.name
                        Box(
                            Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button) { s.attach = null }
                                .semantics { contentDescription = removeLabel },
                            contentAlignment = Alignment.Center,
                        ) { V2Icon(V2Icons.close, colors.textDim, 20.dp) }
                    } else {
                        V2Icon(V2Icons.chevronRight, colors.textDim, 20.dp)
                    }
                }
            }
            if (!s.seriesMode) {
                HorizontalDivider(thickness = 1.dp, color = colors.dividerSubtle, modifier = Modifier.padding(horizontal = 16.dp))
                Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp)) {
                    FieldLabel(tr(StringKey.NM_NOTE_LABEL))
                    InputBox(height = 52.dp) {
                        V2Icon(V2Icons.note, colors.textDim, 20.dp)
                        BareField(s.note, { s.note = it.take(500) }, tr(StringKey.NM_NOTE_PH))
                    }
                }
            }
        }
    }
}

@Composable
private fun NoWalletState(onAddWallet: () -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        GlyphMark(V2Icons.wallet, NovaColors.current.link, 56.dp)
        Text(tr(StringKey.NM_NO_WALLET_TITLE), fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 16.dp))
        Text(tr(StringKey.NM_NO_WALLET_BODY), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
        V2Button(tr(StringKey.NM_NO_WALLET_CTA), onClick = onAddWallet, modifier = Modifier.padding(top = 20.dp))
        Text(tr(StringKey.COMMON_BACK), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 14.dp).noRippleClick(onBack))
    }
}


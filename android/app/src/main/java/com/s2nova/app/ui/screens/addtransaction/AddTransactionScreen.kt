package com.s2nova.app.ui.screens.addtransaction

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.layout.Arrangement
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
import com.s2nova.app.ui.components.OptionTile
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.PlanMark
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
import com.s2nova.app.ui.theme.heroSurface
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

    fun save() {
        if (!s.valid || s.saving) return
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
                if (saved != null && a != null && !a.existing) AppContainer.transactionRepository.attach(saved.id, a.name, a.mime, a.bytes)
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

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            // 48 dp back target; the 13 dp start keeps the arrow where it was.
            Modifier.padding(start = 13.dp, end = 18.dp, top = 5.dp, bottom = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val backLabel = tr(StringKey.COMMON_BACK)
            Box(
                Modifier.size(48.dp).clip(CircleShape).clickable(onClick = onBack, role = Role.Button)
                    .semantics { contentDescription = backLabel },
                contentAlignment = Alignment.Center,
            ) {
                V2Icon(V2Icons.back, MaterialTheme.colorScheme.onSurfaceVariant, 22.dp)
            }
            Text(
                tr(if (editSeriesId != null) StringKey.NM_EDIT_SERIES else if (editTransactionId != null) StringKey.NM_EDIT else StringKey.NM_TITLE),
                fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
            )
        }
        Column(
            Modifier.weight(1f).imePadding().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Hero(s, cur, wcur, rate, value, wallet.name, typeLocked = s.editing)

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
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(horizontal = 14.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (b.kind == BudgetKind.CUSTOM) PlanMark(b.icon, 34.dp) else CatMark(b.category, 34.dp)
                    Column(Modifier.weight(1f)) {
                        val pickedLabel = pickedBudget?.let { it.budget.name ?: "" }
                        Text(if (autoBudget != null && pickedBudget != null) tr(StringKey.NM_BUDGET_ADDS_TWO, label, pickedLabel) else tr(StringKey.NM_BUDGET_ADDS, label), fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        Text(
                            tr(if (autoBudget != null) StringKey.NM_BUDGET_BY_CATEGORY else StringKey.NM_BUDGET_CUSTOM, formatMoney(lineBudget.spent + valP, principal), formatMoney(b.limit, principal)) +
                                (if (s.future) tr(StringKey.NM_BUDGET_WHEN_RECORDED) else if (value > 0) tr(StringKey.NM_BUDGET_WITH_THIS) else ""),
                            fontSize = 12.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM),
                        )
                    }
                    Text("$n%", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = tone, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(bg).padding(horizontal = 8.dp, vertical = 3.dp), style = TextStyle(fontFeatureSettings = TNUM))
                }
            }

            InputBox(height = 50.dp) {
                V2Icon(V2Icons.title, colors.textDim, 16.dp)
                BareField(s.title, { s.title = it.take(60) }, tr(StringKey.NM_TITLE_PH))
            }
            if (!s.seriesMode) {
                InputBox(height = 50.dp) {
                    V2Icon(V2Icons.note, colors.textDim, 16.dp)
                    BareField(s.note, { s.note = it.take(500) }, tr(StringKey.NM_NOTE_PH), fontWeight = FontWeight.SemiBold)
                }
            }

            OptionRow(s, pickedBudget?.budget?.name, goals.isNotEmpty())

            s.attach?.let { a ->
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(colors.sheetSurface), contentAlignment = Alignment.Center) {
                        V2Icon(if (a.isPhoto) V2Icons.image else V2Icons.file, colors.accentText, 18.dp)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(a.name, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onBackground)
                        Text(tr(if (a.isPhoto) StringKey.NM_PHOTO else StringKey.NM_DOCUMENT) + " · " + a.sizeLabel, fontSize = 12.sp, color = colors.textDim)
                    }
                    val removeLabel = tr(StringKey.COMMON_DELETE) + " " + a.name
                    Box(
                        Modifier.size(40.dp).clip(CircleShape).clickable(role = Role.Button) { s.attach = null }
                            .semantics { contentDescription = removeLabel },
                        contentAlignment = Alignment.Center,
                    ) {
                        V2Icon(V2Icons.close, colors.textDim, 16.dp)
                    }
                }
            }
            s.repeat?.let { r ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    V2Icon(V2Icons.repeat, colors.textDim, 13.dp)
                    Text(
                        repeatSummary(r, s.date) + " · " + tr(if (r.auto) StringKey.NM_AUTOMATIC else StringKey.NM_WITH_CONFIRMATION),
                        fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, style = TextStyle(fontFeatureSettings = TNUM),
                    )
                }
            }

            V2Button(
                label = tr(if (s.seriesMode) StringKey.NM_SAVE_SERIES else if (s.future) StringKey.NM_SAVE_SCHEDULED else if (s.repeat != null) StringKey.NM_SAVE_REPEAT else StringKey.NM_SAVE),
                enabled = s.valid && !s.saving,
                onClick = ::save,
                verticalPadding = 16.dp,
                fontSize = 14.sp,
                glow = true,
            )
            if (editSeriesId != null) {
                DraftSheetDeleteRow(label = t(StringKey.RECURRING_DELETE), onClick = { deleting = true })
            }
        }
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

@Composable
private fun Hero(s: NmState, cur: String, wcur: String, rate: Double, value: Double, walletName: String, typeLocked: Boolean = false) {
    val colors = NovaColors.current
    val white = Color.White
    val repo = AppContainer.categoryRepository
    Column(
        Modifier.fillMaxWidth().heroSurface(RoundedCornerShape(22.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(999.dp)).background(white.copy(alpha = 0.08f)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            // Equal thirds, unless the text is scaled up: then each segment is
            // sized by its label so "Transferencia" isn't cut off.
            val bigText = androidx.compose.ui.platform.LocalDensity.current.fontScale > 1.15f
            listOf(TransactionType.EXPENSE to tr(StringKey.NM_TYPE_EXPENSE), TransactionType.INCOME to tr(StringKey.NM_TYPE_INCOME), TransactionType.TRANSFER to tr(StringKey.NM_TYPE_TRANSFER)).forEach { (t, label) ->
                val on = s.type == t
                Box(
                    // A movement's type is fixed once saved.
                    Modifier.weight(if (bigText) label.length.toFloat() + 4f else 1f).clip(RoundedCornerShape(999.dp)).background(if (on) white else Color.Transparent)
                        .alpha(if (typeLocked && !on) 0.5f else 1f).noRippleClick { if (!typeLocked) s.switchType(t) }.padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(label, fontSize = 12.sp, fontWeight = if (on) FontWeight.ExtraBold else FontWeight.Medium, color = if (on) BrandColors.indigo else white.copy(alpha = 0.85f), maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 4.dp))
                }
            }
        }
        // CATEGORÍA row
        val catOpen = s.sheet == NmSheet.CATEGORY || s.sheet == NmSheet.SUB
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(white.copy(alpha = 0.05f))
                .border(if (catOpen) 1.5.dp else 1.dp, if (catOpen) white else white.copy(alpha = 0.18f), RoundedCornerShape(16.dp))
                .noRippleClick { if (!s.isTransfer) s.sheet = NmSheet.CATEGORY }.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val picked = s.catPicked || s.isTransfer
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(if (picked) white.copy(alpha = 0.14f) else Color.Transparent)
                    .then(if (picked) Modifier else Modifier.drawBehind {
                        drawCircle(white.copy(alpha = 0.45f), radius = size.minDimension / 2 - 0.75.dp.toPx(), style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx()))))
                    }).alpha(if (picked) 1f else 0.55f),
                contentAlignment = Alignment.Center,
            ) {
                if (s.isTransfer) {
                    V2Icon(listOf("M4 8h14l-3-3", "M20 16H6l3 3"), white, 18.dp, 2.25f)
                } else {
                    V2Icon(repo.glyph(s.leaf), Color(repo.color(s.category)), 18.dp, 2.25f)
                }
            }
            Column(Modifier.weight(1f)) {
                Text(tr(StringKey.NM_CATEGORY), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp, color = white.copy(alpha = 0.85f))
                Text(
                    if (s.isTransfer) tr(StringKey.NM_TRANSFER_BETWEEN) else if (s.catPicked) repo.label(s.leaf) else tr(StringKey.NM_PICK_CATEGORY),
                    fontSize = 14.5.sp, fontWeight = FontWeight.ExtraBold, color = white, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 3.dp),
                )
            }
            V2Icon(V2Icons.chevronRight, white.copy(alpha = 0.85f), 18.dp)
        }
        // MONTO row
        val padOpen = s.sheet == NmSheet.PAD
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(white.copy(alpha = 0.05f))
                .border(if (padOpen) 1.5.dp else 1.dp, if (padOpen) white else white.copy(alpha = 0.18f), RoundedCornerShape(16.dp))
                .noRippleClick { s.sheet = NmSheet.PAD }.padding(start = 14.dp, end = 12.dp, top = 10.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(tr(StringKey.NM_AMOUNT).uppercase(), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp, color = white.copy(alpha = 0.85f))
                Text(
                    formatMoney(value, cur), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.9).sp,
                    color = if (value > 0) white else white.copy(alpha = 0.85f), modifier = Modifier.padding(top = 2.dp), style = TextStyle(fontFeatureSettings = TNUM), maxLines = 1,
                )
            }
            Row(
                Modifier.height(34.dp).clip(RoundedCornerShape(999.dp)).background(white.copy(alpha = 0.14f)).noRippleClick { if (!s.isTransfer) s.sheet = NmSheet.CURRENCY }.padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Text(cur, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = white, maxLines = 1, softWrap = false)
                V2Icon(V2Icons.chevronDown, white.copy(alpha = 0.85f), 14.dp, 2.4f)
            }
        }
        if (cur != wcur) {
            Text(
                if (value > 0) tr(StringKey.NM_FX_APPROX, formatMoney(value * rate, wcur), wcur, shortWallet(walletName), cur, formatMoney(rate, wcur))
                else tr(StringKey.NM_FX_LATER, wcur, shortWallet(walletName)),
                fontSize = 12.sp, color = white.copy(alpha = 0.85f), modifier = Modifier.padding(horizontal = 4.dp), style = TextStyle(fontFeatureSettings = TNUM),
            )
        }
        if (s.future) {
            Row(
                Modifier.clip(RoundedCornerShape(999.dp)).background(colors.heroTile).padding(horizontal = 11.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                V2Icon(V2Icons.cal, white, 13.dp)
                Text(tr(StringKey.NM_SCHEDULED_CHIP) + " · ${fmtDate(s.date.toString())}" + if (s.seriesMode) "" else " · ${s.time}", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = white, maxLines = 1)
            }
        }
    }
}

@Composable
private fun OptionRow(s: NmState, pickedBudgetLabel: String?, hasGoals: Boolean) {
    data class Opt(val sheet: NmSheet, val label: String, val on: Boolean, val icon: List<String>)
    val whenShort = if (s.date == s.today) (if (s.time == s.nowTime) tr(StringKey.NM_NOW) else tr(StringKey.NM_TODAY_AT, s.time)) else fmtDate(s.date.toString())
    val opts = buildList {
        add(Opt(NmSheet.WHEN, whenShort, s.whenOn, if (s.future) V2Icons.cal else V2Icons.clock))
        add(Opt(NmSheet.REPEAT, repeatShort(s.repeat), s.repeat != null, V2Icons.repeat))
        // A series has no receipt, payer, budget or goal of its own.
        if (s.seriesMode) return@buildList
        add(Opt(NmSheet.ATTACH, tr(if (s.attach != null) StringKey.NM_ONE_ATTACHMENT else StringKey.NM_ATTACH), s.attach != null, V2Icons.clip))
        if (s.isIncome) add(Opt(NmSheet.FROM, s.from.ifBlank { tr(StringKey.NM_FROM) }, s.from.isNotBlank(), V2Icons.person))
        if (!s.isIncome && !s.isTransfer) add(Opt(NmSheet.BPICK, pickedBudgetLabel ?: tr(StringKey.NM_BUDGET), pickedBudgetLabel != null, V2Icons.target))
        if (!s.isTransfer) add(Opt(NmSheet.MORE, tr(StringKey.NM_MORE), s.loan || s.goalId != null, V2Icons.more))
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        opts.forEach { o ->
            OptionTile(o.icon, o.label, o.on, {
                when (o.sheet) {
                    NmSheet.WHEN -> { s.cal = s.date.withDayOfMonth(1); s.whenBack = null; s.sheet = NmSheet.WHEN }
                    NmSheet.REPEAT -> { s.rpDraft = s.repeat ?: RepeatDraft(); s.sheet = NmSheet.REPEAT }
                    else -> s.sheet = o.sheet
                }
            }, Modifier.weight(1f))
        }
        repeat(5 - opts.size) { Box(Modifier.weight(1f)) }
    }
}

@Composable
private fun NoWalletState(onAddWallet: () -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        GlyphMark(V2Icons.wallet, NovaColors.current.link, 56.dp)
        Text(tr(StringKey.NM_NO_WALLET_TITLE), fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 16.dp))
        Text(tr(StringKey.NM_NO_WALLET_BODY), fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
        V2Button(tr(StringKey.NM_NO_WALLET_CTA), onClick = onAddWallet, modifier = Modifier.padding(top = 20.dp))
        Text(tr(StringKey.COMMON_BACK), fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 14.dp).noRippleClick(onBack))
    }
}


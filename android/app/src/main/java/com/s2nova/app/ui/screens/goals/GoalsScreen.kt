package com.s2nova.app.ui.screens.goals

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Goal
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.model.Wallet
import com.s2nova.app.data.remote.toUserMessage
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.ColorPill
import com.s2nova.app.ui.components.DashedNewRow
import com.s2nova.app.ui.components.DraftSheetDeleteRow
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.GoalCategory
import com.s2nova.app.ui.components.GoalCategoryId
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.SheetAmountBox
import com.s2nova.app.ui.components.SheetBox
import com.s2nova.app.ui.components.SheetInput
import com.s2nova.app.ui.components.SheetLabel
import com.s2nova.app.ui.components.SheetPill
import com.s2nova.app.ui.components.goalCategories
import com.s2nova.app.ui.components.shortWalletName
import com.s2nova.app.ui.components.goalCategoryFor
import com.s2nova.app.ui.components.suggestGoalCategory
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

// Planes › Metas, per the v2 mockup: "+ Nueva meta", then one card per goal
// (progress ring with the category glyph, pencil to edit, "Abonar"). The
// goal sheet, the Abonar sheet and the delete sheet (which returns the
// saved money) follow the mockup's goalSheet / goalPay / goalDel.
@Composable
fun GoalsTab(snackbarHostState: SnackbarHostState) {
    val goals by AppContainer.goalRepository.goals.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val colors = NovaColors.current
    val t = rememberStrings()
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf<GoalDraft?>(null) }
    var paying by remember { mutableStateOf<Goal?>(null) }
    var deleting by remember { mutableStateOf<Goal?>(null) }

    LaunchedEffect(Unit) {
        runCatching { AppContainer.goalRepository.refresh() }
        runCatching { AppContainer.walletRepository.refresh() }
    }

    LazyColumn(
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            DashedNewRow(
                label = t(StringKey.GOALS_NEW),
                onClick = { draft = GoalDraft(id = null, name = "", category = GoalCategoryId.OTHER, userPickedCategory = false, targetText = "") },
            )
        }

        items(goals, key = { it.id }) { goal ->
            val category = goalCategoryFor(goal.themeIcon) ?: goalCategories.last()
            GoalCard(
                goal = goal,
                category = category,
                onEdit = {
                    draft = GoalDraft(
                        id = goal.id,
                        name = goal.name,
                        category = category.id,
                        userPickedCategory = true,
                        targetText = goal.targetAmount.toLong().toString(),
                    )
                },
                onPay = { paying = goal },
            )
        }

        if (goals.isEmpty()) {
            item {
                Text(
                    t(StringKey.GOALS_EMPTY),
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                    color = colors.textDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                )
            }
        }

        item { Spacer(Modifier.height(72.dp)) }
    }

    val d = draft
    if (d != null) {
        GoalDraftSheet(
            draft = d,
            onDraftChange = { draft = it },
            onDismiss = { draft = null },
            onSave = {
                val target = d.targetText.toDoubleOrNull()
                if (d.name.isNotBlank() && target != null && target > 0) {
                    scope.launch {
                        runCatching {
                            if (d.id == null) {
                                AppContainer.goalRepository.create(d.name.trim(), target, themeIcon = d.category.name)
                            } else {
                                AppContainer.goalRepository.update(d.id, d.name.trim(), target, themeIcon = d.category.name)
                            }
                        }
                    }
                    draft = null
                }
            },
            onRequestDelete = {
                val goal = goals.firstOrNull { it.id == d.id }
                if (goal != null) {
                    deleting = goal
                    draft = null
                }
            },
        )
    }

    val goalToDelete = deleting
    if (goalToDelete != null) {
        GoalDeleteSheet(
            goal = goalToDelete,
            wallets = wallets,
            onDismiss = { deleting = null },
            onConfirm = { destination ->
                scope.launch {
                    try {
                        when (destination) {
                            GoalDestination.Origin -> AppContainer.goalRepository.delete(goalToDelete.id, returnToOrigin = true)
                            is GoalDestination.Wallet -> AppContainer.goalRepository.delete(goalToDelete.id, destination.id)
                            null -> AppContainer.goalRepository.delete(goalToDelete.id)
                        }
                        if (destination != null) {
                            AppContainer.walletRepository.refresh()
                            AppContainer.transactionRepository.refresh()
                        }
                        deleting = null
                    } catch (error: Exception) {
                        snackbarHostState.showSnackbar(error.toUserMessage(t(StringKey.GOALS_DELETE_ERROR)))
                    }
                }
            },
        )
    }

    val goalToPay = paying
    if (goalToPay != null) {
        GoalPaySheet(
            goal = goalToPay,
            wallets = wallets,
            snackbarHostState = snackbarHostState,
            onDismiss = { paying = null },
        )
    }
}

private fun goalNote(goal: Goal, t: (StringKey) -> String, format: (Double) -> String): String = when {
    goal.currentAmount <= 0 -> t(StringKey.GOALS_NOTE_NONE)
    goal.currentAmount >= goal.targetAmount -> t(StringKey.GOALS_NOTE_DONE)
    else -> String.format(t(StringKey.GOALS_NOTE_LEFT), format(goal.targetAmount - goal.currentAmount))
}

@Composable
private fun GoalCard(goal: Goal, category: GoalCategory, onEdit: () -> Unit, onPay: () -> Unit) {
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape)
            .padding(horizontal = 18.dp, vertical = 16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            GoalRing(percentage = goal.percentage, category = category)
            Column(modifier = Modifier.weight(1f).padding(start = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        goal.name,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        MockupIcons.Pencil,
                        contentDescription = t(StringKey.GOALS_EDIT_TITLE),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .padding(start = 8.dp)
                            .clip(CircleShape)
                            .clickable(onClick = onEdit)
                            .padding(2.dp)
                            .size(15.dp),
                    )
                }
                Text(
                    buildAnnotatedString {
                        append(format(goal.currentAmount))
                        withStyle(SpanStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textDim)) {
                            append(" ${t(StringKey.BUDGETS_OF)} ${format(goal.targetAmount)}")
                        }
                    },
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Text(goalNote(goal, t) { format(it) }, fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 3.dp))
            }
        }
        Box(
            modifier = Modifier
                .padding(top = 14.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.primary)
                .clickable(role = Role.Button, onClick = onPay)
                .padding(11.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(t(StringKey.GOALS_CONTRIBUTE), fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        }
    }
}

// Mockup ringStyle: a 62dp conic fill in the goal color over --line, with a
// 48dp --surface disc on top holding the 22dp glyph.
@Composable
private fun GoalRing(percentage: Int, category: GoalCategory) {
    val color = Color(category.color)
    val track = MaterialTheme.colorScheme.outline
    val surface = MaterialTheme.colorScheme.surface
    Box(modifier = Modifier.size(62.dp), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(62.dp)) {
            drawCircle(track)
            drawArc(color, startAngle = -90f, sweepAngle = 3.6f * percentage.coerceIn(0, 100), useCenter = true, topLeft = Offset.Zero, size = Size(size.width, size.height))
            drawCircle(surface, radius = 24.dp.toPx())
        }
        Icon(category.icon, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
    }
}

// Draft state backing the goal create/edit sheet. `id == null` means
// "creating".
private data class GoalDraft(
    val id: String?,
    val name: String,
    val category: GoalCategoryId,
    val userPickedCategory: Boolean,
    val targetText: String,
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun GoalDraftSheet(
    draft: GoalDraft,
    onDraftChange: (GoalDraft) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onRequestDelete: () -> Unit,
) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val isEdit = draft.id != null
    val category = goalCategories.first { it.id == draft.category }
    val color = Color(category.color)
    val showAutoNote = !draft.userPickedCategory && suggestGoalCategory(draft.name) != null

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = t(if (isEdit) StringKey.GOALS_EDIT_TITLE else StringKey.GOALS_NEW),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                SheetLabel(t(StringKey.GOALS_NAME))
                SheetBox(padding = PaddingValues(horizontal = 14.dp, vertical = 11.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(40.dp).clip(CircleShape).background(color.copy(alpha = 0x29 / 255f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(category.icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
                        }
                        Box(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                            SheetInput(
                                value = draft.name,
                                onValueChange = { newName ->
                                    val g = if (!draft.userPickedCategory) suggestGoalCategory(newName) else null
                                    onDraftChange(draft.copy(name = newName, category = g ?: draft.category))
                                },
                                placeholder = t(StringKey.GOALS_NAME_PLACEHOLDER),
                                style = TextStyle(fontSize = 13.5.sp, fontWeight = FontWeight.Bold),
                            )
                        }
                    }
                }
                Text(
                    t(if (showAutoNote) StringKey.BUDGETS_CATEGORY_AUTO_NOTE else StringKey.GOALS_CATEGORY_NOTE),
                    fontSize = 11.sp,
                    color = colors.textDim,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }

            Column {
                SheetLabel(t(StringKey.ADD_TXN_CATEGORY))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    goalCategories.forEach { c ->
                        ColorPill(
                            label = t(c.labelKey),
                            color = Color(c.color),
                            selected = draft.category == c.id,
                            onClick = { onDraftChange(draft.copy(category = c.id, userPickedCategory = true)) },
                        )
                    }
                }
            }

            Column {
                SheetLabel(t(StringKey.GOALS_TARGET_AMOUNT))
                SheetAmountBox(draft.targetText) { onDraftChange(draft.copy(targetText = it)) }
            }

            DraftSheetPrimaryButton(
                label = t(StringKey.COMMON_SAVE),
                enabled = draft.name.isNotBlank() && (draft.targetText.toDoubleOrNull() ?: 0.0) > 0,
                onClick = onSave,
            )

            if (isEdit) {
                DraftSheetDeleteRow(label = t(StringKey.GOALS_DELETE), onClick = onRequestDelete)
            }
        }
    }
}

private sealed interface GoalDestination {
    data object Origin : GoalDestination
    data class Wallet(val id: String) : GoalDestination
}

// Mockup goalDel: the saved money goes back either to the wallets it came
// from ("Devolver a su origen") or all to one wallet, as real movements.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GoalDeleteSheet(
    goal: Goal,
    wallets: List<Wallet>,
    onDismiss: () -> Unit,
    onConfirm: (GoalDestination?) -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current
    val hasBalance = goal.currentAmount > 0
    val origin = goal.contributions.entries.sortedByDescending { it.value }.mapNotNull { (id, amount) -> wallets.firstOrNull { it.id == id }?.let { "${shortWalletName(it.name)} ${format(amount)}" } }
    var selected by remember { mutableStateOf<GoalDestination>(if (goal.contributions.isNotEmpty()) GoalDestination.Origin else wallets.firstOrNull()?.let { GoalDestination.Wallet(it.id) } ?: GoalDestination.Origin) }

    val subtitle = if (hasBalance) {
        val amount = format(goal.currentAmount)
        val body = String.format(t(StringKey.GOALS_DELETE_HAS_BALANCE), amount)
        val at = body.indexOf(amount)
        buildAnnotatedString {
            append(body.substring(0, at))
            withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)) { append(amount) }
            append(body.substring(at + amount.length))
        }
    } else {
        buildAnnotatedString { append(t(StringKey.GOALS_DELETE_CONFIRM_BODY)) }
    }

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = String.format(t(StringKey.GOALS_DELETE_NAMED), goal.name),
        subtitle = subtitle,
    ) {
        if (hasBalance) {
            Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                DestinationRow(
                    label = t(StringKey.GOALS_DELETE_ORIGIN),
                    detail = origin.joinToString(" · ").ifBlank { t(StringKey.GOALS_DELETE_NO_ORIGIN) },
                    selected = selected == GoalDestination.Origin,
                    onClick = { selected = GoalDestination.Origin },
                )
                wallets.forEach { wallet ->
                    DestinationRow(
                        label = String.format(t(StringKey.GOALS_DELETE_ALL_TO), shortWalletName(wallet.name)),
                        detail = String.format(t(StringKey.GOALS_DELETE_ONE_MOVE), format(goal.currentAmount)),
                        selected = selected == GoalDestination.Wallet(wallet.id),
                        onClick = { selected = GoalDestination.Wallet(wallet.id) },
                    )
                }
            }
        }
        val canConfirm = !hasBalance || selected != GoalDestination.Origin || goal.contributions.isNotEmpty()
        Box(
            modifier = Modifier
                .padding(top = if (hasBalance) 18.dp else 0.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0x24E85D6B))
                .border(1.dp, colors.negative, RoundedCornerShape(14.dp))
                .clickable(enabled = canConfirm) { onConfirm(if (hasBalance) selected else null) }
                .padding(14.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (hasBalance) String.format(t(StringKey.GOALS_DELETE_AND_RETURN), format(goal.currentAmount)) else t(StringKey.GOALS_DELETE),
                color = colors.negative,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 13.sp,
            )
        }
        Text(
            t(StringKey.COMMON_CANCEL),
            textAlign = TextAlign.Center,
            fontSize = 12.5.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth().clickable(onClick = onDismiss).padding(top = 12.dp, bottom = 4.dp),
        )
    }
}

// Mockup goalDelRows row: 16dp radio dot, label 13 Bold, detail 11 --dim.
@Composable
private fun DestinationRow(label: String, detail: String, selected: Boolean, onClick: () -> Unit) {
    val colors = NovaColors.current
    val accent = MaterialTheme.colorScheme.primary
    val line2 = MaterialTheme.colorScheme.outlineVariant
    val surface = MaterialTheme.colorScheme.surface
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) Color(0x1F6C5CE7) else Color.Transparent)
            .border(1.dp, if (selected) accent else line2, RoundedCornerShape(14.dp))
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Canvas(modifier = Modifier.size(16.dp)) {
            val stroke = 2.dp.toPx()
            val r = size.minDimension / 2
            if (selected) {
                drawCircle(accent, radius = r)
                drawCircle(surface, radius = r - stroke)
                drawCircle(accent, radius = r - stroke - 2.5.dp.toPx())
            } else {
                drawCircle(line2, radius = r - stroke / 2, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
            }
        }
        Column(modifier = Modifier.padding(start = 12.dp)) {
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Text(detail, fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

// Mockup goalPay: amount, source wallet pills and "Abonar". Under the hood
// a normal EXPENSE with `goalId` (backend sums linked COMPLETED rows), so
// it stays editable/deletable like any movement; the snackbar's "Deshacer"
// is only a fast path right after saving.
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun GoalPaySheet(
    goal: Goal,
    wallets: List<Wallet>,
    snackbarHostState: SnackbarHostState,
    onDismiss: () -> Unit,
) {
    val t = rememberStrings()
    val format = rememberCurrencyFormatter()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    var amountText by remember { mutableStateOf("") }
    var walletId by remember { mutableStateOf(wallets.firstOrNull()?.id) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val amount = amountText.toDoubleOrNull() ?: 0.0

    NovaDraftSheet(
        onDismiss = onDismiss,
        title = "${t(StringKey.GOAL_CONTRIBUTION_TITLE)} ${goal.name}",
        subtitle = buildAnnotatedString { append(String.format(t(StringKey.GOAL_PAY_NOTE), format(goal.currentAmount), format(goal.targetAmount))) },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column {
                SheetLabel(t(StringKey.GOAL_CONTRIBUTION_AMOUNT))
                SheetAmountBox(amountText) { amountText = it; error = null }
            }

            if (wallets.isEmpty()) {
                Text(t(StringKey.ADD_TXN_NO_WALLET_SUBTITLE), fontSize = 12.sp, color = colors.textDim)
            } else {
                Column {
                    SheetLabel(t(StringKey.GOAL_CONTRIBUTION_WALLET))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        wallets.forEach { wallet ->
                            SheetPill(shortWalletName(wallet.name), selected = walletId == wallet.id) { walletId = wallet.id }
                        }
                    }
                }
            }

            error?.let { Text(it, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = colors.negative) }

            DraftSheetPrimaryButton(
                label = t(StringKey.GOAL_CONTRIBUTION_SAVE),
                enabled = !saving && amount > 0 && walletId != null,
                onClick = {
                    val selectedWallet = walletId ?: return@DraftSheetPrimaryButton
                    val input = NewTransactionInput(
                        walletId = selectedWallet,
                        description = t(StringKey.GOAL_CONTRIBUTION_DESCRIPTION_PREFIX) + goal.name,
                        amount = amount,
                        type = TransactionType.EXPENSE,
                        category = CategoryId.OTHER,
                        date = todayISO(),
                        goalId = goal.id,
                    )
                    saving = true
                    scope.launch {
                        val created = runCatching { AppContainer.transactionRepository.add(input) }.getOrNull()
                        if (created == null) {
                            saving = false
                            error = t(StringKey.COMMON_SAVE_ERROR)
                            return@launch
                        }
                        runCatching { AppContainer.walletRepository.refresh() }
                        runCatching { AppContainer.goalRepository.refresh() }
                        onDismiss()
                        val result = snackbarHostState.showSnackbar(
                            message = t(StringKey.GOAL_CONTRIBUTION_SAVED),
                            actionLabel = t(StringKey.COMMON_UNDO),
                            duration = SnackbarDuration.Long,
                        )
                        if (result == SnackbarResult.ActionPerformed) {
                            runCatching {
                                AppContainer.transactionRepository.delete(created.id)
                                AppContainer.walletRepository.refresh()
                                AppContainer.goalRepository.refresh()
                            }
                        }
                    }
                },
            )
        }
    }
}

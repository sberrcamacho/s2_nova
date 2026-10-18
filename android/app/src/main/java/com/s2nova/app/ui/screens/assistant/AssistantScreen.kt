package com.s2nova.app.ui.screens.assistant

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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.repository.AssistantProposal
import com.s2nova.app.data.repository.ChatTurn
import com.s2nova.app.data.fmtDate
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.categoryLabel
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.theme.NovaColors
import com.s2nova.app.ui.theme.NovaType
import com.s2nova.app.ui.theme.appCanvas
import com.s2nova.app.ui.theme.ctaBrush
import kotlinx.coroutines.launch
import retrofit2.HttpException

// The conversation outlives the screen (reviewing a draft and coming back
// keeps it) but not the session: it's cleared on sign-out.
object AssistantConversation {
    val turns = mutableStateListOf<ChatTurn>()
}

// "Asistente": a chat over the user's own data (backend routes/assistant.ts).
// It only reads; a draft it prepares opens Nuevo movimiento to review and
// save. Web's AssistantPanel is the same.
@Composable
fun AssistantScreen(onBack: () -> Unit, onDraft: (AssistantProposal) -> Unit, onCreateAccount: () -> Unit) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    val turns = AssistantConversation.turns
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var remaining by remember { mutableStateOf<Int?>(null) }
    val list = rememberLazyListState()
    val guest = AppContainer.isGuest

    LaunchedEffect(turns.size, sending) { if (turns.isNotEmpty()) list.animateScrollToItem(turns.size + 1) }

    fun send(text: String) {
        val question = text.trim()
        if (question.isEmpty() || sending) return
        turns += ChatTurn(fromUser = true, text = question)
        input = ""
        error = null
        sending = true
        scope.launch {
            runCatching { AppContainer.assistantRepository.send(turns.toList()) }
                .onSuccess { reply ->
                    turns += ChatTurn(fromUser = false, text = reply.text.ifBlank { t(StringKey.ASST_EMPTY) }, proposals = reply.proposals)
                    remaining = reply.remaining
                }
                .onFailure { e ->
                    error = t(if (e is HttpException && e.code() == 429) StringKey.ASST_LIMIT else StringKey.ASST_ERROR)
                    // The question goes back to the field to try again.
                    turns.removeAt(turns.lastIndex)
                    input = question
                }
            sending = false
        }
    }

    Scaffold(containerColor = Color.Transparent, modifier = Modifier.appCanvas(MaterialTheme.colorScheme.background), contentWindowInsets = WindowInsets(0, 0, 0, 0)) { padding ->
        // The nav host already ends above the keyboard (adjustResize +
        // imePadding), so no imePadding here (it would count twice).
        Column(Modifier.fillMaxSize().padding(padding)) {
            BackHeader(title = t(StringKey.ASST_TITLE), onBack = onBack)
            LazyColumn(
                state = list,
                modifier = Modifier.weight(1f).fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (turns.isEmpty()) item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(t(if (guest) StringKey.ASST_GUEST else StringKey.ASST_INTRO), style = NovaType.body, color = MaterialTheme.colorScheme.onBackground)
                        if (!guest) {
                            listOf(StringKey.ASST_EX1, StringKey.ASST_EX2, StringKey.ASST_EX3).forEach { k ->
                                Text(
                                    t(k),
                                    style = NovaType.bodySm,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(min = 48.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .border(1.dp, colors.borderInput, RoundedCornerShape(12.dp))
                                        .clickable(role = Role.Button) { send(t(k)) }
                                        .padding(horizontal = 14.dp, vertical = 14.dp),
                                )
                            }
                            Text(t(StringKey.ASST_PRIVACY), style = NovaType.caption, color = colors.textDim)
                        }
                    }
                }
                itemsIndexed(turns) { _, turn ->
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (turn.fromUser) Alignment.End else Alignment.Start, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            Modifier
                                .widthIn(max = 320.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (turn.fromUser) MaterialTheme.colorScheme.primaryContainer else colors.surfaceSunken)
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                        ) {
                            Text(
                                if (turn.fromUser) AnnotatedString(turn.text) else rich(turn.text),
                                style = NovaType.body,
                                color = if (turn.fromUser) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onBackground,
                            )
                        }
                        turn.proposals.forEach { p -> DraftCard(p) { onDraft(p) } }
                    }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (sending) Text(t(StringKey.ASST_THINKING), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(colors.surfaceSunken).padding(horizontal = 14.dp, vertical = 10.dp))
                        error?.let { Text(it, style = NovaType.bodySm.copy(fontWeight = FontWeight.SemiBold), color = colors.negative, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(colors.negativeSoft).padding(12.dp)) }
                        remaining?.takeIf { it <= 5 }?.let { Text(t(StringKey.ASST_REMAINING).format(it.toString()), style = NovaType.caption, color = colors.textDim) }
                    }
                }
            }
            // The question field, or the way to sign up for a guest.
            Row(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (guest) {
                    PrimaryPill(t(StringKey.AUTH_CREATE), enabled = true, modifier = Modifier.weight(1f), onClick = onCreateAccount)
                } else {
                    BasicTextField(
                        value = input,
                        onValueChange = { input = it.take(2000) },
                        textStyle = NovaType.body.copy(color = MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        maxLines = 4,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { send(input) }),
                        modifier = Modifier.weight(1f).semantics { contentDescription = t(StringKey.ASST_PLACEHOLDER) },
                        decorationBox = { inner ->
                            Box(
                                Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, colors.borderInput, RoundedCornerShape(12.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
                                contentAlignment = Alignment.CenterStart,
                            ) {
                                if (input.isEmpty()) Text(t(StringKey.ASST_PLACEHOLDER), style = NovaType.body, color = colors.textDim)
                                inner()
                            }
                        },
                    )
                    PrimaryPill(t(StringKey.ASST_SEND), enabled = !sending && input.isNotBlank()) { send(input) }
                }
            }
        }
    }
}

@Composable
private fun PrimaryPill(label: String, enabled: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .heightIn(min = 48.dp)
            .alpha(if (enabled) 1f else 0.38f)
            .clip(RoundedCornerShape(12.dp))
            .background(ctaBrush())
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = NovaType.label, color = Color.White, maxLines = 1, softWrap = false)
    }
}

// A draft the assistant prepared, with the button that opens the form.
@Composable
private fun DraftCard(p: AssistantProposal, onReview: () -> Unit) {
    val t = rememberStrings()
    val colors = NovaColors.current
    val income = p.type == TransactionType.INCOME
    val meta = listOfNotNull(p.category?.let(::categoryLabel), p.date?.let(::fmtDate)).joinToString(" · ")
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(t(StringKey.ASST_DRAFT).uppercase(), style = NovaType.overline, color = colors.textDim)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(p.description, style = NovaType.titleSm, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text(
                (if (income) "+" else "−") + formatMoney(p.amount, AppContainer.currencyRepository.principal),
                style = NovaType.titleSm.copy(fontFeatureSettings = "tnum"),
                color = if (income) colors.positive else colors.negative,
                maxLines = 1,
                softWrap = false,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
        if (meta.isNotEmpty()) Text(meta, style = NovaType.bodySm, color = colors.textDim, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(
            t(StringKey.ASST_REVIEW),
            style = NovaType.label,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
            modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.primaryContainer).clickable(role = Role.Button, onClick = onReview).padding(horizontal = 16.dp, vertical = 14.dp),
        )
    }
}

// The model's light markdown: **bold** and "- " list lines.
private val BULLET = Regex("""^\s*[-*•]\s+(.*)$""")
private val BOLD = Regex("""\*\*([^*]+)\*\*""")

private fun rich(text: String): AnnotatedString = buildAnnotatedString {
    text.lines().filter { it.isNotBlank() }.forEachIndexed { i, raw ->
        if (i > 0) append("\n")
        val bullet = BULLET.find(raw)
        val line = bullet?.groupValues?.get(1) ?: raw
        if (bullet != null) append("•  ")
        var last = 0
        for (m in BOLD.findAll(line)) {
            append(line.substring(last, m.range.first))
            withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(m.groupValues[1]) }
            last = m.range.last + 1
        }
        append(line.substring(last))
    }
}

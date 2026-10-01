package com.s2nova.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.model.CategoryNode
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.components.BareField
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.GlyphMark
import com.s2nova.app.ui.components.InputBox
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.PillRow
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.SheetTextAction
import com.s2nova.app.ui.components.V2Button
import com.s2nova.app.ui.components.V2Pill
import com.s2nova.app.ui.components.V2Switch
import com.s2nova.app.ui.components.hexColor
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.screens.addtransaction.GridOf
import com.s2nova.app.ui.theme.NovaColors
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.ui.semantics.Role
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.components.HeaderAddButton
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

// Ajustes › Categorías (CATEGORY_SYSTEM.md §7b): Gastos / Ingresos tabs,
// one card per parent with its subcategory chips and "+ Subcategoría"; "+"
// creates a parent. Built-ins can be renamed, re-iconed or hidden; custom
// nodes can also be deleted (their movements move to the parent or "Otros").

private data class CatDraft(val id: String?, val name: String, val parentId: String?, val vis: String, val hidden: Boolean = false, val err: String = "")

@Composable
fun CategoriesScreen(initialIncome: Boolean, onBack: () -> Unit) {
    val nodes by AppContainer.categoryRepository.nodes.collectAsStateWithLifecycle()
    val repo = AppContainer.categoryRepository
    var income by remember { mutableStateOf(initialIncome) }
    var draft by remember { mutableStateOf<CatDraft?>(null) }
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { runCatching { repo.refresh() } }
    nodes.size

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackHeader(title = tr(StringKey.CAT_TITLE), onBack = onBack, action = { HeaderAddButton(tr(StringKey.CAT_NEW)) { draft = CatDraft(null, "", null, "other") } })
        UnderlineTabs(listOf(tr(StringKey.CAT_TAB_EXPENSES), tr(StringKey.CAT_TAB_INCOME)), if (income) 1 else 0) { income = it == 1 }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(tr(StringKey.CAT_SUBTITLE), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant)
            repo.parents(income).forEach { p ->
                val kids = repo.children(p.id)
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp)).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClickLabel = tr(StringKey.CAT_EDIT)) { draft = CatDraft(p.id, repo.displayName(p), null, p.vis, p.hidden) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CatMark(p.id, 40.dp)
                        Column(Modifier.weight(1f)) {
                            Text(repo.displayName(p), style = NovaType.titleSm, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            Text(tr(if (kids.size == 1) StringKey.CAT_SUB_ONE else StringKey.CAT_SUB_MANY, kids.size), style = NovaType.bodySm, color = colors.textDim)
                        }
                        if (p.hidden) Tag(tr(StringKey.CAT_HIDDEN), MaterialTheme.colorScheme.onSurfaceVariant, MaterialTheme.colorScheme.outlineVariant)
                        if (p.custom) Tag(tr(StringKey.CAT_YOURS), colors.link, colors.link)
                        Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    }
                    val color = Color(p.color)
                    androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        kids.forEach { c ->
                            // A tappable chip: 40 dp tall, `label` text.
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(999.dp)).background(if (c.custom) color else color.copy(alpha = 0.12f))
                                    .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                                    .clickable(role = Role.Button, onClickLabel = tr(StringKey.CAT_EDIT_SUB)) { draft = CatDraft(c.id, repo.displayName(c), p.id, p.vis) }.padding(horizontal = 14.dp),
                            ) {
                                Text(
                                    repo.displayName(c), style = NovaType.label, maxLines = 1, softWrap = false,
                                    color = if (c.custom) (if (color.luminance() > 0.5f) Color(0xFF111118) else Color.White) else MaterialTheme.colorScheme.onSurface,
                                )
                            }
                        }
                        val line2 = MaterialTheme.colorScheme.outlineVariant
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(999.dp)).drawBehind {
                                drawRoundRect(line2, style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 2.dp.toPx()))), cornerRadius = androidx.compose.ui.geometry.CornerRadius(size.height / 2))
                            }.clickable(role = Role.Button) { draft = CatDraft(null, "", p.id, p.vis) }.padding(horizontal = 14.dp),
                        ) {
                            Text(tr(StringKey.CAT_ADD_SUB), style = NovaType.label, color = colors.link, maxLines = 1, softWrap = false)
                        }
                    }
                }
            }
        }
    }

    val d = draft ?: return
    val editing = d.id?.let(repo::node)
    val parent = d.parentId?.let(repo::node)
    NovaDraftSheet(onDismiss = { draft = null }) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SheetHeader(
                if (editing != null) tr(if (editing.parentId != null) StringKey.CAT_EDIT_SUB else StringKey.CAT_EDIT) else if (parent != null) tr(StringKey.CAT_NEW_SUB_IN, repo.displayName(parent)) else tr(StringKey.CAT_NEW),
                if (editing != null) tr(if (editing.custom) StringKey.CAT_SUB_CUSTOM else StringKey.CAT_SUB_BUILTIN)
                else tr(if (income) StringKey.CAT_SUB_NEW_INCOME else StringKey.CAT_SUB_NEW_EXPENSE),
                bottom = 18.dp, subtitleTop = 5.dp,
            )
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Column {
                    FieldLabel(tr(StringKey.PLAN_NAME))
                    InputBox { BareField(d.name, { draft = d.copy(name = it.take(40), err = "") }, tr(StringKey.CAT_NAME_PH)) }
                }
                if (editing == null) {
                    Column {
                        FieldLabel(tr(StringKey.CAT_INSIDE))
                        PillRow {
                            V2Pill(tr(StringKey.CAT_NEW_MAIN), d.parentId == null, { draft = d.copy(parentId = null, err = "") })
                            repo.parents(income).forEach { p -> V2Pill(repo.displayName(p), d.parentId == p.id, { draft = d.copy(parentId = p.id, vis = p.vis, err = "") }) }
                        }
                    }
                }
                if (parent == null) {
                    Column {
                        FieldLabel(tr(StringKey.CAT_ICON_COLOR))
                        GridOf(Taxonomy.vis.keys.filter { it != "transfer" }, 6, 6.dp, 6.dp) { k ->
                            val v = Taxonomy.vis.getValue(k)
                            val c = hexColor(v.color)
                            Box(
                                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.5.dp, if (d.vis == k) c else Color.Transparent, RoundedCornerShape(12.dp))
                                    .noRippleClick { draft = d.copy(vis = k) }.padding(vertical = 4.dp),
                                contentAlignment = Alignment.Center,
                            ) { GlyphMark(v.glyph, c, 34.dp) }
                        }
                    }
                } else {
                    Text(tr(StringKey.CAT_PARENT_COLOR, repo.displayName(parent)), fontSize = 12.sp, color = colors.textDim)
                }
                if (editing != null && !editing.custom && editing.parentId == null) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(tr(StringKey.CAT_SHOW), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text(tr(StringKey.CAT_SHOW_HINT), fontSize = 12.sp, lineHeight = 15.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                        }
                        V2Switch(!d.hidden) { draft = d.copy(hidden = !d.hidden) }
                    }
                }
                if (d.err.isNotBlank()) Text(d.err, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.negative)
                V2Button(tr(if (editing != null) StringKey.CAT_SAVE else StringKey.CAT_CREATE), onClick = {
                    val name = d.name.trim()
                    if (name.isEmpty()) { draft = d.copy(err = tr(StringKey.CAT_ERR_NAME)); return@V2Button }
                    val siblings = if (d.parentId != null) repo.children(d.parentId) else repo.parents(income)
                    if (siblings.any { repo.displayName(it).equals(name, ignoreCase = true) && it.id != editing?.id }) { draft = d.copy(err = tr(StringKey.CAT_ERR_TAKEN)); return@V2Button }
                    scope.launch {
                        runCatching {
                            // A built-in shown in English keeps its stored name unless it was changed.
                            if (editing != null) repo.update(editing.id, if (name == repo.displayName(editing)) editing.name else name, if (editing.parentId == null) d.vis else null, if (!editing.custom && editing.parentId == null) d.hidden else null)
                            else repo.create(income, d.parentId, name, d.vis)
                        }.onSuccess { draft = null }.onFailure { draft = d.copy(err = tr(StringKey.LOAN_ERR_SAVE)) }
                    }
                })
                if (editing != null && editing.custom) {
                    SheetTextAction(tr(if (editing.parentId != null) StringKey.CAT_DELETE_SUB else StringKey.CAT_DELETE), colors.negative, { askDelete(editing, income) { draft = null } }, weight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

private fun askDelete(n: CategoryNode, income: Boolean, onDone: () -> Unit) {
    val repo = AppContainer.categoryRepository
    val kids = repo.children(n.id)
    val fallback = n.parentId ?: if (income) "inc.other" else "exp.other"
    val used = n.usage + kids.sumOf { it.usage }
    Confirm.ask(
        ConfirmRequest(
            title = tr(StringKey.MV_DELETE_TITLE, repo.displayName(n)),
            lines = listOf(
                (if (n.parentId != null) tr(StringKey.CAT_SUB_OF, repo.name(n.parentId)) else tr(StringKey.CAT_MAIN)) + if (kids.isNotEmpty()) tr(StringKey.CAT_AND_SUBS, kids.size) else "",
                tr(if (used == 1) StringKey.CAT_MOVE_ONE else StringKey.CAT_MOVE_MANY, used, repo.name(fallback)),
                tr(StringKey.CAT_DELETE_GONE),
            ),
            ack = tr(StringKey.CAT_DELETE_ACK, repo.name(fallback)),
            cta = tr(StringKey.CAT_DELETE),
            onConfirm = {
                onDone()
                AppContainer.appScope.launch {
                    runCatching { repo.delete(n.id) }
                    if (!AppContainer.isGuest) runCatching { AppContainer.transactionRepository.refresh() }
                }
            },
        ),
    )
}

@Composable
private fun Tag(label: String, color: Color, border: Color) {
    Text(label, style = NovaType.caption.copy(fontWeight = FontWeight.SemiBold), color = color, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, border, RoundedCornerShape(999.dp)).padding(horizontal = 7.dp, vertical = 2.dp))
}

// Text tabs over a 1 dp `border` rule with a 2 dp `primary-border`
// indicator: `label` text, 48 dp tall, tab semantics.
@Composable
fun UnderlineTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    val accent = NovaColors.current.primaryBorder
    Row(
        Modifier.fillMaxWidth().drawBehind { drawRect(line, topLeft = Offset(0f, size.height - 1.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 1.dp.toPx())) }.padding(horizontal = 16.dp).selectableGroup(),
    ) {
        labels.forEachIndexed { i, label ->
            val on = i == selected
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.heightIn(min = 48.dp).selectable(selected = on, role = Role.Tab) { onSelect(i) }.drawBehind {
                    if (on) drawRect(accent, topLeft = Offset(0f, size.height - 2.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 2.dp.toPx()))
                }.padding(horizontal = 14.dp),
            ) {
                Text(
                    label, style = NovaType.label.copy(fontWeight = if (on) FontWeight.Bold else FontWeight.SemiBold),
                    color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1, softWrap = false,
                )
            }
        }
    }
}

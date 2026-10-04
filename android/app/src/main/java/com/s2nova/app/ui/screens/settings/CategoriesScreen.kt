package com.s2nova.app.ui.screens.settings

import com.s2nova.app.ui.theme.cardAurora
import com.s2nova.app.ui.theme.appCanvas
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.model.CategoryNode
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.FieldLabel
import com.s2nova.app.ui.components.GlyphMark
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.StepSpacer
import com.s2nova.app.ui.components.StepSheet
import com.s2nova.app.ui.components.StepQuestion
import com.s2nova.app.ui.components.StepDeleteButton
import com.s2nova.app.ui.components.RadioDot
import com.s2nova.app.ui.components.NameField
import com.s2nova.app.ui.components.FieldNote
import com.s2nova.app.ui.components.DraftSheetPrimaryButton
import com.s2nova.app.ui.components.ChoiceCard
import com.s2nova.app.ui.components.V2Switch
import com.s2nova.app.ui.components.hexColor
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

    Column(Modifier.fillMaxSize().appCanvas(MaterialTheme.colorScheme.background)) {
        BackHeader(title = tr(StringKey.CAT_TITLE), onBack = onBack, action = { HeaderAddButton(tr(StringKey.CAT_NEW)) { draft = CatDraft(null, "", null, "other") } })
        UnderlineTabs(listOf(tr(StringKey.CAT_TAB_EXPENSES), tr(StringKey.CAT_TAB_INCOME)), if (income) 1 else 0) { income = it == 1 }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(tr(StringKey.CAT_SUBTITLE), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant)
            repo.parents(income).forEach { p ->
                val kids = repo.children(p.id)
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).cardAurora()
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
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
                            // A tappable chip: 40 dp tall, `label` text. Your own subcategories get the
                            // parent's full-color border (text stays on-surface, so it reads on any hue).
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = if (c.custom) 0.16f else 0.12f))
                                    .border(if (c.custom) 1.5.dp else 1.dp, if (c.custom) color else color.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                                    .clickable(role = Role.Button, onClickLabel = tr(StringKey.CAT_EDIT_SUB)) { draft = CatDraft(c.id, repo.displayName(c), p.id, p.vis) }.padding(horizontal = 14.dp),
                            ) {
                                Text(
                                    repo.displayName(c), style = NovaType.label, maxLines = 1, softWrap = false,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                            }
                        }
                        val line2 = MaterialTheme.colorScheme.outlineVariant
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(10.dp)).drawBehind {
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
    val save: (CatDraft) -> Unit = save@{ cur ->
        val name = cur.name.trim()
        if (name.isEmpty()) { draft = cur.copy(err = tr(StringKey.CAT_ERR_NAME)); return@save }
        val siblings = if (cur.parentId != null) repo.children(cur.parentId) else repo.parents(income)
        if (siblings.any { repo.displayName(it).equals(name, ignoreCase = true) && it.id != editing?.id }) { draft = cur.copy(err = tr(StringKey.CAT_ERR_TAKEN)); return@save }
        scope.launch {
            runCatching {
                // A built-in shown in English keeps its stored name unless it was changed.
                if (editing != null) repo.update(editing.id, if (name == repo.displayName(editing)) editing.name else name, if (editing.parentId == null) cur.vis else null, if (!editing.custom && editing.parentId == null) cur.hidden else null)
                else repo.create(income, cur.parentId, name, cur.vis)
            }.onSuccess { draft = null }.onFailure { draft = cur.copy(err = tr(StringKey.LOAN_ERR_SAVE)) }
        }
    }
    if (editing == null) {
        CategoryCreateSheet(d, income, onChange = { draft = it }, onDismiss = { draft = null }, onSave = save)
        return
    }
    // Editing: one sheet with the name, the icon (parents) and, for a
    // built-in parent, whether it shows when recording.
    NovaDraftSheet(
        onDismiss = { draft = null },
        title = tr(if (editing.parentId != null) StringKey.CAT_EDIT_SUB else StringKey.CAT_EDIT),
        subtitle = androidx.compose.ui.text.AnnotatedString(tr(if (editing.custom) StringKey.CAT_SUB_CUSTOM else StringKey.CAT_SUB_BUILTIN)),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            CategoryFields(d, d.parentId?.let(repo::node)) { draft = it }
            if (!editing.custom && editing.parentId == null) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(tr(StringKey.CAT_SHOW), style = NovaType.label, color = MaterialTheme.colorScheme.onBackground)
                        Text(tr(StringKey.CAT_SHOW_HINT), style = NovaType.caption, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                    }
                    V2Switch(!d.hidden) { draft = d.copy(hidden = !d.hidden) }
                }
            }
            Column {
                DraftSheetPrimaryButton(tr(StringKey.CAT_SAVE), enabled = d.name.isNotBlank(), onClick = { save(d) })
                if (editing.custom) StepDeleteButton(tr(if (editing.parentId != null) StringKey.CAT_DELETE_SUB else StringKey.CAT_DELETE)) { askDelete(editing, income) { draft = null } }
            }
        }
    }
}

// Creating, in steps that fit the screen: where it goes (a new main
// category, or a subcategory; tap advances), which parent (the category
// grid, only for a subcategory; tap advances), then its name and icon.
// "+ Subcategoría" already knows the parent, so it opens on the last step.
@Composable
private fun CategoryCreateSheet(d: CatDraft, income: Boolean, onChange: (CatDraft) -> Unit, onDismiss: () -> Unit, onSave: (CatDraft) -> Unit) {
    val repo = AppContainer.categoryRepository
    val colors = NovaColors.current
    val known = remember { d.parentId != null }
    var asSub by remember { mutableStateOf(d.parentId != null) }
    val steps = if (known) listOf(2) else if (asSub) listOf(0, 1, 2) else listOf(0, 2)
    var index by remember { mutableStateOf(0) }
    val at = index.coerceAtMost(steps.lastIndex)
    val parent = d.parentId?.let(repo::node)
    StepSheet(
        title = tr(if (parent != null) StringKey.CAT_NEW_SUB else StringKey.CAT_NEW),
        context = parent?.let(repo::displayName),
        step = at,
        stepCount = steps.size,
        onBack = { index = at - 1 },
        onDismiss = onDismiss,
        primaryLabel = tr(StringKey.CAT_CREATE),
        primaryEnabled = d.name.isNotBlank(),
        onPrimary = { onSave(d) },
        showPrimary = steps[at] == 2,
    ) { shown ->
        when (steps[shown.coerceAtMost(steps.lastIndex)]) {
            0 -> {
                StepQuestion(tr(StringKey.CAT_Q_WHERE), tr(if (income) StringKey.CAT_SUB_NEW_INCOME else StringKey.CAT_SUB_NEW_EXPENSE))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChoiceCard(V2Icons.plus, colors.accentText, tr(StringKey.CAT_NEW_MAIN), tr(StringKey.CAT_CHOICE_MAIN_DETAIL), !asSub && index > 0, {
                        asSub = false
                        onChange(d.copy(parentId = null, err = ""))
                        index = 1
                    })
                    ChoiceCard(V2Icons.more, colors.accentText, tr(StringKey.CAT_CHOICE_SUB), tr(StringKey.CAT_CHOICE_SUB_DETAIL), asSub, {
                        asSub = true
                        index = 1
                    })
                }
            }
            1 -> {
                StepQuestion(tr(StringKey.CAT_Q_PARENT))
                val parents = repo.parents(income)
                com.s2nova.app.ui.screens.addtransaction.GridOf(parents, com.s2nova.app.ui.screens.addtransaction.categoryGridColumns(parents.map { repo.displayName(it) }), 14.dp, 6.dp) { p ->
                    val on = d.parentId == p.id
                    Column(
                        Modifier.selectable(selected = on, role = Role.RadioButton) {
                            onChange(d.copy(parentId = p.id, vis = p.vis, err = ""))
                            index = 2
                        },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        com.s2nova.app.ui.screens.addtransaction.GridChip(repo.glyph(p.id), Color(p.color), on)
                        com.s2nova.app.ui.screens.addtransaction.GridLabel(repo.displayName(p), on)
                    }
                }
            }
            else -> {
                StepQuestion(tr(StringKey.CAT_Q_NAME))
                CategoryFields(d, parent, onChange)
            }
        }
    }
}

// The name (its mark shows the chosen icon) and, for a parent, the icon and
// color grid; a subcategory takes its parent's.
@Composable
private fun CategoryFields(d: CatDraft, parent: com.s2nova.app.data.model.CategoryNode?, onChange: (CatDraft) -> Unit) {
    val repo = AppContainer.categoryRepository
    val colors = NovaColors.current
    val vis = Taxonomy.vis[parent?.vis ?: d.vis] ?: Taxonomy.vis.getValue("other")
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        NameField(tr(StringKey.PLAN_NAME), d.name, { onChange(d.copy(name = it.take(40), err = "")) }, tr(StringKey.CAT_NAME_PH), leading = { GlyphMark(vis.glyph, hexColor(vis.color), 44.dp) })
        if (parent == null) {
            Column {
                FieldLabel(tr(StringKey.CAT_ICON_COLOR))
                GridOf(Taxonomy.vis.keys.filter { it != "transfer" }, 6, 8.dp, 8.dp) { k ->
                    val v = Taxonomy.vis.getValue(k)
                    val on = d.vis == k
                    Box(
                        Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(RoundedCornerShape(14.dp))
                            .border(2.dp, if (on) colors.primaryBorder else Color.Transparent, RoundedCornerShape(14.dp))
                            .selectable(selected = on, role = Role.RadioButton) { onChange(d.copy(vis = k)) },
                        contentAlignment = Alignment.Center,
                    ) {
                        GlyphMark(v.glyph, hexColor(v.color), 40.dp)
                        if (on) {
                            Box(
                                Modifier.align(Alignment.TopEnd).padding(3.dp).size(18.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center,
                            ) { V2Icon(V2Icons.check, MaterialTheme.colorScheme.onPrimary, 12.dp, strokeWidth = 3f) }
                        }
                    }
                }
            }
        } else {
            FieldNote(tr(StringKey.CAT_PARENT_COLOR, repo.displayName(parent)))
        }
        if (d.err.isNotBlank()) Text(d.err, style = NovaType.bodySm, color = colors.negative)
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
    Text(label, style = NovaType.caption.copy(fontWeight = FontWeight.SemiBold), color = color, maxLines = 1, softWrap = false, modifier = Modifier.clip(RoundedCornerShape(6.dp)).border(1.dp, border, RoundedCornerShape(6.dp)).padding(horizontal = 7.dp, vertical = 2.dp))
}

// Text tabs over a 1 dp `border` rule with a 2 dp `primary-border`
// indicator: `label` text, 48 dp tall, tab semantics.
@Composable
fun UnderlineTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    val accent = com.s2nova.app.ui.theme.ctaBrush()
    Row(
        Modifier.fillMaxWidth().drawBehind { drawRect(line, topLeft = Offset(0f, size.height - 1.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 1.dp.toPx())) }.padding(horizontal = 16.dp).selectableGroup(),
    ) {
        labels.forEachIndexed { i, label ->
            val on = i == selected
            // The brand underline grows out from the center (as Planes' tabs).
            val grow by androidx.compose.animation.core.animateFloatAsState(
                if (on) 1f else 0f,
                androidx.compose.animation.core.tween(if (on) 260 else 160, easing = com.s2nova.app.ui.theme.NovaMotion.EmphasizedDecelerate),
                label = "tabLine",
            )
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.heightIn(min = 48.dp).selectable(selected = on, role = Role.Tab) { onSelect(i) }.drawBehind {
                    if (grow > 0f) {
                        val h = 3.dp.toPx()
                        val w = size.width * grow
                        drawRoundRect(accent, topLeft = Offset((size.width - w) / 2f, size.height - h), size = androidx.compose.ui.geometry.Size(w, h), cornerRadius = androidx.compose.ui.geometry.CornerRadius(h / 2f))
                    }
                }.padding(horizontal = 14.dp),
            ) {
                Text(
                    label, style = NovaType.label.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.SemiBold),
                    color = if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1, softWrap = false,
                )
            }
        }
    }
}

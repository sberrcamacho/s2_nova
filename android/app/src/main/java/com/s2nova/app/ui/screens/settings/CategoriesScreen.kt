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
import kotlinx.coroutines.launch

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
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick(onBack), contentAlignment = Alignment.Center) { Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Text("Categorías", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick { draft = CatDraft(null, "", null, "other") }, contentAlignment = Alignment.Center) {
                Text("+", fontSize = 22.sp, fontWeight = FontWeight.Light, color = MaterialTheme.colorScheme.primary)
            }
        }
        UnderlineTabs(listOf("Gastos", "Ingresos"), if (income) 1 else 0) { income = it == 1 }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Son las mismas en Nuevo movimiento, presupuestos, filtros y reportes. Toca una categoría o subcategoría para editarla.", fontSize = 11.sp, lineHeight = 16.sp, color = colors.textDim)
            repo.parents(income).forEach { p ->
                val kids = repo.children(p.id)
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp)).padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(Modifier.noRippleClick { draft = CatDraft(p.id, p.name, null, p.vis, p.hidden) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CatMark(p.id, 38.dp)
                        Column(Modifier.weight(1f)) {
                            Text(p.name, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
                            Text(kids.size.toString() + if (kids.size == 1) " subcategoría" else " subcategorías", fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                        }
                        if (p.hidden) Tag("Oculta", colors.textDim, MaterialTheme.colorScheme.outlineVariant)
                        if (p.custom) Tag("Tuya", colors.accentText, colors.accentText)
                        Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(15.dp))
                    }
                    val color = Color(p.color)
                    androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        kids.forEach { c ->
                            Text(
                                c.name, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                color = if (c.custom) (if (color.luminance() > 0.5f) Color(0xFF111118) else Color.White) else colors.pillText,
                                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(if (c.custom) color else color.copy(alpha = 0.12f))
                                    .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                                    .noRippleClick { draft = CatDraft(c.id, c.name, p.id, p.vis) }.padding(horizontal = 9.dp, vertical = 4.dp),
                            )
                        }
                        val line2 = MaterialTheme.colorScheme.outlineVariant
                        Text(
                            "+ Subcategoría", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText,
                            modifier = Modifier.clip(RoundedCornerShape(999.dp)).drawBehind {
                                drawRoundRect(line2, style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 2.dp.toPx()))), cornerRadius = androidx.compose.ui.geometry.CornerRadius(size.height / 2))
                            }.noRippleClick { draft = CatDraft(null, "", p.id, p.vis) }.padding(horizontal = 9.dp, vertical = 4.dp),
                        )
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
                if (editing != null) (if (editing.parentId != null) "Editar subcategoría" else "Editar categoría") else if (parent != null) "Nueva subcategoría en ${parent.name}" else "Nueva categoría",
                if (editing != null) (if (editing.custom) "Creada por ti. Los cambios se ven en movimientos, presupuestos y reportes." else "Categoría de S2 Nova: puedes cambiar el nombre y el icono. No se puede eliminar; ocúltala si no la usas.")
                else "Tipo: " + (if (income) "ingreso" else "gasto") + ". Queda disponible en todo S2 Nova.",
                bottom = 18.dp, subtitleTop = 5.dp,
            )
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Column {
                    FieldLabel("Nombre")
                    InputBox { BareField(d.name, { draft = d.copy(name = it.take(40), err = "") }, "Ej. Clases de música") }
                }
                if (editing == null) {
                    Column {
                        FieldLabel("Dentro de")
                        PillRow {
                            V2Pill("Nueva principal", d.parentId == null, { draft = d.copy(parentId = null, err = "") })
                            repo.parents(income).forEach { p -> V2Pill(p.name, d.parentId == p.id, { draft = d.copy(parentId = p.id, vis = p.vis, err = "") }) }
                        }
                    }
                }
                if (parent == null) {
                    Column {
                        FieldLabel("Icono y color")
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
                    Text("Usa el color de ${parent.name} para agruparse igual en reportes.", fontSize = 11.sp, color = colors.textDim)
                }
                if (editing != null && !editing.custom && editing.parentId == null) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text("Mostrar al registrar", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text("Si la ocultas, sale del selector pero conserva su historial en reportes.", fontSize = 11.sp, lineHeight = 15.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                        }
                        V2Switch(!d.hidden) { draft = d.copy(hidden = !d.hidden) }
                    }
                }
                if (d.err.isNotBlank()) Text(d.err, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.negative)
                V2Button(if (editing != null) "Guardar cambios" else "Crear categoría", onClick = {
                    val name = d.name.trim()
                    if (name.isEmpty()) { draft = d.copy(err = "Escribe un nombre."); return@V2Button }
                    val siblings = if (d.parentId != null) repo.children(d.parentId) else repo.parents(income)
                    if (siblings.any { it.name.equals(name, ignoreCase = true) && it.id != editing?.id }) { draft = d.copy(err = "Ya existe una categoría con ese nombre aquí."); return@V2Button }
                    scope.launch {
                        runCatching {
                            if (editing != null) repo.update(editing.id, name, if (editing.parentId == null) d.vis else null, if (!editing.custom && editing.parentId == null) d.hidden else null)
                            else repo.create(income, d.parentId, name, d.vis)
                        }.onSuccess { draft = null }.onFailure { draft = d.copy(err = "No se pudo guardar. Intenta de nuevo.") }
                    }
                })
                if (editing != null && editing.custom) {
                    SheetTextAction(if (editing.parentId != null) "Eliminar subcategoría" else "Eliminar categoría", colors.negative, { askDelete(editing, income) { draft = null } }, weight = FontWeight.ExtraBold)
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
            title = "Eliminar “${n.name}”",
            lines = listOf(
                (if (n.parentId != null) "Subcategoría de " + repo.name(n.parentId) else "Categoría principal") + if (kids.isNotEmpty()) " y sus ${kids.size} subcategorías" else "",
                used.toString() + (if (used == 1) " movimiento pasa" else " movimientos pasan") + " a " + repo.name(fallback),
                "Deja de aparecer en presupuestos, filtros y reportes",
            ),
            ack = "Entiendo que los movimientos se reasignan a ${repo.name(fallback)} y que esto no se puede deshacer.",
            cta = "Eliminar categoría",
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
    Text(label, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = color, modifier = Modifier.clip(RoundedCornerShape(999.dp)).border(1.dp, border, RoundedCornerShape(999.dp)).padding(horizontal = 7.dp, vertical = 2.dp))
}

// catTabs: text tabs over a 1 dp --line rule, 2 dp accent underline.
@Composable
fun UnderlineTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    val accent = MaterialTheme.colorScheme.primary
    Row(
        Modifier.fillMaxWidth().drawBehind { drawRect(line, topLeft = Offset(0f, size.height - 1.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 1.dp.toPx())) }.padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        labels.forEachIndexed { i, label ->
            val on = i == selected
            Text(
                label, fontSize = 12.5.sp, fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold,
                color = if (on) MaterialTheme.colorScheme.onBackground else NovaColors.current.textDim,
                modifier = Modifier.noRippleClick { onSelect(i) }.drawBehind {
                    if (on) drawRect(accent, topLeft = Offset(0f, size.height - 2.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 2.dp.toPx()))
                }.padding(horizontal = 12.dp, vertical = 10.dp),
            )
        }
    }
}

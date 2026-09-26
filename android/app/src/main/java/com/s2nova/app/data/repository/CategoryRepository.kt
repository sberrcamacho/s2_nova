package com.s2nova.app.data.repository

import com.s2nova.app.data.Taxonomy
import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.CategoryNode
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.ApiService
import com.s2nova.app.data.remote.CategoryDto
import com.s2nova.app.data.remote.CreateCategoryRequest
import com.s2nova.app.data.remote.UpdateCategoryRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// The one category registry every screen resolves names, colors and glyphs
// through (CATEGORY_SYSTEM.md). Nodes are keyed by the taxonomy's stable
// dotted id; the backend row's UUID is only used on the wire
// (backendIdFor / idForBackendId). Until GET /categories loads — and in
// guest mode, which never calls it — the bundled taxonomy stands in.
class CategoryRepository(private val api: ApiService = ApiClient.api) {
    private val _nodes = MutableStateFlow<List<CategoryNode>>(emptyList())
    val nodes: StateFlow<List<CategoryNode>> = _nodes.asStateFlow()

    private fun parseColor(hex: String): Long = ("FF" + hex.removePrefix("#")).toLong(16)

    private fun bundled(): List<CategoryNode> = Taxonomy.nodes.map {
        CategoryNode(
            id = it.id, backendId = null, income = it.type == "income", parentId = it.parentId,
            name = it.name, defaultName = it.name, vis = it.vis, color = parseColor(it.color),
            custom = false, hidden = false, usage = 0,
        )
    }

    private fun current(): List<CategoryNode> = _nodes.value.ifEmpty { bundled().also { _nodes.value = it } }

    private fun List<CategoryDto>.toNodes(): List<CategoryNode> {
        val slugOf = associate { it.id to it.slug }
        return map {
            CategoryNode(
                id = it.slug, backendId = it.id, income = it.kind == "INCOME", parentId = it.parentId?.let(slugOf::get),
                name = it.name, defaultName = it.defaultName ?: it.name, vis = it.icon, color = parseColor(it.color),
                custom = it.isCustom, hidden = it.hidden, usage = it.usage,
            )
        }
    }

    suspend fun refresh() {
        if (DemoModeFlag.active) return
        // Taxonomy order (s2-categories.js), custom nodes after.
        val order = Taxonomy.nodes.withIndex().associate { it.value.id to it.index }
        _nodes.value = api.getCategories().toNodes().sortedBy { order[it.id] ?: Int.MAX_VALUE }
    }

    // Guest mode: the bundled taxonomy, editable locally.
    fun loadDemo() {
        _nodes.value = bundled()
    }

    fun all(): List<CategoryNode> = current()

    fun node(id: CategoryId?): CategoryNode? = id?.let { i -> current().firstOrNull { it.id == i } }

    fun parentOf(id: CategoryId?): CategoryNode? = node(id)?.let { n -> n.parentId?.let(::node) ?: n }

    fun parents(income: Boolean, includeHidden: Boolean = true): List<CategoryNode> =
        current().filter { it.parentId == null && it.income == income && (includeHidden || !it.hidden) }

    fun children(parentId: CategoryId): List<CategoryNode> = current().filter { it.parentId == parentId }

    fun name(id: CategoryId?): String = if (id == TRANSFER) Taxonomy.transfer.name else node(id)?.name ?: ""

    // "Alimentación · Mercado" for a leaf, "Alimentación" for a parent.
    fun label(id: CategoryId?): String {
        if (id == TRANSFER) return Taxonomy.transfer.name
        val n = node(id) ?: return ""
        return n.parentId?.let { node(it)?.name + " · " + n.name } ?: n.name
    }

    // Leaves inherit the parent's color.
    fun color(id: CategoryId?): Long {
        if (id == TRANSFER) return parseColor(Taxonomy.transfer.color)
        val p = parentOf(id) ?: return parseColor(Taxonomy.visColor("other"))
        return p.color
    }

    // A leaf uses its own taxonomy glyph when it has one, else the parent
    // identity's; a renamed/re-iconed parent uses its override's identity.
    fun glyph(id: CategoryId?): List<String> {
        if (id == TRANSFER) return Taxonomy.transfer.glyph
        val n = node(id) ?: return Taxonomy.vis.getValue("other").glyph
        val parent = parentOf(id)!!
        val bundledNode = Taxonomy.node(n.id)
        if (n.parentId != null && bundledNode != null && parent.vis == Taxonomy.node(parent.id)?.vis) return bundledNode.glyph
        return Taxonomy.vis[parent.vis]?.glyph ?: Taxonomy.vis.getValue("other").glyph
    }

    // True if `id` equals `scope` or is one of its children ("Todas").
    fun isIn(id: CategoryId?, scope: CategoryId?): Boolean {
        if (id == null || scope == null) return false
        return id == scope || node(id)?.parentId == scope
    }

    fun backendIdFor(id: CategoryId?): String? = node(id)?.backendId

    fun idForBackendId(backendId: String?): CategoryId? = backendId?.let { b -> current().firstOrNull { it.backendId == b }?.id }

    // ---- Ajustes › Categorías -------------------------------------------

    suspend fun create(income: Boolean, parentId: CategoryId?, name: String, vis: String): CategoryNode? {
        if (DemoModeFlag.active) {
            val parent = parentId?.let(::node)
            val base = parent?.id ?: if (income) "inc" else "exp"
            val slug = base + ".u_" + name.lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_')
            val v = parent?.vis ?: vis
            val created = CategoryNode(slug, null, income, parent?.id, name, name, v, parent?.color ?: parseColor(Taxonomy.visColor(v)), true, false, 0)
            _nodes.value = current() + created
            return created
        }
        api.createCategory(CreateCategoryRequest(if (income) "INCOME" else "EXPENSE", backendIdFor(parentId), name, if (parentId == null) vis else null))
        refresh()
        return current().lastOrNull { it.name == name && it.parentId == parentId }
    }

    suspend fun update(id: CategoryId, name: String?, vis: String?, hidden: Boolean?) {
        if (DemoModeFlag.active) {
            _nodes.value = current().map {
                when {
                    it.id == id -> it.copy(name = name ?: it.name, vis = vis ?: it.vis, color = vis?.let { v -> parseColor(Taxonomy.visColor(v)) } ?: it.color, hidden = hidden ?: it.hidden)
                    it.parentId == id && vis != null -> it.copy(vis = vis, color = parseColor(Taxonomy.visColor(vis)))
                    else -> it
                }
            }
            return
        }
        val backendId = backendIdFor(id) ?: return
        api.updateCategory(backendId, UpdateCategoryRequest(name, vis, hidden))
        refresh()
    }

    suspend fun delete(id: CategoryId) {
        if (DemoModeFlag.active) {
            _nodes.value = current().filterNot { it.id == id || it.parentId == id }
            return
        }
        val backendId = backendIdFor(id) ?: return
        val response = api.deleteCategory(backendId)
        if (!response.isSuccessful) throw retrofit2.HttpException(response)
        refresh()
    }

    companion object {
        // Wallet-to-wallet transfers are a type, not a category: presentation only.
        const val TRANSFER = "transfer"
    }
}

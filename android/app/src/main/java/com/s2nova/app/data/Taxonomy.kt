package com.s2nova.app.data

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The unified category taxonomy and plan icons (design_handoff_s2_nova_v2/
// s2-categories.js), bundled as assets/taxonomy.json by
// scripts/gen-taxonomy.mjs — never edit the JSON by hand. It is the
// fallback when the backend's GET /categories isn't loaded (guest mode,
// offline) and the source of every glyph, color and keyword. Node ids are
// the stable dotted ids ("exp.food.groceries"); see CATEGORY_SYSTEM.md.

@Serializable
data class TaxVis(val color: String, val glyph: List<String>)

@Serializable
data class TaxNode(
    val id: String,
    val type: String, // "expense" | "income"
    val parentId: String? = null,
    val name: String,
    val vis: String,
    val color: String,
    val glyph: List<String>,
)

@Serializable
data class TaxTransfer(val id: String, val name: String, val color: String, val glyph: List<String>)

@Serializable
data class TaxPlanIcon(val key: String, val name: String, val kw: List<String>, val color: String, val glyph: List<String>)

@Serializable
data class TaxKeywords(val expense: List<List<kotlinx.serialization.json.JsonElement>>, val income: List<List<kotlinx.serialization.json.JsonElement>>)

@Serializable
data class TaxonomyFile(
    val sourceHash: String,
    val vis: Map<String, TaxVis>,
    val nodes: List<TaxNode>,
    val transfer: TaxTransfer,
    val legacy: Map<String, String>,
    val keywords: TaxKeywords,
    val planIcons: List<TaxPlanIcon>,
)

object Taxonomy {
    private var file: TaxonomyFile? = null
    private val json = Json { ignoreUnknownKeys = true }

    fun init(context: Context) {
        if (file != null) return
        file = json.decodeFromString(TaxonomyFile.serializer(), context.assets.open("taxonomy.json").bufferedReader().use { it.readText() })
    }

    // Tests and previews without a Context load the JSON from a string.
    fun initFrom(text: String) {
        file = json.decodeFromString(TaxonomyFile.serializer(), text)
    }

    private val data: TaxonomyFile get() = file ?: error("Taxonomy.init(context) was not called")

    val nodes: List<TaxNode> get() = data.nodes
    val vis: Map<String, TaxVis> get() = data.vis
    val transfer: TaxTransfer get() = data.transfer
    val planIcons: List<TaxPlanIcon> get() = data.planIcons
    val legacy: Map<String, String> get() = data.legacy

    private val byId: Map<String, TaxNode> by lazy { data.nodes.associateBy { it.id } }

    fun node(id: String?): TaxNode? = id?.let { byId[it] }

    fun planIcon(key: String?): TaxPlanIcon = data.planIcons.firstOrNull { it.key == key } ?: data.planIcons.last()

    // First keyword hit wins; null when nothing matches (PLANS.md §1).
    fun guessPlanIcon(text: String): String? {
        val n = text.lowercase()
        if (n.isBlank()) return null
        return data.planIcons.firstOrNull { p -> p.kw.any { n.contains(it) } }?.key
    }

    // Keyword suggestion → most specific node id (catGuess).
    fun guessCategory(text: String, income: Boolean): String? {
        val n = text.lowercase().trim()
        if (n.isEmpty()) return null
        val rows = if (income) data.keywords.income else data.keywords.expense
        for (row in rows) {
            val suffix = (row[0] as kotlinx.serialization.json.JsonPrimitive).content
            val kws = (row[1] as kotlinx.serialization.json.JsonArray).map { (it as kotlinx.serialization.json.JsonPrimitive).content }
            if (kws.any { n.contains(it) }) return (if (income) "inc." else "exp.") + suffix
        }
        return null
    }

    fun visColor(key: String): String = data.vis[key]?.color ?: data.vis.getValue("other").color
}

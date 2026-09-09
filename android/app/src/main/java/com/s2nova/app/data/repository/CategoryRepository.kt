package com.s2nova.app.data.repository

import com.s2nova.app.data.model.CategoryId
import com.s2nova.app.data.model.Subcategory
import com.s2nova.app.data.remote.ApiClient
import com.s2nova.app.data.remote.CategoryDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Bridges the app's existing CategoryId enum (still what every screen's
// icons/colors/i18n keys are keyed on — see categoryStringKey()) to the
// backend's real category rows, matched by `slug` (CategoryId.name in
// lowercase == the seeded category's slug, e.g. FOOD <-> "food"). Nothing
// else in the UI needs to know a category is now backed by a UUID.
class CategoryRepository {
    private val _categories = MutableStateFlow<List<CategoryDto>>(emptyList())
    val categories: StateFlow<List<CategoryDto>> = _categories.asStateFlow()

    suspend fun refresh() {
        _categories.value = ApiClient.api.getCategories()
    }

    fun backendIdFor(categoryId: CategoryId): String? =
        _categories.value.find { it.slug == categoryId.name.lowercase() }?.id

    fun categoryIdForBackendId(backendId: String): CategoryId? {
        val slug = _categories.value.find { it.id == backendId }?.slug ?: return null
        return CategoryId.entries.find { it.name.lowercase() == slug }
    }

    // Rows whose parentId matches this CategoryId's backend row — never
    // collides with the top-level bridge above since a subcategory's own
    // slug (e.g. "food-groceries") never equals a CategoryId enum name.
    fun subcategoriesFor(categoryId: CategoryId): List<Subcategory> {
        val parentBackendId = backendIdFor(categoryId) ?: return emptyList()
        return _categories.value
            .filter { it.parentId == parentBackendId }
            .map { Subcategory(id = it.id, slug = it.slug, name = it.name, parentCategoryId = categoryId) }
    }

    fun subcategoryById(id: String): Subcategory? {
        val dto = _categories.value.find { it.id == id } ?: return null
        val parentId = dto.parentId ?: return null
        val parentCategoryId = categoryIdForBackendId(parentId) ?: return null
        return Subcategory(id = dto.id, slug = dto.slug, name = dto.name, parentCategoryId = parentCategoryId)
    }
}

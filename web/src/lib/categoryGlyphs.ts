import { categoryColor as registryColor, categoryGlyph } from '@/lib/backendCategories'
import { planIcon } from '@/lib/taxonomy'
import type { CategoryId } from '@/types'

// Glyphs and colors come from the unified taxonomy (lib/taxonomy.json via
// the category registry); plan marks (goals, custom budgets) from its
// PLAN_ICONS (PLANS.md §1).

export function categoryColor(id: CategoryId | null | undefined): string {
  return registryColor(id)
}

export function glyphOf(id: CategoryId | null | undefined): string[] {
  return categoryGlyph(id)
}

export function goalMark(icon: string | undefined): { glyph: string[]; color: string } {
  const p = planIcon(icon)
  return { glyph: p.glyph, color: p.color }
}

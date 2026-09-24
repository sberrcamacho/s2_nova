import { categoryMap } from '@/data/categories'
import type { CategoryId } from '@/types'

// Category glyphs, verbatim from the v2 mockups' CAT_GLYPHS (the same set
// Android draws) — 24×24 stroke paths. `gift` has no glyph in either
// mockup; like the mockup's own fallback it draws the "Otros" glyph.
export const CATEGORY_GLYPHS: Record<CategoryId | 'transfer', string[]> = {
  food: ['M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2', 'M6 2v20', 'M17 2c-1.7 1.3-3 3.7-3 6 0 1.7.7 3 2 3h2c1.3 0 2-1.3 2-3 0-2.3-1.3-4.7-3-6z', 'M18 11v11'],
  transportation: ['M5 17H3v-5l2-5h14l2 5v5h-2', 'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M9 17h6'],
  shopping: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  health: ['M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-7.3a5 5 0 0 0 0-7.1z'],
  education: ['M22 9 12 5 2 9l10 4 10-4z', 'M6 11v6c0 1.5 3 3 6 3s6-1.5 6-3v-6'],
  entertainment: ['M4 11h16l-1.2 9a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7z', 'M4 11 8 3', 'M12 11 9.5 4', 'M16 11 14 5'],
  bills: ['M4 2h16v20l-3-2-2 2-3-2-3 2-2-2-3 2z', 'M8 7h8', 'M8 11h8', 'M8 15h5'],
  subscriptions: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5'],
  salary: ['M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12', 'M17 13h.01'],
  freelance: ['M4 5h16v10H4z', 'M2 19h20'],
  other: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 11h.01', 'M12 11h.01', 'M16 11h.01'],
  gift: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 11h.01', 'M12 11h.01', 'M16 11h.01'],
  transfer: ['M7 7h13', 'M16 3l4 4-4 4', 'M17 17H4', 'M8 13l-4 4 4 4'],
}

export const TRANSFER_COLOR = '#6c5ce7'

export function categoryColor(id: CategoryId | 'transfer'): string {
  if (id === 'transfer') return TRANSFER_COLOR
  return categoryMap[id]?.color ?? '#9C9CAA'
}

// Goals are keyed by their own category (backend GOAL_CATEGORY_IDS). The
// Web v2 mockup draws each goal with a transaction-category glyph in the
// goal category's color (Fondo de emergencia = Salud glyph in #E85D6B,
// Viaje = Entretenimiento glyph, Portátil = Compras glyph, Especialización =
// Educación glyph); colors mirror Android's GoalCategory.kt.
const GOAL_MARKS: Record<string, { glyph: CategoryId; color: string }> = {
  EMERGENCY: { glyph: 'health', color: '#E85D6B' },
  TRAVEL: { glyph: 'entertainment', color: '#3DBBA8' },
  EDUCATION: { glyph: 'education', color: '#5D6BE8' },
  HOUSING: { glyph: 'other', color: '#E8A23D' },
  VEHICLE: { glyph: 'transportation', color: '#3D8BE8' },
  TECHNOLOGY: { glyph: 'shopping', color: '#6657E8' },
  HEALTH: { glyph: 'health', color: '#22A06B' },
  DEBT: { glyph: 'other', color: '#8A8A99' },
  RETIREMENT: { glyph: 'other', color: '#B25DE8' },
  OTHER: { glyph: 'other', color: '#9C9CAA' },
}

export function goalMark(themeIcon: string | undefined): { glyph: CategoryId; color: string } {
  return (themeIcon && GOAL_MARKS[themeIcon]) || GOAL_MARKS.OTHER
}

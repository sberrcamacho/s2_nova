import data from '@/lib/taxonomy.json'

// The unified category taxonomy and plan icons (design_handoff_s2_nova_v2/
// s2-categories.js), generated into taxonomy.json by scripts/gen-taxonomy.mjs
// — never edit the JSON by hand. Node ids are the stable dotted ids
// ("exp.food.groceries"), the backend's Category.slug. See CATEGORY_SYSTEM.md.

export interface TaxNode {
  id: string
  type: 'expense' | 'income'
  parentId: string | null
  name: string
  vis: string
  color: string
  glyph: string[]
}

export interface PlanIcon {
  key: string
  name: string
  kw: string[]
  color: string
  glyph: string[]
}

export const TAX_VIS = data.vis as Record<string, { color: string; glyph: string[] }>
export const TAX_NODES = data.nodes as TaxNode[]
export const TAX_TRANSFER = data.transfer as { id: 'transfer'; name: string; color: string; glyph: string[] }
export const PLAN_ICONS = data.planIcons as PlanIcon[]
const KEYWORDS = data.keywords as { expense: [string, string[]][]; income: [string, string[]][] }

const byId = new Map(TAX_NODES.map((n) => [n.id, n]))

export function taxNode(id: string | null | undefined): TaxNode | undefined {
  return id ? byId.get(id) : undefined
}

export function visColor(vis: string): string {
  return TAX_VIS[vis]?.color ?? TAX_VIS.other.color
}

export function planIcon(key: string | null | undefined): PlanIcon {
  return PLAN_ICONS.find((p) => p.key === key) ?? PLAN_ICONS[PLAN_ICONS.length - 1]
}

// PLANS.md §1: first keyword hit wins; null when nothing matches.
export function guessPlanIcon(text: string): string | null {
  const n = text.toLowerCase()
  if (!n.trim()) return null
  return PLAN_ICONS.find((p) => p.kw.some((k) => n.includes(k)))?.key ?? null
}

// CATEGORY_SYSTEM.md: keyword guess from a title ("Mercado" → Alimentación ·
// Mercado). Returns the full dotted id.
export function guessCategory(text: string, income: boolean): string | null {
  const n = text.toLowerCase()
  if (!n.trim()) return null
  const hit = KEYWORDS[income ? 'income' : 'expense'].find(([, kws]) => kws.some((k) => n.includes(k)))
  return hit ? `${income ? 'inc' : 'exp'}.${hit[0]}` : null
}

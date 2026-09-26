// The one category registry every screen resolves names, colors and glyphs
// through (CATEGORY_SYSTEM.md). Nodes are keyed by the taxonomy's stable
// dotted id (== the backend's Category.slug, e.g. 'exp.food.groceries');
// the backend row's UUID is only used on the wire (categoryIdFor /
// categorySlugFor). Until GET /categories loads — and in guest mode — the
// bundled taxonomy stands in. Components subscribe with useCategories().
import { useSyncExternalStore } from 'react'
import { apiClient } from '@/lib/apiClient'
import { TAX_NODES, TAX_TRANSFER, TAX_VIS, taxNode, visColor } from '@/lib/taxonomy'
import type { CategoryId } from '@/types'

export interface CategoryNode {
  id: CategoryId
  backendId: string | null
  income: boolean
  parentId: CategoryId | null
  name: string
  defaultName: string
  vis: string
  color: string
  custom: boolean
  hidden: boolean
  usage: number
}

interface BackendCategory {
  id: string
  slug: string
  name: string
  defaultName?: string
  icon: string
  color: string
  kind: 'EXPENSE' | 'INCOME'
  parentId: string | null
  isCustom: boolean
  hidden: boolean
  usage: number
}

export const TRANSFER = 'transfer'

function bundled(): CategoryNode[] {
  return TAX_NODES.map((n) => ({
    id: n.id,
    backendId: null,
    income: n.type === 'income',
    parentId: n.parentId,
    name: n.name,
    defaultName: n.name,
    vis: n.vis,
    color: n.color,
    custom: false,
    hidden: false,
    usage: 0,
  }))
}

let nodes: CategoryNode[] = bundled()
let byId = new Map(nodes.map((n) => [n.id, n]))
let byBackend = new Map<string, CategoryNode>()
const listeners = new Set<() => void>()

function publish(next: CategoryNode[]) {
  nodes = next
  byId = new Map(next.map((n) => [n.id, n]))
  byBackend = new Map(next.filter((n) => n.backendId).map((n) => [n.backendId!, n]))
  listeners.forEach((l) => l())
}

function toNodes(rows: BackendCategory[]): CategoryNode[] {
  const slugOf = new Map(rows.map((r) => [r.id, r.slug]))
  const order = new Map(TAX_NODES.map((n, i) => [n.id, i]))
  return rows
    .map((r) => ({
      id: r.slug,
      backendId: r.id,
      income: r.kind === 'INCOME',
      parentId: r.parentId ? (slugOf.get(r.parentId) ?? null) : null,
      name: r.name,
      defaultName: r.defaultName ?? r.name,
      vis: r.icon,
      color: r.color,
      custom: r.isCustom,
      hidden: r.hidden,
      usage: r.usage,
    }))
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER))
}

let loading: Promise<void> | null = null
let guest = false

function load(): Promise<void> {
  if (guest) return Promise.resolve()
  if (!loading) {
    loading = apiClient
      .get<BackendCategory[]>('/categories')
      .then((rows) => publish(toNodes(rows)))
      .catch((err) => {
        // Don't wedge every future call behind this one failed request.
        loading = null
        throw err
      })
  }
  return loading
}

export async function refreshCategories(): Promise<void> {
  loading = null
  await load()
}

// Guest mode: the bundled taxonomy, editable locally.
export function setCategoryGuest(on: boolean) {
  guest = on
  loading = null
  publish(bundled())
}

export function isCategoryGuest(): boolean {
  return guest
}

export function replaceLocalCategories(next: CategoryNode[]) {
  publish(next)
}

export async function categoryIdFor(slug: CategoryId): Promise<string> {
  await load()
  const id = byId.get(slug)?.backendId
  if (!id) throw new Error(`Unknown category: ${slug}`)
  return id
}

// The UUID of the parent + (for a leaf) the UUID of the subcategory, the
// way POST/PATCH /transactions expect them.
export async function categoryWireIds(slug: CategoryId): Promise<{ categoryId: string; subcategoryId?: string }> {
  await load()
  const node = byId.get(slug)
  if (!node?.backendId) throw new Error(`Unknown category: ${slug}`)
  if (!node.parentId) return { categoryId: node.backendId }
  return { categoryId: byId.get(node.parentId)!.backendId!, subcategoryId: node.backendId }
}

export async function categorySlugFor(id: string | null | undefined): Promise<CategoryId> {
  if (!id) return 'exp.other'
  await load()
  return byBackend.get(id)?.id ?? 'exp.other'
}

// A movement's category: the leaf when it has one, else the parent.
export async function movementCategory(categoryId: string, subcategoryId: string | null | undefined, type: string): Promise<CategoryId> {
  if (type === 'TRANSFER') return TRANSFER
  return categorySlugFor(subcategoryId ?? categoryId)
}

export function resetCategoryCache() {
  loading = null
  guest = false
  publish(bundled())
}

// ---- Synchronous lookups ---------------------------------------------

export function allCategories(): CategoryNode[] {
  return nodes
}

export function categoryNode(id: CategoryId | null | undefined): CategoryNode | undefined {
  return id ? byId.get(id) : undefined
}

export function parentOf(id: CategoryId | null | undefined): CategoryNode | undefined {
  const n = categoryNode(id)
  if (!n) return undefined
  return n.parentId ? (byId.get(n.parentId) ?? n) : n
}

export function parentCategories(income: boolean, includeHidden = true): CategoryNode[] {
  return nodes.filter((n) => n.parentId === null && n.income === income && (includeHidden || !n.hidden))
}

export function childCategories(parentId: CategoryId, includeHidden = true): CategoryNode[] {
  return nodes.filter((n) => n.parentId === parentId && (includeHidden || !n.hidden))
}

export function categoryName(id: CategoryId | null | undefined): string {
  if (id === TRANSFER) return TAX_TRANSFER.name
  return categoryNode(id)?.name ?? ''
}

// "Alimentación · Mercado" for a leaf, "Alimentación" for a parent.
export function categoryLabel(id: CategoryId | null | undefined): string {
  if (id === TRANSFER) return TAX_TRANSFER.name
  const n = categoryNode(id)
  if (!n) return ''
  const p = n.parentId ? byId.get(n.parentId) : undefined
  return p ? `${p.name} · ${n.name}` : n.name
}

// Leaves inherit the parent's color.
export function categoryColor(id: CategoryId | null | undefined): string {
  if (id === TRANSFER) return TAX_TRANSFER.color
  return parentOf(id)?.color ?? visColor('other')
}

// A leaf uses its own taxonomy glyph unless its parent was re-iconed; a
// parent (or a custom node) uses its identity's glyph.
export function categoryGlyph(id: CategoryId | null | undefined): string[] {
  if (id === TRANSFER) return TAX_TRANSFER.glyph
  const n = categoryNode(id)
  if (!n) return TAX_VIS.other.glyph
  const parent = parentOf(id)!
  const bundledNode = taxNode(n.id)
  if (n.parentId && bundledNode && parent.vis === taxNode(parent.id)?.vis) return bundledNode.glyph
  return TAX_VIS[parent.vis]?.glyph ?? TAX_VIS.other.glyph
}

// True if `id` equals `scope` or is one of its children ("Todas").
export function isInCategory(id: CategoryId | null | undefined, scope: CategoryId | null | undefined): boolean {
  if (!id || !scope) return false
  return id === scope || categoryNode(id)?.parentId === scope
}

export function isIncomeCategory(id: CategoryId | null | undefined): boolean {
  return categoryNode(id)?.income ?? false
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Re-renders the caller whenever the registry changes (load, edit).
export function useCategories(): CategoryNode[] {
  return useSyncExternalStore(subscribe, () => nodes)
}

// Fire-and-forget warm-up so names resolve before the first list renders.
export function ensureCategories() {
  void load().catch(() => undefined)
}

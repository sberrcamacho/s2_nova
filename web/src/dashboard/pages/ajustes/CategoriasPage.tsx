import { fill, tr } from '@/lib/i18n/translations'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog, IC, Icon } from '@/components/v2/Kit'
import { CategoryMark, GlyphMark } from '@/components/v2/CategoryMark'
import { AjCard, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { categoryLabel, categoryName, categoryNode, childCategories, displayName, ensureCategories, parentCategories, useCategories, type CategoryNode } from '@/lib/backendCategories'
import { cn } from '@/lib/cn'
import { TAX_VIS } from '@/lib/taxonomy'
import { categoryService } from '@/services/categoryService'
import { useToast } from '@/state/ToastContext'
import type { CategoryId } from '@/types'

interface Draft {
  id: CategoryId | null
  name: string
  parentId: CategoryId | ''
  vis: string
  hidden: boolean
  err: string
}

const EMPTY: Draft = { id: null, name: '', parentId: '', vis: 'other', hidden: false, err: '' }

const fieldLabel = 'text-caption font-semibold tracking-[.06em] text-ink-secondary'
const field = 'box-border h-11 w-full rounded-[8px] border border-border-input bg-surface px-3 font-[inherit] text-body text-ink outline-none focus:border-primary-border min-[760px]:text-body-sm'

// Ajustes › Categorías (Dashboard v2 isSettingsCategories,
// CATEGORY_SYSTEM.md §7b): the Gastos / Ingresos taxonomy with each
// parent's subcategories, and the form beside it. Built-ins can be
// renamed, re-iconed (parents) and hidden (parents); custom nodes can
// also be deleted — their movements move to the parent or "Otros".
export default function CategoriasPage() {
  useCategories()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const income = params.get('tab') === 'ingresos'
  const [d, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(ensureCategories, [])

  const setD = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch, err: '' }))
  const editing = d.id ? (categoryNode(d.id) ?? null) : null
  const parent = d.parentId ? (categoryNode(d.parentId) ?? null) : null
  const parents = parentCategories(income)

  // Below 900 px the form sits above the list, so picking a row brings it
  // into view.
  const formRef = useRef<HTMLDivElement>(null)
  const openEdit = (n: CategoryNode) => {
    setDraft({ id: n.id, name: displayName(n), parentId: n.parentId ?? '', vis: n.vis, hidden: n.hidden, err: '' })
    if (window.matchMedia?.('(max-width: 899px)').matches) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const switchTab = (toIncome: boolean) => {
    setParams(toIncome ? { tab: 'ingresos' } : {}, { replace: true })
    setDraft(EMPTY)
  }

  const save = async () => {
    const name = d.name.trim()
    if (!name) return setDraft({ ...d, err: tr('bud.err.name') })
    const siblings = parent ? childCategories(parent.id) : parents
    if (siblings.some((n) => displayName(n).toLowerCase() === name.toLowerCase() && (!editing || n.id !== editing.id))) {
      return setDraft({ ...d, err: tr('cat.err.taken') })
    }
    if (busy) return
    setBusy(true)
    try {
      if (editing) {
        const parentNode = !editing.parentId
        await categoryService.update(editing.id, {
          // A built-in shown in English keeps its name unless it was changed.
          name: name === displayName(editing) ? undefined : name,
          vis: parentNode && d.vis !== editing.vis ? d.vis : undefined,
          hidden: parentNode && !editing.custom && d.hidden !== editing.hidden ? d.hidden : undefined,
        })
        setDraft(EMPTY)
        showToast(tr('cat.toast.updated'))
      } else {
        const before = new Set(parent ? childCategories(parent.id).map((n) => n.id) : parents.map((n) => n.id))
        await categoryService.create({ income, parentId: parent?.id ?? null, name, vis: d.vis })
        const created = (parent ? childCategories(parent.id) : parentCategories(income)).find((n) => !before.has(n.id))
        setDraft(EMPTY)
        showToast(fill(tr('cat.toast.created'), created ? categoryLabel(created.id) : name))
      }
    } catch (err) {
      setDraft({ ...d, err: err instanceof Error ? err.message : tr('api.generic') })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editing) return
    setDeleting(false)
    try {
      await categoryService.remove(editing.id)
      setDraft(EMPTY)
    } catch (err) {
      showToast(err instanceof Error ? err.message : tr('api.generic'), 'error')
    }
  }

  const title = editing ? tr(editing.parentId ? 'cat.editSub' : 'cat.edit') : parent ? fill(tr('cat.newSubIn'), displayName(parent)) : tr('cat.new')
  const subtitle = editing ? tr(editing.custom ? 'cat.sub.custom' : 'cat.sub.builtin') : tr(income ? 'cat.sub.newIncome' : 'cat.sub.newExpense')
  const canHide = !!(editing && !editing.custom && !editing.parentId)
  const shown = !d.hidden

  return (
    <div className="flex max-w-[1036px] flex-col gap-[18px] px-4 pt-6 pb-10 min-[760px]:px-7 min-[760px]:pt-[26px]">
      <AjSubHeader title={tr('cat.title')} subtitle={tr('cat.subtitle')}>
        <div role="tablist" className="flex border-b border-border">
          {[false, true].map((inc) => {
            const on = inc === income
            return (
              <button
                key={String(inc)}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(inc)}
                className={cn('-mb-px h-10 cursor-pointer whitespace-nowrap border-b-2 px-4 text-label', on ? 'border-primary-border font-semibold text-ink' : 'border-transparent font-semibold text-ink-secondary hover:text-ink')}
              >
                {`${tr(inc ? 'mv.filter.income' : 'mv.filter.expenses')} · ${parentCategories(inc).length}`}
              </button>
            )
          })}
        </div>
      </AjSubHeader>
      {/* One column on narrow screens (the form first), two from 900 px. */}
      <div className="grid grid-cols-1 items-start gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_320px]">
        <AjCard className="order-2 px-5 py-2 min-[900px]:order-1">
          {parents.map((p, i) => {
            const kids = childCategories(p.id)
            return (
              <div key={p.id} className={cn('-mx-2.5 flex flex-col gap-2.5 rounded-[12px] px-2.5 py-3.5', d.id === p.id && 'bg-surface-sunken', i < parents.length - 1 && 'border-b border-divider')}>
                <div role="button" tabIndex={0} onClick={() => openEdit(p)} onKeyDown={(e) => e.key === 'Enter' && openEdit(p)} className="flex cursor-pointer items-center gap-3">
                  <CategoryMark category={p.id} box={40} />
                  {/* The tags drop under the name when the row is narrow. */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="min-w-0 max-w-full truncate text-title-sm font-semibold" title={displayName(p)}>{displayName(p)}</div>
                    {p.hidden && <span className="whitespace-nowrap rounded-[6px] border border-border-input px-2 py-0.5 text-caption font-semibold text-ink-secondary">{tr('cat.hidden')}</span>}
                    {p.custom && (
                      <span className="whitespace-nowrap rounded-[6px] px-2 py-[3px] text-caption font-semibold text-link" style={{ background: 'var(--color-accent-soft)' }}>
                        {tr('cat.custom')}
                      </span>
                    )}
                  </div>
                  <span className="flex-none whitespace-nowrap text-body-sm tabular-nums text-ink-secondary">{fill(tr(kids.length === 1 ? 'cat.subOne' : 'cat.subMany'), kids.length)}</span>
                </div>
                <div className="flex flex-wrap gap-2 min-[640px]:pl-[52px]">
                  {kids.map((c) => {
                    const lit = c.custom || d.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openEdit(c)}
                        className={cn('flex h-8 cursor-pointer items-center whitespace-nowrap rounded-[10px] border px-3 text-label font-medium', lit ? 'text-ink' : 'border-border bg-surface-sunken text-ink hover:border-border-input')}
                        style={lit ? { background: `color-mix(in oklab, ${p.color} 16%, transparent)`, borderColor: p.color } : undefined}
                      >
                        {displayName(c)}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setDraft({ ...EMPTY, parentId: p.id, vis: p.vis })}
                    className="flex h-8 cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-dashed border-border-input px-3 text-label font-semibold text-link hover:bg-surface-sunken"
                  >
                    {tr('cat.addSub')}
                  </button>
                </div>
              </div>
            )
          })}
        </AjCard>
        <AjCard ref={formRef} className="order-1 flex scroll-mt-20 flex-col gap-3.5 p-5 min-[900px]:sticky min-[900px]:top-20 min-[900px]:order-2">
          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-title font-semibold">{title}</div>
              <div className="text-body-sm text-ink-secondary">{subtitle}</div>
            </div>
            {editing && (
              <button type="button" onClick={() => setDraft(EMPTY)} className="flex min-h-8 cursor-pointer items-center whitespace-nowrap text-label font-semibold text-link">
                {tr('cat.addNew')}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tr('bud.name')}</span>
            <div className="flex h-14 items-center gap-2.5 rounded-[10px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
              <GlyphMark paths={(TAX_VIS[parent?.vis ?? d.vis] ?? TAX_VIS.other).glyph} color={(TAX_VIS[parent?.vis ?? d.vis] ?? TAX_VIS.other).color} box={40} />
              <input
                value={d.name}
                aria-label={tr('bud.name')}
                onChange={(e) => setD({ name: e.target.value })}
                placeholder={tr('cat.namePh')}
                className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary"
              />
            </div>
          </div>
          {!editing && (
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>{tr('cat.inside')}</span>
              <select value={d.parentId} onChange={(e) => setD({ parentId: e.target.value })} className={cn(field, 'cursor-pointer [color-scheme:dark]')}>
                <option value="">{tr('cat.insideNone')}</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!parent && (
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>{tr('cat.iconColor')}</span>
              <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={tr('cat.iconColor')}>
                {Object.entries(TAX_VIS).map(([k, v]) => {
                  const on = d.vis === k
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-label={k}
                      aria-checked={on}
                      onClick={() => setD({ vis: k })}
                      className={cn('relative flex h-11 cursor-pointer items-center justify-center rounded-[12px] border-2', on ? 'border-primary-border' : 'border-transparent hover:bg-surface-sunken')}
                    >
                      <GlyphMark paths={v.glyph} color={v.color} box={32} />
                      {on && (
                        <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Icon paths={IC.check} size={10} color="var(--on-primary)" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {parent && <div className="text-caption text-ink-secondary">{fill(tr('cat.parentColor'), displayName(parent))}</div>}
          {canHide && (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-label font-semibold">{tr('cat.show')}</div>
                <div className="text-caption text-ink-secondary">{tr('cat.showHint')}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shown}
                aria-label={tr('cat.show')}
                onClick={() => setD({ hidden: !d.hidden })}
                className={cn("relative box-border flex h-[22px] w-[38px] flex-none cursor-pointer rounded-full p-[3px] before:absolute before:-inset-[5px] before:content-['']", shown ? 'justify-end bg-primary' : 'justify-start bg-border-input')}
              >
                <span className="block h-4 w-4 rounded-full bg-white" />
              </button>
            </div>
          )}
          {d.err && <div className="rounded-[10px] bg-negative-soft px-3 py-2.5 text-body-sm font-semibold text-negative">{d.err}</div>}
          <button type="button" onClick={() => void save()} className="h-11 cursor-pointer rounded-[12px] bg-primary px-4 text-center text-label font-semibold text-on-primary hover:bg-primary-pressed">
            {tr(editing ? 'cat.save' : 'cat.create')}
          </button>
          {editing?.custom && (
            <button type="button" onClick={() => setDeleting(true)} className="min-h-8 cursor-pointer text-center text-label font-semibold text-negative">
              {tr(editing.parentId ? 'cat.deleteSub' : 'cat.delete')}
            </button>
          )}
        </AjCard>
      </div>
      {deleting && editing && <DeleteConfirm node={editing} income={income} onCancel={() => setDeleting(false)} onConfirm={() => void remove()} />}
    </div>
  )
}

// A custom node's movements move to its parent, or to "Otros" for a
// parent (the backend's DELETE /categories/:id).
function DeleteConfirm({ node, income, onCancel, onConfirm }: { node: CategoryNode; income: boolean; onCancel: () => void; onConfirm: () => void }) {
  const kids = childCategories(node.id)
  const fallback = categoryName(node.parentId ?? (income ? 'inc.other' : 'exp.other'))
  const used = node.usage
  return (
    <ConfirmDialog
      title={fill(tr('loan.delete.title'), displayName(node))}
      lines={[
        (node.parentId ? fill(tr('nm.subOf'), categoryName(node.parentId)) : tr('cat.main')) + (kids.length ? fill(tr('cat.andSubs'), kids.length) : ''),
        fill(tr(used === 1 ? 'cat.moveOne' : 'cat.moveMany'), used, fallback),
        tr('cat.delete.gone'),
      ]}
      ack={fill(tr('cat.delete.ack'), fallback)}
      cta={tr('cat.delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

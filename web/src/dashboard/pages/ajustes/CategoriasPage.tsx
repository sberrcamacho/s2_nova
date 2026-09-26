import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/v2/Kit'
import { CategoryMark, GlyphMark } from '@/components/v2/CategoryMark'
import { AjCard, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { categoryLabel, categoryName, categoryNode, childCategories, ensureCategories, parentCategories, useCategories, type CategoryNode } from '@/lib/backendCategories'
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

const fieldLabel = 'text-[11px] font-bold tracking-[.06em] text-v2-muted'
const field = 'box-border h-[42px] w-full rounded-[10px] border border-v2-line bg-v2-sidebar px-3 font-[inherit] text-[13px] text-v2-text outline-none'

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

  const openEdit = (n: CategoryNode) => setDraft({ id: n.id, name: n.name, parentId: n.parentId ?? '', vis: n.vis, hidden: n.hidden, err: '' })
  const switchTab = (toIncome: boolean) => {
    setParams(toIncome ? { tab: 'ingresos' } : {}, { replace: true })
    setDraft(EMPTY)
  }

  const save = async () => {
    const name = d.name.trim()
    if (!name) return setDraft({ ...d, err: 'Escribe un nombre.' })
    const siblings = parent ? childCategories(parent.id) : parents
    if (siblings.some((n) => n.name.toLowerCase() === name.toLowerCase() && (!editing || n.id !== editing.id))) {
      return setDraft({ ...d, err: 'Ya existe una categoría con ese nombre aquí.' })
    }
    if (busy) return
    setBusy(true)
    try {
      if (editing) {
        const parentNode = !editing.parentId
        await categoryService.update(editing.id, {
          name: name === editing.name ? undefined : name,
          vis: parentNode && d.vis !== editing.vis ? d.vis : undefined,
          hidden: parentNode && !editing.custom && d.hidden !== editing.hidden ? d.hidden : undefined,
        })
        setDraft(EMPTY)
        showToast('Categoría actualizada')
      } else {
        const before = new Set(parent ? childCategories(parent.id).map((n) => n.id) : parents.map((n) => n.id))
        await categoryService.create({ income, parentId: parent?.id ?? null, name, vis: d.vis })
        const created = (parent ? childCategories(parent.id) : parentCategories(income)).find((n) => !before.has(n.id))
        setDraft(EMPTY)
        showToast(`Categoría creada: ${created ? categoryLabel(created.id) : name}`)
      }
    } catch (err) {
      setDraft({ ...d, err: err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.' })
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
      showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')
    }
  }

  const title = editing ? (editing.parentId ? 'Editar subcategoría' : 'Editar categoría') : parent ? `Nueva subcategoría en ${parent.name}` : 'Nueva categoría'
  const subtitle = editing
    ? editing.custom
      ? 'Creada por ti. Los cambios se ven en movimientos, presupuestos y reportes.'
      : 'Categoría de S2 Nova: puedes cambiar el nombre y el icono. No se puede eliminar; ocúltala si no la usas.'
    : `Tipo: ${income ? 'ingreso' : 'gasto'}. Queda disponible en todo S2 Nova, también en Android.`
  const canHide = !!(editing && !editing.custom && !editing.parentId)
  const shown = !d.hidden

  return (
    <div className="flex max-w-[1036px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title="Categorías" subtitle="Las mismas en Nuevo movimiento, presupuestos, filtros y reportes. Haz clic en una para editarla.">
        <div role="tablist" className="flex border-b border-v2-line">
          {[false, true].map((inc) => {
            const on = inc === income
            return (
              <button
                key={String(inc)}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(inc)}
                className={cn('-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 text-[12.5px]', on ? 'border-v2-accent3 font-extrabold text-v2-text' : 'border-transparent font-semibold text-v2-dim')}
              >
                {`${inc ? 'Ingresos' : 'Gastos'} · ${parentCategories(inc).length}`}
              </button>
            )
          })}
        </div>
      </AjSubHeader>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-[18px]">
        <AjCard className="px-5 py-2">
          {parents.map((p, i) => {
            const kids = childCategories(p.id)
            return (
              <div key={p.id} className={cn('-mx-2.5 flex flex-col gap-2.5 rounded-[12px] px-2.5 py-3.5', d.id === p.id && 'bg-v2-surface2', i < parents.length - 1 && 'border-b border-v2-subtle')}>
                <div role="button" tabIndex={0} onClick={() => openEdit(p)} onKeyDown={(e) => e.key === 'Enter' && openEdit(p)} className="flex cursor-pointer items-center gap-3">
                  <CategoryMark category={p.id} box={34} />
                  <div className="min-w-0 flex-1 text-[13px] font-extrabold">{p.name}</div>
                  {p.hidden && <span className="rounded-full border border-v2-line2 px-2 py-0.5 text-[10.5px] font-extrabold text-v2-dim">Oculta</span>}
                  {p.custom && (
                    <span className="rounded-full px-2 py-[3px] text-[10.5px] font-extrabold text-v2-accent2" style={{ background: 'color-mix(in oklab, var(--v2-accent2) 14%, transparent)' }}>
                      Personalizada
                    </span>
                  )}
                  <span className="font-numeric text-[11px] text-v2-dim">{`${kids.length} ${kids.length === 1 ? 'subcategoría' : 'subcategorías'}`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-[46px]">
                  {kids.map((c) => {
                    const lit = c.custom || d.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openEdit(c)}
                        className={cn('cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] font-bold', lit ? 'text-v2-text' : 'border-v2-line bg-v2-surface2 text-v2-muted')}
                        style={lit ? { background: `color-mix(in oklab, ${p.color} 16%, transparent)`, borderColor: p.color } : undefined}
                      >
                        {c.name}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setDraft({ ...EMPTY, parentId: p.id, vis: p.vis })}
                    className="cursor-pointer rounded-full border border-dashed border-v2-line2 px-2.5 py-1 text-[11.5px] font-extrabold text-v2-accent2"
                  >
                    + Subcategoría
                  </button>
                </div>
              </div>
            )
          })}
        </AjCard>
        <AjCard className="sticky top-20 flex flex-col gap-3.5 p-5">
          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-extrabold">{title}</div>
              <div className="mt-0.5 text-[11.5px] leading-[1.45] text-v2-dim">{subtitle}</div>
            </div>
            {editing && (
              <button type="button" onClick={() => setDraft(EMPTY)} className="cursor-pointer whitespace-nowrap text-[11.5px] font-extrabold text-v2-accent2">
                + Nueva
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>NOMBRE</span>
            <input value={d.name} onChange={(e) => setD({ name: e.target.value })} placeholder="Ej. Clases de música" className={field} />
          </label>
          {!editing && (
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>DENTRO DE</span>
              <select value={d.parentId} onChange={(e) => setD({ parentId: e.target.value })} className={cn(field, 'cursor-pointer [color-scheme:dark]')}>
                <option value="">Ninguna · nueva categoría principal</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!parent && (
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>ICONO Y COLOR</span>
              <div className="grid grid-cols-6 gap-1.5">
                {Object.entries(TAX_VIS).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k}
                    aria-pressed={d.vis === k}
                    onClick={() => setD({ vis: k })}
                    className={cn('flex cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] py-[5px]', d.vis === k ? 'bg-v2-surface2' : 'border-transparent')}
                    style={d.vis === k ? { borderColor: v.color } : undefined}
                  >
                    <GlyphMark paths={v.glyph} color={v.color} box={30} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {parent && <div className="text-[11px] text-v2-dim">{`Usa el color de ${parent.name}, así se agrupa igual en gráficos y reportes.`}</div>}
          {canHide && (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold">Mostrar al registrar</div>
                <div className="mt-0.5 text-[11px] leading-[1.4] text-v2-dim">Si la ocultas, sale del selector pero conserva su historial en reportes.</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shown}
                aria-label="Mostrar al registrar"
                onClick={() => setD({ hidden: !d.hidden })}
                className={cn('box-border flex h-[22px] w-[38px] flex-none cursor-pointer rounded-full p-[3px]', shown ? 'justify-end bg-v2-accent' : 'justify-start bg-v2-line2')}
              >
                <span className="block h-4 w-4 rounded-full bg-white" />
              </button>
            </div>
          )}
          {d.err && <div className="rounded-[10px] bg-[rgba(255,98,98,.1)] px-3 py-2.5 text-[12px] font-bold text-v2-neg">{d.err}</div>}
          <button type="button" onClick={() => void save()} className="cursor-pointer rounded-[10px] bg-v2-accent px-4 py-2.5 text-center text-[12.5px] font-bold text-white">
            {editing ? 'Guardar cambios' : 'Crear categoría'}
          </button>
          {editing?.custom && (
            <button type="button" onClick={() => setDeleting(true)} className="cursor-pointer text-center text-[12.5px] font-bold text-v2-neg">
              {editing.parentId ? 'Eliminar subcategoría' : 'Eliminar categoría'}
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
      title={`Eliminar “${node.name}”`}
      lines={[
        (node.parentId ? `Subcategoría de ${categoryName(node.parentId)}` : 'Categoría principal') + (kids.length ? ` y sus ${kids.length} subcategorías` : ''),
        `${used}${used === 1 ? ' movimiento pasa' : ' movimientos pasan'} a ${fallback}`,
        'Deja de aparecer en presupuestos, filtros y reportes',
      ]}
      ack={`Entiendo que los movimientos se reasignan a ${fallback} y que esto no se puede deshacer.`}
      cta="Eliminar categoría"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

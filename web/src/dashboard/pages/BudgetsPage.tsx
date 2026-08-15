import { useState } from 'react'
import { PiggyBank, Plus, TrendingDown, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { categoryMap, expenseCategories } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import type { CategoryId } from '@/types'

const STATUS_TONE: Record<BudgetProgress['status'], 'positive' | 'warning' | 'negative'> = {
  on_track: 'positive',
  near_limit: 'warning',
  over_budget: 'negative',
}
const STATUS_LABEL: Record<BudgetProgress['status'], string> = {
  on_track: 'En curso',
  near_limit: 'Cerca del límite',
  over_budget: 'Excedido',
}

export default function BudgetsPage() {
  const { budgets, refresh } = useAppData()
  const { showToast } = useToast()
  const { format } = useCurrency()
  const [editing, setEditing] = useState<BudgetProgress | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCategory, setNewCategory] = useState<CategoryId | ''>('')
  const [newLimitInput, setNewLimitInput] = useState('')

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overCount = budgets.filter((b) => b.status === 'over_budget').length
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
  const budgetedCategories = new Set(budgets.map((b) => b.category))
  const availableCategories = expenseCategories.filter((c) => !budgetedCategories.has(c.id))

  const openEdit = (b: BudgetProgress) => {
    setEditing(b)
    setLimitInput(String(b.limit))
  }

  const saveLimit = async () => {
    if (!editing) return
    const value = Number(limitInput)
    if (!value || value <= 0) return
    setSaving(true)
    await budgetService.setBudgetLimit(editing.category, value, editing.month)
    await refresh()
    setSaving(false)
    setEditing(null)
    showToast('Presupuesto actualizado', 'success')
  }

  const openCreate = () => {
    setNewCategory(availableCategories[0]?.id ?? '')
    setNewLimitInput('')
    setCreating(true)
  }

  const createBudget = async () => {
    const value = Number(newLimitInput)
    if (!newCategory || !value || value <= 0) return
    setSaving(true)
    await budgetService.setBudgetLimit(newCategory, value)
    await refresh()
    setSaving(false)
    setCreating(false)
    showToast('Presupuesto creado', 'success')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          <KPICard label="Presupuesto total" value={format(totalLimit)} icon={<Wallet className="h-4 w-4" />} tone="primary" />
          <KPICard label="Gastado este mes" value={format(totalSpent)} icon={<TrendingDown className="h-4 w-4" />} trend={{ value: pct, label: 'del presupuesto' }} />
          <KPICard label="Categorías excedidas" value={String(overCount)} icon={<PiggyBank className="h-4 w-4" />} />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled={availableCategories.length === 0} onClick={openCreate}>
          Nuevo presupuesto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...budgets]
          .sort((a, b) => b.percentage - a.percentage)
          .map((b) => (
            <Card key={b.id} interactive onClick={() => openEdit(b)} className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon category={b.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{categoryMap[b.category]?.label}</p>
                  <p className="text-xs text-ink-tertiary">Límite mensual</p>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              </div>
              <p className="font-numeric text-lg font-extrabold text-ink">
                {format(b.spent)} <span className="text-sm font-semibold text-ink-tertiary">/ {format(b.limit)}</span>
              </p>
              <ProgressBar value={b.percentage} tone={STATUS_TONE[b.status]} trackClassName="mt-3" />
              <p className="mt-2 text-xs font-semibold text-ink-tertiary">
                {b.remaining >= 0 ? `${format(b.remaining)} disponibles` : `${format(Math.abs(b.remaining))} por encima del límite`}
              </p>
            </Card>
          ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">Utilización de presupuesto</h3>
        <div className="flex flex-col gap-4">
          {[...budgets]
            .sort((a, b) => b.percentage - a.percentage)
            .map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <CategoryIcon category={b.category} size="sm" />
                <span className="w-32 shrink-0 truncate text-[13px] font-semibold text-ink">{categoryMap[b.category]?.label}</span>
                <div className="flex-1">
                  <ProgressBar value={b.percentage} tone={STATUS_TONE[b.status]} />
                </div>
                <span className="w-12 shrink-0 text-right font-numeric text-xs font-bold text-ink-secondary">{b.percentage}%</span>
              </div>
            ))}
        </div>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar presupuesto" size="sm">
        {editing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <CategoryIcon category={editing.category} />
              <p className="text-sm font-bold text-ink">{categoryMap[editing.category]?.label}</p>
            </div>
            <Input
              label="Límite mensual"
              inputMode="numeric"
              leftIcon={<span className="text-sm font-bold">$</span>}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <Button fullWidth loading={saving} leftIcon={<Plus className="h-4 w-4" />} onClick={saveLimit}>
              Guardar límite
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo presupuesto" size="sm">
        <div className="flex flex-col gap-4">
          <Select
            label="Categoría"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as CategoryId)}
            options={availableCategories.map((c) => ({ value: c.id, label: c.label }))}
          />
          <Input
            label="Límite mensual"
            inputMode="numeric"
            leftIcon={<span className="text-sm font-bold">$</span>}
            value={newLimitInput}
            onChange={(e) => setNewLimitInput(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Button fullWidth loading={saving} leftIcon={<Plus className="h-4 w-4" />} onClick={createBudget}>
            Crear presupuesto
          </Button>
        </div>
      </Modal>
    </div>
  )
}

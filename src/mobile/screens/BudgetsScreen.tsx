import { useMemo, useState } from 'react'
import { PiggyBank, Plus } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { categoryMap } from '@/data/categories'
import { formatCOP } from '@/lib/currency'
import { cn } from '@/lib/cn'

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

export default function BudgetsScreen() {
  const { budgets, refresh } = useAppData()
  const { showToast } = useToast()
  const [editing, setEditing] = useState<BudgetProgress | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [saving, setSaving] = useState(false)

  const totals = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
    return { totalLimit, totalSpent, pct: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0 }
  }, [budgets])

  const sorted = [...budgets].sort((a, b) => b.percentage - a.percentage)

  const openEdit = (budget: BudgetProgress) => {
    setEditing(budget)
    setLimitInput(String(budget.limit))
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

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Presupuestos" />

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] p-5 text-white shadow-[var(--shadow-lg)]"
          style={{ background: 'linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-white/60">Presupuesto del mes</p>
              <p className="font-numeric mt-1 text-2xl font-extrabold">{formatCOP(totals.totalSpent)}</p>
              <p className="text-xs font-medium text-white/60">de {formatCOP(totals.totalLimit)}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <PiggyBank className="h-7 w-7 text-primary-secondary" />
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={totals.pct} tone={totals.pct >= 100 ? 'negative' : totals.pct >= 80 ? 'warning' : 'positive'} trackClassName="bg-white/15" />
            <p className="mt-1.5 text-xs font-semibold text-white/60">{totals.pct}% utilizado</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <p className="px-1 text-[13px] font-bold text-ink">Presupuestos por categoría</p>
          {sorted.map((budget) => {
            const meta = categoryMap[budget.category]
            return (
              <Card
                key={budget.id}
                interactive
                onClick={() => openEdit(budget)}
                className="p-4"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon category={budget.category} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{meta?.label}</p>
                    <p className="text-xs text-ink-tertiary">
                      {formatCOP(budget.spent)} de {formatCOP(budget.limit)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[budget.status]}>{STATUS_LABEL[budget.status]}</Badge>
                </div>
                <ProgressBar value={budget.percentage} tone={STATUS_TONE[budget.status]} className={cn('mt-3')} />
              </Card>
            )
          })}
        </div>
      </div>

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
    </div>
  )
}

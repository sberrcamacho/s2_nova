import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { AmountText } from '@/components/ui/AmountText'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { categories, categoryMap, paymentMethods } from '@/data/categories'
import { formatFullDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Transaction } from '@/types'

export default function TransactionsScreen() {
  const { transactions, deleteTransaction, isLoading } = useAppData()
  const { showToast } = useToast()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [category, setCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)

  useEffect(() => {
    const openId = (location.state as { openId?: string } | null)?.openId
    if (openId) {
      const found = transactions.find((t) => t.id === openId)
      if (found) setSelected(found)
    }
  }, [location.state, transactions])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (category !== 'all' && t.category !== category) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${t.description} ${t.merchant ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [transactions, type, category, search])

  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const list = groups.get(t.date) ?? []
      list.push(t)
      groups.set(t.date, list)
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const onDelete = async (id: string) => {
    await deleteTransaction(id)
    setSelected(null)
    showToast('Movimiento eliminado', 'success')
  }

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Movimientos" />

      <div className="flex flex-col gap-3 px-5 pb-3">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar movimientos…"
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Filtros"
            aria-pressed={showFilters}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors',
              showFilters || category !== 'all' ? 'border-primary bg-accent-soft text-primary' : 'border-border bg-surface text-ink-secondary',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <Tabs
          value={type}
          onChange={(v) => setType(v as typeof type)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'income', label: 'Ingresos' },
            { value: 'expense', label: 'Gastos' },
          ]}
        />

        {showFilters && (
          <div className="scrollbar-none flex animate-fade-in gap-2 overflow-x-auto pb-1">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
              Todas las categorías
            </FilterChip>
            {categories.map((c) => (
              <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {isLoading ? (
          <p className="py-8 text-center text-xs text-ink-tertiary">Cargando…</p>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Sin resultados"
            description="Ajusta la búsqueda o los filtros para ver más movimientos."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">
                  {formatFullDate(date)}
                </p>
                <Card className="p-2">
                  {items.map((t) => (
                    <TransactionRow key={t.id} transaction={t} showDate={false} onClick={() => setSelected(t)} />
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} onDelete={onDelete} />
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-ink-secondary',
      )}
    >
      {children}
    </button>
  )
}

function TransactionDetailModal({
  transaction,
  onClose,
  onDelete,
}: {
  transaction: Transaction | null
  onClose: () => void
  onDelete: (id: string) => void
}) {
  if (!transaction) return null
  const category = categoryMap[transaction.category]
  const method = paymentMethods.find((m) => m.id === transaction.paymentMethod)

  return (
    <Modal open={!!transaction} onClose={onClose} title="Detalle del movimiento">
      <div className="flex flex-col items-center gap-3 border-b border-border pb-5">
        <CategoryIcon category={transaction.category} size="lg" />
        <div className="text-center">
          <p className="text-base font-bold text-ink">{transaction.description}</p>
          <p className="text-xs text-ink-tertiary">{transaction.merchant}</p>
        </div>
        <AmountText amount={transaction.amount} type={transaction.type} className="text-2xl" />
      </div>
      <dl className="flex flex-col gap-3 py-4 text-[13.5px]">
        <Row label="Categoría" value={category?.label ?? transaction.category} />
        <Row label="Fecha" value={formatFullDate(transaction.date)} />
        <Row label="Método de pago" value={method?.label ?? transaction.paymentMethod} />
        {transaction.note && <Row label="Nota" value={transaction.note} />}
      </dl>
      <Button variant="danger" fullWidth leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(transaction.id)}>
        Eliminar movimiento
      </Button>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-tertiary">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { AmountText } from '@/components/ui/AmountText'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { categories, categoryMap, paymentMethods } from '@/data/categories'
import { formatLongDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Transaction } from '@/types'

type SortKey = 'date' | 'amount'
const PAGE_SIZE = 10

export default function TransactionsPage() {
  const { transactions, deleteTransaction } = useAppData()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [method, setMethod] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    const list = transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (category !== 'all' && t.category !== category) return false
      if (method !== 'all' && t.paymentMethod !== method) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${t.description} ${t.merchant ?? ''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'amount') return (a.amount - b.amount) * dir
      return (a.date < b.date ? -1 : 1) * dir
    })
    return sorted
  }, [transactions, type, category, method, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    await deleteTransaction(toDelete.id)
    showToast('Transacción eliminada', 'success')
    setToDelete(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por descripción o comercio…"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetPage()
          }}
          className="sm:max-w-xs"
        />
        <Select
          options={[{ value: 'all', label: 'Todos los tipos' }, { value: 'income', label: 'Ingresos' }, { value: 'expense', label: 'Gastos' }]}
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            resetPage()
          }}
          className="sm:max-w-[160px]"
        />
        <Select
          options={[{ value: 'all', label: 'Todas las categorías' }, ...categories.map((c) => ({ value: c.id, label: c.label }))]}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            resetPage()
          }}
          className="sm:max-w-[190px]"
        />
        <Select
          options={[{ value: 'all', label: 'Todos los métodos' }, ...paymentMethods.map((m) => ({ value: m.id, label: m.label }))]}
          value={method}
          onChange={(e) => {
            setMethod(e.target.value)
            resetPage()
          }}
          className="sm:max-w-[190px]"
        />
      </Card>

      <Card className="overflow-hidden">
        {pageItems.length === 0 ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">
                  <SortableTh label="Fecha" active={sortKey === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Categoría</th>
                  <SortableTh label="Monto" active={sortKey === 'amount'} dir={sortDir} onClick={() => toggleSort('amount')} />
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-bg-secondary">
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-medium text-ink-secondary">{formatLongDate(t.date)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon category={t.category} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{t.description}</p>
                          <p className="truncate text-xs text-ink-tertiary">{t.merchant}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone="neutral">{categoryMap[t.category]?.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <AmountText amount={t.amount} type={t.type} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-medium text-ink-secondary">
                      {paymentMethods.find((m) => m.id === t.paymentMethod)?.label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone="positive">Completado</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <button
                        aria-label="Eliminar transacción"
                        onClick={() => setToDelete(t)}
                        className="rounded-[var(--radius-sm)] p-1.5 text-ink-tertiary transition-colors hover:bg-negative-soft hover:text-negative"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs font-medium text-ink-tertiary">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                Anterior
              </Button>
              <span className="px-2 text-xs font-bold text-ink-secondary">
                {page} / {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Eliminar transacción" size="sm">
        <p className="text-sm text-ink-secondary">
          ¿Seguro que deseas eliminar <span className="font-bold text-ink">{toDelete?.description}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function SortableTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th className="px-4 py-3">
      <button onClick={onClick} className={cn('flex items-center gap-1 transition-colors', active ? 'text-primary' : 'hover:text-ink-secondary')}>
        {label}
        <ArrowUpDown className={cn('h-3 w-3', active && dir === 'asc' && 'rotate-180')} />
      </button>
    </th>
  )
}

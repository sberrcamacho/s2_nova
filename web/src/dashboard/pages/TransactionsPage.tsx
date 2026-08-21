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
import { categories, paymentMethods } from '@/data/categories'
import { formatLongDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'
import type { Transaction } from '@/types'

type SortKey = 'date' | 'amount'
const PAGE_SIZE = 10

export default function TransactionsPage() {
  const { transactions, deleteTransaction } = useAppData()
  const { showToast } = useToast()
  const { t, tCategory, tPaymentMethod, language } = useTranslation()

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
    showToast(t('txn.deletedToast'), 'success')
    setToDelete(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          placeholder={t('txn.searchPlaceholder')}
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetPage()
          }}
          className="sm:max-w-xs"
        />
        <Select
          options={[{ value: 'all', label: t('txn.filterAllTypes') }, { value: 'income', label: t('nav.income') }, { value: 'expense', label: t('nav.expenses') }]}
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            resetPage()
          }}
          className="sm:max-w-[160px]"
        />
        <Select
          options={[{ value: 'all', label: t('txn.filterAllCategories') }, ...categories.map((c) => ({ value: c.id, label: tCategory(c.id) }))]}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            resetPage()
          }}
          className="sm:max-w-[190px]"
        />
        <Select
          options={[{ value: 'all', label: t('txn.filterAllMethods') }, ...paymentMethods.map((m) => ({ value: m.id, label: tPaymentMethod(m.id) }))]}
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
          <EmptyState icon={<Search className="h-6 w-6" />} title={t('txn.emptyTitle')} description={t('txn.emptyDescription')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">
                  <SortableTh label={t('txn.colDate')} active={sortKey === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
                  <th className="px-4 py-3">{t('txn.colDescription')}</th>
                  <th className="px-4 py-3">{t('txn.colCategory')}</th>
                  <th className="px-4 py-3">{t('txn.colType')}</th>
                  <SortableTh label={t('txn.colAmount')} active={sortKey === 'amount'} dir={sortDir} onClick={() => toggleSort('amount')} />
                  <th className="px-4 py-3">{t('txn.colMethod')}</th>
                  <th className="px-4 py-3">{t('txn.colStatus')}</th>
                  <th className="px-4 py-3 text-right">{t('txn.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((txn) => (
                  <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-bg-secondary">
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-medium text-ink-secondary">{formatLongDate(txn.date, language)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon category={txn.category} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{txn.description}</p>
                          <p className="truncate text-xs text-ink-tertiary">{txn.merchant}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone="neutral">{tCategory(txn.category)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone={txn.type === 'income' ? 'positive' : txn.type === 'expense' ? 'negative' : 'neutral'}>
                        {txn.type === 'income' ? t('txn.typeIncome') : txn.type === 'expense' ? t('txn.typeExpense') : t('txn.typeTransfer')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <AmountText amount={txn.amount} type={txn.type} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-medium text-ink-secondary">
                      {tPaymentMethod(txn.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge tone="positive">{t('txn.statusCompleted')}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <button
                        aria-label={t('txn.deleteAria')}
                        onClick={() => setToDelete(txn)}
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
              {t('common.showing')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} {t('common.of')} {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                {t('common.previous')}
              </Button>
              <span className="px-2 text-xs font-bold text-ink-secondary">
                {page} / {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('txn.deleteTitle')} size="sm">
        <p className="text-sm text-ink-secondary">
          {t('txn.deleteConfirmPrefix')} <span className="font-bold text-ink">{toDelete?.description}</span>{t('txn.deleteConfirmSuffix')}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            {t('common.delete')}
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

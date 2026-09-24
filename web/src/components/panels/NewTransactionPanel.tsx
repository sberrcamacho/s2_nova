import { useEffect, useState } from 'react'
import { SidePanel, chipClass, errorBoxClass, fieldLabelClass, primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { accountService } from '@/services/accountService'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { todayISO } from '@/lib/date'
import { EXPENSE_CATEGORY_IDS, INCOME_CATEGORY_IDS, fill, guessCategory } from '@/lib/inicio'
import { categoryColor } from '@/lib/categoryGlyphs'
import type { CategoryId, TransactionType, Wallet } from '@/types'

const TYPES: { value: TransactionType; key: 'newTx.expense' | 'newTx.income' | 'newTx.transfer' }[] = [
  { value: 'expense', key: 'newTx.expense' },
  { value: 'income', key: 'newTx.income' },
  { value: 'transfer', key: 'newTx.transfer' },
]

// "Nuevo movimiento" — Web v2 mockup panel: type, amount, description with
// a category suggestion, category grid, wallet and (for transfers)
// destination wallet. Saves through POST /transactions; the backend applies
// every balance side effect.
export function NewTransactionPanel({ onClose }: { onClose: () => void }) {
  const { t, tCategory } = useTranslation()
  const { addTransaction } = useAppData()
  const { showToast } = useToast()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [picked, setPicked] = useState<CategoryId | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    accountService
      .getWallets()
      .then((list) => {
        if (cancelled) return
        setWallets(list)
        setWalletId(list[0]?.id ?? null)
        setToId(list[1]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setError(t('inicio.syncError'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const isTransfer = type === 'transfer'
  const pool = type === 'income' ? INCOME_CATEGORY_IDS : EXPENSE_CATEGORY_IDS
  const guess = guessCategory(desc)
  const suggested = guess && pool.includes(guess) ? guess : null
  const category = picked ?? suggested

  const edit = (fn: () => void) => {
    fn()
    setError('')
  }

  const pickWallet = (id: string) =>
    edit(() => {
      setWalletId(id)
      if (id === toId) setToId(wallets.find((w) => w.id !== id)?.id ?? null)
    })

  const save = async () => {
    const value = Number(amount)
    if (!value) return setError(t('newTx.errAmount'))
    if (!desc.trim()) return setError(t('newTx.errDescription'))
    if (!isTransfer && !category) return setError(t('newTx.errCategory'))
    if (!walletId) return setError(t('newTx.errWallet'))
    if (isTransfer && (!toId || toId === walletId)) return setError(t('newTx.errTarget'))
    setSaving(true)
    try {
      await addTransaction({
        accountId: walletId,
        transferAccountId: isTransfer ? toId! : undefined,
        type,
        amount: value,
        description: desc.trim(),
        category: isTransfer ? 'other' : category!,
        date: todayISO(),
      })
      showToast(t('newTx.saved'), 'success')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidePanel
      title={t('newTx.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={saving} className={primaryButtonClass}>
            {t('newTx.save')}
          </button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('newTx.title')} className="flex gap-1 rounded-[12px] border border-v2-line bg-v2-surface2 p-1">
        {TYPES.map((opt) => {
          const on = type === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => edit(() => {
                setType(opt.value)
                setPicked(null)
              })}
              className={
                on
                  ? 'flex-1 cursor-pointer rounded-[9px] bg-v2-surface py-2 text-center text-[12px] font-bold text-v2-text shadow-[0_1px_0_var(--v2-line2)]'
                  : 'flex-1 cursor-pointer rounded-[9px] py-2 text-center text-[12px] font-bold text-v2-dim'
              }
            >
              {t(opt.key)}
            </button>
          )
        })}
      </div>

      <div
        className="relative flex flex-col gap-1.5 overflow-hidden rounded-[18px] border border-[#2b2450] px-5 py-[18px] text-white"
        style={{ background: 'linear-gradient(150deg,var(--v2-hero-a) 0%,var(--v2-hero-b) 60%,var(--v2-hero-c) 100%)' }}
      >
        <label htmlFor="nt-amount" className="text-[10.5px] font-bold tracking-[.11em] text-[#a69dff]">
          {t('newTx.amount')}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="font-numeric text-[28px] font-extrabold text-white/60">$</span>
          <input
            id="nt-amount"
            value={amount ? Number(amount).toLocaleString('es-CO') : ''}
            onChange={(e) => edit(() => setAmount(e.target.value.replace(/\D/g, '').slice(0, 11)))}
            placeholder="0"
            inputMode="numeric"
            className="font-numeric h-[41px] min-w-0 flex-1 border-none bg-transparent text-[30px] font-extrabold tracking-[-.02em] text-white outline-none placeholder:text-white/60"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nt-desc" className={fieldLabelClass}>
          {t('newTx.description')}
        </label>
        <input
          id="nt-desc"
          value={desc}
          onChange={(e) => edit(() => setDesc(e.target.value))}
          placeholder={t('newTx.descriptionPlaceholder')}
          className="box-border h-11 w-full rounded-[12px] border border-v2-line bg-v2-sidebar px-3.5 text-[13px] text-v2-text outline-none placeholder:text-v2-dim focus:border-v2-accent"
        />
        {!isTransfer && !picked && suggested && (
          <div className="text-[11.5px] font-bold text-v2-accent2">{fill(t('newTx.suggested'), tCategory(suggested))}</div>
        )}
      </div>

      {!isTransfer && (
        <div className="flex flex-col gap-2">
          <div className={fieldLabelClass}>{t('newTx.category')}</div>
          <div role="radiogroup" aria-label={t('newTx.category')} className="grid grid-cols-4 gap-2">
            {pool.map((id) => {
              const on = category === id
              const c = categoryColor(id)
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => edit(() => setPicked(id))}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] px-1 py-2.5"
                  style={{
                    color: on ? 'var(--v2-text)' : 'var(--v2-muted)',
                    background: on ? `color-mix(in oklab, ${c} 14%, transparent)` : 'var(--v2-surface2)',
                    border: `1.5px solid ${on ? c : 'var(--v2-line)'}`,
                  }}
                >
                  <CategoryMark category={id} box={36} />
                  <span className="text-center text-[10.5px] font-bold leading-[1.2]">{tCategory(id)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className={fieldLabelClass}>{isTransfer ? t('newTx.from') : t('newTx.wallet')}</div>
        {wallets.length === 0 ? (
          <div className="text-[12px] text-v2-dim">{t('newTx.noWallets')}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wallets.map((w) => (
              <button key={w.id} type="button" aria-pressed={walletId === w.id} onClick={() => pickWallet(w.id)} className={chipClass(walletId === w.id)}>
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isTransfer && (
        <div className="flex flex-col gap-2">
          <div className={fieldLabelClass}>{t('newTx.to')}</div>
          <div className="flex flex-wrap gap-1.5">
            {wallets
              .filter((w) => w.id !== walletId)
              .map((w) => (
                <button key={w.id} type="button" aria-pressed={toId === w.id} onClick={() => edit(() => setToId(w.id))} className={chipClass(toId === w.id)}>
                  {w.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}
    </SidePanel>
  )
}

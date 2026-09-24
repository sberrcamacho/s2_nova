import { useState } from 'react'
import { SidePanel, errorBoxClass, primaryButtonClass, secondaryButtonClass } from '@/components/panels/SidePanel'
import { AmountInput, ColorChip, PanelField, WalletChips, dangerButtonClass, panelInputClass } from '@/components/panels/PanelFields'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { goalMark } from '@/lib/categoryGlyphs'
import { todayISO } from '@/lib/date'
import { fill } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import { GOAL_CATEGORY_IDS, guessGoalCategory, type GoalCategoryId } from '@/lib/planCopy'
import type { TranslationKey } from '@/lib/i18n/translations'
import { goalService } from '@/services/goalService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'
import type { Goal, Wallet } from '@/types'

// Create / edit a goal — Android's Metas sheet as a Web side panel:
// Nombre (suggests the category), Categoría, Monto objetivo. "Eliminar
// meta" switches the panel to the delete step, which returns any saved
// money as real movements.
export function GoalPanel({ goal, wallets, onClose, onSaved }: { goal: Goal | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const isEdit = goal !== null
  const [name, setName] = useState(goal?.name ?? '')
  const [category, setCategory] = useState<GoalCategoryId>(((goal?.themeIcon as GoalCategoryId) ?? 'OTHER'))
  const [picked, setPicked] = useState(isEdit)
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const auto = !picked && guessGoalCategory(name) !== null
  const mark = goalMark(category)

  if (goal && deleting) {
    return <GoalDeleteStep goal={goal} wallets={wallets} onClose={onClose} onBack={() => setDeleting(false)} onDeleted={onSaved} />
  }

  const onName = (value: string) => {
    setName(value)
    setError('')
    const g = guessGoalCategory(value)
    if (!picked && g) setCategory(g)
  }

  const save = async () => {
    const amount = Number(target)
    if (!name.trim()) return setError(t('plans.errName'))
    if (!amount) return setError(t('plans.errAmount'))
    setBusy(true)
    try {
      const input = { name: name.trim(), targetAmount: amount, themeIcon: category }
      if (goal) await goalService.updateGoal(goal.id, input)
      else await goalService.createGoal(input)
      showToast(t('plans.goalSaved'), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  return (
    <SidePanel
      title={t(isEdit ? 'plans.editGoal' : 'plans.newGoal')}
      onClose={onClose}
      footer={
        <>
          {isEdit && (
            <button type="button" onClick={() => setDeleting(true)} className={dangerButtonClass}>
              {t('plans.deleteGoal')}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={busy} className={primaryButtonClass}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <PanelField label={t('plans.name')} htmlFor="gp-name" note={t(auto ? 'plans.categoryAuto' : 'plans.goalCategoryNote')}>
        <div className="flex items-center gap-3">
          <CategoryMark category={mark.glyph} color={mark.color} box={40} />
          <input id="gp-name" value={name} onChange={(e) => onName(e.target.value)} placeholder={t('plans.goalNamePlaceholder')} className={panelInputClass} />
        </div>
      </PanelField>

      <PanelField label={t('plans.category')}>
        <div role="radiogroup" aria-label={t('plans.category')} className="flex flex-wrap gap-2">
          {GOAL_CATEGORY_IDS.map((id) => (
            <ColorChip
              key={id}
              label={t(`goalCat.${id}` as TranslationKey)}
              color={goalMark(id).color}
              selected={category === id}
              onClick={() => {
                setCategory(id)
                setPicked(true)
              }}
            />
          ))}
        </div>
      </PanelField>

      <PanelField label={t('plans.targetAmount')} htmlFor="gp-target">
        <AmountInput id="gp-target" value={target} onChange={(v) => { setTarget(v); setError('') }} />
      </PanelField>

      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}
    </SidePanel>
  )
}

type Destination = 'origin' | { accountId: string }

// Android's GoalDeleteSheet: the saved money goes back to the wallets it
// came from ("Devolver a su origen") or all to one wallet.
function GoalDeleteStep({ goal, wallets, onClose, onBack, onDeleted }: { goal: Goal; wallets: Wallet[]; onClose: () => void; onBack: () => void; onDeleted: () => void }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const contributions = [...(goal.contributions ?? [])].sort((a, b) => b.amount - a.amount)
  const hasBalance = goal.currentAmount > 0
  const [dest, setDest] = useState<Destination>(contributions.length > 0 || !wallets[0] ? 'origin' : { accountId: wallets[0].id })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const name = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')
  const origin = contributions.map((c) => `${name(c.accountId)} ${format(c.amount)}`).join(' · ')
  const canDelete = !hasBalance || dest !== 'origin' || contributions.length > 0

  const remove = async () => {
    setBusy(true)
    try {
      await goalService.deleteGoal(goal.id, hasBalance ? dest : undefined)
      showToast(t('plans.goalDeleted'), 'success')
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  const rows: { key: string; label: string; detail: string; value: Destination }[] = [
    { key: 'origin', label: t('plans.origin'), detail: origin || t('plans.noOrigin'), value: 'origin' },
    ...wallets.map((w) => ({ key: w.id, label: fill(t('plans.allTo'), shortWallet(w.name)), detail: fill(t('plans.oneMove'), format(goal.currentAmount)), value: { accountId: w.id } })),
  ]
  const isOn = (value: Destination) => (value === 'origin' ? dest === 'origin' : dest !== 'origin' && dest.accountId === value.accountId)

  return (
    <SidePanel
      title={fill(t('plans.deleteGoalTitle'), goal.name)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onBack} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={remove} disabled={busy || !canDelete} className={cn(dangerButtonClass, 'mr-0 bg-[rgba(232,93,107,.14)]')}>
            {hasBalance ? fill(t('plans.deleteAndReturn'), format(goal.currentAmount)) : t('plans.deleteGoal')}
          </button>
        </>
      }
    >
      <div className="text-[12px] leading-[1.5] text-v2-dim">
        {hasBalance ? fill(t('plans.deleteGoalBalance'), format(goal.currentAmount)) : t('plans.deleteGoalEmpty')}
      </div>
      {hasBalance && (
        <div role="radiogroup" aria-label={t('plans.deleteGoal')} className="flex flex-col gap-2">
          {rows.map((r) => {
            const on = isOn(r.value)
            return (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDest(r.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left',
                  on ? 'border-v2-accent bg-[rgba(108,92,231,.12)]' : 'border-v2-line2 bg-transparent',
                )}
              >
                <span
                  className="h-4 w-4 flex-none rounded-full border-2"
                  style={on ? { borderColor: 'var(--v2-accent)', background: 'var(--v2-accent)', boxShadow: 'inset 0 0 0 2.5px var(--v2-surface)' } : { borderColor: 'var(--v2-line2)' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{r.label}</span>
                  <span className="font-numeric mt-0.5 block text-[11px] text-v2-dim">{r.detail}</span>
                </span>
              </button>
            )
          })}
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

// Android's GoalPaySheet ("Abonar"): an ordinary expense linked to the goal
// (goalId), so the backend moves the wallet balance and the goal progress.
export function GoalPayPanel({ goal, wallets, onClose, onSaved }: { goal: Goal; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { addTransaction } = useAppData()
  const { showToast } = useToast()
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState<string | null>(wallets[0]?.id ?? null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const value = Number(amount)
    if (!value) return setError(t('plans.errAmount'))
    if (!walletId) return setError(t('newTx.errWallet'))
    setBusy(true)
    try {
      await addTransaction({
        accountId: walletId,
        type: 'expense',
        amount: value,
        description: fill(t('plans.contributionDesc'), goal.name),
        category: 'other',
        date: todayISO(),
        goalId: goal.id,
      })
      showToast(t('plans.contributed'), 'success')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inicio.syncError'))
      setBusy(false)
    }
  }

  return (
    <SidePanel
      title={fill(t('plans.contributeTitle'), goal.name)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={busy} className={primaryButtonClass}>
            {t('plans.contribute')}
          </button>
        </>
      }
    >
      <div className="font-numeric text-[12px] leading-[1.5] text-v2-dim">{fill(t('plans.contributeNote'), format(goal.currentAmount), format(goal.targetAmount))}</div>
      <PanelField label={t('plans.contributeAmount')} htmlFor="gpay-amount">
        <AmountInput id="gpay-amount" value={amount} onChange={(v) => { setAmount(v); setError('') }} />
      </PanelField>
      <PanelField label={t('plans.contributeWallet')}>
        {wallets.length === 0 ? <div className="text-[12px] text-v2-dim">{t('newTx.noWallets')}</div> : <WalletChips wallets={wallets} selected={walletId} onSelect={setWalletId} />}
      </PanelField>
      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}
    </SidePanel>
  )
}

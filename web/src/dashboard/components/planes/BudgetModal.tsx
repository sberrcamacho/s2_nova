import { useState } from 'react'
import { CategoryMark, PlanMark } from '@/components/v2/CategoryMark'
import { ConfirmDialog, DateInput, ErrorBox, Field, Flat, GridCell, IC, Label, inputClass } from '@/components/v2/Kit'
import { AmountHero, ChoiceCard, PlanIconPicker, StepDeleteButton, StepModal, StepNote, StepQuestion } from '@/components/v2/Steps'
import { ApiError } from '@/lib/apiClient'
import { categoryLabel, categoryName, categoryNode, childCategories, parentCategories, parentOf, useCategories } from '@/lib/backendCategories'
import { shortWallet } from '@/lib/movimientos'
import { budgetPeriodLabel } from '@/lib/planCopy'
import { guessPlanIcon } from '@/lib/taxonomy'
import { budgetService, type BudgetDraft, type BudgetProgress } from '@/services/budgetService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill } from '@/lib/i18n/translations'
import type { BudgetKind, Wallet } from '@/types'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'

interface Draft {
  kind: BudgetKind
  name: string
  limit: string
  cat: string | null
  sub: string | null
  icon: string
  iconAuto: boolean
  walletIds: string[]
  period: 'monthly' | 'custom'
  start: string
  end: string
  auto: boolean
  // The name is typed by the user (otherwise it is the suggested category name).
  nameTouched: boolean
}

function draftOf(b: BudgetProgress | null): Draft {
  if (!b) return { kind: 'category', name: '', limit: '', cat: null, sub: null, icon: 'other', iconAuto: true, walletIds: [], period: 'monthly', start: '', end: '', auto: true, nameTouched: false }
  const custom = b.kind === 'custom'
  return {
    kind: b.kind,
    name: b.name ?? (custom ? '' : categoryName(b.category)),
    limit: numStr(b.limit),
    cat: custom ? null : (parentOf(b.category)?.id ?? null),
    sub: custom ? null : categoryNode(b.category)?.parentId ? (b.category ?? null) : null,
    icon: b.icon ?? 'other',
    iconAuto: false,
    walletIds: b.walletIds,
    period: b.period === 'custom' ? 'custom' : 'monthly',
    start: b.startDate ?? '',
    end: b.endDate ?? '',
    auto: false,
    nameTouched: true,
  }
}

// Nuevo / Editar presupuesto as guided steps (the single modal was too
// crowded), same as Android's BudgetSheet: 1 the kind, 2 the category (or
// the custom budget's name and icon), 3 the limit, period and wallets with a
// summary of what counts. Editing starts at step 3 and never shows step 1:
// the kind is fixed once saved.
export function BudgetModal({ budget, wallets, onClose, onSaved }: { budget: BudgetProgress | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  useCategories()
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [d, setD] = useState<Draft>(() => draftOf(budget))
  const steps = budget ? [1, 2] : [0, 1, 2]
  const [index, setIndex] = useState(budget ? steps.length - 1 : 0)
  const [direction, setDirection] = useState<'next' | 'back'>('next')
  const [kindChosen, setKindChosen] = useState(!!budget)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const set = (p: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...p }))
    setErr('')
  }
  const go = (delta: 1 | -1) => {
    setDirection(delta > 0 ? 'next' : 'back')
    setIndex((i) => i + delta)
  }

  const step = steps[index]
  const custom = d.kind === 'custom'
  const valid = evalExpr(d.limit) > 0 && (d.period !== 'custom' || (!!d.start && !!d.end && d.end >= d.start)) && (custom ? !!d.name.trim() : !!d.cat && !!d.name.trim())
  const stepValid = step === 1 ? !!d.name.trim() && (custom || !!d.cat) : valid
  const leaf = d.sub ?? d.cat
  const wl = d.walletIds.length ? d.walletIds.map((id) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')) : null

  const scopeNote = custom
    ? `${t('bud.kind.customHint')} ${capitalize(t(d.period === 'custom' ? 'bud.scope.noReset' : 'bud.scope.reset'))}.`
    : !d.cat
      ? t('bud.scope.pick')
      : (d.sub ? fill(t('bud.scope.only'), categoryLabel(d.sub)) : fill(t('bud.scope.all'), categoryName(d.cat))) +
        (wl ? fill(t('bud.scope.from'), wl.join(', ')) : t('bud.scope.allWallets')) +
        ` · ${t(d.period === 'custom' ? 'bud.scope.noReset' : 'bud.scope.reset')}.`

  const save = async () => {
    if (!valid) return
    const draft: BudgetDraft = {
      kind: d.kind,
      name: d.name.trim(),
      category: custom ? undefined : (leaf ?? undefined),
      icon: custom ? d.icon : undefined,
      walletIds: custom ? [] : d.walletIds,
      limit: evalExpr(d.limit),
      period: d.period,
      startDate: d.period === 'custom' ? d.start : undefined,
      endDate: d.period === 'custom' ? d.end : undefined,
    }
    setBusy(true)
    try {
      if (!budget) await budgetService.createBudget(draft)
      else await budgetService.updateBudget(budget.id, draft)
      showToast(t(budget ? 'bud.toast.updated' : 'bud.toast.created'), 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 409 ? t('bud.err.taken') : e instanceof Error ? e.message : t('common.saveError'))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!budget) return
    setConfirming(false)
    try {
      await budgetService.deleteBudget(budget.id)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.deleteError'))
    }
  }

  const title = t(budget ? 'bud.edit' : 'bud.new')
  const label = budget ? (budget.name ?? categoryName(budget.category)) : ''
  const pickKind = (kind: BudgetKind) => {
    setKindChosen(true)
    set({ kind, ...(d.nameTouched ? {} : { name: kind === 'custom' || !d.cat ? '' : categoryName(d.sub ?? d.cat) }) })
    go(1)
  }

  return (
    <>
      <StepModal
        title={title}
        context={budget ? label : undefined}
        step={index}
        stepCount={steps.length}
        direction={direction}
        onBack={() => go(-1)}
        onClose={onClose}
        primaryLabel={t(step < 2 ? 'step.continue' : budget ? 'step.saveChanges' : 'bud.save')}
        primaryEnabled={stepValid}
        busy={busy}
        onPrimary={() => (step < 2 ? go(1) : void save())}
        showPrimary={step !== 0}
        footer={budget && <StepDeleteButton onClick={() => setConfirming(true)}>{t('bud.delete')}</StepDeleteButton>}
      >
        {step === 0 && (
          <>
            <StepQuestion text={t('bud.q.kind')} />
            <div className="flex flex-col gap-3" role="radiogroup">
              <ChoiceCard icon={[...IC.target]} title={t('bud.choice.category')} detail={t('bud.choice.categoryDetail')} on={kindChosen && !custom} onClick={() => pickKind('category')} />
              <ChoiceCard
                icon={['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z']}
                title={t('bud.choice.custom')}
                detail={t('bud.choice.customDetail')}
                on={kindChosen && custom}
                onClick={() => pickKind('custom')}
              />
            </div>
          </>
        )}

        {step === 1 && custom && (
          <>
            <StepQuestion text={t('bud.q.custom')} hint={t('bud.kind.customHint')} />
            <Field label={t('bud.name')} note={t(d.iconAuto && guessPlanIcon(d.name) ? 'bud.note.iconGuess' : 'bud.note.iconPick')}>
              <div className="flex h-14 items-center gap-2.5 rounded-[10px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
                <PlanMark icon={d.icon} box={40} />
                <input
                  autoFocus
                  value={d.name}
                  aria-label={t('bud.name')}
                  onChange={(e) => set({ name: e.target.value, nameTouched: true, icon: d.iconAuto ? (guessPlanIcon(e.target.value) ?? 'other') : d.icon })}
                  placeholder={t('bud.ph.custom')}
                  className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary"
                />
              </div>
            </Field>
            <div className="mt-5 flex flex-col gap-2">
              <Label>{t('bud.icon')}</Label>
              <PlanIconPicker value={d.icon} onPick={(k) => set({ icon: k, iconAuto: false })} />
            </div>
          </>
        )}

        {step === 1 && !custom && (
          <>
            <StepQuestion text={t('bud.q.category')} hint={t('bud.q.categoryHint')} />
            <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-1" role="radiogroup">
              {parentCategories(false, false).map((x) => (
                <GridCell
                  key={x.id}
                  on={d.cat === x.id}
                  color={x.color}
                  chip={<CategoryMark category={x.id} box={40} />}
                  label={categoryName(x.id)}
                  onClick={() => set({ cat: x.id, sub: null, auto: false, ...(d.nameTouched ? {} : { name: categoryName(x.id) }) })}
                />
              ))}
            </div>
            {d.cat && childCategories(d.cat, false).length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                <Label>{t('bud.subcategory')}</Label>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {[{ id: null as string | null, name: t('bud.allSubs') }, ...childCategories(d.cat, false).map((c) => ({ id: c.id as string | null, name: categoryName(c.id) }))].map((x) => (
                    <Flat key={x.id ?? 'all'} role="radio" on={d.sub === x.id} onClick={() => set({ sub: x.id, ...(d.nameTouched || !d.cat ? {} : { name: categoryName(x.id ?? d.cat) }) })}>
                      {x.name}
                    </Flat>
                  ))}
                </div>
              </div>
            )}
            {d.cat && (
              <div className="mt-5">
                <Field label={t('bud.name')}>
                  <input value={d.name} onChange={(e) => set({ name: e.target.value, nameTouched: e.target.value.trim().length > 0 })} placeholder={t('bud.ph.category')} className={`${inputClass} h-12 text-body font-semibold`} />
                </Field>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <StepQuestion text={t('bud.q.limit')} />
            <AmountHero label={t('bud.limitLabel')} expr={d.limit} onExpr={(v) => set({ limit: v })} />
            <div className="mt-5 flex flex-col gap-2">
              <Label>{t('bud.period')}</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                <Flat role="radio" on={d.period === 'monthly'} onClick={() => set({ period: 'monthly' })}>
                  {t('bud.monthly')}
                </Flat>
                <Flat role="radio" on={d.period === 'custom'} onClick={() => set({ period: 'custom' })}>
                  {t('bud.customRange')}
                </Flat>
              </div>
              {d.period === 'custom' && (
                <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                  <DateInput value={d.start} onChange={(v) => set({ start: v })} />
                  <DateInput value={d.end} onChange={(v) => set({ end: v })} />
                </div>
              )}
            </div>
            {!custom && wallets.length > 1 && (
              <div className="mt-5 flex flex-col gap-2">
                <Label>{t('bud.walletsLabel')}</Label>
                <div className="flex flex-wrap gap-2">
                  <Flat on={!wl} onClick={() => set({ walletIds: [] })}>
                    {t('bud.all')}
                  </Flat>
                  {wallets.map((w) => {
                    const on = d.walletIds.includes(w.id)
                    return (
                      <Flat key={w.id} role="checkbox" on={on} onClick={() => set({ walletIds: on ? d.walletIds.filter((x) => x !== w.id) : [...d.walletIds, w.id] })}>
                        {shortWallet(w.name)}
                      </Flat>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt-5">
              <StepNote>{scopeNote}</StepNote>
            </div>
            {err && (
              <div className="mt-3">
                <ErrorBox>{err}</ErrorBox>
              </div>
            )}
          </>
        )}
      </StepModal>

      {confirming && budget && (
        <ConfirmDialog
          title={fill(t('bud.delete.title'), label)}
          lines={[fill(t('bud.delete.spent'), format(budget.spent), format(budget.limit), budgetPeriodLabel(budget)), t('bud.delete.history'), t('bud.delete.keep')]}
          ack={t('bud.delete.ack')}
          cta={t('bud.delete')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

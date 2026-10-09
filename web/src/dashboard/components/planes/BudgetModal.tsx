import { useState } from 'react'
import { CategoryMark, PlanMark } from '@/components/v2/CategoryMark'
import { ConfirmDialog, DateInput, ErrorBox, Field, GridCell, IC, Label, inputClass } from '@/components/v2/Kit'
import { AmountHero, ChoiceCard, PlanIconPicker, StepChoiceRow, StepDeleteButton, StepModal, StepNote, StepOptionGroup, StepOptionRow, StepQuestion } from '@/components/v2/Steps'
import { ApiError } from '@/lib/apiClient'
import { categoryLabel, categoryName, categoryNode, childCategories, parentCategories, parentOf, useCategories } from '@/lib/backendCategories'
import { shortWallet } from '@/lib/movimientos'
import { formatShortDate } from '@/lib/date'
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

// Nuevo / Editar presupuesto as guided steps that never scroll, same as
// Android's BudgetSheet. Category kind: Tipo → Categoría (click advances) →
// Subcategoría (only when the category has some; click advances) → Límite
// (amount, name, and Periodo / Billeteras rows that open their own
// sub-pages). Custom kind: Tipo → Nombre e icono → Límite. Editing starts
// at Límite and never shows Tipo: the kind is fixed once saved.
const KIND = 0
const CATEGORY = 1
const SUB = 2
const LIMIT = 3

export function BudgetModal({ budget, wallets, onClose, onSaved }: { budget: BudgetProgress | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  useCategories()
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [d, setD] = useState<Draft>(() => draftOf(budget))
  const custom = d.kind === 'custom'
  const hasSubs = !custom && !!d.cat && childCategories(d.cat, false).length > 0
  const steps = [...(budget ? [] : [KIND]), CATEGORY, ...(hasSubs ? [SUB] : []), LIMIT]
  const [index, setIndex] = useState(budget ? 99 : 0)
  const at = Math.min(index, steps.length - 1)
  const [direction, setDirection] = useState<'next' | 'back'>('next')
  const [kindChosen, setKindChosen] = useState(!!budget)
  const [sub, setSub] = useState<'period' | 'wallets' | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const set = (p: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...p }))
    setErr('')
  }
  const go = (delta: 1 | -1) => {
    setDirection(delta > 0 ? 'next' : 'back')
    setIndex(at + delta)
  }

  const step = steps[at]
  const valid = evalExpr(d.limit) > 0 && (d.period !== 'custom' || (!!d.start && !!d.end && d.end >= d.start)) && (custom ? !!d.name.trim() : !!d.cat && !!d.name.trim())
  const stepValid = step === CATEGORY ? (custom ? !!d.name.trim() : !!d.cat) : valid
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
  const periodValue = d.period === 'custom' ? (d.start && d.end ? `${formatShortDate(d.start)} – ${formatShortDate(d.end)}` : t('bud.customRange')) : t('bud.monthly')

  const subPage =
    sub === 'period'
      ? {
          key: 'period',
          title: t('bud.q.period'),
          content: (
            <div className="flex flex-col gap-2" role="radiogroup">
              <StepChoiceRow label={t('bud.monthly')} on={d.period === 'monthly'} onClick={() => set({ period: 'monthly' })} />
              <StepChoiceRow label={t('bud.customRange')} on={d.period === 'custom'} onClick={() => set({ period: 'custom' })} />
              {d.period === 'custom' && (
                <div className="mt-2 grid grid-cols-1 gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <DateInput value={d.start} onChange={(v) => set({ start: v })} />
                  <DateInput value={d.end} onChange={(v) => set({ end: v })} />
                </div>
              )}
            </div>
          ),
        }
      : sub === 'wallets'
        ? {
            key: 'wallets',
            title: t('bud.q.wallets'),
            content: (
              <div className="flex flex-col gap-2">
                <StepChoiceRow label={t('bud.all')} on={!wl} onClick={() => set({ walletIds: [] })} />
                {wallets.map((w) => {
                  const on = d.walletIds.includes(w.id)
                  return <StepChoiceRow key={w.id} multi label={shortWallet(w.name)} on={on} onClick={() => set({ walletIds: on ? d.walletIds.filter((x) => x !== w.id) : [...d.walletIds, w.id] })} />
                })}
              </div>
            ),
          }
        : null

  return (
    <>
      <StepModal
        title={title}
        context={step === KIND ? undefined : budget ? label : !custom && leaf ? categoryName(leaf) : undefined}
        step={at}
        stepCount={steps.length}
        direction={direction}
        onBack={() => go(-1)}
        onClose={onClose}
        primaryLabel={t(step !== LIMIT ? 'step.continue' : budget ? 'step.saveChanges' : 'bud.save')}
        primaryEnabled={stepValid}
        busy={busy}
        onPrimary={() => (step !== LIMIT ? go(1) : void save())}
        showPrimary={step === LIMIT || (step === CATEGORY && custom)}
        showBack={at > 0}
        footer={budget && step === LIMIT && <StepDeleteButton onClick={() => setConfirming(true)}>{t('bud.delete')}</StepDeleteButton>}
        subPage={subPage}
        onSubDone={() => setSub(null)}
      >
        {step === KIND && (
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

        {step === CATEGORY && custom && (
          <>
            <StepQuestion text={t('bud.q.custom')} hint={t('bud.kind.customHint')} />
            <Field label={t('bud.name')} note={t(d.iconAuto && guessPlanIcon(d.name) ? 'bud.note.iconGuess' : 'bud.note.iconPick')}>
              <div className="flex h-14 items-center gap-2.5 rounded-[12px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
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

        {step === CATEGORY && !custom && (
          <>
            <StepQuestion text={t('bud.q.category')} hint={t('bud.q.categoryHint')} />
            <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-1" role="radiogroup">
              {parentCategories(false, false).map((x) => (
                <GridCell
                  key={x.id}
                  on={d.cat === x.id}
                  chip={<CategoryMark category={x.id} box={40} />}
                  label={categoryName(x.id)}
                  onClick={() => {
                    const keep = d.cat === x.id
                    set({ cat: x.id, sub: keep ? d.sub : null, auto: false, ...(d.nameTouched ? {} : { name: categoryName(keep ? (d.sub ?? x.id) : x.id) }) })
                    go(1)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {step === SUB && d.cat && (
          <>
            <StepQuestion text={fill(t('bud.q.sub'), categoryName(d.cat))} hint={t('bud.q.subHint')} />
            <div className="flex flex-col gap-2" role="radiogroup">
              {[{ id: null as string | null, name: t('bud.allSubs') }, ...childCategories(d.cat, false).map((c) => ({ id: c.id as string | null, name: categoryName(c.id) }))].map((x) => (
                <StepChoiceRow
                  key={x.id ?? 'all'}
                  label={x.name}
                  on={d.sub === x.id}
                  leading={<CategoryMark category={x.id ?? d.cat!} box={32} />}
                  onClick={() => {
                    set({ sub: x.id, ...(d.nameTouched || !d.cat ? {} : { name: categoryName(x.id ?? d.cat) }) })
                    go(1)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {step === LIMIT && (
          <>
            <StepQuestion text={t('bud.q.limit')} />
            <AmountHero label={t('bud.limitLabel')} expr={d.limit} onExpr={(v) => set({ limit: v })} />
            <div className="mt-4">
              <Field label={t('bud.name')}>
                <input value={d.name} onChange={(e) => set({ name: e.target.value, nameTouched: e.target.value.trim().length > 0 })} placeholder={t(custom ? 'bud.ph.custom' : 'bud.ph.category')} className={`${inputClass} h-12 text-body font-semibold`} />
              </Field>
            </div>
            <div className="mt-4">
              <StepOptionGroup>
                <StepOptionRow icon={[...IC.cal]} label={t('step.row.period')} value={periodValue} onClick={() => setSub('period')} />
                {!custom && wallets.length > 1 && <StepOptionRow icon={[...IC.wallet]} label={t('step.row.wallets')} value={wl ? wl.join(', ') : t('bud.all')} onClick={() => setSub('wallets')} />}
              </StepOptionGroup>
            </div>
            <div className="mt-4">
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

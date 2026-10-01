import { fill, tr } from '@/lib/i18n/translations'
import { useState } from 'react'
import { PlanMark } from '@/components/v2/CategoryMark'
import {
  CancelButton,
  ConfirmDialog,
  DangerLink,
  DateInput,
  ErrorBox,
  Field,
  IC,
  Icon,
  Label,
  ModalFooter,
  ModalTitle,
  AmountField,
  PlanIconGrid,
  Pills,
  RadioRow,
  SaveButton,
  V2Modal,
  inputClass,
} from '@/components/v2/Kit'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { todayISO } from '@/lib/date'
import { shortWallet } from '@/lib/movimientos'
import { addSteps, longDate, monthYearLong, planText, shortDayMonth } from '@/lib/planCopy'
import { guessPlanIcon } from '@/lib/taxonomy'
import { goalService, type GoalPlanInput } from '@/services/goalService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { Goal, GoalPlan, Wallet } from '@/types'

interface PlanDraft {
  amount: string
  frequency: GoalPlan['frequency']
  accountId: string
  startDate: string
  endMode: GoalPlan['endMode']
  count: number
  endDate: string
  autoConfirm: boolean
}

const freqs = (): { value: GoalPlan['frequency']; label: string }[] => [
  { value: 'daily', label: tr('nm.freq.daily') },
  { value: 'weekly', label: tr('nm.freq.weekly') },
  { value: 'monthly', label: tr('nm.freq.monthly') },
]
const ends = (): { value: GoalPlan['endMode']; label: string }[] => [
  { value: 'goal', label: tr('goal.ends.goal') },
  { value: 'count', label: tr('nm.ends.count') },
  { value: 'date', label: tr('nm.ends.until') },
]

function planDraftOf(plan: GoalPlan): PlanDraft {
  return { amount: numStr(plan.amount), frequency: plan.frequency, accountId: plan.accountId, startDate: plan.startDate, endMode: plan.endMode, count: plan.count ?? 12, endDate: plan.endDate ?? '', autoConfirm: plan.autoConfirm }
}

function planInput(p: PlanDraft): GoalPlanInput {
  return {
    amount: evalExpr(p.amount),
    frequency: p.frequency,
    accountId: p.accountId,
    startDate: p.startDate || todayISO(),
    endMode: p.endMode,
    count: p.endMode === 'count' ? p.count : undefined,
    endDate: p.endMode === 'date' ? p.endDate : undefined,
    autoConfirm: p.autoConfirm,
  }
}

// PUT /goals/:id/plan restarts the schedule, so it's only sent on a change.
function samePlan(a: GoalPlan, b: GoalPlanInput): boolean {
  return (
    a.amount === b.amount &&
    a.frequency === b.frequency &&
    a.accountId === b.accountId &&
    a.startDate === b.startDate &&
    a.endMode === b.endMode &&
    (a.count ?? undefined) === b.count &&
    (a.endDate ?? undefined) === b.endDate &&
    a.autoConfirm === b.autoConfirm
  )
}

// Nueva / Editar meta — the Web v2 mockup's goal modal (gOpen): Nombre with
// the suggested icon, Icono, Monto objetivo · Monto inicial · Fecha
// objetivo, and the inline "Aporte periódico" section. PLANS.md §2–3.
export function GoalModal({ goal, wallets, onClose, onSaved }: { goal: Goal | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'other')
  const [iconAuto, setIconAuto] = useState(!goal)
  const [target, setTarget] = useState(goal ? numStr(goal.targetAmount) : '')
  const [initial, setInitial] = useState(goal?.initialAmount ? numStr(goal.initialAmount) : '')
  const [due, setDue] = useState(goal?.targetDate ?? '')
  const [plan, setPlanState] = useState<PlanDraft | null>(goal?.plan ? planDraftOf(goal.plan) : null)
  const [planOpen, setPlanOpen] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const valid = !!name.trim() && evalExpr(target) > 0
  const walletName = (id: string) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')
  const clear = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setErr('')
  }

  const pl: PlanDraft = plan ?? { amount: '', frequency: 'monthly', accountId: wallets[0]?.id ?? '', startDate: todayISO(), endMode: 'goal', count: 12, endDate: '', autoConfirm: false }
  const plSet = (p: Partial<PlanDraft>) => {
    setPlanState({ ...pl, ...p })
    setErr('')
  }
  const amt = evalExpr(pl.amount)
  const current = goal ? goal.currentAmount : evalExpr(initial)
  let summary = ''
  if (planOpen && amt > 0) {
    const start = pl.startDate || todayISO()
    if (pl.endMode === 'goal') {
      const k = Math.max(1, Math.ceil(Math.max(0, evalExpr(target) - current) / amt))
      const { month, year } = monthYearLong(addSteps(start, pl.frequency, k - 1))
      summary = fill(tr('goal.sum.goal'), k, format(amt), month, year)
    } else if (pl.endMode === 'count') summary = fill(tr('goal.sum.count'), pl.count, format(pl.count * amt), shortDayMonth(addSteps(start, pl.frequency, pl.count - 1)))
    else summary = fill(tr('goal.sum.date'), format(amt), pl.endDate ? longDate(pl.endDate) : '…')
  }

  const planRow = plan && evalExpr(plan.amount) > 0 ? planText({ ...planInput(plan), nextDate: '', doneCount: 0, active: true, due: false }, walletName(plan.accountId), format) : tr('goal.plan.empty')

  const onName = (v: string) => {
    setName(v)
    setErr('')
    if (iconAuto) setIcon(guessPlanIcon(v) ?? 'other')
  }

  const save = async () => {
    if (!valid) return setErr(tr(!name.trim() ? 'goal.err.name' : 'goal.err.target'))
    const input = { name: name.trim(), icon, targetAmount: evalExpr(target), initialAmount: evalExpr(initial), targetDate: due || null }
    const nextPlan = plan && evalExpr(plan.amount) > 0 && plan.accountId ? planInput(plan) : null
    setBusy(true)
    try {
      const saved = goal ? await goalService.updateGoal(goal.id, input) : await goalService.createGoal(input)
      let next = saved.plan?.nextDate
      if (nextPlan && !(goal?.plan && samePlan(goal.plan, nextPlan))) next = (await goalService.setPlan(saved.id, nextPlan)).plan?.nextDate
      else if (!nextPlan && goal?.plan) await goalService.removePlan(saved.id)
      showToast(nextPlan && next ? fill(tr('goal.toast.savedNext'), shortDayMonth(next)) : tr('goal.toast.saved'), 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('common.saveError'))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!goal) return
    setConfirming(false)
    try {
      await goalService.deleteGoal(goal.id, goal.currentAmount > 0 ? 'origin' : undefined)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('common.deleteError'))
    }
  }

  const title = tr(goal ? 'goal.edit' : 'goal.new')
  return (
    <V2Modal width={520} onClose={onClose} label={title}>
      <ModalTitle>{title}</ModalTitle>

      <Field label={tr('bud.name')} note={tr(iconAuto && guessPlanIcon(name) ? 'bud.note.iconGuess' : 'goal.note.iconPick')}>
        <div className="flex items-center gap-2.5">
          <PlanMark icon={icon} box={38} />
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder={tr('goal.namePh')} className={`${inputClass} flex-1`} />
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <Label>{tr('bud.icon')}</Label>
        <PlanIconGrid
          value={icon}
          onPick={(k) => {
            setIcon(k)
            setIconAuto(false)
            setErr('')
          }}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
        <Field label={tr('goal.target')}>
          <AmountField expr={target} onExpr={clear(setTarget)} label={tr('goal.targetLabel')} />
        </Field>
        <Field label={tr('goal.initial')}>
          <AmountField expr={initial} onExpr={clear(setInitial)} label={tr('goal.initialLabel')} />
        </Field>
        <Field label={tr('goal.date')}>
          <DateInput value={due} onChange={clear(setDue)} />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!planOpen && !plan) setPlanState(pl)
          setPlanOpen(!planOpen)
        }}
        className="flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left"
        style={{ borderColor: plan ? 'var(--v2-accent-line)' : 'var(--v2-line2)', background: plan ? 'color-mix(in srgb, var(--v2-accent) 8%, transparent)' : 'transparent' }}
      >
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-v2-accent/16">
          <Icon paths={IC.repeat} size={16} color="var(--v2-accent2)" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body-sm font-semibold">{tr('goal.plan')}</div>
          <div className="font-numeric mt-0.5 text-caption text-ink-secondary">{planRow}</div>
        </div>
      </button>

      {planOpen && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border-input bg-surface-sunken p-3.5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
            <Field label={tr('goal.plan.amount')}>
              <AmountField expr={pl.amount} onExpr={(v) => plSet({ amount: v })} label={tr('goal.plan.amountLabel')} />
            </Field>
            <Field label={tr('goal.plan.starts')}>
              <DateInput value={pl.startDate} onChange={(v) => plSet({ startDate: v })} />
            </Field>
          </div>
          <Field label={tr('goal.plan.freq')}>
            <Pills options={freqs()} value={pl.frequency} onChange={(v) => plSet({ frequency: v })} />
          </Field>
          <Field label={tr('goal.fromWallet')}>
            <Pills options={wallets.map((w) => ({ value: w.id, label: shortWallet(w.name) }))} value={pl.accountId} onChange={(v) => plSet({ accountId: v })} />
          </Field>
          <Field label={tr('nm.ends')}>
            <Pills options={ends()} value={pl.endMode} onChange={(v) => plSet({ endMode: v })} />
            {pl.endMode === 'count' && (
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => plSet({ count: Math.max(1, pl.count - 1) })} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-input text-title-sm font-semibold">
                  −
                </button>
                <div className="font-numeric flex-1 text-center text-title-sm font-semibold">{fill(tr('goal.nContributions'), pl.count)}</div>
                <button type="button" onClick={() => plSet({ count: Math.min(120, pl.count + 1) })} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border-input text-title-sm font-semibold">
                  +
                </button>
              </div>
            )}
            {pl.endMode === 'date' && <DateInput value={pl.endDate} onChange={(v) => plSet({ endDate: v })} />}
          </Field>
          <Field label={tr('nm.eachDate')}>
            <div className="flex flex-col gap-2">
              {(
                [
                  [false, tr('nm.ask'), tr('goal.ask.detail')],
                  [true, tr('goal.auto'), tr('goal.auto.detail')],
                ] as const
              ).map(([auto, text, detail]) => (
                <RadioRow key={text} on={pl.autoConfirm === auto} onClick={() => plSet({ autoConfirm: auto })}>
                  <div className="text-body-sm font-semibold">{text}</div>
                  <div className="mt-0.5 text-caption leading-[1.4] text-ink-secondary">{detail}</div>
                </RadioRow>
              ))}
            </div>
          </Field>
          {summary && <div className="font-numeric rounded-[12px] bg-v2-accent/12 px-3 py-2.5 text-body-sm font-semibold leading-[1.45]">{summary}</div>}
          <button
            type="button"
            onClick={() => {
              setPlanState(null)
              setPlanOpen(false)
            }}
            className="cursor-pointer self-start text-body-sm font-semibold text-negative"
          >
            {tr('goal.plan.remove')}
          </button>
        </div>
      )}

      {err && <ErrorBox>{err}</ErrorBox>}

      <ModalFooter left={goal && <DangerLink onClick={() => setConfirming(true)}>{tr('goal.delete')}</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>

      {confirming && goal && (
        <ConfirmDialog
          title={fill(tr('goal.delete.title'), goal.name)}
          lines={[fill(tr('goal.delete.saved'), format(goal.currentAmount), format(goal.targetAmount)), ...(goal.plan ? [tr('goal.delete.plan')] : []), tr('goal.delete.money')]}
          ack={tr('goal.delete.ack')}
          cta={tr('goal.delete')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </V2Modal>
  )
}

// "Abonar" — the mockup's gPay modal: a one-off contribution from a wallet.
export function GoalPayModal({ goal, wallets, onClose, onSaved }: { goal: Goal; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(wallets[0]?.id ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = evalExpr(amount) > 0 && !!accountId

  const confirm = async () => {
    if (!ok || busy) return
    setBusy(true)
    try {
      await goalService.contribute(goal.id, { amount: evalExpr(amount), accountId, date: todayISO() })
      showToast(fill(tr('goal.pay.toast'), format(evalExpr(amount)), goal.name, shortWallet(wallets.find((w) => w.id === accountId)?.name ?? '')), 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('goal.pay.err'))
      setBusy(false)
    }
  }

  return (
    <V2Modal width={420} onClose={onClose} label={fill(tr('goal.pay.title'), goal.name)}>
      <div className="flex items-center gap-3">
        <PlanMark icon={goal.icon} box={38} />
        <div className="min-w-0 flex-1">
          <div className="text-title-sm font-semibold">{fill(tr('goal.pay.title'), goal.name)}</div>
          <div className="font-numeric mt-[3px] text-caption leading-[1.45] text-ink-secondary">
            {fill(tr('goal.pay.sub'), format(goal.currentAmount), format(goal.targetAmount))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{tr('goal.pay.amount')}</Label>
        <AmountField
          expr={amount}
          onExpr={(v) => {
            setAmount(v)
            setErr('')
          }}
          height={46}
          fontSize={16}
          label={tr('goal.pay.amountLabel')}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{tr('goal.fromWallet')}</Label>
        <Pills options={wallets.map((w) => ({ value: w.id, label: shortWallet(w.name) }))} value={accountId} onChange={setAccountId} />
      </div>
      {err && <ErrorBox>{err}</ErrorBox>}
      <div className="flex justify-end gap-2.5">
        <CancelButton onClick={onClose} />
        <button
          type="button"
          onClick={() => void confirm()}
          className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-body-sm font-semibold"
          style={{ cursor: ok ? 'pointer' : 'not-allowed', color: ok ? '#fff' : 'var(--v2-dim)', background: ok ? 'var(--v2-accent)' : 'var(--v2-surface2)' }}
        >
          {tr('goal.pay')}
        </button>
      </div>
    </V2Modal>
  )
}

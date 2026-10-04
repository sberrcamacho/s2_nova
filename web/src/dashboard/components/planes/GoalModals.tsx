import { fill, tr } from '@/lib/i18n/translations'
import { useState } from 'react'
import { PlanMark } from '@/components/v2/CategoryMark'
import { AmountField, CancelButton, ConfirmDialog, DateInput, ErrorBox, Field, Flat, IC, Label, Pills, RadioRow, V2Modal } from '@/components/v2/Kit'
import { AmountHero, ChoiceCard, PlanIconPicker, StepDeleteButton, StepModal, StepNote, StepQuestion } from '@/components/v2/Steps'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { todayISO } from '@/lib/date'
import { shortWallet } from '@/lib/movimientos'
import { addSteps, longDate, monthYearLong, shortDayMonth } from '@/lib/planCopy'
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

// Nueva / Editar meta in guided steps, like Android: name and icon, the
// amounts and target date, then how to save (by hand or with a recurring
// contribution). Editing opens on the last step. PLANS.md §2–3.
export function GoalModal({ goal, wallets, onClose, onSaved }: { goal: Goal | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'other')
  const [iconAuto, setIconAuto] = useState(!goal)
  const [target, setTarget] = useState(goal ? numStr(goal.targetAmount) : '')
  const [initial, setInitial] = useState(goal?.initialAmount ? numStr(goal.initialAmount) : '')
  const [due, setDue] = useState(goal?.targetDate ?? '')
  const [planOn, setPlanOn] = useState(!!goal?.plan)
  const [pl, setPl] = useState<PlanDraft>(() =>
    goal?.plan ? planDraftOf(goal.plan) : { amount: '', frequency: 'monthly', accountId: wallets[0]?.id ?? '', startDate: todayISO(), endMode: 'goal', count: 12, endDate: '', autoConfirm: false },
  )
  const [step, setStep] = useState(goal ? 2 : 0)
  const [direction, setDirection] = useState<'next' | 'back'>('next')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const clear = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setErr('')
  }
  const plSet = (p: Partial<PlanDraft>) => {
    setPl({ ...pl, ...p })
    setErr('')
  }
  const go = (delta: number) => {
    setDirection(delta > 0 ? 'next' : 'back')
    setStep(step + delta)
  }

  const amt = evalExpr(pl.amount)
  const current = goal ? goal.currentAmount : evalExpr(initial)
  const planValid = !planOn || (amt > 0 && !!pl.accountId)
  const stepValid = step === 0 ? !!name.trim() : step === 1 ? !!name.trim() && evalExpr(target) > 0 : !!name.trim() && evalExpr(target) > 0 && planValid
  let summary = ''
  if (planOn && amt > 0) {
    const start = pl.startDate || todayISO()
    if (pl.endMode === 'goal') {
      const k = Math.max(1, Math.ceil(Math.max(0, evalExpr(target) - current) / amt))
      const { month, year } = monthYearLong(addSteps(start, pl.frequency, k - 1))
      summary = fill(tr('goal.sum.goal'), k, format(amt), month, year)
    } else if (pl.endMode === 'count') summary = fill(tr('goal.sum.count'), pl.count, format(pl.count * amt), shortDayMonth(addSteps(start, pl.frequency, pl.count - 1)))
    else summary = fill(tr('goal.sum.date'), format(amt), pl.endDate ? longDate(pl.endDate) : '…')
  }

  const onName = (v: string) => {
    setName(v)
    setErr('')
    if (iconAuto) setIcon(guessPlanIcon(v) ?? 'other')
  }

  const save = async () => {
    if (!stepValid || busy) return
    const input = { name: name.trim(), icon, targetAmount: evalExpr(target), initialAmount: evalExpr(initial), targetDate: due || null }
    const nextPlan = planOn ? planInput(pl) : null
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
    <>
      <StepModal
        title={title}
        context={goal?.name}
        step={step}
        stepCount={3}
        direction={direction}
        onBack={() => go(-1)}
        onClose={onClose}
        primaryLabel={tr(step < 2 ? 'step.continue' : goal ? 'step.saveChanges' : 'goal.save')}
        primaryEnabled={stepValid}
        busy={busy}
        onPrimary={() => (step < 2 ? go(1) : void save())}
        footer={goal && <StepDeleteButton onClick={() => setConfirming(true)}>{tr('goal.delete')}</StepDeleteButton>}
      >
        {step === 0 && (
          <>
            <StepQuestion text={tr('goal.q.name')} />
            <Field label={tr('bud.name')} note={tr(iconAuto && guessPlanIcon(name) ? 'bud.note.iconGuess' : 'goal.note.iconPick')}>
              <div className="flex h-14 items-center gap-2.5 rounded-[10px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
                <PlanMark icon={icon} box={40} />
                <input
                  autoFocus
                  value={name}
                  aria-label={tr('bud.name')}
                  onChange={(e) => onName(e.target.value)}
                  placeholder={tr('goal.namePh')}
                  className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary"
                />
              </div>
            </Field>
            <div className="mt-5 flex flex-col gap-2">
              <Label>{tr('bud.icon')}</Label>
              <PlanIconPicker
                value={icon}
                onPick={(k) => {
                  setIcon(k)
                  setIconAuto(false)
                }}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepQuestion text={tr('goal.q.amount')} hint={tr('goal.q.amountHint')} />
            <AmountHero label={tr('goal.target')} expr={target} onExpr={clear(setTarget)} />
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
              <Field label={tr('goal.initial')}>
                <AmountField expr={initial} onExpr={clear(setInitial)} label={tr('goal.initialLabel')} height={48} fontSize={16} />
              </Field>
              <Field label={tr('goal.dateOptional')}>
                <DateInput value={due} onChange={clear(setDue)} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepQuestion text={tr('goal.q.plan')} hint={tr('goal.q.planHint')} />
            <div className="flex flex-col gap-3" role="radiogroup">
              <ChoiceCard icon={[...IC.wallet]} title={tr('goal.choice.manual')} detail={tr('goal.choice.manualDetail')} on={!planOn} onClick={() => setPlanOn(false)} />
              <ChoiceCard icon={[...IC.repeat]} title={tr('goal.plan')} detail={tr('goal.choice.planDetail')} on={planOn} onClick={() => setPlanOn(true)} />
            </div>
            {planOn && (
              <>
                <div className="mt-5">
                  <AmountHero label={tr('goal.plan.amount')} expr={pl.amount} onExpr={(v) => plSet({ amount: v })} />
                </div>
                <div className="mt-5">
                  <Field label={tr('goal.plan.freq')}>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {freqs().map((f) => (
                        <Flat key={f.value} role="radio" on={pl.frequency === f.value} onClick={() => plSet({ frequency: f.value })}>
                          {f.label}
                        </Flat>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
                  <Field label={tr('goal.plan.starts')}>
                    <DateInput value={pl.startDate} onChange={(v) => plSet({ startDate: v })} />
                  </Field>
                </div>
                <div className="mt-5">
                  <Field label={tr('goal.fromWallet')}>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {wallets.map((w) => (
                        <Flat key={w.id} role="radio" on={pl.accountId === w.id} onClick={() => plSet({ accountId: w.id })}>
                          {shortWallet(w.name)}
                        </Flat>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="mt-5">
                  <Field label={tr('nm.ends')}>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {ends().map((e) => (
                        <Flat key={e.value} role="radio" on={pl.endMode === e.value} onClick={() => plSet({ endMode: e.value })}>
                          {e.label}
                        </Flat>
                      ))}
                    </div>
                    {pl.endMode === 'count' && (
                      <div className="flex items-center gap-2.5">
                        <button type="button" aria-label="−1" onClick={() => plSet({ count: Math.max(1, pl.count - 1) })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border-input text-title-sm font-semibold">
                          −
                        </button>
                        <div className="font-numeric flex-1 text-center text-title-sm font-semibold">{fill(tr('goal.nContributions'), pl.count)}</div>
                        <button type="button" aria-label="+1" onClick={() => plSet({ count: Math.min(120, pl.count + 1) })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border-input text-title-sm font-semibold">
                          +
                        </button>
                      </div>
                    )}
                    {pl.endMode === 'date' && <DateInput value={pl.endDate} onChange={(v) => plSet({ endDate: v })} />}
                  </Field>
                </div>
                <div className="mt-5">
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
                </div>
                {summary && (
                  <div className="mt-5">
                    <StepNote>{summary}</StepNote>
                  </div>
                )}
              </>
            )}
            {err && (
              <div className="mt-3">
                <ErrorBox>{err}</ErrorBox>
              </div>
            )}
          </>
        )}
      </StepModal>

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
    </>
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
      <AmountHero
        label={tr('goal.pay.amount')}
        expr={amount}
        onExpr={(v) => {
          setAmount(v)
          setErr('')
        }}
      />
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

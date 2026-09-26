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
  MoneyInput,
  PlanIconGrid,
  Pills,
  RadioRow,
  SaveButton,
  V2Modal,
  inputClass,
} from '@/components/v2/Kit'
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

const FREQS: { value: GoalPlan['frequency']; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]
const ENDS: { value: GoalPlan['endMode']; label: string }[] = [
  { value: 'goal', label: 'Al cumplir la meta' },
  { value: 'count', label: 'Después de' },
  { value: 'date', label: 'En una fecha' },
]

function planDraftOf(plan: GoalPlan): PlanDraft {
  return { amount: String(plan.amount), frequency: plan.frequency, accountId: plan.accountId, startDate: plan.startDate, endMode: plan.endMode, count: plan.count ?? 12, endDate: plan.endDate ?? '', autoConfirm: plan.autoConfirm }
}

function planInput(p: PlanDraft): GoalPlanInput {
  return {
    amount: Number(p.amount),
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
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '')
  const [initial, setInitial] = useState(goal?.initialAmount ? String(goal.initialAmount) : '')
  const [due, setDue] = useState(goal?.targetDate ?? '')
  const [plan, setPlanState] = useState<PlanDraft | null>(goal?.plan ? planDraftOf(goal.plan) : null)
  const [planOpen, setPlanOpen] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const valid = !!name.trim() && Number(target) > 0
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
  const amt = Number(pl.amount) || 0
  const current = goal ? goal.currentAmount : Number(initial) || 0
  let summary = ''
  if (planOpen && amt > 0) {
    const start = pl.startDate || todayISO()
    if (pl.endMode === 'goal') {
      const k = Math.max(1, Math.ceil(Math.max(0, (Number(target) || 0) - current) / amt))
      const { month, year } = monthYearLong(addSteps(start, pl.frequency, k - 1))
      summary = `Con ${k} aportes de ${format(amt)} cumples la meta hacia ${month} de ${year}.`
    } else if (pl.endMode === 'count') summary = `${pl.count} aportes · ${format(pl.count * amt)} en total · último el ${shortDayMonth(addSteps(start, pl.frequency, pl.count - 1))}`
    else summary = `Aportes de ${format(amt)} hasta el ${pl.endDate ? longDate(pl.endDate) : '…'}`
  }

  const planRow = plan && Number(plan.amount) > 0 ? planText({ ...planInput(plan), nextDate: '', doneCount: 0, active: true, due: false }, walletName(plan.accountId), format) : 'Agrega un aporte automático o con recordatorio'

  const onName = (v: string) => {
    setName(v)
    setErr('')
    if (iconAuto) setIcon(guessPlanIcon(v) ?? 'other')
  }

  const save = async () => {
    if (!valid) return setErr(!name.trim() ? 'Escribe un nombre para la meta.' : 'Escribe el monto objetivo.')
    const input = { name: name.trim(), icon, targetAmount: Number(target), initialAmount: Number(initial) || 0, targetDate: due || null }
    const nextPlan = plan && Number(plan.amount) > 0 && plan.accountId ? planInput(plan) : null
    setBusy(true)
    try {
      const saved = goal ? await goalService.updateGoal(goal.id, input) : await goalService.createGoal(input)
      let next = saved.plan?.nextDate
      if (nextPlan && !(goal?.plan && samePlan(goal.plan, nextPlan))) next = (await goalService.setPlan(saved.id, nextPlan)).plan?.nextDate
      else if (!nextPlan && goal?.plan) await goalService.removePlan(saved.id)
      showToast(nextPlan && next ? `Meta guardada. Próximo aporte el ${shortDayMonth(next)}` : 'Meta guardada', 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
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
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  const title = goal ? 'Editar meta' : 'Nueva meta'
  return (
    <V2Modal width={520} onClose={onClose} label={title}>
      <ModalTitle>{title}</ModalTitle>

      <Field label="NOMBRE" note={iconAuto && guessPlanIcon(name) ? 'Icono sugerido por el nombre. Elige otro abajo si quieres.' : 'Elige un icono para reconocer la meta de un vistazo.'}>
        <div className="flex items-center gap-2.5">
          <PlanMark icon={icon} box={38} />
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Viaje a Perú, portátil nuevo…" className={`${inputClass} flex-1`} />
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <Label>ICONO</Label>
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
        <Field label="MONTO OBJETIVO">
          <MoneyInput digits={target} onDigits={clear(setTarget)} />
        </Field>
        <Field label="MONTO INICIAL">
          <MoneyInput digits={initial} onDigits={clear(setInitial)} />
        </Field>
        <Field label="FECHA OBJETIVO">
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
        style={{ borderColor: plan ? 'var(--v2-accent)' : 'var(--v2-line2)', background: plan ? 'rgba(108,92,231,.08)' : 'transparent' }}
      >
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[rgba(108,92,231,.16)]">
          <Icon paths={IC.repeat} size={16} color="var(--v2-accent2)" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold">Aporte periódico</div>
          <div className="font-numeric mt-0.5 text-[11px] text-v2-dim">{planRow}</div>
        </div>
      </button>

      {planOpen && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-v2-line2 bg-v2-surface2 p-3.5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
            <Field label="MONTO DE CADA APORTE">
              <MoneyInput digits={pl.amount} onDigits={(v) => plSet({ amount: v })} />
            </Field>
            <Field label="EMPIEZA">
              <DateInput value={pl.startDate} onChange={(v) => plSet({ startDate: v })} />
            </Field>
          </div>
          <Field label="FRECUENCIA">
            <Pills options={FREQS} value={pl.frequency} onChange={(v) => plSet({ frequency: v })} />
          </Field>
          <Field label="DESDE QUÉ BILLETERA">
            <Pills options={wallets.map((w) => ({ value: w.id, label: shortWallet(w.name) }))} value={pl.accountId} onChange={(v) => plSet({ accountId: v })} />
          </Field>
          <Field label="TERMINA">
            <Pills options={ENDS} value={pl.endMode} onChange={(v) => plSet({ endMode: v })} />
            {pl.endMode === 'count' && (
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => plSet({ count: Math.max(1, pl.count - 1) })} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                  −
                </button>
                <div className="font-numeric flex-1 text-center text-[14px] font-extrabold">{pl.count} aportes</div>
                <button type="button" onClick={() => plSet({ count: Math.min(120, pl.count + 1) })} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                  +
                </button>
              </div>
            )}
            {pl.endMode === 'date' && <DateInput value={pl.endDate} onChange={(v) => plSet({ endDate: v })} />}
          </Field>
          <Field label="EN CADA FECHA">
            <div className="flex flex-col gap-2">
              {(
                [
                  [false, 'Pedirme confirmación', 'Te llega una alerta y confirmas cada aporte.'],
                  [true, 'Automático', 'Se descuenta de la billetera en cada fecha y te avisamos.'],
                ] as const
              ).map(([auto, text, detail]) => (
                <RadioRow key={text} on={pl.autoConfirm === auto} onClick={() => plSet({ autoConfirm: auto })}>
                  <div className="text-[12.5px] font-bold">{text}</div>
                  <div className="mt-0.5 text-[11px] leading-[1.4] text-v2-dim">{detail}</div>
                </RadioRow>
              ))}
            </div>
          </Field>
          {summary && <div className="font-numeric rounded-[12px] bg-[rgba(108,92,231,.12)] px-3 py-2.5 text-[12px] font-semibold leading-[1.45]">{summary}</div>}
          <button
            type="button"
            onClick={() => {
              setPlanState(null)
              setPlanOpen(false)
            }}
            className="cursor-pointer self-start text-[12px] font-bold text-v2-neg"
          >
            Quitar aporte periódico
          </button>
        </div>
      )}

      {err && <ErrorBox>{err}</ErrorBox>}

      <ModalFooter left={goal && <DangerLink onClick={() => setConfirming(true)}>Eliminar meta</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>

      {confirming && goal && (
        <ConfirmDialog
          title={`Eliminar la meta “${goal.name}”`}
          lines={[`${format(goal.currentAmount)} ahorrados de ${format(goal.targetAmount)}`, ...(goal.plan ? ['El aporte periódico se cancela'] : []), 'El dinero ahorrado vuelve a las billeteras de origen']}
          ack="Entiendo que la meta se elimina y su dinero vuelve a las billeteras de origen."
          cta="Eliminar meta"
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
  const ok = Number(amount) > 0 && !!accountId

  const confirm = async () => {
    if (!ok || busy) return
    setBusy(true)
    try {
      await goalService.contribute(goal.id, { amount: Number(amount), accountId, date: todayISO() })
      showToast(`Abono de ${format(Number(amount))} a ${goal.name} desde ${shortWallet(wallets.find((w) => w.id === accountId)?.name ?? '')}`, 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo registrar el abono.')
      setBusy(false)
    }
  }

  return (
    <V2Modal width={420} onClose={onClose} label={`Abonar a ${goal.name}`}>
      <div className="flex items-center gap-3">
        <PlanMark icon={goal.icon} box={38} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold">Abonar a {goal.name}</div>
          <div className="font-numeric mt-[3px] text-[11.5px] leading-[1.45] text-v2-dim">
            {format(goal.currentAmount)} de {format(goal.targetAmount)} · el abono queda registrado en la billetera de origen
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>MONTO DEL ABONO</Label>
        <div className="box-border flex h-[46px] items-center gap-1.5 rounded-[10px] border border-v2-line bg-v2-sidebar px-3.5">
          <span className="font-numeric text-[16px] font-extrabold text-v2-muted">$</span>
          <input
            autoFocus
            value={amount ? Number(amount).toLocaleString('es-CO') : ''}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, '').slice(0, 12))
              setErr('')
            }}
            inputMode="numeric"
            placeholder="0"
            className="font-numeric min-w-0 flex-1 border-none bg-transparent font-[inherit] text-[16px] font-extrabold text-v2-text outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>DESDE QUÉ BILLETERA</Label>
        <Pills options={wallets.map((w) => ({ value: w.id, label: shortWallet(w.name) }))} value={accountId} onChange={setAccountId} />
      </div>
      {err && <ErrorBox>{err}</ErrorBox>}
      <div className="flex justify-end gap-2.5">
        <CancelButton onClick={onClose} />
        <button
          type="button"
          onClick={() => void confirm()}
          className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-[12.5px] font-bold"
          style={{ cursor: ok ? 'pointer' : 'not-allowed', color: ok ? '#fff' : 'var(--v2-dim)', background: ok ? 'var(--v2-accent)' : 'var(--v2-surface2)' }}
        >
          Abonar
        </button>
      </div>
    </V2Modal>
  )
}

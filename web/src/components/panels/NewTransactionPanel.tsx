import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidePanel } from '@/components/panels/SidePanel'
import { CategoryMark, GlyphMark, PlanMark } from '@/components/v2/CategoryMark'
import { CancelButton, ErrorBox, Flat, GridCell, IC, Icon, OptionTile, RadioRow } from '@/components/v2/Kit'
import { AjSwitch } from '@/dashboard/components/ajustes/AjustesUi'
import { categoryColor, categoryGlyph, categoryLabel, categoryName, childCategories, isInCategory, parentCategories, useCategories } from '@/lib/backendCategories'
import { currencyInfo, formatMoney, referenceRate } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { shortWallet } from '@/lib/movimientos'
import {
  CALC,
  FREQS,
  FREQ_INTERVAL,
  MONTHS_LONG,
  OPS,
  RP_DEFAULT,
  addDays,
  evalExpr,
  fileSize,
  fmtDate,
  fmtDateLong,
  fmtExpr,
  hasOps,
  nextFirst,
  pressKey,
  repeatShort,
  repeatSummary,
  toneOf,
  typedExpr,
  type RepeatDraft,
} from '@/lib/nuevoMovimiento'
import { TAX_VIS } from '@/lib/taxonomy'
import { cn } from '@/lib/cn'
import { accountService } from '@/services/accountService'
import { currencyService, type UserCurrency } from '@/services/currencyService'
import { goalService } from '@/services/goalService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { CategoryId, CounterpartyKind, Goal, TransactionType, Wallet } from '@/types'

// "Nuevo movimiento" — the Web v2 mockup's side panel (NEW_MOVEMENT.md,
// WEB_PARITY.md): type, "Elige una categoría" (inline category grid), the
// amount hero with typed arithmetic and the Teclado/Calculadora switch,
// wallet, the automatic budget line, Título/Nota, and the five option
// tiles whose sections open inline. Saves through POST /transactions; the
// backend applies balances, PLANNED status, currency and Repetir.

type Section = 'cat' | 'when' | 'repeat' | 'attach' | 'from' | 'bpick' | 'more' | 'currency'

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
]

const FROM_KINDS: { label: string; kind: CounterpartyKind }[] = [
  { label: 'Empleador', kind: 'employer' },
  { label: 'Cliente', kind: 'client' },
  { label: 'Familia', kind: 'family' },
  { label: 'Amigo', kind: 'friend' },
  { label: 'Otro', kind: 'other' },
]

const SECTION_TITLE: Record<Section, string> = {
  cat: '',
  when: 'Fecha y hora',
  repeat: 'Repetir',
  attach: 'Adjuntar comprobante',
  from: '¿De quién recibiste el dinero?',
  bpick: 'Presupuesto personalizado',
  more: 'Más opciones',
  currency: 'Moneda del movimiento',
}

const ATTACH_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_ATTACH = 10 * 1024 * 1024

// Per-device preferences (NEW_MOVEMENT.md §3–4): the pad mode, the last
// manually chosen date/time ("Como el anterior") and the last wallet.
const PREFS = { calc: 'nm.calc', lastWhen: 'nm.lastWhen', wallet: 'nm.wallet' }
function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the preference just isn't remembered.
  }
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const fieldLabel = 'text-[11px] font-bold tracking-[.06em] text-v2-muted'
const textInput =
  'box-border h-[42px] w-full rounded-[10px] border border-v2-line bg-v2-sidebar px-3 font-[inherit] text-[13px] text-v2-text outline-none [color-scheme:dark]'

function SectionHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center">
      <div className="flex-1 text-[13px] font-extrabold">{title}</div>
      <button type="button" onClick={onAction} className="cursor-pointer text-[12px] font-bold text-v2-accent2">
        {action}
      </button>
    </div>
  )
}

function RowText({ label, detail }: { label: string; detail: string }) {
  return (
    <>
      <div className="text-[12.5px] font-bold">{label}</div>
      <div className="font-numeric mt-0.5 text-[11px] leading-[1.4] text-v2-dim">{detail}</div>
    </>
  )
}

function PillRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

export function NewTransactionPanel({ onClose }: { onClose: () => void }) {
  useCategories()
  const navigate = useNavigate()
  const { addTransaction, budgets, transactions } = useAppData()
  const { currency: principal, format, formatIn } = useCurrency()
  const { showToast } = useToast()
  const [today] = useState(todayISO)
  const [now] = useState(nowTime)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [currencies, setCurrencies] = useState<UserCurrency[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  const [type, setType] = useState<TransactionType>('expense')
  const [cat, setCat] = useState<CategoryId | null>(null)
  const [sub, setSub] = useState<CategoryId | null>(null)
  const [catDone, setCatDone] = useState(false)
  const [expr, setExpr] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState(now)
  const [repeat, setRepeat] = useState<RepeatDraft | null>(null)
  const [rpDraft, setRpDraft] = useState<RepeatDraft | null>(null)
  const [cur, setCur] = useState<string | null>(null)
  const [attach, setAttach] = useState<{ file: File; photo: boolean } | null>(null)
  const [from, setFrom] = useState('')
  const [fromKind, setFromKind] = useState<CounterpartyKind | null>(null)
  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [loan, setLoan] = useState(false)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [section, setSection] = useState<Section | null>(null)
  const [calc, setCalc] = useState(() => readPref(PREFS.calc) === '1')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const docInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    accountService
      .getWallets()
      .then((list) => {
        if (cancelled) return
        setWallets(list)
        const last = readPref(PREFS.wallet)
        const first = list.find((w) => w.id === last) ?? list[0]
        setWalletId(first?.id ?? null)
        setToId(list.find((w) => w.id !== first?.id)?.id ?? null)
      })
      .catch(() => !cancelled && setErr('No se pudieron cargar tus billeteras.'))
    currencyService
      .getMine()
      .then((list) => !cancelled && setCurrencies(list))
      .catch(() => undefined)
    goalService
      .getGoals()
      .then((list) => !cancelled && setGoals(list))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Every edit clears the error, as the mockup's nset() does.
  const edit =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      fn(...args)
      setErr('')
    }

  const isInc = type === 'income'
  const isTr = type === 'transfer'
  const wallet = wallets.find((w) => w.id === walletId)
  const walletName = wallet ? shortWallet(wallet.name) : ''
  const wcur = wallet?.currency ?? principal
  const code = cur ?? wcur
  const rateOf = (c: string) => currencies.find((x) => x.code === c)?.rate ?? referenceRate(c, principal)
  const rate = rateOf(code) / rateOf(wcur)
  const val = evalExpr(expr)
  const future = date > today || (date === today && time > now)
  const leaf = sub ?? cat
  const valid = (isTr || catDone) && val > 0
  const whenOn = !(date === today && time === now)
  const lastWhen = readPref(PREFS.lastWhen)?.split(' ') as [string, string] | undefined

  // Budget line (expenses): the category budget this expense counts in
  // and/or the custom one picked, with this expense added.
  const autoBudget = !isTr && !isInc && catDone ? budgets.find((b) => b.kind === 'category' && isInCategory(leaf, b.category) && (!b.walletIds.length || (walletId && b.walletIds.includes(walletId)))) : undefined
  const customs = budgets.filter((b) => b.kind === 'custom')
  const picked = !isInc && !isTr ? customs.find((b) => b.id === budgetId) : undefined
  const lineBudget = autoBudget ?? picked
  const budgetLabel = (b: (typeof budgets)[number]) => b.name || categoryName(b.category)
  let budgetLine: ReactNode = null
  if (lineBudget) {
    const add = future ? 0 : val * rateOf(code)
    const pct = lineBudget.limit > 0 ? Math.round(((lineBudget.spent + add) / lineBudget.limit) * 100) : 0
    const [tone, bg] = toneOf(pct)
    budgetLine = (
      <div className="flex items-center gap-3 rounded-[14px] border border-v2-line bg-v2-surface2 px-3 py-2.5">
        {lineBudget.kind === 'custom' ? <PlanMark icon={lineBudget.icon} box={32} /> : <CategoryMark category={lineBudget.category!} box={32} />}
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold">{'Suma a ' + budgetLabel(lineBudget) + (autoBudget && picked ? ' y a ' + picked.name : '')}</div>
          <div className="font-numeric mt-0.5 text-[11px] text-v2-dim">
            {(autoBudget ? 'Por la categoría · ' : 'Personalizado · ') +
              format(lineBudget.spent + add) +
              ' de ' +
              format(lineBudget.limit) +
              (future ? ' · cuenta cuando se registre' : val > 0 ? ' con este gasto' : '')}
          </div>
        </div>
        <span className="font-numeric flex-none rounded-full px-2 py-[3px] text-[11.5px] font-extrabold" style={{ color: tone, background: bg }}>
          {pct}%
        </span>
      </div>
    )
  }

  const pickType = edit((next: TransactionType) => {
    setType(next)
    setCat(null)
    setSub(null)
    setCatDone(false)
    setFrom('')
    setFromKind(null)
    setBudgetId(null)
    setSection(null)
  })

  const pickWallet = edit((id: string) => {
    setWalletId(id)
    if (id === toId) setToId(wallets.find((w) => w.id !== id)?.id ?? null)
  })

  const toggleSection = (k: Section) => setSection(section === k ? null : k)

  const takeFile = (file: File | undefined) => {
    if (!file) return
    if (!ATTACH_MIMES.includes(file.type)) return setErr('Usa un archivo PDF, JPG o PNG.')
    if (file.size > MAX_ATTACH) return setErr('El archivo supera los 10 MB.')
    setAttach({ file, photo: file.type !== 'application/pdf' })
    setErr('')
    setSection(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    takeFile(e.dataTransfer.files[0])
  }

  const options: { k: Section; label: string; on: boolean; icon: readonly string[] }[] = [
    { k: 'when', label: date === today ? (time === now ? 'Ahora' : 'Hoy ' + time) : fmtDate(date), on: whenOn, icon: future ? IC.cal : IC.clock },
    { k: 'repeat', label: repeatShort(repeat), on: !!repeat, icon: IC.repeat },
    { k: 'attach', label: attach ? '1 adjunto' : 'Adjuntar', on: !!attach, icon: IC.clip },
  ]
  if (isInc) options.push({ k: 'from', label: from || 'De', on: !!from, icon: IC.person })
  if (!isInc && !isTr) options.push({ k: 'bpick', label: picked ? picked.name! : 'Presupuesto', on: !!picked, icon: IC.target })
  if (!isTr) options.push({ k: 'more', label: 'Más', on: loan || !!goalId, icon: IC.more })

  const rp = rpDraft ?? repeat ?? RP_DEFAULT
  const rpSet = (patch: Partial<RepeatDraft>) => setRpDraft({ ...rp, ...patch })

  const recents = [...new Map(transactions.filter((t) => t.type === 'income' && !t.loanKind && t.counterpartyName).map((t) => [t.counterpartyName!, t.counterpartyKind ?? null])).entries()].slice(0, 3)

  const save = async () => {
    if (!valid) return setErr(!isTr && !catDone ? 'Elige una categoría.' : 'Escribe el monto.')
    if (!walletId) return setErr('Elige una billetera.')
    if (isTr && !toId) return setErr('Elige la billetera de destino.')
    setSaving(true)
    try {
      const created = await addTransaction({
        accountId: walletId,
        transferAccountId: isTr ? toId! : undefined,
        type,
        amount: val,
        currency: isTr ? undefined : code,
        category: isTr ? undefined : leaf!,
        description: title.trim(),
        note: note.trim() || undefined,
        date,
        time,
        customBudgetId: !isInc && !isTr ? (budgetId ?? undefined) : undefined,
        goalId: !isTr ? (goalId ?? undefined) : undefined,
        loanKind: loan && !isTr ? (isInc ? 'borrowed' : 'lent') : undefined,
        counterpartyName: isInc ? from.trim() || undefined : undefined,
        counterpartyKind: isInc && from.trim() ? (fromKind ?? undefined) : undefined,
        repeat: repeat?.freq
          ? {
              interval: FREQ_INTERVAL[repeat.freq],
              occurrences: repeat.endMode === 'count' ? repeat.count : undefined,
              endDate: repeat.endMode === 'until' && repeat.until ? repeat.until : undefined,
              autoConfirm: repeat.confirm === 'auto',
            }
          : undefined,
      })
      writePref(PREFS.wallet, walletId)
      if (whenOn) writePref(PREFS.lastWhen, `${date} ${time}`)
      if (attach) await transactionService.uploadAttachment(created.id, attach.file)
      showToast(future ? `Programado para el ${fmtDate(date)}. No afecta el saldo hasta entonces.` : 'Movimiento guardado', 'success')
      onClose()
      navigate('/movimientos')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar el movimiento. Intenta de nuevo.')
      setSaving(false)
    }
  }

  const ctypeIncome = isInc
  const subs = cat ? childCategories(cat, false) : []
  const saveLabel = future ? 'Programar movimiento' : repeat ? 'Guardar y repetir' : 'Guardar movimiento'

  return (
    <SidePanel
      title="Nuevo movimiento"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-[12.5px] font-bold"
            style={{ cursor: valid ? 'pointer' : 'not-allowed', color: valid ? '#fff' : 'var(--v2-dim)', background: valid ? 'var(--v2-accent)' : 'var(--v2-surface2)' }}
          >
            {saveLabel}
          </button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Tipo de movimiento" className="flex gap-1 rounded-[12px] border border-v2-line bg-v2-surface2 p-1">
        {TYPES.map((opt) => {
          const on = type === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pickType(opt.value)}
              className={cn(
                'flex-1 cursor-pointer rounded-[9px] py-2 text-center text-[12px] font-bold',
                on ? 'bg-v2-surface text-v2-text shadow-[0_1px_0_var(--v2-line2)]' : 'text-v2-dim',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {!isTr && section === 'cat' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center">
            <div className="flex-1 text-[15px] font-extrabold">{ctypeIncome ? '¿De dónde viene el ingreso?' : '¿En qué gastaste?'}</div>
            <button type="button" onClick={() => setSection(null)} className="cursor-pointer text-[12px] font-bold text-v2-accent2">
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {parentCategories(ctypeIncome, false).map((x) => (
              <GridCell
                key={x.id}
                on={cat === x.id}
                color={x.color}
                chip={<CategoryMark category={x.id} box={36} />}
                label={x.name}
                onClick={edit(() => {
                  setCat(x.id)
                  setSub(null)
                  if (!childCategories(x.id, false).length) {
                    setCatDone(true)
                    setSection(null)
                  }
                })}
              />
            ))}
          </div>
          {cat && subs.length > 0 && (
            <>
              <div className="mt-1.5 text-[11px] font-bold tracking-[.06em] text-v2-muted">{'Subcategoría de ' + categoryName(cat)}</div>
              <div className="grid grid-cols-5 gap-1">
                {[{ id: null as CategoryId | null, name: 'Ninguna' }, ...subs].map((x) => (
                  <GridCell
                    key={x.id ?? 'none'}
                    on={catDone && sub === x.id}
                    color={categoryColor(cat)}
                    chip={<GlyphMark paths={categoryGlyph(x.id ?? cat)} color={categoryColor(cat)} box={36} />}
                    label={x.name}
                    onClick={edit(() => {
                      setSub(x.id)
                      setCatDone(true)
                      setSection(null)
                    })}
                  />
                ))}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/ajustes')
            }}
            className="cursor-pointer self-start text-[11.5px] font-bold text-v2-accent2"
          >
            Gestionar categorías en Ajustes →
          </button>
        </div>
      )}

      {!isTr && section !== 'cat' && (
        <button
          type="button"
          onClick={() => setSection('cat')}
          className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-v2-line px-3 py-2.5 text-left hover:border-v2-line2"
        >
          {catDone && leaf ? <CategoryMark category={leaf} box={38} /> : <GlyphMark paths={TAX_VIS.other.glyph} color="var(--v2-dim)" box={38} />}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold tracking-[.1em] text-v2-dim">CATEGORÍA</div>
            <div className="mt-0.5 text-[13.5px] font-extrabold">{catDone && leaf ? categoryLabel(leaf) : 'Elige una categoría'}</div>
          </div>
          <span className="text-[12px] font-bold text-v2-accent2">Cambiar</span>
        </button>
      )}

      <div
        className="relative flex flex-col gap-2 overflow-hidden rounded-[18px] border border-[#2b2450] px-[18px] py-4 text-white"
        style={{ background: 'linear-gradient(150deg,var(--v2-hero-a) 0%,var(--v2-hero-b) 60%,var(--v2-hero-c) 100%)' }}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="nt-amount" className="flex-1 text-[10.5px] font-bold tracking-[.11em] text-[#a69dff]">
            MONTO
          </label>
          <button
            type="button"
            // 34px plus its 1px border (content-box in the mockup).
            title="Cambiar entre teclado y calculadora"
            onClick={() => {
              writePref(PREFS.calc, calc ? '0' : '1')
              setCalc(!calc)
            }}
            className="box-border flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-[11px] text-[11.5px] font-extrabold text-white"
            style={{ background: calc ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.1)', borderColor: calc ? '#fff' : 'transparent' }}
          >
            <Icon paths={IC.calc} size={14} color="#fff" />
            {calc ? 'Calculadora' : 'Teclado'}
          </button>
          <button
            type="button"
            onClick={() => toggleSection('currency')}
            className="flex h-[34px] cursor-pointer items-center gap-[5px] rounded-full bg-[rgba(255,255,255,.14)] px-3 text-[12px] font-extrabold text-white"
          >
            {code}
            <span className="text-[9px] opacity-70">▼</span>
          </button>
        </div>
        <input
          id="nt-amount"
          data-autofocus
          value={fmtExpr(expr)}
          onChange={(e) => edit(setExpr)(typedExpr(e.target.value))}
          placeholder="0"
          inputMode="decimal"
          className="w-full border-none bg-transparent px-0.5 py-px font-[inherit] text-[30px] [font-variant-numeric:tabular-nums] font-extrabold tracking-[-.02em] text-white outline-none"
        />
        {hasOps(expr) && <div className="font-numeric text-[15px] font-extrabold text-white">{'= ' + formatIn(val, code)}</div>}
        <div className="text-[11px] text-[rgba(255,255,255,.55)]">Puedes escribir operaciones: 150000+18500</div>
        {code !== wcur && (
          <div className="font-numeric text-[11.5px] text-[rgba(255,255,255,.8)]">
            {val > 0 ? `≈ ${formatIn(val * rate, wcur)} ${wcur} en ${walletName} · 1 ${code} = ${formatIn(rate, wcur)}` : `Se convierte a ${wcur} al guardar en ${walletName}`}
          </div>
        )}
        {future && (
          <div className="flex items-center gap-[7px] self-start whitespace-nowrap rounded-full bg-[rgba(240,180,41,.18)] px-[11px] py-[5px] text-[11px] font-extrabold text-[#f7cf6b]">
            <Icon paths={IC.cal} size={13} color="#f7cf6b" />
            {`PROGRAMADO · ${fmtDate(date)} · ${time}`}
          </div>
        )}
      </div>

      {calc && (
        <div className="grid grid-cols-4 gap-1.5">
          {CALC.map((k) => {
            const op = OPS.includes(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => edit(setExpr)(pressKey(expr, k))}
                className={cn(
                  'flex h-11 cursor-pointer select-none items-center justify-center rounded-[11px] border font-bold',
                  op
                    ? 'border-transparent bg-[rgba(108,92,231,.16)] text-[18px] text-v2-accent2'
                    : k === '='
                      ? 'row-span-2 h-auto border-transparent bg-[rgba(108,92,231,.32)] text-[20px] text-white'
                      : k === 'C' || k === '⌫'
                        ? 'border-v2-line bg-v2-surface2 text-[13px] font-extrabold text-v2-muted'
                        : 'border-v2-line bg-v2-surface2 text-[16px] text-v2-text',
                )}
              >
                {k}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className={fieldLabel}>{isInc ? 'BILLETERA QUE RECIBE' : isTr ? 'DESDE' : 'BILLETERA'}</div>
        <PillRow>
          {wallets.map((w) => (
            <Flat key={w.id} on={walletId === w.id} onClick={() => pickWallet(w.id)}>
              {shortWallet(w.name) + (w.currency !== principal ? ' · ' + w.currency : '')}
            </Flat>
          ))}
        </PillRow>
      </div>

      {isTr && (
        <div className="flex flex-col gap-2">
          <div className={fieldLabel}>TRANSFERIR A</div>
          <PillRow>
            {wallets
              .filter((w) => w.id !== walletId)
              .map((w) => (
                <Flat key={w.id} on={toId === w.id} onClick={edit(() => setToId(w.id))}>
                  {shortWallet(w.name)}
                </Flat>
              ))}
          </PillRow>
        </div>
      )}

      {budgetLine}

      <input value={title} onChange={(e) => edit(setTitle)(e.target.value.slice(0, 60))} placeholder="Título (opcional)" className={cn(textInput, 'font-bold placeholder:font-bold')} />
      <input value={note} onChange={(e) => edit(setNote)(e.target.value)} placeholder="Nota (opcional)" className={textInput} />

      <div className="grid grid-cols-5 gap-1.5">
        {options.map((o) => (
          <OptionTile
            key={o.k}
            icon={<Icon paths={o.icon} size={18} color={o.on || section === o.k ? 'var(--v2-accent2)' : 'var(--v2-muted)'} />}
            label={o.label}
            on={o.on}
            open={section === o.k}
            onClick={() => toggleSection(o.k)}
          />
        ))}
      </div>

      {section && section !== 'cat' && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-v2-line2 bg-v2-surface2 p-3.5">
          <SectionHead title={SECTION_TITLE[section]} action="Listo" onAction={() => setSection(null)} />

          {section === 'when' && (
            <>
              <PillRow>
                <Flat on={date === today && time === now} onClick={edit(() => (setDate(today), setTime(now)))}>
                  Ahora
                </Flat>
                {(
                  [
                    ['Ayer', addDays(today, -1)],
                    ['Anteayer', addDays(today, -2)],
                  ] as const
                ).map(([label, iso]) => (
                  <Flat key={label} on={date === iso && !(lastWhen && lastWhen[0] === iso && lastWhen[1] === time)} onClick={edit(() => setDate(iso))}>
                    {label}
                  </Flat>
                ))}
                {lastWhen && (
                  <Flat on={date === lastWhen[0] && time === lastWhen[1]} onClick={edit(() => (setDate(lastWhen[0]), setTime(lastWhen[1])))}>
                    {`Como el anterior · ${fmtDate(lastWhen[0])}, ${lastWhen[1]}`}
                  </Flat>
                )}
              </PillRow>
              <div className={fieldLabel}>PROGRAMAR A FUTURO</div>
              <PillRow>
                {(
                  [
                    ['Mañana', addDays(today, 1)],
                    ['En una semana', addDays(today, 7)],
                    [`1 de ${MONTHS_LONG[Number(nextFirst(today).slice(5, 7)) - 1]}`, nextFirst(today)],
                  ] as const
                ).map(([label, iso]) => (
                  <Flat key={label} on={date === iso} onClick={edit(() => setDate(iso))}>
                    {label}
                  </Flat>
                ))}
              </PillRow>
              <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
                <input type="date" aria-label="Fecha" value={date} onChange={(e) => edit(setDate)(e.target.value || today)} className={textInput} />
                <input type="time" aria-label="Hora" value={time} onChange={(e) => edit(setTime)(e.target.value || now)} className={textInput} />
              </div>
              <div
                className="rounded-[10px] text-[11.5px] leading-[1.45]"
                style={{ padding: future ? '9px 11px' : 0, color: future ? 'var(--v2-warn)' : 'var(--v2-dim)', background: future ? 'rgba(240,180,41,.12)' : 'transparent' }}
              >
                {future
                  ? 'Fecha futura: se guarda como programado y no afecta el saldo hasta que llegue la fecha y lo confirmes.'
                  : date < today
                    ? 'Fecha pasada: se registra con esa fecha y cuenta en el mes que corresponde.'
                    : 'Se registra con la fecha y hora de hoy.'}
              </div>
            </>
          )}

          {section === 'repeat' && (
            <>
              <div className="font-numeric text-[11.5px] text-v2-dim">{repeatSummary(rp.freq ? rp : null, date)}</div>
              <PillRow>
                <Flat on={!rp.freq} onClick={() => rpSet({ freq: null })}>
                  No se repite
                </Flat>
                {FREQS.map((f) => (
                  <Flat key={f} on={rp.freq === f} onClick={() => rpSet({ freq: f })}>
                    {f}
                  </Flat>
                ))}
              </PillRow>
              {rp.freq && (
                <>
                  <div className={fieldLabel}>TERMINA</div>
                  <PillRow>
                    {(
                      [
                        ['count', 'Después de'],
                        ['until', 'En una fecha'],
                        ['never', 'Sin fin'],
                      ] as const
                    ).map(([k, label]) => (
                      <Flat key={k} on={rp.endMode === k} onClick={() => rpSet({ endMode: k })}>
                        {label}
                      </Flat>
                    ))}
                  </PillRow>
                  {rp.endMode === 'count' && (
                    <div className="flex items-center gap-2.5">
                      <button type="button" aria-label="Menos" onClick={() => rpSet({ count: Math.max(2, rp.count - 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                        −
                      </button>
                      <div className="font-numeric flex-1 text-center text-[14px] font-extrabold">{rp.count + (rp.count === 1 ? ' vez' : ' veces')}</div>
                      <button type="button" aria-label="Más" onClick={() => rpSet({ count: Math.min(99, rp.count + 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                        +
                      </button>
                    </div>
                  )}
                  {rp.endMode === 'until' && <input type="date" aria-label="Termina el" value={rp.until} onChange={(e) => rpSet({ until: e.target.value })} className={textInput} />}
                  <div className="font-numeric text-[11.5px] text-v2-muted">{`Empieza ${date === today ? 'hoy' : 'el ' + fmtDateLong(date)} · ${time} (según Fecha y hora)`}</div>
                  <div className={fieldLabel}>EN CADA FECHA</div>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ['ask', 'Pedirme confirmación', 'Te avisamos en cada fecha. No mueve saldo hasta que confirmes.'],
                        ['auto', 'Registrar automáticamente', 'Se registra solo en cada fecha y te avisamos.'],
                      ] as const
                    ).map(([k, label, detail]) => (
                      <RadioRow key={k} on={rp.confirm === k} onClick={() => rpSet({ confirm: k })}>
                        <div className="text-[12.5px] font-bold">{label}</div>
                        <div className="mt-0.5 text-[11px] leading-[1.4] text-v2-dim">{detail}</div>
                      </RadioRow>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={edit(() => {
                  setRepeat(rp.freq ? rp : null)
                  setRpDraft(null)
                  setSection(null)
                })}
                className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-[9px] text-center text-[12.5px] font-bold text-white"
              >
                Aplicar
              </button>
            </>
          )}

          {section === 'currency' && (
            <>
              <div className="text-[11.5px] leading-[1.45] text-v2-dim">{`${walletName} está en ${wcur}. Si el movimiento fue en otra moneda, guardamos el monto original y lo convertimos.`}</div>
              <div className="flex flex-col gap-2">
                {(currencies.length ? currencies.map((c) => c.code) : [wcur]).map((c) => (
                  <RadioRow
                    key={c}
                    on={code === c}
                    onClick={edit(() => {
                      setCur(c === wcur ? null : c)
                      setSection(null)
                    })}
                    leading={
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(108,92,231,.16)] text-[11.5px] font-extrabold text-v2-accent2">{currencyInfo(c).symbol}</span>
                    }
                  >
                    <RowText label={`${currencyInfo(c).name} · ${c}`} detail={c === wcur ? `Moneda de ${walletName}` : `1 ${c} = ${formatMoney(rateOf(c) / rateOf(wcur), wcur)} ${wcur}`} />
                  </RadioRow>
                ))}
              </div>
            </>
          )}

          {section === 'attach' && (
            <>
              <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="rounded-[12px] border-[1.5px] border-dashed border-v2-line2 p-4 text-center text-[12px] text-v2-dim">
                Arrastra aquí el recibo o la factura
              </div>
              {(
                [
                  [IC.image, 'Subir foto o imagen', 'JPG o PNG de tu recibo', photoInput],
                  [IC.file, 'Subir PDF o documento', 'PDF, JPG o PNG · hasta 10 MB', docInput],
                ] as const
              ).map(([icon, label, detail, ref]) => (
                <button key={label} type="button" onClick={() => ref.current?.click()} className="flex cursor-pointer items-center gap-3 py-1 text-left">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(108,92,231,.2)]">
                    <Icon paths={icon} size={18} color="var(--v2-accent2)" />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-bold">{label}</div>
                    <div className="text-[11px] text-v2-dim">{detail}</div>
                  </div>
                </button>
              ))}
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => takeFile(e.target.files?.[0])} />
              <input ref={docInput} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => takeFile(e.target.files?.[0])} />
            </>
          )}

          {section === 'from' && (
            <>
              <input value={from} onChange={(e) => edit(setFrom)(e.target.value.slice(0, 40))} placeholder="Empresa, cliente o persona" className={textInput} />
              <div className={fieldLabel}>TIPO DE ORIGEN</div>
              <PillRow>
                {FROM_KINDS.map((k) => (
                  <Flat key={k.kind} on={fromKind === k.kind} onClick={() => setFromKind(fromKind === k.kind ? null : k.kind)}>
                    {k.label}
                  </Flat>
                ))}
              </PillRow>
              {recents.length > 0 && (
                <>
                  <div className={fieldLabel}>RECIENTES</div>
                  <PillRow>
                    {recents.map(([name, kind]) => (
                      <Flat key={name} on={from === name} onClick={edit(() => (setFrom(name), setFromKind(kind)))}>
                        {name}
                      </Flat>
                    ))}
                  </PillRow>
                </>
              )}
            </>
          )}

          {section === 'bpick' && (
            <>
              <div className="text-[11.5px] leading-[1.45] text-v2-dim">
                {autoBudget
                  ? `Este gasto ya suma a ${budgetLabel(autoBudget)} por su categoría. Elige un presupuesto personalizado si también cuenta ahí.`
                  : `Ningún presupuesto por categoría cubre ${cat ? categoryName(leaf) : 'este gasto'}. Puedes asignarlo a uno personalizado.`}
              </div>
              <div className="flex flex-col gap-2">
                <RadioRow on={budgetId === null} onClick={() => setBudgetId(null)}>
                  <RowText label="Ninguno" detail="Solo cuenta por su categoría" />
                </RadioRow>
                {customs.map((b) => (
                  <RadioRow key={b.id} on={budgetId === b.id} onClick={() => setBudgetId(b.id)} leading={<PlanMark icon={b.icon} box={32} />}>
                    <RowText label={b.name ?? ''} detail={`${format(b.spent)} de ${format(b.limit)}`} />
                  </RadioRow>
                ))}
              </div>
            </>
          )}

          {section === 'more' && (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold">{isInc ? 'Es dinero que me prestaron' : 'Es dinero que presté'}</div>
                  <div className="mt-0.5 text-[11px] text-v2-dim">Se registra en Planes › Préstamos con contraparte y vencimiento.</div>
                </div>
                <AjSwitch on={loan} label={isInc ? 'Es dinero que me prestaron' : 'Es dinero que presté'} onToggle={() => setLoan(!loan)} />
              </div>
              <div className={fieldLabel}>APORTE A UNA META</div>
              <PillRow>
                <Flat on={goalId === null} onClick={() => setGoalId(null)}>
                  Ninguna
                </Flat>
                {goals.map((g) => (
                  <Flat key={g.id} on={goalId === g.id} onClick={() => setGoalId(g.id)}>
                    {g.name}
                  </Flat>
                ))}
              </PillRow>
            </>
          )}
        </div>
      )}

      {attach && (
        <div className="flex items-center gap-3 rounded-[12px] border border-v2-line px-3 py-[9px]">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-v2-surface2">
            <Icon paths={attach.photo ? IC.image : IC.file} size={16} color="var(--v2-accent2)" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold">{attach.file.name}</div>
            <div className="text-[11px] text-v2-dim">{`${attach.photo ? 'Foto' : 'Documento'} · ${fileSize(attach.file.size)}`}</div>
          </div>
          <button type="button" aria-label="Quitar adjunto" onClick={() => setAttach(null)} className="cursor-pointer p-1 text-[13px] text-v2-dim">
            ✕
          </button>
        </div>
      )}

      {repeat && (
        <div className="flex items-center gap-2 text-[11.5px] text-v2-muted">
          <Icon paths={IC.repeat} size={13} color="var(--v2-dim)" />
          <span className="font-numeric">{`${repeatSummary(repeat, date)} · ${repeat.confirm === 'auto' ? 'automático' : 'con confirmación'}`}</span>
        </div>
      )}

      {err && <ErrorBox>{err}</ErrorBox>}
    </SidePanel>
  )
}

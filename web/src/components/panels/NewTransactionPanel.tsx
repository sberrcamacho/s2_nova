import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidePanel } from '@/components/panels/SidePanel'
import { CategoryMark, GlyphMark, PlanMark } from '@/components/v2/CategoryMark'
import { CancelButton, ErrorBox, Flat, GridCell, IC, Icon, OptionTile, RadioRow } from '@/components/v2/Kit'
import { AjSwitch } from '@/dashboard/components/ajustes/AjustesUi'
import { categoryColor, categoryGlyph, categoryLabel, categoryName, childCategories, isInCategory, parentCategories, parentOf, useCategories } from '@/lib/backendCategories'
import { currencyInfo, formatMoney, referenceRate } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { shortWallet } from '@/lib/movimientos'
import {
  CALC,
  FREQS,
  FREQ_INTERVAL,
  OPS,
  RP_DEFAULT,
  addDays,
  evalExpr,
  fileSize,
  fmtDate,
  fmtDateLong,
  fmtDayMonth,
  fmtExpr,
  freqLabel,
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
import { recurringService } from '@/services/recurringService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill, type TranslationKey } from '@/lib/i18n/translations'
import type { CategoryId, CounterpartyKind, Goal, NewTransactionInput, RecurringSeries, Transaction, TransactionType, Wallet } from '@/types'

// "Nuevo movimiento" — the Web v2 mockup's side panel (NEW_MOVEMENT.md,
// WEB_PARITY.md): type, "Elige una categoría" (inline category grid), the
// amount hero with typed arithmetic and the Teclado/Calculadora switch,
// wallet, the automatic budget line, Título/Nota, and the five option
// tiles whose sections open inline. Saves through POST /transactions; the
// backend applies balances, PLANNED status, currency and Repetir. With
// `editing` it is "Editar movimiento": every field starts from the movement
// — its Repetir from its series, its receipt — and saves with PATCH.

type Section = 'cat' | 'when' | 'repeat' | 'attach' | 'from' | 'bpick' | 'more' | 'currency'

const TYPES: TransactionType[] = ['expense', 'income', 'transfer']
const FROM_KINDS: CounterpartyKind[] = ['employer', 'client', 'family', 'friend', 'other']

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

// A movement's amount as the amount field's typed expression ("1500,5").
function exprOf(amount: number): string {
  return String(amount).replace('.', ',')
}

const FREQ_OF = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' } as const

// The Repetir draft a series stands for.
function repeatOf(series: RecurringSeries): RepeatDraft {
  return {
    freq: FREQ_OF[series.interval],
    endMode: series.occurrences ? 'count' : series.endDate ? 'until' : 'never',
    count: series.occurrences ?? RP_DEFAULT.count,
    until: series.endDate ?? '',
    confirm: series.autoConfirm ? 'auto' : 'ask',
  }
}

type AttachDraft = { file?: File; name: string; size: number; photo: boolean }

function PillRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

export function NewTransactionPanel({ onClose, editing }: { onClose: () => void; editing?: Transaction }) {
  useCategories()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addTransaction, budgets, transactions, notifyChanged, refresh: refreshAppData } = useAppData()
  const { currency: principal, format, formatIn } = useCurrency()
  const { showToast } = useToast()
  const [today] = useState(todayISO)
  const [now] = useState(nowTime)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [currencies, setCurrencies] = useState<UserCurrency[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  const e0 = editing
  const e0Parent = e0 && e0.type !== 'transfer' ? parentOf(e0.category)?.id : undefined
  const [type, setType] = useState<TransactionType>(e0?.type ?? 'expense')
  const [cat, setCat] = useState<CategoryId | null>(e0Parent ?? null)
  const [sub, setSub] = useState<CategoryId | null>(e0Parent && e0Parent !== e0?.category ? e0!.category : null)
  const [catDone, setCatDone] = useState(!!e0)
  const [expr, setExpr] = useState(e0 ? exprOf(e0.amount) : '')
  const [title, setTitle] = useState(e0?.description ?? '')
  const [note, setNote] = useState(e0?.note ?? '')
  const [date, setDate] = useState(e0?.date ?? today)
  const [time, setTime] = useState(e0?.time ?? now)
  const [repeat, setRepeat] = useState<RepeatDraft | null>(null)
  const [rpDraft, setRpDraft] = useState<RepeatDraft | null>(null)
  const [cur, setCur] = useState<string | null>(e0 && e0.type !== 'transfer' ? e0.currency : null)
  const [attach, setAttach] = useState<AttachDraft | null>(
    e0?.attachment ? { name: e0.attachment.name, size: e0.attachment.size, photo: e0.attachment.kind === 'image' } : null,
  )
  const [from, setFrom] = useState(e0?.counterpartyName ?? '')
  const [fromKind, setFromKind] = useState<CounterpartyKind | null>(e0?.counterpartyKind ?? null)
  const [budgetId, setBudgetId] = useState<string | null>(e0?.customBudgetId ?? null)
  const [loan, setLoan] = useState(!!e0?.loanKind)
  const [goalId, setGoalId] = useState<string | null>(e0?.goalId ?? null)
  const [walletId, setWalletId] = useState<string | null>(e0?.accountId ?? null)
  const [toId, setToId] = useState<string | null>(e0?.transferAccountId ?? null)
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
        if (editing) return
        const last = readPref(PREFS.wallet)
        const first = list.find((w) => w.id === last) ?? list[0]
        setWalletId(first?.id ?? null)
        setToId(list.find((w) => w.id !== first?.id)?.id ?? null)
      })
      .catch(() => !cancelled && setErr(t('nm.err.wallets')))
    currencyService
      .getMine()
      .then((list) => !cancelled && setCurrencies(list))
      .catch(() => undefined)
    goalService
      .getGoals()
      .then((list) => !cancelled && setGoals(list))
      .catch(() => undefined)
    // Editing keeps the movement's Repetir: it starts from its series.
    if (editing?.recurringSeriesId) {
      recurringService
        .getRecurringSeries()
        .then((list) => {
          const series = list.find((x) => x.id === editing.recurringSeriesId)
          if (!cancelled && series?.active) setRepeat(repeatOf(series))
        })
        .catch(() => undefined)
    }
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
  const valid = (isTr || catDone) && val > 0 && title.trim() !== ''
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
    // Editing: the budget already counts the saved movement, so only the change adds.
    const counted = editing && editing.status === 'completed' && editing.type === 'expense' ? editing.amount * rateOf(editing.currency) : 0
    const add = (future ? 0 : val * rateOf(code)) - counted
    const pct = lineBudget.limit > 0 ? Math.round(((lineBudget.spent + add) / lineBudget.limit) * 100) : 0
    const [tone, bg] = toneOf(pct)
    budgetLine = (
      <div className="flex items-center gap-3 rounded-[14px] border border-v2-line bg-v2-surface2 px-3 py-2.5">
        {lineBudget.kind === 'custom' ? <PlanMark icon={lineBudget.icon} box={32} /> : <CategoryMark category={lineBudget.category!} box={32} />}
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold">{autoBudget && picked ? fill(t('nm.budget.addsTwo'), budgetLabel(lineBudget), picked.name!) : fill(t('nm.budget.adds'), budgetLabel(lineBudget))}</div>
          <div className="font-numeric mt-0.5 text-[11px] text-v2-dim">
            {fill(t(autoBudget ? 'nm.budget.byCategory' : 'nm.budget.custom'), format(lineBudget.spent + add), format(lineBudget.limit)) +
              (future ? t('nm.budget.whenRecorded') : val > 0 ? t('nm.budget.withThis') : '')}
          </div>
        </div>
        <span className="font-numeric flex-none whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-extrabold" style={{ color: tone, background: bg }}>
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
    if (!ATTACH_MIMES.includes(file.type)) return setErr(t('nm.err.fileType'))
    if (file.size > MAX_ATTACH) return setErr(t('nm.err.fileSize'))
    setAttach({ file, name: file.name, size: file.size, photo: file.type !== 'application/pdf' })
    setErr('')
    setSection(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    takeFile(e.dataTransfer.files[0])
  }

  const options: { k: Section; label: string; on: boolean; icon: readonly string[] }[] = [
    { k: 'when', label: date === today ? (time === now ? t('nm.now') : fill(t('nm.todayAt'), time)) : fmtDate(date), on: whenOn, icon: future ? IC.cal : IC.clock },
    { k: 'repeat', label: repeatShort(repeat), on: !!repeat, icon: IC.repeat },
    { k: 'attach', label: attach ? t('nm.oneAttachment') : t('nm.attach'), on: !!attach, icon: IC.clip },
  ]
  if (isInc) options.push({ k: 'from', label: from || t('nm.from'), on: !!from, icon: IC.person })
  if (!isInc && !isTr) options.push({ k: 'bpick', label: picked ? picked.name! : t('nm.budget'), on: !!picked, icon: IC.target })
  if (!isTr) options.push({ k: 'more', label: t('nm.more'), on: loan || !!goalId, icon: IC.more })

  const rp = rpDraft ?? repeat ?? RP_DEFAULT
  const rpSet = (patch: Partial<RepeatDraft>) => setRpDraft({ ...rp, ...patch })

  const recents = [...new Map(transactions.filter((t) => t.type === 'income' && !t.loanKind && t.counterpartyName).map((t) => [t.counterpartyName!, t.counterpartyKind ?? null])).entries()].slice(0, 3)

  const save = async () => {
    if (!valid) return setErr(t(!isTr && !catDone ? 'nm.err.category' : val <= 0 ? 'nm.err.amount' : 'nm.err.title'))
    if (!walletId) return setErr(t('nm.err.wallet'))
    if (isTr && !toId) return setErr(t('nm.err.walletTo'))
    setSaving(true)
    const rule = repeat?.freq
      ? {
          interval: FREQ_INTERVAL[repeat.freq],
          occurrences: repeat.endMode === 'count' ? repeat.count : undefined,
          endDate: repeat.endMode === 'until' && repeat.until ? repeat.until : undefined,
          autoConfirm: repeat.confirm === 'auto',
        }
      : undefined
    try {
      const input: NewTransactionInput = {
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
        repeat: rule,
      }
      const saved = editing ? await transactionService.editMovement(editing.id, input, rule ?? null) : await addTransaction(input)
      writePref(PREFS.wallet, walletId)
      if (whenOn) writePref(PREFS.lastWhen, `${date} ${time}`)
      if (attach?.file) await transactionService.uploadAttachment(saved.id, attach.file)
      else if (editing?.attachment && !attach) await transactionService.deleteAttachment(saved.id)
      showToast(future ? fill(t('nm.toast.scheduled'), fmtDate(date)) : t(editing ? 'nm.toast.edited' : 'nm.toast.saved'), 'success')
      onClose()
      if (editing) {
        // Open pages (Movimientos, Inicio) reload the edited movement.
        notifyChanged()
        void refreshAppData()
      } else navigate('/movimientos')
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('nm.err.save'))
      setSaving(false)
    }
  }

  const ctypeIncome = isInc
  const subs = cat ? childCategories(cat, false) : []
  const saveLabel = t(future ? 'nm.saveScheduled' : repeat ? 'nm.saveRepeat' : 'nm.save')

  return (
    <SidePanel
      title={t(editing ? 'nm.editTitle' : 'nm.title')}
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
      <div role="radiogroup" aria-label={t('nm.typeLabel')} className="flex gap-1 rounded-[12px] border border-v2-line bg-v2-surface2 p-1">
        {TYPES.map((value) => {
          const on = type === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              // A movement's type is fixed once saved.
              disabled={!!editing && !on}
              onClick={() => pickType(value)}
              className={cn(
                'flex-1 rounded-[9px] py-2 text-center text-[12px] font-bold',
                editing ? (on ? 'cursor-default' : 'cursor-not-allowed opacity-50') : 'cursor-pointer',
                on ? 'bg-v2-surface text-v2-text shadow-[0_1px_0_var(--v2-line2)]' : 'text-v2-dim',
              )}
            >
              {t(`nm.type.${value}` as TranslationKey)}
            </button>
          )
        })}
      </div>

      {!isTr && section === 'cat' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center">
            <div className="flex-1 text-[15px] font-extrabold">{t(ctypeIncome ? 'nm.cat.income' : 'nm.cat.expense')}</div>
            <button type="button" onClick={() => setSection(null)} className="cursor-pointer text-[12px] font-bold text-v2-accent2">
              {t('common.close')}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {parentCategories(ctypeIncome, false).map((x) => (
              <GridCell
                key={x.id}
                on={cat === x.id}
                color={x.color}
                chip={<CategoryMark category={x.id} box={36} />}
                label={categoryName(x.id)}
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
              <div className="mt-1.5 text-[11px] font-bold tracking-[.06em] text-v2-muted">{fill(t('nm.subOf'), categoryName(cat))}</div>
              <div className="grid grid-cols-5 gap-1">
                {[{ id: null as CategoryId | null, name: t('nm.none.f') }, ...subs.map((s) => ({ id: s.id as CategoryId | null, name: categoryName(s.id) }))].map((x) => (
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
              navigate(ctypeIncome ? '/ajustes/categorias?tab=ingresos' : '/ajustes/categorias')
            }}
            className="cursor-pointer self-start text-[11.5px] font-bold text-v2-accent2"
          >
            {t('nm.manageCategories')}
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
            <div className="text-[10px] font-extrabold tracking-[.1em] text-v2-dim">{t('nm.category')}</div>
            <div className="mt-0.5 truncate text-[13.5px] font-extrabold" title={catDone && leaf ? categoryLabel(leaf) : undefined}>{catDone && leaf ? categoryLabel(leaf) : t('nm.pickCategory')}</div>
          </div>
          <span className="flex-none whitespace-nowrap text-[12px] font-bold text-v2-accent2">{t('nm.change')}</span>
        </button>
      )}

      <div
        className="relative flex flex-col gap-2 overflow-hidden rounded-[18px] border border-[#2b2450] px-[18px] py-4 text-white"
        style={{ background: 'linear-gradient(150deg,var(--v2-hero-a) 0%,var(--v2-hero-b) 60%,var(--v2-hero-c) 100%)' }}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="nt-amount" className="flex-1 text-[10.5px] font-bold tracking-[.11em] text-[#a69dff]">
            {t('nm.amount')}
          </label>
          <button
            type="button"
            // 34px plus its 1px border (content-box in the mockup).
            title={t('nm.padToggle')}
            onClick={() => {
              writePref(PREFS.calc, calc ? '0' : '1')
              setCalc(!calc)
            }}
            className="box-border flex h-9 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-[11px] text-[11.5px] font-extrabold text-white"
            style={{ background: calc ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.1)', borderColor: calc ? '#fff' : 'transparent' }}
          >
            <Icon paths={IC.calc} size={14} color="#fff" />
            {t(calc ? 'nm.calculator' : 'nm.keypad')}
          </button>
          <button
            type="button"
            onClick={() => toggleSection('currency')}
            className="flex h-[34px] flex-none cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-full bg-[rgba(255,255,255,.14)] px-3 text-[12px] font-extrabold text-white"
          >
            {code}
            <Icon paths={['M6 9l6 6 6-6']} size={13} color="rgba(255,255,255,.7)" />
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
        <div className="text-[11px] text-[rgba(255,255,255,.55)]">{t('nm.opsHint')}</div>
        {code !== wcur && (
          <div className="font-numeric text-[11.5px] text-[rgba(255,255,255,.8)]">
            {val > 0 ? fill(t('nm.fx.approx'), formatIn(val * rate, wcur), wcur, walletName, code, formatIn(rate, wcur)) : fill(t('nm.fx.later'), wcur, walletName)}
          </div>
        )}
        {future && (
          <div className="flex items-center gap-[7px] self-start whitespace-nowrap rounded-full bg-[rgba(240,180,41,.18)] px-[11px] py-[5px] text-[11px] font-extrabold text-[#f7cf6b]">
            <Icon paths={IC.cal} size={13} color="#f7cf6b" />
            {`${t('nm.scheduledChip')} · ${fmtDate(date)} · ${time}`}
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
        <div className={fieldLabel}>{t(isInc ? 'nm.walletIn' : isTr ? 'nm.walletFrom' : 'nm.wallet')}</div>
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
          <div className={fieldLabel}>{t('nm.walletTo')}</div>
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

      <input value={title} onChange={(e) => edit(setTitle)(e.target.value.slice(0, 60))} placeholder={t('nm.titlePh')} className={cn(textInput, 'font-bold placeholder:font-bold')} />
      <input value={note} onChange={(e) => edit(setNote)(e.target.value)} placeholder={t('nm.notePh')} className={textInput} />

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
          <SectionHead title={t(`nm.section.${section}` as TranslationKey)} action={t('nm.done')} onAction={() => setSection(null)} />

          {section === 'when' && (
            <>
              <PillRow>
                <Flat on={date === today && time === now} onClick={edit(() => (setDate(today), setTime(now)))}>
                  {t('nm.now')}
                </Flat>
                {(
                  [
                    [t('nm.yesterday'), addDays(today, -1)],
                    [t('nm.dayBefore'), addDays(today, -2)],
                  ] as const
                ).map(([label, iso]) => (
                  <Flat key={label} on={date === iso && !(lastWhen && lastWhen[0] === iso && lastWhen[1] === time)} onClick={edit(() => setDate(iso))}>
                    {label}
                  </Flat>
                ))}
                {lastWhen && (
                  <Flat on={date === lastWhen[0] && time === lastWhen[1]} onClick={edit(() => (setDate(lastWhen[0]), setTime(lastWhen[1])))}>
                    {fill(t('nm.likeLast'), fmtDate(lastWhen[0]), lastWhen[1])}
                  </Flat>
                )}
              </PillRow>
              <div className={fieldLabel}>{t('nm.future')}</div>
              <PillRow>
                {(
                  [
                    [t('nm.tomorrow'), addDays(today, 1)],
                    [t('nm.inAWeek'), addDays(today, 7)],
                    [fmtDayMonth(nextFirst(today)), nextFirst(today)],
                  ] as const
                ).map(([label, iso]) => (
                  <Flat key={label} on={date === iso} onClick={edit(() => setDate(iso))}>
                    {label}
                  </Flat>
                ))}
              </PillRow>
              <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
                <input type="date" aria-label={t('nm.date')} value={date} onChange={(e) => edit(setDate)(e.target.value || today)} className={textInput} />
                <input type="time" aria-label={t('nm.time')} value={time} onChange={(e) => edit(setTime)(e.target.value || now)} className={textInput} />
              </div>
              <div
                className="rounded-[10px] text-[11.5px] leading-[1.45]"
                style={{ padding: future ? '9px 11px' : 0, color: future ? 'var(--v2-warn)' : 'var(--v2-dim)', background: future ? 'rgba(240,180,41,.12)' : 'transparent' }}
              >
                {future
                  ? t('nm.when.future')
                  : date < today
                    ? t('nm.when.past')
                    : t('nm.when.today')}
              </div>
            </>
          )}

          {section === 'repeat' && (
            <>
              <div className="font-numeric text-[11.5px] text-v2-dim">{repeatSummary(rp.freq ? rp : null, date)}</div>
              <PillRow>
                <Flat on={!rp.freq} onClick={() => rpSet({ freq: null })}>
                  {t('nm.noRepeat')}
                </Flat>
                {FREQS.map((f) => (
                  <Flat key={f} on={rp.freq === f} onClick={() => rpSet({ freq: f })}>
                    {freqLabel(f)}
                  </Flat>
                ))}
              </PillRow>
              {rp.freq && (
                <>
                  <div className={fieldLabel}>{t('nm.ends')}</div>
                  <PillRow>
                    {(
                      [
                        ['count', t('nm.ends.count')],
                        ['until', t('nm.ends.until')],
                        ['never', t('nm.ends.never')],
                      ] as const
                    ).map(([k, label]) => (
                      <Flat key={k} on={rp.endMode === k} onClick={() => rpSet({ endMode: k })}>
                        {label}
                      </Flat>
                    ))}
                  </PillRow>
                  {rp.endMode === 'count' && (
                    <div className="flex items-center gap-2.5">
                      <button type="button" aria-label={t('nm.less')} onClick={() => rpSet({ count: Math.max(2, rp.count - 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                        −
                      </button>
                      <div className="font-numeric flex-1 text-center text-[14px] font-extrabold">{fill(t(rp.count === 1 ? 'nm.time1' : 'nm.timesN'), rp.count)}</div>
                      <button type="button" aria-label={t('nm.moreCount')} onClick={() => rpSet({ count: Math.min(99, rp.count + 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-[16px] font-bold">
                        +
                      </button>
                    </div>
                  )}
                  {rp.endMode === 'until' && <input type="date" aria-label={t('nm.endsOn')} value={rp.until} onChange={(e) => rpSet({ until: e.target.value })} className={textInput} />}
                  <div className="font-numeric text-[11.5px] text-v2-muted">{date === today ? fill(t('nm.startsToday'), time) : fill(t('nm.startsOn'), fmtDateLong(date), time)}</div>
                  <div className={fieldLabel}>{t('nm.eachDate')}</div>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ['ask', t('nm.ask'), t('nm.ask.detail')],
                        ['auto', t('nm.auto'), t('nm.auto.detail')],
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
                {t('nm.apply')}
              </button>
            </>
          )}

          {section === 'currency' && (
            <>
              <div className="text-[11.5px] leading-[1.45] text-v2-dim">{fill(t('nm.currency.hint'), walletName, wcur)}</div>
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
                    <RowText label={`${currencyInfo(c).name} · ${c}`} detail={c === wcur ? fill(t('nm.currency.of'), walletName) : `1 ${c} = ${formatMoney(rateOf(c) / rateOf(wcur), wcur)} ${wcur}`} />
                  </RadioRow>
                ))}
              </div>
            </>
          )}

          {section === 'attach' && (
            <>
              <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="rounded-[12px] border-[1.5px] border-dashed border-v2-line2 p-4 text-center text-[12px] text-v2-dim">
                {t('nm.attach.drop')}
              </div>
              {(
                [
                  [IC.image, t('nm.attach.photo'), t('nm.attach.photoDetail'), photoInput],
                  [IC.file, t('nm.attach.doc'), t('nm.attach.docDetail'), docInput],
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
              <input value={from} onChange={(e) => edit(setFrom)(e.target.value.slice(0, 40))} placeholder={t('nm.from.ph')} className={textInput} />
              <div className={fieldLabel}>{t('nm.from.kind')}</div>
              <PillRow>
                {FROM_KINDS.map((k) => (
                  <Flat key={k} on={fromKind === k} onClick={() => setFromKind(fromKind === k ? null : k)}>
                    {t(`nm.from.${k}` as TranslationKey)}
                  </Flat>
                ))}
              </PillRow>
              {recents.length > 0 && (
                <>
                  <div className={fieldLabel}>{t('nm.recents')}</div>
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
                  ? fill(t('nm.bpick.auto'), budgetLabel(autoBudget))
                  : fill(t('nm.bpick.none'), cat ? categoryName(leaf) : t('nm.bpick.thisExpense'))}
              </div>
              <div className="flex flex-col gap-2">
                <RadioRow on={budgetId === null} onClick={() => setBudgetId(null)}>
                  <RowText label={t('nm.none.m')} detail={t('nm.bpick.noneDetail')} />
                </RadioRow>
                {customs.map((b) => (
                  <RadioRow key={b.id} on={budgetId === b.id} onClick={() => setBudgetId(b.id)} leading={<PlanMark icon={b.icon} box={32} />}>
                    <RowText label={b.name ?? ''} detail={fill(t('nm.xOfY'), format(b.spent), format(b.limit))} />
                  </RadioRow>
                ))}
              </div>
            </>
          )}

          {section === 'more' && (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold">{t(isInc ? 'nm.loan.borrowed' : 'nm.loan.lent')}</div>
                  <div className="mt-0.5 text-[11px] text-v2-dim">{t('nm.loan.detail')}</div>
                </div>
                <AjSwitch on={loan} label={t(isInc ? 'nm.loan.borrowed' : 'nm.loan.lent')} onToggle={() => !editing && setLoan(!loan)} />
              </div>
              <div className={fieldLabel}>{t('nm.goal')}</div>
              <PillRow>
                <Flat on={goalId === null} onClick={() => setGoalId(null)}>
                  {t('nm.none.f')}
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
            <div className="truncate text-[12.5px] font-bold" title={attach.name}>{attach.name}</div>
            <div className="text-[11px] text-v2-dim">{`${t(attach.photo ? 'nm.photo' : 'nm.document')} · ${fileSize(attach.size)}`}</div>
          </div>
          <button type="button" aria-label={t('nm.removeAttachment')} title={t('nm.removeAttachment')} onClick={() => setAttach(null)} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-[8px] hover:bg-v2-subtle">
            <Icon paths={['M18 6 6 18', 'M6 6l12 12']} size={14} color="var(--v2-dim)" />
          </button>
        </div>
      )}

      {repeat && (
        <div className="flex items-center gap-2 text-[11.5px] text-v2-muted">
          <Icon paths={IC.repeat} size={13} color="var(--v2-dim)" />
          <span className="font-numeric">{`${repeatSummary(repeat, date)} · ${t(repeat.confirm === 'auto' ? 'nm.automatic' : 'nm.withConfirmation')}`}</span>
        </div>
      )}

      {err && <ErrorBox>{err}</ErrorBox>}
    </SidePanel>
  )
}

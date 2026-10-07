import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useAutoTour } from '@/components/tour/TourProvider'
import { useNavigate } from 'react-router-dom'
import { SidePanel } from '@/components/panels/SidePanel'
import { CategoryMark, GlyphMark, PlanMark } from '@/components/v2/CategoryMark'
import { CancelButton, ErrorBox, Flat, GridCell, IC, Icon, RadioRow } from '@/components/v2/Kit'
import { OverdraftWarning } from '@/components/v2/OverdraftWarning'
import { CategoryPicker } from '@/components/panels/CategoryPicker'
import { StepChoiceRow, StepOptionGroup, StepOptionRow } from '@/components/v2/Steps'
import { AjSwitch } from '@/dashboard/components/ajustes/AjustesUi'
import { categoryColor, categoryIdFor, categoryGlyph, categoryLabel, categoryName, childCategories, isInCategory, parentCategories, parentOf, useCategories } from '@/lib/backendCategories'
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
  overdraftAfter,
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
// amount field with typed arithmetic and the Teclado/Calculadora switch,
// wallet, the automatic budget line, Título/Nota, and the five option
// tiles whose sections open inline. Saves through POST /transactions; the
// backend applies balances, PLANNED status, currency and Repetir. With
// `editing` it is "Editar movimiento": every field starts from the movement
// — its Repetir from its series, its receipt — and saves with PATCH.

type Section = 'cat' | 'when' | 'repeat' | 'attach' | 'from' | 'bpick' | 'more' | 'currency' | 'wallet' | 'walletTo'

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

const fieldLabel = 'text-overline uppercase text-ink-secondary'
const textInput =
  'box-border h-11 w-full rounded-[8px] border border-border-input bg-surface px-3 font-[inherit] text-body text-ink outline-none placeholder:text-ink-tertiary focus:border-2 focus:border-primary-border [color-scheme:light_dark]'

function SectionHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center">
      <div className="flex-1 text-label font-semibold">{title}</div>
      <button type="button" onClick={onAction} className="cursor-pointer text-caption font-semibold text-v2-accent2">
        {action}
      </button>
    </div>
  )
}

function RowText({ label, detail }: { label: string; detail: string }) {
  return (
    <>
      <div className="text-caption font-semibold">{label}</div>
      <div className="font-numeric mt-0.5 text-caption leading-[1.4] text-v2-dim">{detail}</div>
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
  // The title starts as a suggestion (a generic one the first time, then the
  // one used last) until the user types their own.
  const titleTouched = useRef(!!e0)
  // True while the title in the field is one the app suggested (shows the
  // "Sugerido" tag); typing your own (or emptying the field) clears it.
  const [titleSuggested, setTitleSuggested] = useState(!e0)
  const [titleHints, setTitleHints] = useState<string[]>([])
  const hintsRef = useRef<HTMLDivElement>(null)
  const [hintsFade, setHintsFade] = useState(false)
  const updateHintsFade = () => {
    const el = hintsRef.current
    setHintsFade(!!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }
  useLayoutEffect(updateHintsFade, [titleHints, title])
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
  // Its tour runs over the panel itself; not when editing a movement.
  useAutoTour('tour.nuevo', !editing, { insidePanel: true })
  // Progressive disclosure: "Más opciones" starts open only when an option
  // is already set (editing a movement that has one).
  const [moreOpen, setMoreOpen] = useState(!!e0 && (!!e0.note || !!e0.attachment || !!e0.counterpartyName || !!e0.customBudgetId || !!e0.loanKind || !!e0.goalId || !!e0.recurringSeriesId || e0.date !== todayISO()))
  const [calc, setCalc] = useState(() => readPref(PREFS.calc) === '1')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  // Where Guardar would leave the source wallet, while its warning is open.
  const [overdraftAsk, setOverdraftAsk] = useState<number | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const docInput = useRef<HTMLInputElement>(null)

  // Suggested title: with no category the generic one; with a category (and
  // subcategory) the title last used for that exact pair, else its name.
  useEffect(() => {
    if (editing) return
    const generic = t(type === 'income' ? 'nm.titleGenericIncome' : type === 'expense' ? 'nm.titleGenericExpense' : 'nm.titleGenericTransfer')
    if (!titleTouched.current) {
      setTitle(type !== 'transfer' && cat ? categoryName(sub ?? cat) : generic)
      setTitleSuggested(true)
    }
    if (type === 'transfer') {
      setTitleHints([])
      return
    }
    let cancelled = false
    void (async () => {
      let ids: { categoryId?: string; subcategoryId?: string } = {}
      try {
        if (cat) ids = { categoryId: await categoryIdFor(cat), subcategoryId: sub ? await categoryIdFor(sub) : undefined }
      } catch {
        ids = {}
      }
      const res = await transactionService.getTitleSuggestions({ type: type === 'income' ? 'INCOME' : 'EXPENSE', limit: 4, ...ids })
      if (cancelled) return
      setTitleHints(res.titles)
      if (cat && res.last && !titleTouched.current) setTitle(res.last)
    })()
    return () => {
      cancelled = true
    }
  }, [type, cat, sub])

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
      <div className="flex items-start gap-3 nova-card px-4 py-3">
        {lineBudget.kind === 'custom' ? <PlanMark icon={lineBudget.icon} box={40} /> : <CategoryMark category={lineBudget.category!} box={40} />}
        <div className="min-w-0 flex-1">
          <div className="text-label font-semibold">{autoBudget && picked ? fill(t('nm.budget.addsTwo'), budgetLabel(lineBudget), picked.name!) : fill(t('nm.budget.adds'), budgetLabel(lineBudget))}</div>
          <div className="font-numeric mt-0.5 text-body-sm text-ink-tertiary">
            {fill(t(autoBudget ? 'nm.budget.byCategory' : 'nm.budget.custom'), format(lineBudget.spent + add), format(lineBudget.limit)) +
              (future ? t('nm.budget.whenRecorded') : val > 0 ? t('nm.budget.withThis') : '')}
          </div>
        </div>
        <span className="font-numeric flex flex-none items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-1 text-label font-semibold" style={{ color: tone, background: bg }}>
          {/* The state icon, so the tone isn't carried by color alone. */}
          <Icon paths={pct >= 90 ? ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v5', 'M12 16h.01'] : pct >= 65 ? ['M12 3 2 21h20z', 'M12 10v5', 'M12 18h.01'] : ['M5 12.5l4.5 4.5L19 7']} size={14} color={tone} />
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

  // "Más opciones" rows: the option's name and its current value.
  const goalName = goals.find((g) => g.id === goalId)?.name
  const loanOrGoal = [loan ? t('nm.loan') : null, goalName].filter(Boolean).join(' · ')
  const whenShort = date === today ? (time === now ? t('nm.now') : fill(t('nm.todayAt'), time)) : `${fmtDate(date)} · ${time}`
  const options: { k: Section; label: string; value: string; on: boolean; icon: readonly string[] }[] = [
    { k: 'when', label: t('nm.section.when'), value: whenShort, on: whenOn, icon: future ? IC.cal : IC.clock },
    {
      k: 'repeat',
      label: t('nm.section.repeat'),
      value: repeat ? `${repeatSummary(repeat, date)} · ${t(repeat.confirm === 'auto' ? 'nm.automatic' : 'nm.withConfirmation')}` : t('nm.noRepeat'),
      on: !!repeat,
      icon: IC.repeat,
    },
    { k: 'attach', label: t('nm.attach'), value: attach ? `${attach.name} · ${fileSize(attach.size)}` : t('nm.optional'), on: !!attach, icon: IC.clip },
  ]
  if (isInc) options.push({ k: 'from', label: t('nm.from'), value: from || t('nm.optional'), on: !!from, icon: IC.person })
  if (!isInc && !isTr) options.push({ k: 'bpick', label: t('nm.budget'), value: picked ? picked.name! : t('nm.bpick.noneDetail'), on: !!picked, icon: IC.target })
  if (!isTr) options.push({ k: 'more', label: t('nm.section.more'), value: loanOrGoal || t('nm.none.m'), on: loan || !!goalId, icon: IC.more })
  const moreSummary = [
    whenOn ? whenShort : null,
    repeat ? repeatShort(repeat) : null,
    note.trim() ? t('nm.noteLabel') : null,
    attach ? t('nm.oneAttachment') : null,
    isInc && from ? from : null,
    !isInc && !isTr && picked ? picked.name! : null,
    loanOrGoal || null,
  ]
    .filter(Boolean)
    .join(' · ')

  const rp = rpDraft ?? repeat ?? RP_DEFAULT
  const rpSet = (patch: Partial<RepeatDraft>) => setRpDraft({ ...rp, ...patch })

  const recents = [...new Map(transactions.filter((t) => t.type === 'income' && !t.loanKind && t.counterpartyName).map((t) => [t.counterpartyName!, t.counterpartyKind ?? null])).entries()].slice(0, 3)

  // Expenses and transfers out that would leave the wallet below zero ask
  // first; saving anyway is allowed. Editing gives back what the saved
  // movement had already taken from this same wallet.
  const refund =
    editing && (editing.status ?? 'completed') === 'completed' && editing.accountId === walletId
      ? editing.type === 'expense' ? (editing.walletAmount ?? editing.amount) : editing.type === 'transfer' ? editing.amount : 0
      : 0
  const overdraft = wallet && !isInc ? overdraftAfter({ balance: wallet.currentBalance, spend: isTr ? val : val * rate, refund, credit: wallet.accountType === 'BANK_CREDIT', future }) : null

  const save = async (confirmed = false) => {
    if (!valid) return setErr(t(!isTr && !catDone ? 'nm.err.category' : val <= 0 ? 'nm.err.amount' : 'nm.err.title'))
    if (!walletId) return setErr(t('nm.err.wallet'))
    if (isTr && !toId) return setErr(t('nm.err.walletTo'))
    if (overdraft !== null && !confirmed) return setOverdraftAsk(overdraft)
    setOverdraftAsk(null)
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

  const walletLabel = (id: string | null) => {
    const w = wallets.find((x) => x.id === id)
    return w ? shortWallet(w.name) + (w.currency !== principal ? ' · ' + w.currency : '') : undefined
  }
  const walletRowKey = (to: boolean): TranslationKey => (to ? 'nm.row.walletTo' : isInc ? 'nm.row.walletIn' : isTr ? 'nm.row.walletFrom' : 'nm.row.wallet')

  // "Es dinero que presté / me prestaron": the loan is registered in
  // Préstamos (it needs a counterparty and a due date), with the amount in
  // the wallet's currency and the wallet already chosen here.
  const toLoans = () => {
    const q = new URLSearchParams({ tab: 'prestamos', side: isInc ? 'borrowed' : 'lent', new: 'loan' })
    const amountInWallet = Math.round(val * rate * 100) / 100
    if (amountInWallet > 0) q.set('amount', String(amountInWallet))
    if (walletId) q.set('wallet', walletId)
    onClose()
    navigate(`/planes?${q.toString()}`)
  }

  const sectionPanel = section && section !== 'cat' && section !== 'wallet' && section !== 'walletTo' ? (
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
                  className="rounded-[10px] text-caption leading-[1.45]"
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
                <div className="font-numeric text-caption text-v2-dim">{repeatSummary(rp.freq ? rp : null, date)}</div>
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
                        <button type="button" aria-label={t('nm.less')} onClick={() => rpSet({ count: Math.max(2, rp.count - 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-body font-semibold">
                          −
                        </button>
                        <div className="font-numeric flex-1 text-center text-body-sm font-semibold">{fill(t(rp.count === 1 ? 'nm.time1' : 'nm.timesN'), rp.count)}</div>
                        <button type="button" aria-label={t('nm.moreCount')} onClick={() => rpSet({ count: Math.min(99, rp.count + 1) })} className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-body font-semibold">
                          +
                        </button>
                      </div>
                    )}
                    {rp.endMode === 'until' && <input type="date" aria-label={t('nm.endsOn')} value={rp.until} onChange={(e) => rpSet({ until: e.target.value })} className={textInput} />}
                    <div className="font-numeric text-caption text-v2-muted">{date === today ? fill(t('nm.startsToday'), time) : fill(t('nm.startsOn'), fmtDateLong(date), time)}</div>
                    <div className={fieldLabel}>{t('nm.eachDate')}</div>
                    <div className="flex flex-col gap-2">
                      {(
                        [
                          ['ask', t('nm.ask'), t('nm.ask.detail')],
                          ['auto', t('nm.auto'), t('nm.auto.detail')],
                        ] as const
                      ).map(([k, label, detail]) => (
                        <RadioRow key={k} on={rp.confirm === k} onClick={() => rpSet({ confirm: k })}>
                          <div className="text-caption font-semibold">{label}</div>
                          <div className="mt-0.5 text-caption leading-[1.4] text-v2-dim">{detail}</div>
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
                  className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-[9px] text-center text-caption font-semibold text-white"
                >
                  {t('nm.apply')}
                </button>
              </>
            )}

            {section === 'currency' && (
              <>
                <div className="text-caption leading-[1.45] text-v2-dim">{fill(t('nm.currency.hint'), walletName, wcur)}</div>
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
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-v2-accent/16 text-caption font-semibold text-v2-accent2">{currencyInfo(c).symbol}</span>
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
                <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="rounded-[12px] border-[1.5px] border-dashed border-v2-line2 p-4 text-center text-caption text-v2-dim">
                  {t('nm.attach.drop')}
                </div>
                {(
                  [
                    [IC.image, t('nm.attach.photo'), t('nm.attach.photoDetail'), photoInput],
                    [IC.file, t('nm.attach.doc'), t('nm.attach.docDetail'), docInput],
                  ] as const
                ).map(([icon, label, detail, ref]) => (
                  <button key={label} type="button" onClick={() => ref.current?.click()} className="flex cursor-pointer items-center gap-3 py-1 text-left">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-v2-accent/20">
                      <Icon paths={icon} size={18} color="var(--v2-accent2)" />
                    </span>
                    <div>
                      <div className="text-caption font-semibold">{label}</div>
                      <div className="text-caption text-v2-dim">{detail}</div>
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
                <div className="text-caption leading-[1.45] text-v2-dim">
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
                {editing ? (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-semibold">{t(isInc ? 'nm.loan.borrowed' : 'nm.loan.lent')}</div>
                      <div className="mt-0.5 text-caption text-v2-dim">{t('nm.loan.detail')}</div>
                    </div>
                    <AjSwitch on={loan} label={t(isInc ? 'nm.loan.borrowed' : 'nm.loan.lent')} onToggle={() => undefined} />
                  </div>
                ) : (
                  // A loan needs its counterparty and due date, which live in
                  // Préstamos: this opens its form with what's typed here.
                  <button type="button" onClick={toLoans} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-left hover:bg-surface-sunken">
                    <div className="min-w-0 flex-1">
                      <div className="text-body-sm font-semibold text-ink">{t(isInc ? 'nm.loan.borrowed' : 'nm.loan.lent')}</div>
                      <div className="mt-0.5 text-caption text-ink-secondary">{t('nm.loan.goDetail')}</div>
                    </div>
                    <Icon paths={['M9 6l6 6-6 6']} size={18} color="var(--color-text-secondary)" />
                  </button>
                )}
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
  ) : null

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
            onClick={() => save()}
            disabled={saving}
            className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-caption font-semibold"
            style={{ cursor: valid ? 'pointer' : 'not-allowed', color: valid ? '#fff' : 'var(--v2-dim)', background: valid ? 'var(--v2-accent)' : 'var(--v2-surface2)' }}
          >
            {saveLabel}
          </button>
        </>
      }
    >
      {!isTr && section === 'cat' ? (
        <CategoryPicker
          income={ctypeIncome}
          cat={cat}
          sub={sub}
          done={catDone}
          onBack={() => setSection(null)}
          onPick={edit((c: CategoryId, sc: CategoryId | null) => {
            setCat(c)
            setSub(sc)
            setCatDone(true)
            setSection(null)
          })}
          onManage={() => {
            onClose()
            navigate(ctypeIncome ? '/ajustes/categorias?tab=ingresos' : '/ajustes/categorias')
          }}
        />
      ) : (
      <>
      <div role="radiogroup" aria-label={t('nm.typeLabel')} data-tour="nm.type" className="flex h-11 gap-1 rounded-[12px] bg-surface-sunken p-1">
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
                'min-w-0 flex-1 truncate whitespace-nowrap rounded-[9px] px-1 text-center text-label',
                editing ? (on ? 'cursor-default' : 'cursor-not-allowed opacity-40') : 'cursor-pointer',
                on ? 'border border-border bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'font-medium text-ink-secondary hover:text-ink',
              )}
            >
              {t(`nm.type.${value}` as TranslationKey)}
            </button>
          )
        })}
      </div>

      <div
        data-tour="nm.amount"
        className="relative flex flex-col gap-2 overflow-hidden rounded-[16px] border border-border-input bg-surface px-[18px] py-4 text-ink focus-within:border-2 focus-within:border-primary-border"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="nt-amount" className="flex-1 text-overline font-semibold uppercase text-ink-secondary">
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
            className={cn('box-border flex h-9 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-[11px] text-caption font-semibold text-ink', calc ? 'border-primary-border bg-accent-soft' : 'border-transparent bg-surface-sunken')}
          >
            <Icon paths={IC.calc} size={14} color="var(--color-text-secondary)" />
            {t(calc ? 'nm.calculator' : 'nm.keypad')}
          </button>
          <button
            type="button"
            onClick={() => toggleSection('currency')}
            className="flex h-[34px] flex-none cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-[8px] bg-surface-sunken px-3 text-caption font-semibold text-ink"
          >
            {code}
            <Icon paths={['M6 9l6 6 6-6']} size={13} color="var(--color-text-secondary)" />
          </button>
        </div>
        <input
          id="nt-amount"
          data-autofocus
          value={fmtExpr(expr)}
          onChange={(e) => edit(setExpr)(typedExpr(e.target.value))}
          placeholder="0"
          inputMode="decimal"
          className="w-full border-none bg-transparent px-0.5 py-px font-[inherit] text-display-sm [font-variant-numeric:tabular-nums] font-semibold tracking-[-.02em] text-ink outline-none placeholder:text-ink-tertiary"
        />
        {hasOps(expr) && <div className="font-numeric text-body-sm font-semibold text-ink">{'= ' + formatIn(val, code)}</div>}
        <div className="text-caption text-ink-secondary">{t('nm.opsHint')}</div>
        {code !== wcur && (
          <div className="font-numeric text-caption text-ink-secondary">
            {val > 0 ? fill(t('nm.fx.approx'), formatIn(val * rate, wcur), wcur, walletName, code, formatIn(rate, wcur)) : fill(t('nm.fx.later'), wcur, walletName)}
          </div>
        )}
        {future && (
          <div className="flex items-center gap-[7px] self-start whitespace-nowrap rounded-[8px] bg-surface-sunken px-[11px] py-[5px] text-caption font-semibold text-ink">
            <Icon paths={IC.cal} size={13} color="var(--color-text-secondary)" />
            {`${t('nm.scheduledChip')} · ${fmtDate(date)} · ${time}`}
          </div>
        )}
      </div>

      {section === 'currency' && sectionPanel}

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
                  'flex h-11 cursor-pointer select-none items-center justify-center rounded-[11px] border font-semibold',
                  op
                    ? 'border-transparent bg-v2-accent/16 text-title text-v2-accent2'
                    : k === '='
                      ? 'row-span-2 h-auto border-transparent bg-v2-accent/32 text-title text-white'
                      : k === 'C' || k === '⌫'
                        ? 'border-v2-line bg-v2-surface2 text-label font-semibold text-v2-muted'
                        : 'border-v2-line bg-v2-surface2 text-body text-v2-text',
                )}
              >
                {k}
              </button>
            )
          })}
        </div>
      )}

      {!isTr && section !== 'cat' && (
        <button
          type="button"
          onClick={() => setSection('cat')}
          data-tour="nm.category"
          className="flex min-h-16 cursor-pointer items-center gap-3 nova-card px-4 py-3 text-left hover:border-border-strong"
        >
          {catDone && leaf ? <CategoryMark category={leaf} box={40} /> : <GlyphMark paths={TAX_VIS.other.glyph} color="var(--color-text-tertiary)" box={40} />}
          <div className="min-w-0 flex-1">
            <div className="text-overline uppercase text-ink-secondary">{t('nm.category')}</div>
            <div className={cn('mt-0.5 truncate text-title-sm font-semibold', !(catDone && leaf) && 'text-link')} title={catDone && leaf ? categoryLabel(leaf) : undefined}>{catDone && leaf ? categoryLabel(leaf) : t('nm.pickCategory')}</div>
          </div>
          <span className="flex-none whitespace-nowrap text-label font-semibold text-link">{t('nm.change')}</span>
        </button>
      )}

      {/* Wallets as option rows (like a budget's Periodo / Billeteras): each
          shows its value and opens the list of wallets in its place. */}
      {section === 'wallet' || section === 'walletTo' ? (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t(walletRowKey(section === 'walletTo'))}>
          <div className={fieldLabel}>{t(walletRowKey(section === 'walletTo')).toUpperCase()}</div>
          {wallets
            .filter((w) => section === 'wallet' || w.id !== walletId)
            .map((w) => (
              <StepChoiceRow
                key={w.id}
                label={walletLabel(w.id)!}
                on={section === 'walletTo' ? toId === w.id : walletId === w.id}
                onClick={() => {
                  if (section === 'walletTo') edit(setToId)(w.id)
                  else pickWallet(w.id)
                  setSection(null)
                }}
              />
            ))}
        </div>
      ) : (
        <StepOptionGroup>
          <StepOptionRow icon={[...IC.wallet]} label={t(walletRowKey(false))} value={walletLabel(walletId) ?? t('nm.pickWallet')} onClick={() => setSection('wallet')} />
          {isTr && <StepOptionRow icon={[...IC.wallet]} label={t(walletRowKey(true))} value={walletLabel(toId) ?? t('nm.pickWallet')} onClick={() => setSection('walletTo')} />}
        </StepOptionGroup>
      )}

      {budgetLine}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="nt-title" className={fieldLabel}>{t('nm.titlePh')}</label>
          {titleSuggested && title && (
            <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[6px] border border-primary-border px-2 text-caption font-semibold text-ink">
              <Icon paths={['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z']} size={12} color="var(--color-primary-border)" />
              {t('nm.titleSuggested')}
            </span>
          )}
        </div>
        {/* The title field of a budget's Nombre: the category's mark, then the text. */}
        <div className="flex h-14 items-center gap-2.5 rounded-[12px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
          {isTr ? (
            <GlyphMark paths={['M4 8h14l-3-3', 'M20 16H6l3 3']} color="var(--color-link)" box={40} />
          ) : catDone && leaf ? (
            <CategoryMark category={leaf} box={40} />
          ) : (
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-surface-sunken">
              <Icon paths={['M4 7V5h16v2', 'M12 5v14', 'M9 19h6']} size={18} color="var(--color-text-secondary)" />
            </span>
          )}
          <input id="nt-title" value={title} onChange={(e) => { const v = e.target.value.slice(0, 60); titleTouched.current = true; setTitleSuggested(false); edit(setTitle)(v) }} onFocus={(e) => { if (!titleTouched.current) e.target.select() }} placeholder={t('nm.titleEx')} className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary" />
        </div>
        {titleHints.filter((h) => h !== title).length > 0 && (
          // One line that scrolls sideways; the edge fades while there's more.
          <div ref={hintsRef} onScroll={updateHintsFade} className="scrollbar-none flex gap-1.5 overflow-x-auto" style={hintsFade ? { maskImage: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)' } : undefined} role="group" aria-label={t('nm.titleHints')}>
            {titleHints.filter((h) => h !== title).map((h) => (
              <button key={h} type="button" onClick={() => { titleTouched.current = true; setTitleSuggested(false); edit(setTitle)(h) }} className="inline-flex h-8 flex-none cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-border-input px-3 text-body-sm text-ink-secondary hover:bg-surface-sunken">
                <span className="truncate">{h}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MoreOptions
        open={moreOpen}
        onToggle={() => setMoreOpen(!moreOpen)}
        summary={moreSummary}
        rows={options.map((o) => ({ ...o, open: section === o.k, onClick: () => toggleSection(o.k), panel: section === o.k ? sectionPanel : null }))}
        onRemoveAttach={attach ? () => setAttach(null) : undefined}
      >
        <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
          <label htmlFor="nt-note" className={fieldLabel}>{t('nm.noteLabel')}</label>
          <input id="nt-note" value={note} onChange={(e) => edit(setNote)(e.target.value)} placeholder={t('nm.notePh')} className={textInput} />
        </div>
      </MoreOptions>

      {err && <ErrorBox>{err}</ErrorBox>}
      {overdraftAsk !== null && (
        <OverdraftWarning
          walletName={walletName}
          currency={wcur}
          available={(wallet?.currentBalance ?? 0) + refund}
          after={overdraftAsk}
          onReview={() => setOverdraftAsk(null)}
          onConfirm={() => void save(true)}
        />
      )}
      </>
      )}
    </SidePanel>
  )
}

// "Más opciones" (progressive disclosure): a header with a summary of what
// is set; open, one full-width row per option with its current value, its
// section right under it, and the note field.
function MoreOptions({
  open,
  onToggle,
  summary,
  rows,
  onRemoveAttach,
  children,
}: {
  open: boolean
  onToggle: () => void
  summary: string
  rows: { k: Section; label: string; value: string; on: boolean; icon: readonly string[]; open: boolean; onClick: () => void; panel: ReactNode }[]
  onRemoveAttach?: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section data-tour="nm.more" className="nova-card">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[16px] px-4 py-3 text-left hover:bg-v2-subtle">
        <div className="min-w-0 flex-1">
          <div className="text-title-sm font-semibold text-ink">{t('nm.moreOptions')}</div>
          {summary && <div className="truncate text-body-sm text-link" title={summary}>{summary}</div>}
        </div>
        <span className={cn('flex text-ink-tertiary transition-transform duration-150', open && 'rotate-180')}>
          <Icon paths={['M6 9l6 6 6-6']} size={20} color="currentColor" />
        </span>
      </button>
      {open && (
        <>
          {rows.map((r) => (
            <div key={r.k} className="border-t border-divider">
              <div className="flex items-center">
                <button type="button" onClick={r.onClick} aria-expanded={r.open} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-2 text-left hover:bg-v2-subtle">
                  <Icon paths={r.icon} size={20} color="var(--color-link)" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label font-semibold text-ink">{r.label}</div>
                    <div className="font-numeric line-clamp-2 text-body-sm text-ink-tertiary">{r.value}</div>
                  </div>
                  {!(r.k === 'attach' && onRemoveAttach) && (
                    <span className={cn('flex text-ink-tertiary transition-transform duration-150', r.open && 'rotate-90')}>
                      <Icon paths={['M9 18l6-6-6-6']} size={18} color="currentColor" />
                    </span>
                  )}
                </button>
                {r.k === 'attach' && onRemoveAttach && (
                  <button type="button" aria-label={t('nm.removeAttachment')} title={t('nm.removeAttachment')} onClick={onRemoveAttach} className="mr-3 flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-[8px] text-ink-tertiary hover:bg-v2-subtle">
                    <Icon paths={['M18 6 6 18', 'M6 6l12 12']} size={16} color="currentColor" />
                  </button>
                )}
              </div>
              {r.panel}
            </div>
          ))}
          <div className="border-t border-divider">{children}</div>
        </>
      )}
    </section>
  )
}

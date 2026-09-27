import { useState } from 'react'
import { CategoryMark, GlyphMark, PlanMark } from '@/components/v2/CategoryMark'
import {
  CancelButton,
  ConfirmDialog,
  DangerLink,
  DateInput,
  ErrorBox,
  Field,
  Flat,
  GridCell,
  IC,
  Icon,
  Label,
  ModalFooter,
  ModalTitle,
  AmountField,
  OptionTile,
  PlanIconGrid,
  SaveButton,
  SectionBox,
  V2Modal,
  inputClass,
} from '@/components/v2/Kit'
import { ApiError } from '@/lib/apiClient'
import { categoryColor, categoryGlyph, categoryLabel, categoryName, categoryNode, childCategories, parentCategories, parentOf, useCategories } from '@/lib/backendCategories'
import { shortWallet } from '@/lib/movimientos'
import { budgetPeriodLabel, shortDayMonth } from '@/lib/planCopy'
import { guessCategory, guessPlanIcon } from '@/lib/taxonomy'
import { budgetService, type BudgetDraft, type BudgetProgress } from '@/services/budgetService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { fill } from '@/lib/i18n/translations'
import type { BudgetKind, Wallet } from '@/types'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'

type Section = 'cat' | 'wallets' | 'period' | null

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
}

function draftOf(b: BudgetProgress | null): Draft {
  if (!b) return { kind: 'category', name: '', limit: '', cat: null, sub: null, icon: 'other', iconAuto: true, walletIds: [], period: 'monthly', start: '', end: '', auto: true }
  const custom = b.kind === 'custom'
  return {
    kind: b.kind,
    name: b.name ?? '',
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
  }
}

// Nuevo / Editar presupuesto — the Web v2 mockup's budget modal (bOpen):
// Por categoría / Personalizado, Nombre with the mark (category picker or
// suggested icon), Monto, and the Categoría · Billeteras · Periodo tiles
// that open inline sections. PLANS.md §4.
export function BudgetModal({ budget, wallets, onClose, onSaved }: { budget: BudgetProgress | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  useCategories()
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { showToast } = useToast()
  const [d, setD] = useState<Draft>(() => draftOf(budget))
  const [section, setSection] = useState<Section>(budget ? null : 'cat')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const set = (p: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...p }))
    setErr('')
  }

  const custom = d.kind === 'custom'
  const valid = evalExpr(d.limit) > 0 && (d.period !== 'custom' || (!!d.start && !!d.end && d.end >= d.start)) && (custom ? !!d.name.trim() : !!d.cat)
  const leaf = d.sub ?? d.cat
  const wl = d.walletIds.length ? d.walletIds.map((id) => shortWallet(wallets.find((w) => w.id === id)?.name ?? '')) : null
  const nameGuess = custom ? null : d.auto ? guessCategory(d.name, false) : null

  const onName = (v: string) => {
    if (custom) return set({ name: v, icon: d.iconAuto ? (guessPlanIcon(v) ?? 'other') : d.icon })
    const lf = d.auto ? guessCategory(v, false) : null
    const p = lf ? parentOf(lf) : undefined
    set({ name: v, ...(lf && p ? { cat: p.id, sub: lf !== p.id ? lf : null } : {}) })
  }

  const tiles: { k: Exclude<Section, null>; label: string; on: boolean; icon: React.ReactNode }[] = custom
    ? []
    : [
        {
          k: 'cat',
          label: d.cat ? categoryName(leaf) : t('bud.category'),
          on: !!d.cat,
          icon: d.cat ? <Icon paths={categoryGlyph(leaf)} size={18} color={categoryColor(d.cat)} /> : <Icon paths={IC.target} size={18} color="var(--v2-muted)" />,
        },
        { k: 'wallets', label: wl ? (wl.length === 1 ? wl[0] : fill(t('bud.nWallets'), wl.length)) : t('bud.wallets'), on: !!wl, icon: <Icon paths={IC.wallet} size={18} color={wl ? 'var(--v2-accent2)' : 'var(--v2-muted)'} /> },
      ]
  tiles.push({
    k: 'period',
    label: d.period === 'custom' ? (d.start && d.end ? `${shortDayMonth(d.start)} – ${shortDayMonth(d.end)}` : t('bud.range')) : t('bud.monthly'),
    on: d.period === 'custom',
    icon: <Icon paths={IC.cal} size={18} color={d.period === 'custom' ? 'var(--v2-accent2)' : 'var(--v2-muted)'} />,
  })

  const scopeNote = custom
    ? ''
    : !d.cat
      ? t('bud.scope.pick')
      : (d.sub ? fill(t('bud.scope.only'), categoryLabel(d.sub)) : fill(t('bud.scope.all'), categoryName(d.cat))) +
        (wl ? fill(t('bud.scope.from'), wl.join(', ')) : t('bud.scope.allWallets')) +
        ` · ${t(d.period === 'custom' ? 'bud.scope.noReset' : 'bud.scope.reset')}.`

  const save = async () => {
    if (!valid) return setErr(t(custom && !d.name.trim() ? 'bud.err.name' : !custom && !d.cat ? 'nm.err.category' : 'bud.err.amount'))
    const draft: BudgetDraft = {
      kind: d.kind,
      name: d.name.trim() || null,
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
      else if (budget.kind === d.kind) await budgetService.updateBudget(budget.id, draft)
      else {
        // The backend fixes a budget's kind, so switching it replaces the budget.
        await budgetService.createBudget(draft)
        await budgetService.deleteBudget(budget.id)
      }
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

  return (
    <V2Modal width={500} onClose={onClose} label={title}>
      <ModalTitle>{title}</ModalTitle>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {(
            [
              ['category', t('bud.kind.category')],
              ['custom', t('bud.kind.custom')],
            ] as const
          ).map(([k, text]) => (
            <Flat
              key={k}
              on={d.kind === k}
              onClick={() => {
                set({ kind: k })
                setSection(null)
              }}
              className="flex-1 text-center"
            >
              {text}
            </Flat>
          ))}
        </div>
        <div className="text-[11.5px] text-v2-dim">
          {t(custom ? 'bud.kind.customHint' : 'bud.kind.categoryHint')}
        </div>
      </div>

      <Field
        label={t('bud.name')}
        note={t(
          custom
            ? d.iconAuto && guessPlanIcon(d.name)
              ? 'bud.note.iconGuess'
              : 'bud.note.iconPick'
            : nameGuess
              ? 'bud.note.catGuess'
              : 'bud.note.catPick',
        )}
      >
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setSection(custom ? null : 'cat')} title={t('bud.pickCategory')} className="relative flex cursor-pointer">
            {custom ? <PlanMark icon={d.icon} box={38} /> : <CategoryMark category={leaf ?? 'exp.other'} box={38} />}
            {!custom && (
              <span className="absolute -bottom-0.5 -right-0.5 box-border flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-v2-surface bg-v2-accent text-[8px] text-white">▾</span>
            )}
          </button>
          <input value={d.name} onChange={(e) => onName(e.target.value)} placeholder={t(custom ? 'bud.ph.custom' : 'bud.ph.category')} className={`${inputClass} flex-1`} />
        </div>
      </Field>

      <Field label={t('nm.amount')}>
        <AmountField expr={d.limit} onExpr={(v) => set({ limit: v })} label={t('bud.limit')} />
      </Field>

      {custom && (
        <div className="flex flex-col gap-2">
          <Label>{t('bud.icon')}</Label>
          <PlanIconGrid value={d.icon} onPick={(k) => set({ icon: k, iconAuto: false })} />
        </div>
      )}

      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1.5">
        {tiles.map((o) => (
          <OptionTile key={o.k} icon={o.icon} label={o.label} on={o.on} open={section === o.k} onClick={() => setSection(section === o.k ? null : o.k)} />
        ))}
      </div>

      {scopeNote && <div className="font-numeric text-[11.5px] leading-[1.45] text-v2-dim">{scopeNote}</div>}

      {section === 'cat' && !custom && (
        <SectionBox>
          <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1">
            {parentCategories(false, false).map((x) => (
              <GridCell
                key={x.id}
                on={d.cat === x.id}
                color={x.color}
                chip={<CategoryMark category={x.id} box={36} />}
                label={categoryName(x.id)}
                onClick={() => {
                  set({ cat: x.id, sub: null, auto: false })
                  if (!childCategories(x.id, false).length) setSection(null)
                }}
              />
            ))}
          </div>
          {d.cat && childCategories(d.cat, false).length > 0 && (
            <>
              <Label>{fill(t('nm.subOf'), categoryName(d.cat))}</Label>
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1">
                {[{ id: null as string | null, name: t('bud.all') }, ...childCategories(d.cat, false).map((s) => ({ id: s.id as string | null, name: categoryName(s.id) }))].map((x) => (
                  <GridCell
                    key={x.id ?? 'all'}
                    on={d.sub === x.id}
                    color={categoryColor(d.cat)}
                    chip={<GlyphMark paths={categoryGlyph(x.id ?? d.cat)} color={categoryColor(d.cat)} box={36} />}
                    label={x.name}
                    onClick={() => {
                      set({ sub: x.id, auto: false })
                      setSection(null)
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </SectionBox>
      )}

      {section === 'wallets' && !custom && (
        <SectionBox className="gap-2">
          <div className="text-[11.5px] text-v2-dim">{t('bud.walletsHint')}</div>
          <div className="flex flex-wrap gap-1.5">
            <Flat on={!wl} onClick={() => set({ walletIds: [] })}>
              {t('bud.all')}
            </Flat>
            {wallets.map((w) => {
              const on = d.walletIds.includes(w.id)
              return (
                <Flat key={w.id} on={on} onClick={() => set({ walletIds: on ? d.walletIds.filter((x) => x !== w.id) : [...d.walletIds, w.id] })}>
                  {shortWallet(w.name)}
                </Flat>
              )
            })}
          </div>
        </SectionBox>
      )}

      {section === 'period' && (
        <SectionBox>
          <div className="flex flex-wrap gap-1.5">
            <Flat on={d.period === 'monthly'} onClick={() => set({ period: 'monthly' })}>
              {t('bud.monthly')}
            </Flat>
            <Flat on={d.period === 'custom'} onClick={() => set({ period: 'custom' })}>
              {t('bud.customRange')}
            </Flat>
          </div>
          {d.period === 'custom' && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <DateInput value={d.start} onChange={(v) => set({ start: v })} />
              <DateInput value={d.end} onChange={(v) => set({ end: v })} />
            </div>
          )}
        </SectionBox>
      )}

      {err && <ErrorBox>{err}</ErrorBox>}

      <ModalFooter left={budget && <DangerLink onClick={() => setConfirming(true)}>{t('bud.delete')}</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>

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
    </V2Modal>
  )
}

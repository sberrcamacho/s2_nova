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
  MoneyInput,
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
import type { BudgetKind, Wallet } from '@/types'

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
    limit: String(b.limit),
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
  const valid = Number(d.limit) > 0 && (d.period !== 'custom' || (!!d.start && !!d.end && d.end >= d.start)) && (custom ? !!d.name.trim() : !!d.cat)
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
          label: d.cat ? categoryName(leaf) : 'Categoría',
          on: !!d.cat,
          icon: d.cat ? <Icon paths={categoryGlyph(leaf)} size={18} color={categoryColor(d.cat)} /> : <Icon paths={IC.target} size={18} color="var(--v2-muted)" />,
        },
        { k: 'wallets', label: wl ? (wl.length === 1 ? wl[0] : `${wl.length} billeteras`) : 'Billeteras', on: !!wl, icon: <Icon paths={IC.wallet} size={18} color={wl ? 'var(--v2-accent2)' : 'var(--v2-muted)'} /> },
      ]
  tiles.push({
    k: 'period',
    label: d.period === 'custom' ? (d.start && d.end ? `${shortDayMonth(d.start)} – ${shortDayMonth(d.end)}` : 'Rango') : 'Mensual',
    on: d.period === 'custom',
    icon: <Icon paths={IC.cal} size={18} color={d.period === 'custom' ? 'var(--v2-accent2)' : 'var(--v2-muted)'} />,
  })

  const scopeNote = custom
    ? ''
    : !d.cat
      ? 'Elige la categoría que cubre este presupuesto.'
      : (d.sub ? `Solo ${categoryLabel(d.sub)}` : `Todos los gastos de ${categoryName(d.cat)}`) +
        (wl ? `, pagados desde ${wl.join(', ')}` : ', de todas tus billeteras') +
        ` · ${d.period === 'custom' ? 'no se reinicia' : 'se reinicia cada mes'}.`

  const save = async () => {
    if (!valid) return setErr(custom && !d.name.trim() ? 'Escribe un nombre.' : !custom && !d.cat ? 'Elige una categoría.' : 'Revisa el monto y el periodo.')
    const draft: BudgetDraft = {
      kind: d.kind,
      name: d.name.trim() || null,
      category: custom ? undefined : (leaf ?? undefined),
      icon: custom ? d.icon : undefined,
      walletIds: custom ? [] : d.walletIds,
      limit: Number(d.limit),
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
      showToast(budget ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success')
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 409 ? 'Ya tienes un presupuesto para esa categoría en ese periodo.' : e instanceof Error ? e.message : 'No se pudo guardar.')
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
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  const title = budget ? 'Editar presupuesto' : 'Nuevo presupuesto'
  const label = budget ? (budget.name ?? categoryName(budget.category)) : ''

  return (
    <V2Modal width={500} onClose={onClose} label={title}>
      <ModalTitle>{title}</ModalTitle>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {(
            [
              ['category', 'Por categoría'],
              ['custom', 'Personalizado'],
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
          {custom ? 'Tú decides qué gastos cuentan: asígnalos desde Nuevo movimiento › Presupuesto.' : 'Los gastos de la categoría elegida suman solos, en las billeteras que indiques.'}
        </div>
      </div>

      <Field
        label="NOMBRE"
        note={
          custom
            ? d.iconAuto && guessPlanIcon(d.name)
              ? 'Icono sugerido por el nombre. Elige otro abajo si quieres.'
              : 'Elige un icono para reconocerlo de un vistazo.'
            : nameGuess
              ? 'Categoría detectada por el nombre. Puedes cambiarla.'
              : 'Haz clic en el icono para elegir la categoría.'
        }
      >
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setSection(custom ? null : 'cat')} title="Elegir categoría" className="relative flex cursor-pointer">
            {custom ? <PlanMark icon={d.icon} box={38} /> : <CategoryMark category={leaf ?? 'exp.other'} box={38} />}
            {!custom && (
              <span className="absolute -bottom-0.5 -right-0.5 box-border flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-v2-surface bg-v2-accent text-[8px] text-white">▾</span>
            )}
          </button>
          <input value={d.name} onChange={(e) => onName(e.target.value)} placeholder={custom ? 'Cumpleaños, viaje, remodelación…' : 'Mercado, salidas… (opcional)'} className={`${inputClass} flex-1`} />
        </div>
      </Field>

      <Field label="MONTO">
        <MoneyInput digits={d.limit} onDigits={(v) => set({ limit: v })} />
      </Field>

      {custom && (
        <div className="flex flex-col gap-2">
          <Label>ICONO</Label>
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
                label={x.name}
                onClick={() => {
                  set({ cat: x.id, sub: null, auto: false })
                  if (!childCategories(x.id, false).length) setSection(null)
                }}
              />
            ))}
          </div>
          {d.cat && childCategories(d.cat, false).length > 0 && (
            <>
              <Label>Subcategoría de {categoryName(d.cat)}</Label>
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-1">
                {[{ id: null as string | null, name: 'Todas' }, ...childCategories(d.cat, false)].map((x) => (
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
          <div className="text-[11.5px] text-v2-dim">Elige desde qué billeteras cuentan los gastos.</div>
          <div className="flex flex-wrap gap-1.5">
            <Flat on={!wl} onClick={() => set({ walletIds: [] })}>
              Todas
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
              Mensual
            </Flat>
            <Flat on={d.period === 'custom'} onClick={() => set({ period: 'custom' })}>
              Rango personalizado
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

      <ModalFooter left={budget && <DangerLink onClick={() => setConfirming(true)}>Eliminar presupuesto</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>

      {confirming && budget && (
        <ConfirmDialog
          title={`Eliminar el presupuesto “${label}”`}
          lines={[`${format(budget.spent)} gastados de ${format(budget.limit)} · ${budgetPeriodLabel(budget)}`, 'Su historial de avance y sus alertas', 'Tus movimientos no se borran; solo dejan de contar para este límite']}
          ack="Entiendo que el presupuesto y su historial se eliminan."
          cta="Eliminar presupuesto"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </V2Modal>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PlanMark } from '@/components/v2/CategoryMark'
import { IC, Icon, RadioDot } from '@/components/v2/Kit'
import { currentLanguage, fill, tr } from '@/lib/i18n/translations'
import { PLAN_ICONS } from '@/lib/taxonomy'
import { cn } from '@/lib/cn'
import { CALC, OPS, evalExpr, fmtExpr, hasOps, pressKey, typedExpr } from '@/lib/nuevoMovimiento'

// Guided steps for the create/edit forms that were too crowded for one
// modal (budgets, goals) — same structure as Android's StepSheet: a header
// with back and close, "Paso n de N" plus a segmented progress bar (the text
// carries the step, so it isn't color alone), one question per step in its
// own scroll, and the primary action fixed at the bottom.
export function StepModal({
  title,
  context,
  step,
  stepCount,
  onBack,
  onClose,
  primaryLabel,
  primaryEnabled,
  onPrimary,
  busy,
  showPrimary = true,
  showBack = step > 0,
  footer,
  direction,
  children,
}: {
  title: string
  context?: string
  step: number
  stepCount: number
  onBack: () => void
  onClose: () => void
  primaryLabel: string
  primaryEnabled: boolean
  onPrimary: () => void
  busy?: boolean
  showPrimary?: boolean
  showBack?: boolean
  footer?: ReactNode
  direction: 'next' | 'back'
  children: ReactNode
}) {
  const headingRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Each new step moves focus to its question so screen readers announce it.
  useEffect(() => {
    headingRef.current?.querySelector<HTMLElement>('[data-step-heading]')?.focus()
  }, [step])
  const caption = [context, fill(tr('step.of'), step + 1, stepCount)].filter(Boolean).join(' · ')
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-50 flex animate-overlay-in items-center justify-center bg-[rgba(6,6,12,.62)] p-6 [line-height:normal]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="box-border flex max-h-[calc(100vh-48px)] w-[520px] max-w-full animate-dialog-in flex-col overflow-hidden rounded-[18px] border border-border-input bg-surface text-ink shadow-[0_24px_60px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center gap-1 px-4 pt-4">
          {showBack && <StepIconButton paths={['M19 12H5', 'M12 19l-7-7 7-7']} label={tr('step.back')} onClick={onBack} />}
          <div className={cn('min-w-0 flex-1', showBack ? 'pl-1' : 'pl-2.5')}>
            <div className="truncate text-title-sm font-semibold">{title}</div>
            <div className="truncate text-caption text-ink-secondary" aria-live="polite">
              {caption}
            </div>
          </div>
          <StepIconButton paths={['M18 6 6 18', 'M6 6l12 12']} label={tr('step.close')} onClick={onClose} />
        </div>
        <div className="flex gap-1.5 px-[26px] pt-3 pb-5" aria-hidden="true">
          {Array.from({ length: stepCount }, (_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? '[background:var(--cta-bg)]' : 'bg-surface-sunken')} />
          ))}
        </div>
        <div ref={headingRef} key={step} className={cn('min-h-0 flex-1 overflow-y-auto px-[26px] pb-4', direction === 'next' ? 'animate-step-next' : 'animate-step-back')}>
          {children}
        </div>
        {(showPrimary || footer) && (
        <div className="flex flex-col gap-4 border-t border-border px-[26px] py-4">
          {showPrimary && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={!primaryEnabled || busy}
              className="btn-cta h-11 w-full cursor-pointer whitespace-nowrap rounded-full text-label font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {primaryLabel}
            </button>
          )}
          {footer}
        </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function StepIconButton({ paths, label, onClick }: { paths: string[]; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full hover:bg-surface-sunken">
      <Icon paths={paths} size={20} color="var(--v2-muted)" />
    </button>
  )
}

// The step's question and an optional hint. Focusable so a new step is announced.
export function StepQuestion({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 data-step-heading tabIndex={-1} className="text-title font-bold outline-none">
        {text}
      </h2>
      {hint && <p className="mt-1.5 text-body-sm text-ink-secondary">{hint}</p>}
    </div>
  )
}

// A large single-choice card: mark, title and detail, and a radio dot, so
// the selected card isn't marked by color alone.
export function ChoiceCard({ icon, title, detail, on, onClick }: { icon: string[]; title: string; detail: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-left transition-colors duration-150',
        on ? 'border-2 border-primary-border bg-v2-accent/10' : 'border border-border-input bg-surface hover:bg-surface-sunken',
      )}
    >
      {/* The brand tint (`link`), drawn here because GlyphMark takes a hex. */}
      <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-v2-accent/16">
        <Icon paths={icon} size={20} color="var(--color-link)" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-body-sm text-ink-secondary">{detail}</span>
      </span>
      <RadioDot on={on} />
    </button>
  )
}

// The amount on the hero surface, as in Nuevo movimiento: overline, the
// figure in display-sm (typed arithmetic allowed) and the calculator keys.
export function AmountHero({ label, expr, onExpr, code = 'COP', symbol = '$' }: { label: string; expr: string; onExpr: (v: string) => void; code?: string; symbol?: string }) {
  const [calc, setCalc] = useState(false)
  const total = evalExpr(expr)
  const id = `amount-${label.replace(/\W+/g, '-')}`
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1 overflow-hidden rounded-[18px] border border-[var(--hero-line)] px-[18px] py-4 text-white" style={{ background: 'var(--hero-bg)' }}>
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="flex-1 truncate text-overline font-bold uppercase text-[var(--hero-overline)]">
            {label}
          </label>
          <button
            type="button"
            aria-pressed={calc}
            onClick={() => setCalc(!calc)}
            className="box-border flex h-8 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-[11px] text-caption font-extrabold text-white"
            style={{ background: calc ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.1)', borderColor: calc ? '#fff' : 'transparent' }}
          >
            <Icon paths={IC.calc} size={14} color="#fff" />
            {tr(calc ? 'nm.calculator' : 'nm.keypad')}
          </button>
          <span className="flex h-8 flex-none items-center rounded-full bg-[var(--hero-tile)] px-3 text-caption font-extrabold text-white">{code}</span>
        </div>
        <div className="flex items-baseline">
          <span className="font-numeric text-display-sm font-extrabold text-white">{symbol}</span>
          <input
            id={id}
            value={fmtExpr(expr)}
            onChange={(e) => onExpr(typedExpr(e.target.value))}
            placeholder="0"
            inputMode="decimal"
            autoFocus
            className="min-w-0 flex-1 border-none bg-transparent px-0.5 py-px font-[inherit] text-display-sm font-extrabold tracking-[-.02em] text-white outline-none [font-variant-numeric:tabular-nums] placeholder:text-white/85"
          />
        </div>
        {hasOps(expr) && <div className="font-numeric text-body-sm font-extrabold text-white">{'= ' + symbol + total.toLocaleString(currentLanguage() === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 2 })}</div>}
        <div className="text-caption text-white/85">{tr('nm.opsHint')}</div>
      </div>
      {calc && (
        <div className="grid grid-cols-4 gap-1.5">
          {CALC.map((k) => {
            const op = OPS.includes(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => onExpr(pressKey(expr, k))}
                className={cn(
                  'flex h-10 cursor-pointer select-none items-center justify-center rounded-[10px] border font-semibold',
                  op
                    ? 'border-transparent bg-v2-accent/16 text-title-sm text-link'
                    : k === '='
                      ? 'row-span-2 h-auto border-transparent bg-v2-accent/32 text-title text-white'
                      : k === 'C' || k === '⌫'
                        ? 'border-border bg-surface-sunken text-body-sm font-semibold text-ink-secondary'
                        : 'border-border bg-surface-sunken text-title-sm text-ink',
                )}
              >
                {k}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The plan icon picker (goals and custom budgets): 6 per row, 44 px cells;
// the selected icon gets a ring and a check badge.
export function PlanIconPicker({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  return (
    <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-2" role="radiogroup">
      {PLAN_ICONS.map((p) => {
        const on = value === p.key
        const name = currentLanguage() === 'en' ? p.nameEn : p.name
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={name}
            title={name}
            onClick={() => onPick(p.key)}
            className={cn('relative flex h-12 cursor-pointer items-center justify-center rounded-[12px] border-2', on ? 'border-primary-border' : 'border-transparent hover:bg-surface-sunken')}
          >
            <PlanMark icon={p.key} box={36} />
            {on && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Icon paths={IC.check} size={10} color="var(--on-primary)" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// A note with an info icon (the scope summary under a step).
export function StepNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-[12px] bg-surface-sunken px-3.5 py-3">
      <Icon paths={['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01']} size={18} color="var(--v2-muted)" />
      <div className="font-numeric text-body-sm text-ink">{children}</div>
    </div>
  )
}

// The edit form's delete action: a full-width destructive outline button.
export function StepDeleteButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-10 w-full cursor-pointer whitespace-nowrap rounded-full border border-negative text-label font-semibold text-negative hover:bg-negative/10">
      {children}
    </button>
  )
}

// Two or three options side by side (a loan's direction): 48 px segments
// with an icon and label; the selected one gets a 2 px ring, the brand tint
// and a check, so it isn't marked by color alone.
export function SegmentedChoice<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; icon: string[] }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] px-3 text-label font-semibold text-ink transition-colors duration-150',
              on ? 'border-2 border-primary-border bg-v2-accent/10' : 'border border-border-input bg-surface hover:bg-surface-sunken',
            )}
          >
            <Icon paths={on ? IC.check : o.icon} size={18} color={on ? 'var(--color-link)' : 'var(--v2-muted)'} />
            <span className="truncate">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

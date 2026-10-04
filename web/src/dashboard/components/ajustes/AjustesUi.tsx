import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'
import { flatClass } from '@/components/v2/Kit'

// The Ajustes building blocks on the design-system tokens and type roles
// (cards, rows, chips, segmented control, switches, form fields, buttons).

export function AjCard({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn('nova-card text-ink', className)} style={style}>
      {children}
    </div>
  )
}

export function AjCardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-title font-semibold">{children}</h2>
}

// A settings row: label + detail on the left, a control on the right.
export function AjRow({ label, detail, danger, last, children }: { label: string; detail: ReactNode; danger?: boolean; last?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5', !last && 'border-b border-divider')}>
      <div className="min-w-[180px] flex-1">
        <div className={cn('text-title-sm font-semibold', danger && 'text-negative')}>{label}</div>
        <div className="text-body-sm text-ink-secondary">{detail}</div>
      </div>
      {children}
    </div>
  )
}

export function AjOutlineButton({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 flex-none cursor-pointer whitespace-nowrap rounded-[12px] border bg-surface px-4 text-label font-semibold',
        danger ? 'border-negative text-negative hover:bg-negative-soft' : 'border-border-input text-ink hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  )
}

export function AjPills<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={flatClass(selected)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// Segmented (§6.5): `surface-sunken` track, the selected segment on
// `surface` with a border and weight 600; 36 px tall, radio semantics.
export function AjSegmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-9 flex-none gap-1 rounded-[10px] bg-surface-sunken p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'cursor-pointer whitespace-nowrap rounded-[7px] border px-3 text-label',
              selected ? 'border-border bg-surface font-semibold text-ink shadow-[var(--shadow-sm)]' : 'border-transparent font-medium text-ink-secondary hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function AjSwitch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        // A 48×30 track with a 24 px knob; the off track is `border-input` (3:1).
        'flex h-[30px] w-[48px] flex-none cursor-pointer rounded-full p-[3px] transition-[background] duration-150 motion-reduce:transition-none',
        on ? 'justify-end [background:var(--cta-bg)]' : 'justify-start bg-border-input',
      )}
    >
      <span className="block h-6 w-6 rounded-full bg-white" />
    </button>
  )
}

// "← Ajustes" + title + subtitle, above every sub-view.
// `children` go under the title, in the same block (Categorías' tabs).
export function AjSubHeader({ title, subtitle, danger, action, children }: { title: string; subtitle: string; danger?: boolean; action?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2.5">
      <Link to="/ajustes" className="-mx-1 flex min-h-8 items-center self-start rounded-[8px] px-1 text-label font-semibold text-link hover:bg-surface-sunken">
        {t('aj.back')}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={cn('text-display-sm font-medium tracking-[-.025em]', danger && 'text-negative')}>{title}</h1>
          <div className="mt-1 text-body-sm text-ink-secondary">{subtitle}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// Input (§6.6): a visible label above a 44 px field (`tall`: 48 px, the
// password view).
export function AjField({ label, tall, ...input }: { label: string; tall?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-overline font-semibold text-ink-secondary">{label}</span>
      <input
        {...input}
        className={cn('box-border w-full rounded-[8px] border border-border-input bg-surface px-3.5 font-[inherit] text-body text-ink placeholder:text-ink-tertiary focus:border-primary-border disabled:bg-surface-sunken disabled:text-ink-tertiary', tall ? 'h-12' : 'h-11')}
      />
    </label>
  )
}

export function AjMessage({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={cn('rounded-[10px] px-3 py-2.5 text-body-sm font-semibold', ok ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative')}
    >
      {children}
    </div>
  )
}

export function AjActions({ onCancel, submitLabel, onSubmit, submitClassName, disabled }: { onCancel: () => void; submitLabel: string; onSubmit: () => void; submitClassName?: string; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="h-11 cursor-pointer whitespace-nowrap rounded-[12px] border border-border-input bg-surface px-4 text-label font-semibold text-ink hover:bg-surface-sunken">
        {t('aj.cancel')}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        aria-disabled={disabled}
        className={cn('flex h-11 items-center whitespace-nowrap rounded-[12px] px-4 text-label font-semibold text-white', submitClassName ?? 'bg-primary hover:bg-primary-pressed', disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer')}
      >
        {submitLabel}
      </button>
    </div>
  )
}

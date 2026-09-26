import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

// The Ajustes building blocks, drawn to the Dashboard v2 mockup's
// Settings views (cards, rows, pills, switches, form fields, buttons).

export function AjCard({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn('rounded-[16px] border border-v2-line bg-v2-surface', className)} style={style}>
      {children}
    </div>
  )
}

export function AjCardTitle({ children }: { children: ReactNode }) {
  return <div className="text-[14px] font-extrabold tracking-[-.01em]">{children}</div>
}

// A settings row: label + detail on the left, a control on the right.
export function AjRow({ label, detail, danger, last, children }: { label: string; detail: ReactNode; danger?: boolean; last?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-4 py-[15px]', !last && 'border-b border-v2-subtle')}>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[13px] font-bold', danger && 'text-v2-neg')}>{label}</div>
        <div className="mt-0.5 text-[11.5px] text-v2-dim">{detail}</div>
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
        'flex-none cursor-pointer rounded-[10px] border px-3.5 py-2 text-[12px] font-bold',
        danger ? 'border-[rgba(255,98,98,.35)] text-v2-neg hover:bg-[rgba(255,98,98,.1)]' : 'border-v2-line2 text-v2-muted hover:text-v2-text',
      )}
    >
      {children}
    </button>
  )
}

export function AjPills<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup">
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
              'cursor-pointer rounded-[9px] border px-[13px] py-[7px] text-[11.5px] font-bold',
              selected ? 'border-v2-accent bg-v2-accent text-white' : 'border-v2-line2 bg-v2-surface2 text-v2-dim',
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
        // The mockup's 42×24 track plus its 3px padding (content-box sizing).
        'flex h-[30px] w-[48px] flex-none cursor-pointer rounded-full p-[3px] transition-[background] duration-200',
        on ? 'justify-end bg-v2-accent' : 'justify-start bg-v2-line2',
      )}
    >
      <span className="block h-[18px] w-[18px] rounded-full bg-white" />
    </button>
  )
}

// "← Ajustes" + title + subtitle, above every sub-view.
// `children` go under the title, in the same block (Categorías' tabs).
export function AjSubHeader({ title, subtitle, danger, action, children }: { title: string; subtitle: string; danger?: boolean; action?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2.5">
      <Link to="/ajustes" className="self-start text-[12px] font-bold text-v2-accent2">
        {t('aj.back')}
      </Link>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className={cn('text-[24px] font-extrabold tracking-[-.025em]', danger && 'text-v2-neg')}>{title}</h1>
          <div className="mt-[3px] text-[12.5px] text-v2-dim">{subtitle}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// `tall`: the password view's inputs have no box-sizing in the mockup, so
// they render 48px (46 + border) instead of the other forms' 46.
export function AjField({ label, tall, ...input }: { label: string; tall?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[.06em] text-v2-muted">{label}</span>
      <input
        {...input}
        className={cn('box-border w-full rounded-[12px]', tall ? 'h-12' : 'h-[46px]', ' border border-v2-line bg-v2-sidebar px-3.5 font-[inherit] text-[13px] text-v2-text outline-none placeholder:text-[#757575] focus:border-v2-accent')}
      />
    </label>
  )
}

export function AjMessage({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={cn('rounded-[10px] px-3 py-2.5 text-[12px] font-bold', ok ? 'bg-[rgba(124,240,187,.1)] text-v2-pos' : 'bg-[rgba(255,98,98,.1)] text-v2-neg')}
    >
      {children}
    </div>
  )
}

export function AjActions({ onCancel, submitLabel, onSubmit, submitClassName, disabled }: { onCancel: () => void; submitLabel: string; onSubmit: () => void; submitClassName?: string; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="cursor-pointer rounded-[10px] border border-v2-line2 px-4 py-2.5 text-[12.5px] font-bold text-v2-muted">
        {t('aj.cancel')}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        aria-disabled={disabled}
        // Stretched to Cancelar's bordered height with its label kept at the
        // top, like the mockup's div button.
        className={cn('flex items-start rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold text-white', submitClassName ?? 'bg-v2-accent', disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer')}
      >
        {submitLabel}
      </button>
    </div>
  )
}

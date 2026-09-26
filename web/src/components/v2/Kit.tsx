import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Glyph, GlyphMark } from '@/components/v2/CategoryMark'
import { PLAN_ICONS } from '@/lib/taxonomy'
import { cn } from '@/lib/cn'

// Building blocks of the Web v2 mockup's modals and inline sections —
// verbatim from its style helpers (flat, tileBox, tileLab, gridCell,
// gridLab, iconGrid, radioStyles, IC).

export const IC = {
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  cal: ['M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  repeat: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5'],
  wallet: ['M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12', 'M17 13h.01'],
  clip: ['M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L15 7.5'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  camera: ['M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  image: ['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6', 'M15.5 9.5h.01'],
  file: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
  keypad: ['M5 5h.01', 'M12 5h.01', 'M19 5h.01', 'M5 12h.01', 'M12 12h.01', 'M19 12h.01', 'M5 19h.01', 'M12 19h.01', 'M19 19h.01'],
  calc: ['M5 3h14v18H5z', 'M8 7h8', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01', 'M8 16h.01', 'M12 16h.01', 'M16 16h.01'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  warn: ['M12 3 2 21h20z', 'M12 10v5', 'M12 18h.01'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  note: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  enter: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  share: ['M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7', 'M16 6l-4-4-4 4', 'M12 2v13'],
  pencil: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
} as const

// The mockup's svgI(): stroke 1.9.
export function Icon({ paths, size, color }: { paths: readonly string[]; size: number; color: string }) {
  return <Glyph paths={[...paths]} size={size} color={color} strokeWidth={1.9} />
}

// Centered modal (budget, goal, wallet, abono): 500–520px, 18px radius.
export function V2Modal({ width = 500, onClose, children, label }: { width?: number; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,6,12,.62)] p-6 [line-height:normal]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="box-border flex max-h-[calc(100vh-48px)] max-w-full flex-col gap-5 overflow-y-auto overflow-x-hidden rounded-[18px] border border-v2-line2 bg-v2-surface px-[26px] py-6 text-v2-text shadow-[0_24px_60px_rgba(0,0,0,.45)]"
        style={{ width }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <div className="text-[15px] font-extrabold">{children}</div>
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-bold tracking-[.06em] text-v2-muted">{children}</label>
}

export function Field({ label, children, note }: { label: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {note && <div className="text-[11px] text-v2-dim">{note}</div>}
    </div>
  )
}

export const inputClass =
  'box-border h-[42px] w-full min-w-0 rounded-[10px] border border-v2-line bg-v2-sidebar px-3 font-[inherit] text-[13px] text-v2-text outline-none [color-scheme:dark] placeholder:text-v2-dim'

export function TextInput({ value, onChange, placeholder, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className={cn(inputClass, className)} />
}

export function DateInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, className)} />
}

// Digits only, shown grouped ("250.000"), with the currency symbol. The
// mockup's input keeps the page font (its inline font-family beats `.num`)
// and the browser's 1px 2px input padding.
export function MoneyInput({ digits, onDigits, symbol = '$' }: { digits: string; onDigits: (d: string) => void; symbol?: string }) {
  return (
    <div className="box-border flex h-[42px] items-center gap-1.5 rounded-[10px] border border-v2-line bg-v2-sidebar px-3">
      <span className="font-numeric text-[14px] font-extrabold text-v2-muted">{symbol}</span>
      <input
        value={digits ? Number(digits).toLocaleString('es-CO') : ''}
        onChange={(e) => onDigits(e.target.value.replace(/\D/g, '').slice(0, 12))}
        inputMode="numeric"
        placeholder="0"
        className="min-w-0 flex-1 border-none bg-transparent px-0.5 py-px font-[inherit] text-[14px] font-extrabold text-v2-text outline-none [font-variant-numeric:tabular-nums]"
      />
    </div>
  )
}

export function flatClass(on: boolean): string {
  return cn(
    'cursor-pointer whitespace-nowrap rounded-[10px] border px-[13px] py-2 text-[12px] font-bold',
    on ? 'border-v2-accent bg-v2-accent text-white' : 'border-v2-line2 bg-v2-surface2 text-v2-muted',
  )
}

export function Flat({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(flatClass(on), className)}>
      {children}
    </button>
  )
}

export function Pills<T>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Flat key={String(o.value)} on={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Flat>
      ))}
    </div>
  )
}

// An option tile: the mockup's 44px content-box (46px with its border)
// rounded box + a two-line label (budget and Nuevo movimiento option rows).
export function OptionTile({ icon, label, on, open, onClick }: { icon: ReactNode; label: string; on: boolean; open?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5">
      <span
        className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border"
        style={{
          background: on || open ? 'rgba(108,92,231,.16)' : 'var(--v2-surface2)',
          borderColor: on || open ? 'var(--v2-accent)' : 'var(--v2-line2)',
          outline: open ? '2px solid rgba(108,92,231,.35)' : 'none',
          outlineOffset: 2,
        }}
      >
        {icon}
      </span>
      <span
        className="line-clamp-2 max-w-full overflow-hidden text-center text-[11px] leading-[1.3] [overflow-wrap:anywhere]"
        style={{ fontWeight: on ? 800 : 600, color: on ? 'var(--v2-text)' : 'var(--v2-muted)' }}
      >
        {label}
      </span>
    </button>
  )
}

// An inline section box ("Listo" closes the Nuevo movimiento ones).
export function SectionBox({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('flex flex-col gap-2.5 rounded-[14px] border border-v2-line2 bg-v2-surface2 p-3', className)} style={style}>
      {children}
    </div>
  )
}

// A category/subcategory grid cell (the mockup's gridCell + gridLab).
export function GridCell({ on, color, chip, label, onClick }: { on: boolean; color: string; chip: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-[12px] px-0.5 py-2.5"
      style={{ background: on ? `color-mix(in oklab, ${color} 14%, transparent)` : 'transparent', border: `1.5px solid ${on ? color : 'transparent'}` }}
    >
      {chip}
      <span lang="es" className="w-full text-center text-[10.5px] font-bold leading-[1.2] text-v2-muted [overflow-wrap:break-word] [hyphens:auto]">
        {label}
      </span>
    </button>
  )
}

// PLAN_ICONS picker, 9 per row.
export function PlanIconGrid({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  return (
    <div className="grid grid-cols-[repeat(9,minmax(0,1fr))] gap-1">
      {PLAN_ICONS.map((p) => (
        <button
          key={p.key}
          type="button"
          title={p.name}
          onClick={() => onPick(p.key)}
          className="flex cursor-pointer justify-center rounded-[10px] py-1"
          style={{ border: `1.5px solid ${value === p.key ? p.color : 'transparent'}` }}
        >
          <GlyphMark paths={p.glyph} color={p.color} box={30} />
        </button>
      ))}
    </div>
  )
}

export function RadioRow({ on, onClick, children, leading }: { on: boolean; onClick: () => void; children: ReactNode; leading?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left"
      style={{ borderColor: on ? 'var(--v2-accent)' : 'var(--v2-line2)', background: on ? 'rgba(108,92,231,.12)' : 'transparent' }}
    >
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      <RadioDot on={on} />
    </button>
  )
}

export function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      // The mockup's 16px dot is content-box: 20px with its 2px border.
      className="h-5 w-5 flex-none rounded-full"
      style={{
        border: `2px solid ${on ? 'var(--v2-accent)' : 'var(--v2-line2)'}`,
        background: on ? 'var(--v2-accent)' : 'transparent',
        boxShadow: on ? 'inset 0 0 0 2.5px var(--v2-surface)' : 'none',
      }}
    />
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-[10px] bg-[rgba(255,98,98,.1)] px-3 py-2.5 text-[12px] font-bold text-v2-neg">
      {children}
    </div>
  )
}

export function CancelButton({ onClick, children = 'Cancelar' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer whitespace-nowrap rounded-[10px] border border-v2-line2 px-4 py-2.5 text-[12.5px] font-bold text-v2-muted">
      {children}
    </button>
  )
}

// Enabled look only when the form is valid; a click on the disabled look
// still reports why (the mockup shows the error instead of doing nothing).
export function SaveButton({ valid, onClick, children = 'Guardar', busy }: { valid: boolean; onClick: () => void; children?: ReactNode; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold"
      style={{ cursor: valid ? 'pointer' : 'not-allowed', color: valid ? '#fff' : 'var(--v2-dim)', background: valid ? 'var(--v2-accent)' : 'var(--v2-surface2)' }}
    >
      {children}
    </button>
  )
}

export function DangerLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer text-[12.5px] font-bold text-v2-neg">
      {children}
    </button>
  )
}

export function ModalFooter({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {left}
      <div className="flex-1" />
      {children}
    </div>
  )
}

// The mockup's two-step destructive confirmation (askConfirm): what gets
// deleted, then "No se puede deshacer" with an acknowledgement checkbox.
// Sits above the modal that opened it.
export function ConfirmDialog({ title, lines, ack, cta, onCancel, onConfirm }: { title: string; lines: string[]; ack: string; cta: string; onCancel: () => void; onConfirm: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])
  const secondary = 'cursor-pointer whitespace-nowrap rounded-[10px] border border-v2-line2 px-4 py-2.5 text-[12.5px] font-bold text-v2-muted'
  return createPortal(
    <div onClick={onCancel} className="fixed inset-0 z-[58] flex items-center justify-center bg-[rgba(6,6,12,.7)] p-6 [line-height:normal]">
      <div
        // The mockup's 440px is content-box: 486px with its 22px padding and border.
        role="alertdialog"
        aria-modal="true"
        aria-label={step === 1 ? title : 'No se puede deshacer'}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[486px] max-w-full flex-col gap-3.5 rounded-[18px] border border-v2-line2 bg-v2-surface p-[22px] text-v2-text shadow-[0_24px_60px_rgba(0,0,0,.45)]"
      >
        <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-v2-neg-soft">
          <Icon paths={step === 1 ? IC.trash : IC.warn} size={20} color="var(--v2-neg)" />
        </span>
        {step === 1 ? (
          <>
            <div className="text-[16px] font-extrabold">{title}</div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-v2-dim">SE VA A ELIMINAR</div>
            <div className="flex flex-col gap-[7px]">
              {lines.map((l) => (
                <div key={l} className="flex gap-2.5 text-[12.5px] leading-[1.45] text-v2-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-v2-neg" />
                  <span className="font-numeric">{l}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className={secondary}>
                Cancelar
              </button>
              <button type="button" onClick={() => setStep(2)} className="cursor-pointer rounded-[10px] border border-v2-neg px-4 py-2.5 text-[12.5px] font-bold text-v2-neg">
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-[16px] font-extrabold">No se puede deshacer</div>
            <button type="button" onClick={() => setChecked(!checked)} className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-v2-line2 p-3 text-left">
              <span
                className="box-border flex h-5 w-5 flex-none items-center justify-center rounded-[6px]"
                style={{ border: `2px solid ${checked ? 'var(--v2-neg)' : 'var(--v2-line2)'}`, background: checked ? 'var(--v2-neg)' : 'transparent' }}
              >
                {checked && <Icon paths={IC.check} size={12} color="#fff" />}
              </span>
              <span className="text-[12.5px] leading-[1.45]">{ack}</span>
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setStep(1); setChecked(false) }} className={secondary}>
                Volver
              </button>
              <button
                type="button"
                onClick={() => checked && onConfirm()}
                className="rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold"
                style={{ cursor: checked ? 'pointer' : 'not-allowed', background: checked ? 'var(--v2-neg)' : 'var(--v2-neg-soft)', color: checked ? '#fff' : 'var(--v2-dim)' }}
              >
                {cta}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

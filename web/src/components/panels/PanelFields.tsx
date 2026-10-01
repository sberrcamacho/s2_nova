import type { ReactNode } from 'react'
import { chipClass, fieldLabelClass } from '@/components/panels/SidePanel'
import { shortWallet } from '@/lib/movimientos'
import { cn } from '@/lib/cn'
import type { Wallet } from '@/types'

// Field pieces for the Planes side panels, in the "Nuevo movimiento" panel's
// idiom (uppercase 11px label, 44px input on --sidebar). The copy and the
// fields themselves mirror Android's v2 sheets.

export const panelInputClass =
  'box-border h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-body-sm text-ink outline-none placeholder:text-ink-secondary focus:border-primary-border'

export function PanelField({ label, htmlFor, aside, note, children }: { label: string; htmlFor?: string; aside?: ReactNode; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={cn(fieldLabelClass, 'uppercase')}>
            {label}
          </label>
        ) : (
          <div className={cn(fieldLabelClass, 'uppercase')}>{label}</div>
        )}
        {aside}
      </div>
      {children}
      {note && <div className="text-caption text-ink-secondary">{note}</div>}
    </div>
  )
}

export function WalletChips({ wallets, selected, onSelect }: { wallets: Wallet[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {wallets.map((w) => (
        <button key={w.id} type="button" aria-pressed={selected === w.id} onClick={() => onSelect(w.id)} className={chipClass(selected === w.id)}>
          {shortWallet(w.name)}
        </button>
      ))}
    </div>
  )
}

// Mockup inkOn: dark text on light fills, white otherwise.
function inkOn(hex: string): string {
  const h = hex.replace('#', '')
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? '#111118' : '#ffffff'
}

// A color-coded choice chip (category / goal category), the mockup pill
// formula: color at 12% with a 35% border, filled when selected.
export function ColorChip({ label, color, selected, onClick }: { label: string; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="cursor-pointer whitespace-nowrap rounded-full border px-[13px] py-2 text-body-sm"
      style={
        selected
          ? { background: color, borderColor: 'transparent', color: inkOn(color), fontWeight: 800 }
          : { background: `${color}1f`, borderColor: `${color}59`, color: 'var(--v2-text)', fontWeight: 600 }
      }
    >
      {label}
    </button>
  )
}

export const dangerButtonClass =
  'mr-auto cursor-pointer rounded-[10px] border border-[rgba(255,98,98,.35)] px-4 py-2.5 text-body-sm font-semibold text-negative disabled:cursor-not-allowed disabled:opacity-60'

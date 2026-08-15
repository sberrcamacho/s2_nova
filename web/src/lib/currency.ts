import type { CurrencyCode } from '@/types'

// Colombian peso formatting: "$125.000" — period as thousands separator,
// no decimals, no currency code. Intl's es-CO locale is used for the
// digit grouping only, so behavior is consistent across environments.

export function formatCOP(value: number, opts: { signed?: boolean } = {}): string {
  const rounded = Math.round(Math.abs(value))
  const grouped = rounded.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  const sign = value < 0 ? '-' : opts.signed && value > 0 ? '+' : ''
  return `${sign}$${grouped}`
}

// US dollar display formatting: "$125,000.00" — comma thousands separator,
// two decimals. This is a display-format switch only (same underlying
// amount, no real COP→USD conversion — there is no backend/FX rate).
export function formatUSD(value: number, opts: { signed?: boolean } = {}): string {
  const rounded = Math.abs(value)
  const grouped = rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sign = value < 0 ? '-' : opts.signed && value > 0 ? '+' : ''
  return `${sign}$${grouped}`
}

// Currency-aware entry point — used by the `useCurrency()` hook so every
// amount in the app respects the user's currency-format preference.
export function formatCurrency(value: number, currency: CurrencyCode, opts: { signed?: boolean } = {}): string {
  return currency === 'USD' ? formatUSD(value, opts) : formatCOP(value, opts)
}

// Compact form for tight spaces (KPI trend labels, chart axes): $1,2M / $850K
export function formatCOPCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`
  }
  return formatCOP(value)
}

export function formatUSDCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`
  }
  return formatUSD(value)
}

export function formatCurrencyCompact(value: number, currency: CurrencyCode): string {
  return currency === 'USD' ? formatUSDCompact(value) : formatCOPCompact(value)
}

export function formatPercent(value: number, opts: { signed?: boolean } = {}): string {
  const sign = value > 0 && opts.signed ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

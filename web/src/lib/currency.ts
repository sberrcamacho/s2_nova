// Multi-currency display (CURRENCIES_AND_WALLETS.md §2). Every amount shows
// its currency's symbol ("$", "US$", "€"…) with Colombian grouping
// ("$168.500", "US$5,99") — the mockup's fmtCur: decimals only when the
// value has them and the currency uses them.
import { currentLanguage } from '@/lib/i18n/translations'

export interface CurrencyInfo {
  code: string
  name: string
  nameEn: string
  symbol: string
  decimals: number
  // COP per unit; the backend's fallback when it has no rate of the day.
  referenceRate: number
}

export const CURRENCY_CATALOG: CurrencyInfo[] = [
  { code: 'COP', name: 'Peso colombiano', nameEn: 'Colombian peso', symbol: '$', decimals: 0, referenceRate: 1 },
  { code: 'USD', name: 'Dólar estadounidense', nameEn: 'US dollar', symbol: 'US$', decimals: 2, referenceRate: 3950 },
  { code: 'EUR', name: 'Euro', nameEn: 'Euro', symbol: '€', decimals: 2, referenceRate: 4300 },
  { code: 'MXN', name: 'Peso mexicano', nameEn: 'Mexican peso', symbol: 'MX$', decimals: 2, referenceRate: 215 },
  { code: 'PEN', name: 'Sol peruano', nameEn: 'Peruvian sol', symbol: 'S/', decimals: 2, referenceRate: 1050 },
  { code: 'BRL', name: 'Real brasileño', nameEn: 'Brazilian real', symbol: 'R$', decimals: 2, referenceRate: 720 },
  { code: 'GBP', name: 'Libra esterlina', nameEn: 'Pound sterling', symbol: '£', decimals: 2, referenceRate: 5000 },
  { code: 'CLP', name: 'Peso chileno', nameEn: 'Chilean peso', symbol: 'CLP$', decimals: 0, referenceRate: 4.2 },
  { code: 'ARS', name: 'Peso argentino', nameEn: 'Argentine peso', symbol: 'AR$', decimals: 2, referenceRate: 4 },
]

export function currencyInfo(code: string | null | undefined): CurrencyInfo {
  return CURRENCY_CATALOG.find((c) => c.code === code) ?? CURRENCY_CATALOG[0]
}

// "Dólar estadounidense" / "US dollar"; `fallback` for a code outside the
// catalog (the backend's own name).
export function currencyName(code: string, fallback?: string): string {
  const c = CURRENCY_CATALOG.find((x) => x.code === code)
  if (!c) return fallback ?? code
  return currentLanguage() === 'en' ? c.nameEn : c.name
}

// 1 `from` in `to` units at the reference rate.
export function referenceRate(from: string, to: string): number {
  return from === to ? 1 : currencyInfo(from).referenceRate / currencyInfo(to).referenceRate
}

// The browser's regional currency (ONBOARDING.md §2), from its locale's region.
const REGION_CURRENCY: Record<string, { currency: string; country: string; countryEn: string }> = {
  CO: { currency: 'COP', country: 'Colombia', countryEn: 'Colombia' },
  US: { currency: 'USD', country: 'Estados Unidos', countryEn: 'United States' },
  MX: { currency: 'MXN', country: 'México', countryEn: 'Mexico' },
  PE: { currency: 'PEN', country: 'Perú', countryEn: 'Peru' },
  BR: { currency: 'BRL', country: 'Brasil', countryEn: 'Brazil' },
  GB: { currency: 'GBP', country: 'Reino Unido', countryEn: 'United Kingdom' },
  CL: { currency: 'CLP', country: 'Chile', countryEn: 'Chile' },
  AR: { currency: 'ARS', country: 'Argentina', countryEn: 'Argentina' },
  ES: { currency: 'EUR', country: 'España', countryEn: 'Spain' },
  DE: { currency: 'EUR', country: 'Alemania', countryEn: 'Germany' },
  FR: { currency: 'EUR', country: 'Francia', countryEn: 'France' },
}

// `country` in the app language.
export function deviceRegion(): { currency: string; country: string } {
  const langs = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : []
  let hit = REGION_CURRENCY.CO
  for (const l of langs) {
    const region = l?.split('-')[1]?.toUpperCase()
    if (region && REGION_CURRENCY[region]) {
      hit = REGION_CURRENCY[region]
      break
    }
  }
  return { currency: hit.currency, country: currentLanguage() === 'en' ? hit.countryEn : hit.country }
}

// Plain grouped number without symbol ("168.500", "5,99").
export function groupNumber(value: number, decimals = 2): string {
  const v = Math.round(Math.abs(value) * 100) / 100
  const frac = v % 1 !== 0
  return v.toLocaleString('es-CO', { minimumFractionDigits: frac && decimals ? 2 : 0, maximumFractionDigits: frac ? 2 : 0 })
}

export function formatMoney(value: number, code = 'COP', opts: { signed?: boolean } = {}): string {
  const c = currencyInfo(code)
  const sign = value < 0 ? '−' : opts.signed && value > 0 ? '+' : ''
  return `${sign}${c.symbol}${groupNumber(value, c.decimals)}`
}

// Colombian peso formatting: "$125.000" — period as thousands separator,
// no decimals, no currency code.
export function formatCOP(value: number, opts: { signed?: boolean } = {}): string {
  const rounded = Math.round(Math.abs(value))
  const grouped = rounded.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  const sign = value < 0 ? '-' : opts.signed && value > 0 ? '+' : ''
  return `${sign}$${grouped}`
}

// Amounts in the principal currency (`useCurrency().format`). COP keeps
// the whole-peso format the v2 screens were verified with.
export function formatCurrency(value: number, currency: string, opts: { signed?: boolean } = {}): string {
  if (currency === 'COP') return formatCOP(value, opts)
  const c = currencyInfo(currency)
  const sign = value < 0 ? '-' : opts.signed && value > 0 ? '+' : ''
  return `${sign}${c.symbol}${groupNumber(value, c.decimals)}`
}

// Compact form for tight spaces (chart axes): $1,2M / $850K
export function formatCurrencyCompact(value: number, currency: string): string {
  const sym = currencyInfo(currency).symbol
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}${sym}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')}M`
  }
  if (abs >= 1_000) {
    return `${sign}${sym}${Math.round(abs / 1_000)}K`
  }
  return formatCurrency(value, currency)
}

export function formatPercent(value: number, opts: { signed?: boolean } = {}): string {
  const sign = value > 0 && opts.signed ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

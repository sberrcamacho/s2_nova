import type { LanguageCode } from '@/types'

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
const WEEKDAY_DAY_MONTH: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

// All formatters below take the app's language preference (not the device
// locale) so dates re-render in the right language the moment it changes in
// Settings, same as every other piece of UI copy.
function localeFor(language: LanguageCode): string {
  return language === 'en' ? 'en-US' : 'es-CO'
}

function toDate(iso: string): Date {
  // Force local-midnight parsing so dates never shift a day across timezones.
  return new Date(`${iso}T00:00:00`)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Local calendar date as YYYY-MM-DD. Deliberately avoids toISOString(),
// which converts to UTC and reports the wrong day for any negative-UTC
// timezone (e.g. Colombia, UTC-5) during local evening hours.
function localISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatShortDate(iso: string, language: LanguageCode = 'es'): string {
  return toDate(iso).toLocaleDateString(localeFor(language), DAY_MONTH)
}

export function formatLongDate(iso: string, language: LanguageCode = 'es'): string {
  return toDate(iso).toLocaleDateString(localeFor(language), DAY_MONTH_YEAR)
}

export function formatFullDate(iso: string, language: LanguageCode = 'es'): string {
  const text = toDate(iso).toLocaleDateString(localeFor(language), WEEKDAY_DAY_MONTH)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function todayISO(): string {
  return localISODate(new Date())
}

export function monthLabel(monthKey: string, language: LanguageCode = 'es'): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(localeFor(language), { month: 'short' })
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function isSameMonth(iso: string, monthKey: string): boolean {
  return iso.startsWith(monthKey)
}

// Reference Sunday (2023-01-01 was a Sunday) so weekday index 0-6
// (JS `Date.getDay()` order) maps to a localized weekday name via Intl
// instead of a hardcoded, language-specific name array.
export function weekdayLabel(dayIndex: number, language: LanguageCode = 'es'): string {
  const date = new Date(2023, 0, 1 + dayIndex)
  const text = date.toLocaleDateString(localeFor(language), { weekday: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function relativeDayLabel(iso: string, language: LanguageCode = 'es'): string {
  const date = toDate(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)

  if (diffDays === 0) return language === 'en' ? 'Today' : 'Hoy'
  if (diffDays === 1) return language === 'en' ? 'Yesterday' : 'Ayer'
  return formatShortDate(iso, language)
}

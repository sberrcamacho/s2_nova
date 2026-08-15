const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
const WEEKDAY_DAY_MONTH: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

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

export function formatShortDate(iso: string): string {
  return toDate(iso).toLocaleDateString('es-CO', DAY_MONTH)
}

export function formatLongDate(iso: string): string {
  return toDate(iso).toLocaleDateString('es-CO', DAY_MONTH_YEAR)
}

export function formatFullDate(iso: string): string {
  const text = toDate(iso).toLocaleDateString('es-CO', WEEKDAY_DAY_MONTH)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function todayISO(): string {
  return localISODate(new Date())
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'short' })
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function isSameMonth(iso: string, monthKey: string): boolean {
  return iso.startsWith(monthKey)
}

export function relativeDayLabel(iso: string): string {
  const date = toDate(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays > 1 && diffDays < 7) return formatShortDate(iso)
  return formatShortDate(iso)
}

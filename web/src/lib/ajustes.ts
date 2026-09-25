// Presentation helpers for Ajustes: relative times ("hace 4 meses"),
// count phrases ("68 movimientos") and the password rules shown live
// under "Cambiar contraseña" (the backend enforces the same rules).
import type { TranslationKey } from '@/lib/i18n/translations'
import { fill } from '@/lib/inicio'

type T = (key: TranslationKey) => string

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function timeAgo(iso: string, now: number, t: T): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime())
  const unit = (n: number, one: TranslationKey, many: TranslationKey) => (n === 1 ? t(one) : fill(t(many), n))
  if (elapsed < MINUTE) return t('aj.ago.now')
  if (elapsed < HOUR) return unit(Math.floor(elapsed / MINUTE), 'aj.ago.minute', 'aj.ago.minutes')
  if (elapsed < DAY) return unit(Math.floor(elapsed / HOUR), 'aj.ago.hour', 'aj.ago.hours')
  if (elapsed < 30 * DAY) return unit(Math.floor(elapsed / DAY), 'aj.ago.day', 'aj.ago.days')
  if (elapsed < 365 * DAY) return unit(Math.floor(elapsed / (30 * DAY)), 'aj.ago.month', 'aj.ago.months')
  return unit(Math.floor(elapsed / (365 * DAY)), 'aj.ago.year', 'aj.ago.years')
}

// "68 movimientos" from a "movimiento|movimientos" key.
export function counted(n: number, key: TranslationKey, t: T): string {
  const [one, many] = t(key).split('|')
  return `${n} ${n === 1 ? one : many}`
}

// "Mariana Torres" → "MT"
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?'
  )
}

export function passwordRules(next: string, confirm: string): { key: TranslationKey; ok: boolean }[] {
  return [
    { key: 'aj.pw.ruleLength', ok: next.length >= 8 },
    { key: 'aj.pw.ruleNumber', ok: /\d/.test(next) },
    { key: 'aj.pw.ruleMatch', ok: next.length > 0 && next === confirm },
  ]
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

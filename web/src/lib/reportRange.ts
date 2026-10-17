import { MONTHS_SHORT, monthYear } from '@/lib/inicio'
import { fill, translate } from '@/lib/i18n/translations'
import type { LanguageCode } from '@/types'

// Reportes' range: any span of up to 24 months the user picks (backend GET
// /summary/report from/to), kept until they pick another. `preset` is the
// backend's older `range` (the last N months).
export type ReportPreset = 3 | 6 | 12
export type ReportSpan = { from: string; to: string }
export type ReportSelection = { preset: ReportPreset } | ReportSpan

export const REPORT_MAX_MONTHS = 24
export const REPORT_DEFAULT_MONTHS = 6
const STORAGE_KEY = 's2nova.reportRange'

// "2026-04" + 3 → "2026-07".
export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

// Months in from..to, both included.
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + 1
}

// How a picked span is kept: one ending this month keeps following the
// current month ("rolling:6", the last six months), any other stays put
// ("fixed:2026-02:2026-04"). Android's ReportRange does the same.
export function encodeRange(from: string, to: string, currentMonth: string): string {
  return to === currentMonth ? `rolling:${monthsBetween(from, to)}` : `fixed:${from}:${to}`
}

// The months a kept range covers today; anything unreadable or no longer
// valid is the default (the last six months).
export function decodeRange(value: string | null, currentMonth: string): ReportSpan {
  const parts = value?.split(':') ?? []
  const key = /^\d{4}-(0[1-9]|1[0-2])$/
  const months = Number(parts[1])
  if (parts.length === 2 && parts[0] === 'rolling' && Number.isInteger(months) && months >= 1 && months <= REPORT_MAX_MONTHS) {
    return { from: shiftMonthKey(currentMonth, -months + 1), to: currentMonth }
  }
  const [, from, to] = parts
  if (parts.length === 3 && parts[0] === 'fixed' && key.test(from) && key.test(to) && from <= to && to <= currentMonth && monthsBetween(from, to) <= REPORT_MAX_MONTHS) {
    return { from, to }
  }
  return { from: shiftMonthKey(currentMonth, -REPORT_DEFAULT_MONTHS + 1), to: currentMonth }
}

// The kept range, in this browser only (a convenience; it may be missing).
export function loadRange(currentMonth: string): ReportSpan {
  try {
    return decodeRange(localStorage.getItem(STORAGE_KEY), currentMonth)
  } catch {
    return decodeRange(null, currentMonth)
  }
}

export function saveRange(from: string, to: string, currentMonth: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, encodeRange(from, to, currentMonth))
  } catch {
    // Storage blocked: the range lasts for this visit.
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// The period button's label: "Feb – Abr 2026", or "Nov 25 – Feb 26" across
// years; one month is "Abr 2026".
export function rangeChipLabel(from: string, to: string, language: LanguageCode): string {
  const name = (key: string) => cap(MONTHS_SHORT[language][Number(key.slice(5, 7)) - 1])
  if (from === to) return `${name(from)} ${from.slice(0, 4)}`
  if (from.slice(0, 4) === to.slice(0, 4)) return `${name(from)} – ${name(to)} ${to.slice(0, 4)}`
  return `${name(from)} ${from.slice(2, 4)} – ${name(to)} ${to.slice(2, 4)}`
}

// "Febrero 2026 – Abril 2026", or "Febrero 2026" for one month.
export function spanLabel(from: string, to: string, language: LanguageCode): string {
  return from === to ? monthYear(from, language) : fill(translate('rep.range.span', language), monthYear(from, language), monthYear(to, language))
}

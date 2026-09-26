// Pure helpers of "Nuevo movimiento" (NEW_MOVEMENT.md), verbatim from the
// Web v2 mockup: the typed/keyed arithmetic (evalExpr, fmtExpr, the
// calculator keys), Repetir's summary lines and short dates.

export const OPS = ['+', '−', '×', '÷']
export const CALC = ['C', '⌫', '÷', '×', '7', '8', '9', '−', '4', '5', '6', '+', '1', '2', '3', '=', '00', '0', ',']

// Evaluates "150000+18500×2" with × ÷ before + −; ÷ 0 is ignored, the
// result is rounded to 2 decimals and never negative.
export function evalExpr(e: string): number {
  const toks = String(e || '').match(/\d+(?:,\d*)?|[+−×÷]/g) || []
  const nums: number[] = []
  const ops: string[] = []
  toks.forEach((x) => (OPS.includes(x) ? ops.push(x) : nums.push(parseFloat(x.replace(',', '.')) || 0)))
  if (!nums.length) return 0
  const o = ops.slice(0, nums.length - 1)
  const n = [nums[0]]
  const add: string[] = []
  o.forEach((op, i) => {
    const b = nums[i + 1]
    if (op === '×') n[n.length - 1] *= b
    else if (op === '÷') n[n.length - 1] = b ? n[n.length - 1] / b : n[n.length - 1]
    else {
      add.push(op)
      n.push(b)
    }
  })
  let r = n[0]
  add.forEach((op, i) => {
    r = op === '+' ? r + n[i + 1] : r - n[i + 1]
  })
  return Math.max(0, Math.round(r * 100) / 100)
}

export const hasOps = (e: string) => /[+−×÷]/.test(e)

const numStr = (n: number) => String(n).replace('.', ',')

// "150000+18500" → "150.000 + 18.500".
export function fmtExpr(e: string): string {
  return String(e || '')
    .replace(/\d+(,\d*)?/g, (m) => {
      const [i, d] = m.split(',')
      return Number(i).toLocaleString('es-CO') + (d !== undefined ? ',' + d : '')
    })
    .replace(/([+−×÷])/g, ' $1 ')
}

// What the amount field keeps from typed text: digits, "," and the four
// operators (* / - x are mapped); the displayed grouping dots are dropped.
export function typedExpr(value: string): string {
  return value
    .replace(/\*/g, '×')
    .replace(/x/gi, '×')
    .replace(/\//g, '÷')
    .replace(/-/g, '−')
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,+−×÷]/g, '')
    .slice(0, 40)
}

// One calculator key press. Max 12 digits per operand, one "," per
// operand, a second operator replaces the first.
export function pressKey(e: string, k: string): string {
  const seg = e.split(/[+−×÷]/).pop() ?? ''
  const last = e.slice(-1)
  if (k === 'C') return ''
  if (k === '⌫') return e.slice(0, -1)
  if (OPS.includes(k)) {
    if (!e) return e
    return OPS.includes(last) ? e.slice(0, -1) + k : (last === ',' ? e.slice(0, -1) : e) + k
  }
  if (k === '=') return hasOps(e) ? numStr(evalExpr(e)) : e
  if (k === ',') return seg.includes(',') ? e : e + (seg ? ',' : '0,')
  if (seg.replace(',', '').length >= 12) return e
  if (k === '00' && !seg) return e
  return (seg === '0' && k !== '00' ? e.slice(0, -1) : e) + k
}

const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const parts = (iso: string) => iso.split('-').map(Number)
const isoOf = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

// "20 ago".
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const [, m, d] = parts(iso)
  return `${d} ${MONTHS_ABBR[m - 1]}`
}

// "21 de agosto de 2026".
export function fmtDateLong(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = parts(iso)
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso)
  return isoOf(new Date(y, m - 1, d + days))
}

export function nextFirst(iso: string): string {
  const [y, m] = parts(iso)
  return isoOf(new Date(y, m, 1))
}

export type Freq = 'Diario' | 'Semanal' | 'Mensual' | 'Anual'
export const FREQS: Freq[] = ['Diario', 'Semanal', 'Mensual', 'Anual']
export const FREQ_INTERVAL = { Diario: 'daily', Semanal: 'weekly', Mensual: 'monthly', Anual: 'yearly' } as const
const FREQ_UNIT: Record<Freq, string> = { Diario: 'día', Semanal: 'semana', Mensual: 'mes', Anual: 'año' }

export interface RepeatDraft {
  freq: Freq | null
  endMode: 'count' | 'until' | 'never'
  count: number
  until: string
  confirm: 'ask' | 'auto'
}

export const RP_DEFAULT: RepeatDraft = { freq: 'Mensual', endMode: 'count', count: 12, until: '', confirm: 'ask' }

export function addIso(iso: string, freq: Freq, k: number): string {
  const [y, m, d] = parts(iso)
  const dt = new Date(y, m - 1, d)
  if (freq === 'Diario') dt.setDate(dt.getDate() + k)
  else if (freq === 'Semanal') dt.setDate(dt.getDate() + 7 * k)
  else if (freq === 'Mensual') dt.setMonth(dt.getMonth() + k)
  else dt.setFullYear(dt.getFullYear() + k)
  return isoOf(dt)
}

// "Cada semana × 4 · del 21 ago al 11 sep".
export function repeatSummary(r: RepeatDraft | null, start: string): string {
  if (!r || !r.freq) return 'No se repite'
  const u = 'Cada ' + FREQ_UNIT[r.freq]
  if (r.endMode === 'count') return `${u} × ${r.count} · del ${fmtDate(start)} al ${fmtDate(addIso(start, r.freq, r.count - 1))}`
  if (r.endMode === 'until') return `${u} · hasta el ${r.until ? fmtDate(r.until) : '…'}`
  return `${u} · sin fecha de fin`
}

// "Semanal ×4".
export function repeatShort(r: RepeatDraft | null): string {
  return r && r.freq ? r.freq + (r.endMode === 'count' ? ' ×' + r.count : '') : 'Repetir'
}

// Budget status colors at 65 / 90 % (PLANS.md).
export function toneOf(pct: number): [string, string] {
  return pct >= 90 ? ['var(--v2-neg)', 'rgba(255,98,98,.14)'] : pct >= 65 ? ['var(--v2-warn)', 'rgba(240,180,41,.16)'] : ['var(--v2-pos)', 'rgba(50,201,138,.14)']
}

// "1,4 MB" / "320 KB".
export function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

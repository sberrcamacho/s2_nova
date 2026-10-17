import { describe, expect, it } from 'vitest'
import { decodeRange, encodeRange, rangeChipLabel } from '@/lib/reportRange'

describe('Reportes range', () => {
  it('keeps a range ending this month following it, and any other put', () => {
    expect(encodeRange('2026-06', '2026-08', '2026-08')).toBe('rolling:3')
    expect(encodeRange('2026-02', '2026-04', '2026-08')).toBe('fixed:2026-02:2026-04')
    expect(decodeRange('rolling:3', '2026-09')).toEqual({ from: '2026-07', to: '2026-09' })
    expect(decodeRange('fixed:2026-02:2026-04', '2026-09')).toEqual({ from: '2026-02', to: '2026-04' })
    // Nothing kept, or nothing valid: the last six months.
    expect(decodeRange(null, '2026-09')).toEqual({ from: '2026-04', to: '2026-09' })
    expect(decodeRange('fixed:2026-08:2026-02', '2026-09')).toEqual({ from: '2026-04', to: '2026-09' })
    expect(decodeRange('rolling:99', '2026-09')).toEqual({ from: '2026-04', to: '2026-09' })
    expect(decodeRange('rolling:3', '2027-01')).toEqual({ from: '2026-11', to: '2027-01' })
  })

  it('names the span on the button', () => {
    expect(rangeChipLabel('2026-02', '2026-04', 'es')).toBe('Feb – Abr 2026')
    expect(rangeChipLabel('2025-11', '2026-02', 'en')).toBe('Nov 25 – Feb 26')
    expect(rangeChipLabel('2026-04', '2026-04', 'es')).toBe('Abr 2026')
  })
})

import { describe, expect, it } from 'vitest'
import { formatCOP, formatCOPCompact, formatCurrency, formatUSD, formatUSDCompact, COP_PER_USD } from '@/lib/currency'

describe('formatCOP', () => {
  it('groups thousands with a period and no decimals', () => {
    expect(formatCOP(1250000)).toBe('$1.250.000')
  })

  it('rounds a fractional amount to the nearest peso', () => {
    expect(formatCOP(999.6)).toBe('$1.000')
  })

  it('prefixes a negative amount with a minus sign regardless of `signed`', () => {
    expect(formatCOP(-500, { signed: true })).toBe('-$500')
  })

  it('prefixes a positive amount with a plus sign only when `signed` is set', () => {
    expect(formatCOP(500)).toBe('$500')
    expect(formatCOP(500, { signed: true })).toBe('+$500')
  })
})

describe('formatUSD', () => {
  it('converts from the underlying COP amount using the fixed reference rate', () => {
    expect(formatUSD(COP_PER_USD * 10)).toBe('$10.00')
  })

  it('always shows exactly two decimals', () => {
    expect(formatUSD(COP_PER_USD * 1.005)).toBe('$1.01')
  })
})

describe('formatCurrency', () => {
  it('dispatches to formatCOP for COP and formatUSD for USD', () => {
    expect(formatCurrency(4000, 'COP')).toBe('$4.000')
    expect(formatCurrency(4000, 'USD')).toBe('$1.00')
  })
})

describe('formatCOPCompact', () => {
  it('renders millions with one decimal below 10M and none at/above it', () => {
    expect(formatCOPCompact(2_500_000)).toBe('$2,5M')
    expect(formatCOPCompact(12_000_000)).toBe('$12M')
  })

  it('renders thousands as a rounded K value', () => {
    expect(formatCOPCompact(45_000)).toBe('$45K')
  })

  it('falls back to full formatting below 1,000', () => {
    expect(formatCOPCompact(500)).toBe('$500')
  })
})

describe('formatUSDCompact', () => {
  it('converts to USD before applying compact thresholds', () => {
    expect(formatUSDCompact(COP_PER_USD * 2_000_000)).toBe('$2.0M')
  })
})

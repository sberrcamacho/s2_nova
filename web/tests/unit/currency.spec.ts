import { describe, expect, it } from 'vitest'
import { currencyInfo, formatApprox, formatCOP, formatCurrency, formatCurrencyCompact, formatMoney, referenceRate } from '@/lib/currency'

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

// The mockup's fmtCur (CURRENCIES_AND_WALLETS.md §2): the currency's
// symbol, Colombian grouping, decimals only when the value has them.
describe('formatMoney', () => {
  it("uses each currency's symbol", () => {
    expect(formatMoney(168_500, 'COP')).toBe('$168.500')
    expect(formatMoney(5.99, 'USD')).toBe('US$5,99')
    expect(formatMoney(320, 'USD')).toBe('US$320')
    expect(formatMoney(12, 'EUR')).toBe('€12')
  })

  it('signs with a true minus, and a plus only when asked', () => {
    expect(formatMoney(-21_000)).toBe('−$21.000')
    expect(formatMoney(200, 'USD', { signed: true })).toBe('+US$200')
  })
})

describe('formatApprox', () => {
  it("rounds a conversion to the target currency's decimals", () => {
    expect(formatApprox(23_660.5, 'COP')).toBe('$23.661')
    expect(formatApprox(5.994, 'USD')).toBe(formatMoney(5.99, 'USD'))
  })
})

describe('formatCurrency', () => {
  it('keeps whole pesos for COP and the symbol format for other currencies', () => {
    expect(formatCurrency(4000.4, 'COP')).toBe('$4.000')
    expect(formatCurrency(4000, 'USD')).toBe('US$4.000')
  })
})

describe('formatCurrencyCompact', () => {
  it('renders millions with one decimal below 10M and none at/above it', () => {
    expect(formatCurrencyCompact(2_500_000, 'COP')).toBe('$2,5M')
    expect(formatCurrencyCompact(12_000_000, 'COP')).toBe('$12M')
  })

  it('renders thousands as a rounded K value', () => {
    expect(formatCurrencyCompact(45_000, 'COP')).toBe('$45K')
  })

  it('falls back to full formatting below 1,000', () => {
    expect(formatCurrencyCompact(500, 'COP')).toBe('$500')
  })
})

describe('referenceRate', () => {
  it('converts through the COP reference rates', () => {
    expect(referenceRate('USD', 'COP')).toBe(3950)
    expect(referenceRate('COP', 'COP')).toBe(1)
    expect(referenceRate('EUR', 'USD')).toBeCloseTo(4300 / 3950)
  })

  it('falls back to COP for an unknown code', () => {
    expect(currencyInfo('XYZ').code).toBe('COP')
  })
})

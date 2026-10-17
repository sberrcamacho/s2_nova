import { describe, expect, it } from 'vitest'
import { loanBalance, type LoanTermsMinor } from '@/lib/loanBalance'

// The same cases as backend/tests/unit/loans.spec.ts: guest mode must show
// the figures a real account gets.
const loan = (o: Partial<LoanTermsMinor>): LoanTermsMinor => ({ amountMinor: 1_000_000n, date: '2026-01-01', mode: null, rate: null, period: null, from: null, ...o })
const pay = (date: string, amountMinor: bigint) => ({ date, amountMinor })

describe('loanBalance (guest copy of the backend rule)', () => {
  it('without interest owes the principal minus what was paid', () => {
    expect(loanBalance(loan({}), [pay('2026-02-01', 400_000n)], '2026-12-31').outstanding).toBe(600_000n)
  })

  it('FIXED adds the rate once; abonos pay that interest first', () => {
    const terms = loan({ mode: 'FIXED', rate: 10 })
    expect(loanBalance(terms, [], '2030-01-01').outstanding).toBe(1_100_000n)
    expect(loanBalance(terms, [pay('2026-02-01', 300_000n)], '2026-03-01')).toEqual({ principalOutstanding: 800_000n, interestAccrued: 100_000n, interestPaid: 100_000n, outstanding: 800_000n })
  })

  it('ON_BALANCE accrues per day on the unpaid principal', () => {
    const terms = loan({ mode: 'ON_BALANCE', rate: 2, period: 'MONTHLY' })
    expect(loanBalance(terms, [], '2026-04-01').outstanding).toBe(1_060_000n)
    expect(loanBalance(terms, [pay('2026-01-31', 500_000n)], '2026-01-31').principalOutstanding).toBe(520_000n)
    expect(loanBalance(terms, [pay('2026-01-31', 500_000n)], '2026-03-02').outstanding).toBe(530_400n)
    expect(loanBalance(loan({ mode: 'ON_BALANCE', rate: 36.5, period: 'ANNUAL' }), [], '2026-01-11').outstanding).toBe(1_010_000n)
  })

  it('charges nothing before the start date', () => {
    const terms = loan({ mode: 'ON_BALANCE', rate: 3, period: 'MONTHLY', from: '2026-03-01' })
    expect(loanBalance(terms, [], '2026-02-28').outstanding).toBe(1_000_000n)
    expect(loanBalance(terms, [pay('2026-02-15', 1_000_000n)], '2026-12-31').outstanding).toBe(0n)
    expect(loanBalance(terms, [], '2026-03-31').outstanding).toBe(1_030_000n)
  })
})

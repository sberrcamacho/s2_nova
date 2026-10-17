// Guest mode's copy of the backend's loan rule (backend/src/lib/loans.ts
// loanBalance): what a loan still owes on a day, given its abonos. Same
// integer arithmetic in minor units, so a guest sees the figures a real
// account would. Keep the two in step (tests/unit/loanBalance.spec.ts uses
// the backend's cases).

export interface LoanTermsMinor {
  amountMinor: bigint
  date: string // YYYY-MM-DD
  mode: 'NONE' | 'FIXED' | 'ON_BALANCE' | null
  rate: number | null // a percentage
  period: 'MONTHLY' | 'ANNUAL' | null
  from: string | null // YYYY-MM-DD
}

export interface LoanPaymentMinor {
  amountMinor: bigint
  date: string // YYYY-MM-DD
}

export interface LoanBalanceMinor {
  principalOutstanding: bigint
  interestAccrued: bigint
  interestPaid: bigint
  outstanding: bigint
}

const RATE_SCALE = 10_000n

// 2.5 → 25000 (the percentage × 10 000), rounded to the column's 4 decimals.
export function scaledRate(rate: number | null): bigint {
  return rate === null ? 0n : BigInt(Math.round(rate * 10_000))
}

function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n)
}

function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`) / 86_400_000)
}

export function loanBalance(loan: LoanTermsMinor, payments: LoanPaymentMinor[], asOf: string): LoanBalanceMinor {
  const due = payments.filter((p) => p.date.slice(0, 10) <= asOf.slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))
  const paid = due.reduce((sum, p) => sum + p.amountMinor, 0n)
  const mode = loan.mode ?? 'NONE'
  const rate = scaledRate(loan.rate)

  if (mode === 'NONE' || rate <= 0n) {
    const principalOutstanding = loan.amountMinor > paid ? loan.amountMinor - paid : 0n
    return { principalOutstanding, interestAccrued: 0n, interestPaid: 0n, outstanding: principalOutstanding }
  }

  if (mode === 'FIXED') {
    const interestAccrued = divRoundHalfUp(loan.amountMinor * rate, 100n * RATE_SCALE)
    const interestPaid = paid < interestAccrued ? paid : interestAccrued
    const principalPaid = paid - interestPaid
    const principalOutstanding = loan.amountMinor > principalPaid ? loan.amountMinor - principalPaid : 0n
    return { principalOutstanding, interestAccrued, interestPaid, outstanding: principalOutstanding + interestAccrued - interestPaid }
  }

  const periodDays = loan.period === 'ANNUAL' ? 365n : 30n
  let cursor = Math.max(dayNumber(loan.date), dayNumber(loan.from ?? loan.date))
  let principal = loan.amountMinor
  let unpaidInterest = 0n
  let interestAccrued = 0n
  let interestPaid = 0n
  const accrueTo = (day: number) => {
    if (day <= cursor) return
    if (principal > 0n) {
      const interest = divRoundHalfUp(principal * rate * BigInt(day - cursor), 100n * RATE_SCALE * periodDays)
      unpaidInterest += interest
      interestAccrued += interest
    }
    cursor = day
  }
  for (const payment of due) {
    accrueTo(dayNumber(payment.date))
    const toInterest = payment.amountMinor < unpaidInterest ? payment.amountMinor : unpaidInterest
    unpaidInterest -= toInterest
    interestPaid += toInterest
    const toPrincipal = payment.amountMinor - toInterest
    principal = principal > toPrincipal ? principal - toPrincipal : 0n
  }
  accrueTo(dayNumber(asOf))
  return { principalOutstanding: principal, interestAccrued, interestPaid, outstanding: principal + unpaidInterest }
}

// Where a loan stands now: every abono counts, even one dated after today.
export function currentLoanBalance(loan: LoanTermsMinor, payments: LoanPaymentMinor[], today: string): LoanBalanceMinor {
  const last = payments.reduce<string | null>((max, p) => (max === null || p.date > max ? p.date : max), null)
  return loanBalance(loan, payments, last && last.slice(0, 10) > today ? last : today)
}

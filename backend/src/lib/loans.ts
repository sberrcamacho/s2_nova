import type { LoanInterestMode, LoanInterestPeriod } from "@prisma/client";
import { prisma } from "./prisma.js";

// A loan's repaid amount is the live sum of its settlement rows (linked via
// parentLoanId, see schema.prisma), never a stored running total. One
// grouped query for any number of loans, so list endpoints stay O(1) in
// queries.
export async function loanRepaidMap(loanIds: string[]): Promise<Map<string, bigint>> {
  if (loanIds.length === 0) return new Map();
  const rows = await prisma.transaction.groupBy({
    by: ["parentLoanId"],
    where: { parentLoanId: { in: loanIds } },
    _sum: { amountMinor: true },
  });
  return new Map(rows.map((row) => [row.parentLoanId!, row._sum.amountMinor ?? 0n]));
}

export function outstandingOf(loan: { amountMinor: bigint }, repaid: bigint | undefined): bigint {
  const outstanding = loan.amountMinor - (repaid ?? 0n);
  return outstanding > 0n ? outstanding : 0n;
}

// What loanBalance needs from the loan row; select it with LOAN_TERMS.
export interface LoanTerms {
  amountMinor: bigint;
  transactionDate: Date;
  loanInterestMode: LoanInterestMode | null;
  loanInterestRate: { toString(): string } | null;
  loanInterestPeriod: LoanInterestPeriod | null;
  loanInterestFrom: Date | null;
}

export const LOAN_TERMS = {
  amountMinor: true,
  transactionDate: true,
  loanInterestMode: true,
  loanInterestRate: true,
  loanInterestPeriod: true,
  loanInterestFrom: true,
} as const;

export interface LoanPayment {
  amountMinor: bigint;
  transactionDate: Date;
}

export interface LoanBalance {
  // Principal not yet repaid.
  principalOutstanding: bigint;
  // Interest charged so far (FIXED: the whole fixed amount) and how much of
  // it the abonos have paid.
  interestAccrued: bigint;
  interestPaid: bigint;
  // What is still owed: unpaid principal plus unpaid interest.
  outstanding: bigint;
}

// Every loan's abonos with their dates, for loanBalance.
export async function loanPaymentsMap(loanIds: string[]): Promise<Map<string, LoanPayment[]>> {
  const map = new Map<string, LoanPayment[]>();
  if (loanIds.length === 0) return map;
  const rows = await prisma.transaction.findMany({
    where: { parentLoanId: { in: loanIds } },
    select: { parentLoanId: true, amountMinor: true, transactionDate: true },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });
  for (const row of rows) {
    const list = map.get(row.parentLoanId!) ?? [];
    list.push({ amountMinor: row.amountMinor, transactionDate: row.transactionDate });
    map.set(row.parentLoanId!, list);
  }
  return map;
}

const RATE_SCALE = 10_000n; // the rate column keeps 4 decimals
const DAY_MS = 86_400_000;

// "2.5" → 25000 (the percentage × 10 000), exactly, without floats.
export function scaledRate(rate: { toString(): string } | null): bigint {
  if (rate === null) return 0n;
  const [whole = "0", fraction = ""] = rate.toString().split(".");
  return BigInt(whole || "0") * RATE_SCALE + BigInt((fraction + "0000").slice(0, 4));
}

function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

// The single rule both clients show (Planes › Préstamos, net worth, alerts,
// CSV): what a loan still owes on `asOf`, given its abonos.
//  - No interest: principal minus what was paid.
//  - FIXED: principal × rate% is owed once on top; abonos pay that interest
//    first, then principal.
//  - ON_BALANCE: simple interest per day (monthly rate ÷ 30, annual ÷ 365)
//    on the unpaid principal, from loanInterestFrom (or the loan's date)
//    until `asOf`; each abono pays the interest accrued so far, then
//    principal. Unpaid interest doesn't earn interest. Set the start to the
//    due date for a card-like loan: nothing accrues if paid in time.
export function loanBalance(loan: LoanTerms, payments: LoanPayment[], asOf: Date): LoanBalance {
  const due = payments.filter((p) => p.transactionDate.getTime() <= asOf.getTime());
  const paid = due.reduce((sum, p) => sum + p.amountMinor, 0n);
  const mode = loan.loanInterestMode ?? "NONE";
  const rate = scaledRate(loan.loanInterestRate);

  if (mode === "NONE" || rate <= 0n) {
    const principalOutstanding = outstandingOf(loan, paid);
    return { principalOutstanding, interestAccrued: 0n, interestPaid: 0n, outstanding: principalOutstanding };
  }

  if (mode === "FIXED") {
    const interestAccrued = divRoundHalfUp(loan.amountMinor * rate, 100n * RATE_SCALE);
    const interestPaid = paid < interestAccrued ? paid : interestAccrued;
    const principalPaid = paid - interestPaid;
    const principalOutstanding = loan.amountMinor > principalPaid ? loan.amountMinor - principalPaid : 0n;
    return { principalOutstanding, interestAccrued, interestPaid, outstanding: principalOutstanding + interestAccrued - interestPaid };
  }

  const periodDays = loan.loanInterestPeriod === "ANNUAL" ? 365n : 30n;
  const start = Math.max(utcDay(loan.transactionDate), utcDay(loan.loanInterestFrom ?? loan.transactionDate));
  let cursor = start;
  let principal = loan.amountMinor;
  let unpaidInterest = 0n;
  let interestAccrued = 0n;
  let interestPaid = 0n;
  const accrueTo = (day: number) => {
    if (day <= cursor) return;
    if (principal > 0n) {
      const interest = divRoundHalfUp(principal * rate * BigInt(day - cursor), 100n * RATE_SCALE * periodDays);
      unpaidInterest += interest;
      interestAccrued += interest;
    }
    cursor = day;
  };

  for (const payment of due) {
    accrueTo(utcDay(payment.transactionDate));
    const toInterest = payment.amountMinor < unpaidInterest ? payment.amountMinor : unpaidInterest;
    unpaidInterest -= toInterest;
    interestPaid += toInterest;
    const toPrincipal = payment.amountMinor - toInterest;
    principal = principal > toPrincipal ? principal - toPrincipal : 0n;
  }
  accrueTo(utcDay(asOf));

  return { principalOutstanding: principal, interestAccrued, interestPaid, outstanding: principal + unpaidInterest };
}

// Where a loan stands now: every abono counts, even one dated after
// `today` (interest runs until the later of the two).
export function currentLoanBalance(loan: LoanTerms, payments: LoanPayment[], today: Date): LoanBalance {
  const last = payments.at(-1)?.transactionDate;
  return loanBalance(loan, payments, last && last > today ? last : today);
}

// currentLoanBalance for many loans at once (one query whatever their number).
export async function loanBalances(loans: (LoanTerms & { id: string })[], today: Date = new Date()): Promise<Map<string, LoanBalance>> {
  const payments = await loanPaymentsMap(loans.map((loan) => loan.id));
  return new Map(loans.map((loan) => [loan.id, currentLoanBalance(loan, payments.get(loan.id) ?? [], today)]));
}

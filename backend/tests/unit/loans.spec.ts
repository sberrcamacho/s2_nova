import { describe, expect, it } from "vitest";
import { loanBalance, scaledRate, type LoanTerms } from "../../src/lib/loans.js";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const loan = (overrides: Partial<LoanTerms>): LoanTerms => ({
  amountMinor: 1_000_000n,
  transactionDate: d("2026-01-01"),
  loanInterestMode: null,
  loanInterestRate: null,
  loanInterestPeriod: null,
  loanInterestFrom: null,
  ...overrides,
});
const pay = (iso: string, amountMinor: bigint) => ({ transactionDate: d(iso), amountMinor });

describe("loanBalance", () => {
  it("reads the rate exactly", () => {
    expect(scaledRate("2")).toBe(20_000n);
    expect(scaledRate("2.5")).toBe(25_000n);
    expect(scaledRate("0.0125")).toBe(125n);
  });

  it("without interest owes the principal minus what was paid", () => {
    const b = loanBalance(loan({}), [pay("2026-02-01", 400_000n)], d("2026-12-31"));
    expect(b).toEqual({ principalOutstanding: 600_000n, interestAccrued: 0n, interestPaid: 0n, outstanding: 600_000n });
  });

  it("FIXED adds the rate once, and abonos pay that interest first", () => {
    const terms = loan({ loanInterestMode: "FIXED", loanInterestRate: "10" });
    expect(loanBalance(terms, [], d("2030-01-01")).outstanding).toBe(1_100_000n);
    const b = loanBalance(terms, [pay("2026-02-01", 300_000n)], d("2026-03-01"));
    expect(b).toEqual({ principalOutstanding: 800_000n, interestAccrued: 100_000n, interestPaid: 100_000n, outstanding: 800_000n });
  });

  it("ON_BALANCE accrues per day on the unpaid principal; an abono pays interest, then principal", () => {
    const terms = loan({ loanInterestMode: "ON_BALANCE", loanInterestRate: "2", loanInterestPeriod: "MONTHLY" });
    // 90 days at 2 % a month: 60 000 of interest, nothing paid.
    expect(loanBalance(terms, [], d("2026-04-01")).outstanding).toBe(1_060_000n);
    // 30 days → 20 000 interest; 500 000 pays it and 480 000 of principal.
    const b = loanBalance(terms, [pay("2026-01-31", 500_000n)], d("2026-01-31"));
    expect(b).toEqual({ principalOutstanding: 520_000n, interestAccrued: 20_000n, interestPaid: 20_000n, outstanding: 520_000n });
    // Then 30 more days on 520 000: 10 400.
    expect(loanBalance(terms, [pay("2026-01-31", 500_000n)], d("2026-03-02")).outstanding).toBe(530_400n);
  });

  it("ON_BALANCE annual divides by 365", () => {
    const terms = loan({ loanInterestMode: "ON_BALANCE", loanInterestRate: "36.5", loanInterestPeriod: "ANNUAL" });
    // 0.1 % a day for 10 days.
    expect(loanBalance(terms, [], d("2026-01-11")).outstanding).toBe(1_010_000n);
  });

  it("charges nothing before the start date (a card-like loan paid in time)", () => {
    const terms = loan({ loanInterestMode: "ON_BALANCE", loanInterestRate: "3", loanInterestPeriod: "MONTHLY", loanInterestFrom: d("2026-03-01") });
    expect(loanBalance(terms, [], d("2026-02-28")).outstanding).toBe(1_000_000n);
    // Paid in full before the start: nothing accrues afterwards.
    expect(loanBalance(terms, [pay("2026-02-15", 1_000_000n)], d("2026-12-31")).outstanding).toBe(0n);
    // Not paid: 3 % a month from the start on.
    expect(loanBalance(terms, [], d("2026-03-31")).outstanding).toBe(1_030_000n);
  });

  it("ignores abonos dated after the day asked for", () => {
    const b = loanBalance(loan({}), [pay("2026-05-01", 1_000_000n)], d("2026-04-30"));
    expect(b.outstanding).toBe(1_000_000n);
  });
});

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

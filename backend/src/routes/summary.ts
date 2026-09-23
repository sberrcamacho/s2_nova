import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { monthEnd, monthKeyOf, monthStart, parseDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema, monthKeySchema } from "../lib/validation.js";

// Server-side aggregates for Inicio (and later Reportes), so Android and Web
// show the same figures instead of each re-deriving them from a partial,
// client-side page of transactions. Only COMPLETED INCOME/EXPENSE rows
// count — transfers move money between the user's own wallets and PLANNED
// rows haven't happened yet.

// Clients pass their local calendar date (`today`), since month and "due
// today" boundaries are the user's, not the server's UTC clock.
export function resolveToday(today: string | undefined): Date {
  if (today) return parseDateOnly(today);
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function shiftMonth(monthKey: string, delta: number): string {
  const start = monthStart(monthKey);
  return monthKeyOf(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)));
}

const monthsQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(24).default(6),
  today: dateOnlySchema.optional(),
});

const categoriesQuerySchema = z.object({
  month: monthKeySchema.optional(),
  today: dateOnlySchema.optional(),
});

export async function summaryRoutes(app: FastifyInstance) {
  // Oldest month first, the current month last — the shape both clients
  // chart directly (Inicio's 6-month bars, the month income/expense boxes).
  app.get("/summary/months", { preHandler: app.authenticate }, async (request) => {
    const query = monthsQuerySchema.parse(request.query);
    const currentMonth = monthKeyOf(resolveToday(query.today));
    const monthKeys = Array.from({ length: query.count }, (_, index) => shiftMonth(currentMonth, index - query.count + 1));

    const rows = await prisma.transaction.groupBy({
      by: ["type", "transactionDate"],
      where: {
        userId: request.userId,
        status: "COMPLETED",
        type: { in: ["INCOME", "EXPENSE"] },
        transactionDate: { gte: monthStart(monthKeys[0]!), lte: monthEnd(currentMonth) },
      },
      _sum: { amountMinor: true },
    });

    const totals = new Map(monthKeys.map((key) => [key, { income: 0n, expenses: 0n }]));
    for (const row of rows) {
      const bucket = totals.get(monthKeyOf(row.transactionDate));
      if (!bucket) continue;
      const amount = row._sum.amountMinor ?? 0n;
      if (row.type === "INCOME") bucket.income += amount;
      else bucket.expenses += amount;
    }

    return monthKeys.map((month) => {
      const { income, expenses } = totals.get(month)!;
      return { month, income, expenses, net: income - expenses };
    });
  });

  // Spending per top-level category for one month, largest first.
  // `percentage` is the category's whole-number share of the month's total.
  app.get("/summary/categories", { preHandler: app.authenticate }, async (request) => {
    const query = categoriesQuerySchema.parse(request.query);
    const month = query.month ?? monthKeyOf(resolveToday(query.today));

    const rows = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: request.userId,
        status: "COMPLETED",
        type: "EXPENSE",
        transactionDate: { gte: monthStart(month), lte: monthEnd(month) },
      },
      _sum: { amountMinor: true },
    });

    const total = rows.reduce((sum, row) => sum + (row._sum.amountMinor ?? 0n), 0n);
    const categories = rows
      .map((row) => {
        const amount = row._sum.amountMinor ?? 0n;
        return {
          categoryId: row.categoryId,
          amount,
          percentage: total > 0n ? Math.round((Number(amount) / Number(total)) * 100) : 0,
        };
      })
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1));

    return { month, total, categories };
  });
}

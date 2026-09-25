import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { monthEnd, monthKeyOf, monthStart, parseDateOnly } from "../lib/dates.js";
import { loanRepaidMap, outstandingOf } from "../lib/loans.js";
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

const reportQuerySchema = z.object({
  range: z.coerce.number().int().refine((value) => [3, 6, 12].includes(value)).default(6),
  today: dateOnlySchema.optional(),
});

// Reportes' category trend flag: a category up this much or more against
// the previous month is shown in the negative tone ("Transporte · +82%").
export const CATEGORY_RISE_PERCENTAGE = 50;
// Categories that always count as fixed spending, on top of the categories
// of the user's active expense Programados.
const FIXED_CATEGORY_SLUGS = ["bills", "subscriptions"];
// Patrimonio's balance history is always the last six months ("ÚLTIMOS SEIS
// MESES"), whatever the selected range.
const NET_WORTH_MONTHS = 6;

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

  // Everything Reportes shows (Android's three cards, Web's four tabs) in one
  // request, so both clients show the same figures. `range` is the 3M/6M/12M
  // selector: `months`, `totals` and the range-wide figures cover the last
  // `range` months including the current one; `previousTotals` the `range`
  // months before that. Category spending is the current month's.
  app.get("/summary/report", { preHandler: app.authenticate }, async (request) => {
    const query = reportQuerySchema.parse(request.query);
    const userId = request.userId!;
    const today = resolveToday(query.today);
    const currentMonth = monthKeyOf(today);
    const previousMonth = shiftMonth(currentMonth, -1);
    const span = Math.max(query.range * 2, NET_WORTH_MONTHS);
    const firstMonth = shiftMonth(currentMonth, -span + 1);
    const rangeKeys = Array.from({ length: query.range }, (_, index) => shiftMonth(currentMonth, index - query.range + 1));
    const previousKeys = rangeKeys.map((key) => shiftMonth(key, -query.range));

    const [rows, laterNet, accounts, fixedCategories, series, loans] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["type", "categoryId", "merchant", "transactionDate"],
        where: {
          userId,
          status: "COMPLETED",
          type: { in: ["INCOME", "EXPENSE"] },
          transactionDate: { gte: monthStart(firstMonth), lte: monthEnd(currentMonth) },
        },
        _sum: { amountMinor: true },
      }),
      // Anything dated after this month still moved the balance, so the
      // history walks back from today's wallets through those rows too.
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId, status: "COMPLETED", type: { in: ["INCOME", "EXPENSE"] }, transactionDate: { gt: monthEnd(currentMonth) } },
        _sum: { amountMinor: true },
      }),
      prisma.account.findMany({ where: { userId }, select: { currentBalanceMinor: true } }),
      prisma.category.findMany({ where: { slug: { in: FIXED_CATEGORY_SLUGS } }, select: { id: true } }),
      prisma.recurringSeries.findMany({ where: { userId, active: true, type: "EXPENSE" }, select: { categoryId: true } }),
      prisma.transaction.findMany({
        where: { userId, status: "COMPLETED", loanKind: { not: null } },
        select: { id: true, loanKind: true, counterpartyName: true, amountMinor: true },
      }),
    ]);

    const byMonth = new Map<string, { income: bigint; expenses: bigint }>();
    const monthBucket = (key: string) => {
      let bucket = byMonth.get(key);
      if (!bucket) byMonth.set(key, (bucket = { income: 0n, expenses: 0n }));
      return bucket;
    };
    const categoryMonth = new Map<string, bigint>(); // `${categoryId}|${month}`
    const rangeKeySet = new Set(rangeKeys);
    const weekdays = Array.from({ length: 7 }, () => 0n);
    const fixedIds = new Set([...fixedCategories.map((c) => c.id), ...series.map((s) => s.categoryId)]);
    let rangeFixed = 0n;
    const sources = new Map<string, { categoryId: string; merchant: string | null; amount: bigint; monthly: Map<string, bigint> }>();

    for (const row of rows) {
      const amount = row._sum.amountMinor ?? 0n;
      const month = monthKeyOf(row.transactionDate);
      const bucket = monthBucket(month);
      if (row.type === "INCOME") bucket.income += amount;
      else bucket.expenses += amount;
      if (row.type === "EXPENSE") {
        const key = `${row.categoryId}|${month}`;
        categoryMonth.set(key, (categoryMonth.get(key) ?? 0n) + amount);
      }
      if (!rangeKeySet.has(month)) continue;
      if (row.type === "EXPENSE") {
        weekdays[row.transactionDate.getUTCDay()]! += amount;
        if (fixedIds.has(row.categoryId)) rangeFixed += amount;
      } else {
        const merchant = row.merchant?.trim() || null;
        const key = `${row.categoryId}|${merchant ?? ""}`;
        let source = sources.get(key);
        if (!source) sources.set(key, (source = { categoryId: row.categoryId, merchant, amount: 0n, monthly: new Map() }));
        source.amount += amount;
        source.monthly.set(month, (source.monthly.get(month) ?? 0n) + amount);
      }
    }

    const sumOf = (keys: string[]) => {
      const income = keys.reduce((sum, key) => sum + (byMonth.get(key)?.income ?? 0n), 0n);
      const expenses = keys.reduce((sum, key) => sum + (byMonth.get(key)?.expenses ?? 0n), 0n);
      const savings = income - expenses;
      return { income, expenses, savings, savingsRate: income > 0n ? Math.round((Number(savings) / Number(income)) * 100) : 0 };
    };
    const totals = sumOf(rangeKeys);

    const monthCategories = [...categoryMonth.entries()]
      .filter(([key]) => key.endsWith(`|${currentMonth}`))
      .map(([key, amount]) => {
        const categoryId = key.split("|")[0]!;
        const previousAmount = categoryMonth.get(`${categoryId}|${previousMonth}`) ?? 0n;
        const change = previousAmount > 0n ? Math.round(((Number(amount) - Number(previousAmount)) / Number(previousAmount)) * 100) : null;
        return { categoryId, amount, previousAmount, change, rising: change !== null && change >= CATEGORY_RISE_PERCENTAGE };
      })
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1));

    const monthExpenses = byMonth.get(currentMonth)?.expenses ?? 0n;
    const peak = weekdays.reduce((best, amount, day) => (amount > weekdays[best]! ? day : best), 0);
    const walletTotal = accounts.reduce((sum, account) => sum + account.currentBalanceMinor, 0n);
    const averageExpenses = Number(totals.expenses) / query.range;

    const incomeSources = [...sources.values()]
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))
      .map((source) => {
        const monthly = rangeKeys.map((key) => source.monthly.get(key) ?? 0n);
        return {
          categoryId: source.categoryId,
          merchant: source.merchant,
          amount: source.amount,
          percentage: totals.income > 0n ? Math.round((Number(source.amount) / Number(totals.income)) * 100) : 0,
          monthlyMin: monthly.reduce((min, value) => (value < min ? value : min)),
          monthlyMax: monthly.reduce((max, value) => (value > max ? value : max)),
        };
      });

    // Month-end balances, newest first: today's wallets minus everything that
    // happened after each month closed.
    let after = (laterNet.find((r) => r.type === "INCOME")?._sum.amountMinor ?? 0n) - (laterNet.find((r) => r.type === "EXPENSE")?._sum.amountMinor ?? 0n);
    const history: { month: string; balance: bigint }[] = [];
    for (let index = 0; index < NET_WORTH_MONTHS; index++) {
      const key = shiftMonth(currentMonth, -index);
      history.unshift({ month: key, balance: walletTotal - after });
      const bucket = byMonth.get(key);
      after += (bucket?.income ?? 0n) - (bucket?.expenses ?? 0n);
    }

    const repaid = await loanRepaidMap(loans.map((loan) => loan.id));
    const loanSide = (kind: "LENT" | "BORROWED") => {
      const own = loans.filter((loan) => loan.loanKind === kind).map((loan) => ({ loan, outstanding: outstandingOf(loan, repaid.get(loan.id)) }));
      const open = own.filter(({ outstanding }) => outstanding > 0n);
      return {
        outstanding: open.reduce((sum, { outstanding }) => sum + outstanding, 0n),
        people: new Set(open.map(({ loan }) => loan.counterpartyName?.trim().toLowerCase() ?? loan.id)).size,
        settled: own.length - open.length,
      };
    };

    return {
      range: query.range,
      month: currentMonth,
      months: rangeKeys.map((month) => {
        const { income, expenses } = byMonth.get(month) ?? { income: 0n, expenses: 0n };
        return { month, income, expenses, net: income - expenses };
      }),
      totals,
      previousTotals: sumOf(previousKeys),
      categories: monthCategories,
      dailyAverage: monthExpenses / BigInt(today.getUTCDate()),
      peakWeekday: weekdays[peak]! > 0n ? peak : null,
      fixedShare: totals.expenses > 0n ? Math.round((Number(rangeFixed) / Number(totals.expenses)) * 100) : null,
      runwayMonths: averageExpenses > 0 ? Math.round((Number(walletTotal) / averageExpenses) * 10) / 10 : null,
      incomeSources,
      netWorth: { wallets: walletTotal, lent: loanSide("LENT"), borrowed: loanSide("BORROWED"), history },
    };
  });
}

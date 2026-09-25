import type { Budget, Prisma } from "@prisma/client";
import { convertMinor, fromMinor, principalOf } from "./currency.js";
import { currentMonthKey, monthEnd, monthKeyOf, monthStart } from "./dates.js";
import { prisma } from "./prisma.js";

// Budget progress lives here (not in routes/budgets.ts) because both the
// budgets routes and the Inicio alert rules (routes/alerts.ts) need the
// exact same spent/percentage/status figures.
//
// PLANS.md §4. A CATEGORY budget counts every COMPLETED expense in its
// scope (the category itself, or — for a parent, "Todas" — any of its
// subcategories) paid from one of its wallets (all when walletIds is
// empty). A CUSTOM budget counts only the movements assigned to it
// (Transaction.customBudgetId). The window is the month for MONTHLY and
// startDate..endDate for CUSTOM. Amounts are in the principal currency,
// each movement converted with its own stored rate.

export function windowOf(budget: Pick<Budget, "period" | "startDate" | "endDate">, monthKey: string): { from: Date; to: Date } {
  if (budget.period === "CUSTOM") {
    return { from: budget.startDate, to: budget.endDate ? new Date(budget.endDate.getTime() + 86_399_999) : monthEnd(monthKey) };
  }
  return { from: monthStart(monthKey), to: monthEnd(monthKey) };
}

export function scopeWhere(budget: Pick<Budget, "kind" | "id" | "categoryId" | "walletIds">): Prisma.TransactionWhereInput {
  if (budget.kind === "CUSTOM") return { customBudgetId: budget.id };
  return {
    OR: [{ categoryId: budget.categoryId! }, { subcategoryId: budget.categoryId! }],
    ...(budget.walletIds.length ? { accountId: { in: budget.walletIds } } : {}),
  };
}

// Sums rows in the principal currency: the wallet amount (already in the
// wallet's currency) converted at the reference rate when that wallet
// isn't in the principal currency.
export async function principalSum(
  userId: string,
  rows: { amountMinor: bigint; walletAmountMinor: bigint | null; accountId: string }[],
  principal?: string,
): Promise<bigint> {
  const code = principal ?? (await principalOf(userId));
  const wallets = await prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } });
  const currencyOf = new Map(wallets.map((w) => [w.id, w.currency]));
  return rows.reduce((sum, row) => {
    const walletMinor = row.walletAmountMinor ?? row.amountMinor;
    return sum + convertMinor(walletMinor, currencyOf.get(row.accountId) ?? code, code);
  }, 0n);
}

export async function computeSpent(userId: string, budget: Budget, monthKey = currentMonthKey(), extra: Prisma.TransactionWhereInput = {}) {
  const { from, to } = windowOf(budget, monthKey);
  // Movements linked directly (Transaction.budgetId, before v2) always count.
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      status: "COMPLETED",
      OR: [{ budgetId: budget.id }, { budgetId: null, transactionDate: { gte: from, lte: to }, ...scopeWhere(budget) }],
      ...extra,
    },
    select: { amountMinor: true, walletAmountMinor: true, accountId: true },
  });
  return principalSum(userId, rows);
}

// healthy < 65 %, watch 65–89 %, at risk ≥ 90 %, exceeded > 100 %.
export function budgetStatus(percentage: number) {
  return percentage > 100 ? "OVER_BUDGET" : percentage >= 90 ? "AT_RISK" : percentage >= 65 ? "NEAR_LIMIT" : "ON_TRACK";
}

export async function serializeBudget(userId: string, budget: Budget, monthKey = currentMonthKey()) {
  const principal = await principalOf(userId);
  const spent = await computeSpent(userId, budget, monthKey);
  const limit = budget.amountMinor;
  const percentage = limit > 0n ? Math.min(999, Math.round((Number(spent) / Number(limit)) * 100)) : 0;
  const assigned =
    budget.kind === "CUSTOM" ? await prisma.transaction.count({ where: { userId, customBudgetId: budget.id } }) : null;

  return {
    id: budget.id,
    name: budget.name,
    kind: budget.kind,
    categoryId: budget.categoryId,
    icon: budget.icon,
    walletIds: budget.walletIds,
    period: budget.period,
    startDate: budget.startDate,
    endDate: budget.endDate,
    currency: principal,
    amount: fromMinor(limit, principal),
    spent: fromMinor(spent, principal),
    remaining: fromMinor(limit - spent, principal),
    percentage,
    status: budgetStatus(percentage),
    assignedCount: assigned,
    themeIcon: budget.themeIcon,
    month: budget.period === "CUSTOM" ? monthKeyOf(budget.startDate) : monthKey,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

// Budgets active in a month: MONTHLY ones started on or before it, CUSTOM
// ones whose range overlaps it.
export function activeInMonth(monthKey: string): Prisma.BudgetWhereInput {
  return {
    startDate: { lte: monthEnd(monthKey) },
    OR: [{ endDate: null }, { endDate: { gte: monthStart(monthKey) } }],
  };
}

import { monthEnd, monthStart } from "./dates.js";
import { prisma } from "./prisma.js";

// Budget progress lives here (not in routes/budgets.ts) because both the
// budgets routes and the Inicio alert rules (routes/alerts.ts) need the
// exact same spent/percentage/status figures.

// A transaction contributes to a budget either by direct link
// (transaction.budgetId = budget.id) or, for budgets nothing links to
// directly yet, by the legacy category+month match — never both, so a
// transaction can't double-count (it either has budgetId set or it
// doesn't). See schema.prisma's Budget doc comment.
export async function computeSpent(userId: string, budget: { id: string; categoryId: string; startDate: Date }): Promise<bigint> {
  const monthKey = `${budget.startDate.getUTCFullYear()}-${String(budget.startDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      status: "COMPLETED",
      OR: [
        { budgetId: budget.id },
        {
          budgetId: null,
          categoryId: budget.categoryId,
          transactionDate: { gte: monthStart(monthKey), lte: monthEnd(monthKey) },
        },
      ],
    },
    select: { amountMinor: true },
  });
  return rows.reduce((sum, row) => sum + row.amountMinor, 0n);
}

export async function serializeBudget(userId: string, budget: {
  id: string;
  name: string | null;
  categoryId: string;
  amountMinor: bigint;
  themeIcon: string | null;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  const spent = await computeSpent(userId, budget);
  const limit = budget.amountMinor;
  const percentage = limit > 0n ? Math.min(999, Math.round((Number(spent) / Number(limit)) * 100)) : 0;
  const status = percentage >= 100 ? "OVER_BUDGET" : percentage >= 80 ? "NEAR_LIMIT" : "ON_TRACK";

  return {
    id: budget.id,
    name: budget.name,
    categoryId: budget.categoryId,
    amount: limit,
    spent,
    remaining: limit - spent,
    percentage,
    status,
    themeIcon: budget.themeIcon,
    month: `${budget.startDate.getUTCFullYear()}-${String(budget.startDate.getUTCMonth() + 1).padStart(2, "0")}`,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

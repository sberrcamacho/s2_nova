import { prisma } from "./prisma.js";

// Goal progress is the live sum of linked COMPLETED transactions. Shared by
// routes/goals.ts and the Inicio alert rules (routes/alerts.ts).

export async function computeProgress(goalId: string): Promise<bigint> {
  const rows = await prisma.transaction.findMany({
    where: { goalId, status: "COMPLETED" },
    select: { amountMinor: true },
  });
  return rows.reduce((sum, row) => sum + row.amountMinor, 0n);
}

// What each wallet has put into the goal (net of linked rows), so a goal
// can be closed by returning every wallet its own share.
export async function computeContributions(goalId: string): Promise<{ accountId: string; amount: bigint }[]> {
  const rows = await prisma.transaction.groupBy({
    by: ["accountId"],
    where: { goalId, status: "COMPLETED" },
    _sum: { amountMinor: true },
  });
  return rows
    .map((row) => ({ accountId: row.accountId, amount: row._sum.amountMinor ?? 0n }))
    .filter((row) => row.amount > 0n);
}

export async function serializeGoal(goal: {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  targetDate: Date | null;
  themeIcon: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const [currentAmount, contributions] = await Promise.all([computeProgress(goal.id), computeContributions(goal.id)]);
  const target = goal.targetAmountMinor;
  const percentage = target > 0n ? Math.min(999, Math.round((Number(currentAmount) / Number(target)) * 100)) : 0;

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: target,
    currentAmount,
    remaining: target - currentAmount,
    percentage,
    themeIcon: goal.themeIcon,
    contributions,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

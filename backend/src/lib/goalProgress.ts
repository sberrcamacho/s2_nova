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

export async function serializeGoal(goal: {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  targetDate: Date | null;
  themeIcon: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const currentAmount = await computeProgress(goal.id);
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
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

import type { Goal, GoalPlan } from "@prisma/client";
import { principalSum } from "./budgetProgress.js";
import { convertMinor, fromMinor, principalOf, referenceRate } from "./currency.js";
import { addInterval, type Interval } from "./dates.js";
import { applyBalanceEffect, type Tx } from "./movements.js";
import { prisma } from "./prisma.js";
import { paymentMethodForAccountType } from "../routes/transactions.js";

// Goal progress = "Monto inicial" + Σ linked COMPLETED movements, in the
// principal currency (PLANS.md §2). Shared by routes/goals.ts and the Inicio
// alert rules (routes/alerts.ts).

export async function computeProgress(goalId: string, initialAmountMinor = 0n, userId?: string): Promise<bigint> {
  const rows = await prisma.transaction.findMany({
    where: { goalId, status: "COMPLETED" },
    select: { amountMinor: true, walletAmountMinor: true, accountId: true, userId: true },
  });
  const owner = userId ?? rows[0]?.userId;
  const contributed = owner ? await principalSum(owner, rows) : 0n;
  return initialAmountMinor + contributed;
}

// What each wallet has put into the goal (net of linked rows), so a goal
// can be closed by returning every wallet its own share. Wallet currency.
export async function computeContributions(goalId: string): Promise<{ accountId: string; amount: bigint }[]> {
  const rows = await prisma.transaction.findMany({
    where: { goalId, status: "COMPLETED" },
    select: { accountId: true, amountMinor: true, walletAmountMinor: true },
  });
  const byWallet = new Map<string, bigint>();
  for (const row of rows) byWallet.set(row.accountId, (byWallet.get(row.accountId) ?? 0n) + (row.walletAmountMinor ?? row.amountMinor));
  return [...byWallet.entries()].map(([accountId, amount]) => ({ accountId, amount })).filter((row) => row.amount > 0n);
}

export function planEnded(plan: GoalPlan, next: Date, progress: bigint, target: bigint): boolean {
  if (plan.endMode === "GOAL") return progress >= target;
  if (plan.endMode === "COUNT") return plan.count !== null && plan.doneCount >= plan.count;
  return plan.endDate !== null && next > plan.endDate;
}

// Records one "Aporte" of the plan: a real EXPENSE out of its wallet,
// linked to the goal (the same movement "Abonar" creates).
export async function recordContribution(tx: Tx, goal: Goal, accountId: string, amountMinor: bigint, date: Date) {
  const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
  const principal = await principalOf(goal.userId);
  const other = await tx.category.findFirstOrThrow({ where: { userId: null, slug: "exp.other" } });
  const foreign = account.currency !== principal;
  const rate = foreign ? referenceRate(principal, account.currency) : null;
  const walletAmountMinor = foreign ? convertMinor(amountMinor, principal, account.currency, rate!) : null;
  const row = await tx.transaction.create({
    data: {
      userId: goal.userId,
      accountId,
      type: "EXPENSE",
      status: "COMPLETED",
      amountMinor,
      currency: principal,
      fxRate: rate,
      walletAmountMinor,
      categoryId: other.id,
      goalId: goal.id,
      paymentMethod: paymentMethodForAccountType(account.type),
      description: `Aporte a ${goal.name}`,
      transactionDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
      occurredAt: new Date(),
    },
  });
  await applyBalanceEffect(tx, { accountId, transferToAccountId: null, type: "EXPENSE", amountMinor, walletAmountMinor }, 1);
  return row;
}

// Moves the plan past its current date (after a confirm or skip) and stops
// it when its "Termina" rule is met.
export async function advancePlan(tx: Tx, plan: GoalPlan, goal: Goal, counted: boolean) {
  const next = addInterval(plan.nextDate, plan.frequency as Interval);
  const doneCount = plan.doneCount + (counted ? 1 : 0);
  const progress = await computeProgress(goal.id, goal.initialAmountMinor, goal.userId);
  const ended = planEnded({ ...plan, doneCount }, next, progress, goal.targetAmountMinor);
  return tx.goalPlan.update({ where: { goalId: plan.goalId }, data: { nextDate: next, doneCount, active: !ended } });
}

// "Automático" plans: records every due contribution up to `today` the
// next time the user's data is read. Returns the ones recorded so the
// client can show "Aporte automático registrado".
export async function processDuePlans(userId: string, today: Date) {
  const plans = await prisma.goalPlan.findMany({
    where: { userId, active: true, autoConfirm: true, nextDate: { lte: today } },
    include: { goal: true },
  });
  for (const initial of plans) {
    await prisma.$transaction(async (tx) => {
      let plan: GoalPlan = initial;
      for (let i = 0; i < 400 && plan.active && plan.nextDate <= today; i++) {
        const account = await tx.account.findFirst({ where: { id: plan.accountId, userId } });
        if (!account) break;
        await recordContribution(tx, initial.goal, plan.accountId, plan.amountMinor, plan.nextDate);
        plan = await advancePlan(tx, plan, initial.goal, true);
      }
    });
  }
}

export function serializePlan(plan: GoalPlan, principal: string, today: Date) {
  return {
    amount: fromMinor(plan.amountMinor, principal),
    frequency: plan.frequency,
    accountId: plan.accountId,
    startDate: plan.startDate,
    endMode: plan.endMode,
    count: plan.count,
    endDate: plan.endDate,
    autoConfirm: plan.autoConfirm,
    nextDate: plan.nextDate,
    doneCount: plan.doneCount,
    active: plan.active,
    due: plan.active && !plan.autoConfirm && plan.nextDate <= today,
  };
}

export async function serializeGoal(goal: Goal & { plan?: GoalPlan | null }, today = new Date()) {
  const principal = await principalOf(goal.userId);
  const [currentAmount, contributions] = await Promise.all([
    computeProgress(goal.id, goal.initialAmountMinor, goal.userId),
    computeContributions(goal.id),
  ]);
  const target = goal.targetAmountMinor;
  const percentage = target > 0n ? Math.min(999, Math.round((Number(currentAmount) / Number(target)) * 100)) : 0;

  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    currency: principal,
    targetAmount: fromMinor(target, principal),
    initialAmount: fromMinor(goal.initialAmountMinor, principal),
    currentAmount: fromMinor(currentAmount, principal),
    remaining: fromMinor(target - currentAmount, principal),
    percentage,
    themeIcon: goal.themeIcon,
    contributions: contributions.map((c) => ({ accountId: c.accountId, amount: Number(c.amount) })),
    plan: goal.plan ? serializePlan(goal.plan, principal, today) : null,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

import type { Account, Goal, GoalPlan, Prisma } from "@prisma/client";
import { convertMinor, fromMinor, principalOf, referenceRate } from "./currency.js";
import { addInterval, type Interval } from "./dates.js";
import { applyBalanceEffect, type Tx } from "./movements.js";
import { prisma } from "./prisma.js";
import { paymentMethodForAccountType } from "../routes/transactions.js";

// Goal progress = "Monto inicial" + Σ linked COMPLETED movements, in the
// principal currency (PLANS.md §2). Shared by routes/goals.ts and the Inicio
// alert rules (routes/alerts.ts).
//
// Everything that runs inside an interactive transaction takes that `tx`
// (or values resolved before it opened): a query on the global client there
// needs a second pooled connection while the first one is held, which
// stalls every request once the pool is busy.

type Db = Tx;
type GoalRow = { goalId: string | null; amountMinor: bigint; walletAmountMinor: bigint | null; accountId: string };

// What a goal's figures need about its owner: the principal currency and
// each wallet's currency.
export type GoalContext = { principal: string; currencyOf: Map<string, string> };

export async function goalContext(userId: string, db: Db = prisma): Promise<GoalContext> {
  // principalOf's query, through `db`.
  const [principalRow, wallets] = await Promise.all([
    db.userCurrency.findFirst({ where: { userId, isPrincipal: true }, select: { code: true } }),
    db.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
  ]);
  return { principal: principalRow?.code ?? "COP", currencyOf: new Map(wallets.map((w) => [w.id, w.currency])) };
}

function contributedOf(rows: GoalRow[], ctx: GoalContext): bigint {
  return rows.reduce((sum, row) => {
    const walletMinor = row.walletAmountMinor ?? row.amountMinor;
    return sum + convertMinor(walletMinor, ctx.currencyOf.get(row.accountId) ?? ctx.principal, ctx.principal);
  }, 0n);
}

function contributionsOf(rows: GoalRow[]): { accountId: string; amount: bigint }[] {
  const byWallet = new Map<string, bigint>();
  for (const row of rows) byWallet.set(row.accountId, (byWallet.get(row.accountId) ?? 0n) + (row.walletAmountMinor ?? row.amountMinor));
  return [...byWallet.entries()].map(([accountId, amount]) => ({ accountId, amount })).filter((row) => row.amount > 0n);
}

const goalRowSelect = { goalId: true, amountMinor: true, walletAmountMinor: true, accountId: true, userId: true } as const;

export async function computeProgress(goalId: string, initialAmountMinor = 0n, userId?: string, db: Db = prisma): Promise<bigint> {
  const rows = await db.transaction.findMany({ where: { goalId, status: "COMPLETED" }, select: goalRowSelect });
  const owner = userId ?? rows[0]?.userId;
  if (!owner || rows.length === 0) return initialAmountMinor;
  return initialAmountMinor + contributedOf(rows, await goalContext(owner, db));
}

// What each wallet has put into the goal (net of linked rows), so a goal
// can be closed by returning every wallet its own share. Wallet currency.
export async function computeContributions(goalId: string): Promise<{ accountId: string; amount: bigint }[]> {
  const rows = await prisma.transaction.findMany({ where: { goalId, status: "COMPLETED" }, select: goalRowSelect });
  return contributionsOf(rows);
}

export function planEnded(plan: GoalPlan, next: Date, progress: bigint, target: bigint): boolean {
  if (plan.endMode === "GOAL") return progress >= target;
  if (plan.endMode === "COUNT") return plan.count !== null && plan.doneCount >= plan.count;
  return plan.endDate !== null && next > plan.endDate;
}

// Resolved once, before a transaction opens.
export type ContributionContext = { principal: string; otherCategoryId: string };

export async function contributionContext(userId: string): Promise<ContributionContext> {
  const [principal, other] = await Promise.all([
    principalOf(userId),
    prisma.category.findFirstOrThrow({ where: { userId: null, slug: "exp.other" }, select: { id: true } }),
  ]);
  return { principal, otherCategoryId: other.id };
}

type ContributionRow = Prisma.TransactionCreateManyInput & { amountMinor: bigint; walletAmountMinor: bigint | null };

// The row of one "Aporte": a real EXPENSE out of its wallet, linked to the
// goal (the same movement "Abonar" creates).
function contributionData(
  goal: Goal,
  account: Pick<Account, "id" | "currency" | "type">,
  amountMinor: bigint,
  date: Date,
  ctx: ContributionContext,
  clientRequestId?: string,
): ContributionRow {
  const foreign = account.currency !== ctx.principal;
  const rate = foreign ? referenceRate(ctx.principal, account.currency) : null;
  return {
    userId: goal.userId,
    accountId: account.id,
    type: "EXPENSE",
    status: "COMPLETED",
    amountMinor,
    currency: ctx.principal,
    fxRate: rate,
    walletAmountMinor: foreign ? convertMinor(amountMinor, ctx.principal, account.currency, rate!) : null,
    categoryId: ctx.otherCategoryId,
    goalId: goal.id,
    paymentMethod: paymentMethodForAccountType(account.type),
    description: `Aporte a ${goal.name}`,
    transactionDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
    occurredAt: new Date(),
    clientRequestId: clientRequestId ?? null,
  };
}

export async function recordContribution(
  tx: Tx,
  goal: Goal,
  accountId: string,
  amountMinor: bigint,
  date: Date,
  ctx: ContributionContext,
  clientRequestId?: string,
) {
  const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
  const data = contributionData(goal, account, amountMinor, date, ctx, clientRequestId);
  const row = await tx.transaction.create({ data });
  await applyBalanceEffect(tx, { accountId, transferToAccountId: null, type: "EXPENSE", amountMinor, walletAmountMinor: data.walletAmountMinor ?? null }, 1);
  return row;
}

// Moves the plan past its current date (after a confirm or skip) and stops
// it when its "Termina" rule is met. Progress is read through `tx`, so a
// contribution recorded in the same transaction counts.
export async function advancePlan(tx: Tx, plan: GoalPlan, goal: Goal, counted: boolean) {
  const next = addInterval(plan.nextDate, plan.frequency as Interval);
  const doneCount = plan.doneCount + (counted ? 1 : 0);
  const progress = await computeProgress(goal.id, goal.initialAmountMinor, goal.userId, tx);
  const ended = planEnded({ ...plan, doneCount }, next, progress, goal.targetAmountMinor);
  return tx.goalPlan.update({ where: { goalId: plan.goalId }, data: { nextDate: next, doneCount, active: !ended } });
}

// How many missed "Aporte automático" dates one read catches up on. The
// rest follow on the next read, so no request does unbounded work.
export const PLAN_CATCH_UP_LIMIT = 60;

// "Automático" plans: records the due contributions up to `today` the next
// time the user's data is read. Each plan is one short transaction: the
// due dates are worked out in memory, then written with one insert, one
// balance update and one plan update.
export async function processDuePlans(userId: string, today: Date) {
  const plans = await prisma.goalPlan.findMany({
    where: { userId, active: true, autoConfirm: true, nextDate: { lte: today } },
    include: { goal: true },
  });
  if (plans.length === 0) return;
  const [ctx, figures] = await Promise.all([contributionContext(userId), goalContext(userId)]);

  for (const plan of plans) {
    try {
      const account = await prisma.account.findFirst({ where: { id: plan.accountId, userId } });
      if (!account) continue;
      const goal = plan.goal;
      let progress = await computeProgress(goal.id, goal.initialAmountMinor, userId);
      let next = plan.nextDate;
      let doneCount = plan.doneCount;
      let active = true;
      const rows: ContributionRow[] = [];
      while (rows.length < PLAN_CATCH_UP_LIMIT && active && next <= today) {
        const row = contributionData(goal, account, plan.amountMinor, next, ctx);
        rows.push(row);
        progress += convertMinor(row.walletAmountMinor ?? row.amountMinor, account.currency, figures.principal);
        doneCount += 1;
        next = addInterval(next, plan.frequency as Interval);
        active = !planEnded({ ...plan, doneCount }, next, progress, goal.targetAmountMinor);
      }
      if (rows.length === 0) continue;

      await prisma.$transaction(
        async (tx) => {
          // Only the read that still sees the plan where it was records it,
          // so two reads at once (Inicio asks for goals and alerts together)
          // never record the same date twice.
          const moved = await tx.goalPlan.updateMany({
            where: { goalId: plan.goalId, nextDate: plan.nextDate, doneCount: plan.doneCount, active: true },
            data: { nextDate: next, doneCount, active },
          });
          if (moved.count === 0) return;
          await tx.transaction.createMany({ data: rows });
          const amountMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0n);
          const walletAmountMinor = rows[0]!.walletAmountMinor == null ? null : rows.reduce((sum, row) => sum + row.walletAmountMinor!, 0n);
          await applyBalanceEffect(tx, { accountId: account.id, transferToAccountId: null, type: "EXPENSE", amountMinor, walletAmountMinor }, 1);
        },
        { maxWait: 5_000, timeout: 15_000 },
      );
    } catch (error) {
      // One plan that can't be recorded must not fail the read that
      // triggered it; it is tried again on the next one.
      console.error(`processDuePlans: plan ${plan.goalId} failed`, error);
    }
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

type GoalWithPlan = Goal & { plan?: GoalPlan | null };

// Serializes all of one user's goals with two queries in total (their
// linked rows and the user's wallets), whatever the number of goals.
export async function serializeGoals(userId: string, goals: GoalWithPlan[], today = new Date()) {
  if (goals.length === 0) return [];
  const [ctx, rows] = await Promise.all([
    goalContext(userId),
    prisma.transaction.findMany({ where: { goalId: { in: goals.map((g) => g.id) }, status: "COMPLETED" }, select: goalRowSelect }),
  ]);
  const rowsOf = new Map<string, GoalRow[]>();
  for (const row of rows) {
    const list = rowsOf.get(row.goalId!);
    if (list) list.push(row);
    else rowsOf.set(row.goalId!, [row]);
  }
  return goals.map((goal) => {
    const own = rowsOf.get(goal.id) ?? [];
    const currentAmount = goal.initialAmountMinor + contributedOf(own, ctx);
    const target = goal.targetAmountMinor;
    const percentage = target > 0n ? Math.min(999, Math.round((Number(currentAmount) / Number(target)) * 100)) : 0;
    const principal = ctx.principal;
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
      contributions: contributionsOf(own).map((c) => ({ accountId: c.accountId, amount: Number(c.amount) })),
      plan: goal.plan ? serializePlan(goal.plan, principal, today) : null,
      targetDate: goal.targetDate,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  });
}

export async function serializeGoal(goal: GoalWithPlan, today = new Date()) {
  return (await serializeGoals(goal.userId, [goal], today))[0]!;
}

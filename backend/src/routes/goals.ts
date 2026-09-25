import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { paymentMethodForAccountType } from "./transactions.js";
import { principalOf, toMinor } from "../lib/currency.js";
import { parseDateOnly } from "../lib/dates.js";
import {
  advancePlan,
  computeContributions,
  computeProgress,
  processDuePlans,
  recordContribution,
  serializeGoal,
} from "../lib/goalProgress.js";
import { prisma } from "../lib/prisma.js";
import { guessPlanIcon, PLAN_ICON_KEYS } from "../lib/taxonomy.js";
import { dateOnlySchema } from "../lib/validation.js";
import { resolveToday } from "./summary.js";

// PLANS.md §2–3. A goal has a plan icon (suggested from its name), a
// target, an optional "Monto inicial" and "Fecha objetivo", and at most one
// "Aporte periódico" (GoalPlan).

const planIconSchema = z.enum(PLAN_ICON_KEYS as [string, ...string[]]);
const money = z.number().positive().max(1e12);

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: planIconSchema.optional(),
  targetAmount: money,
  initialAmount: z.number().min(0).max(1e12).optional(),
  targetDate: dateOnlySchema.optional(),
});

const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: planIconSchema.optional(),
  targetAmount: money.optional(),
  initialAmount: z.number().min(0).max(1e12).optional(),
  targetDate: dateOnlySchema.nullable().optional(),
});

const planSchema = z
  .object({
    amount: money,
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    accountId: z.string().uuid(),
    startDate: dateOnlySchema,
    endMode: z.enum(["GOAL", "COUNT", "DATE"]).default("GOAL"),
    count: z.number().int().min(1).max(999).optional(),
    endDate: dateOnlySchema.optional(),
    autoConfirm: z.boolean().default(false),
  })
  .refine((p) => p.endMode !== "COUNT" || p.count !== undefined, { message: "count is required.", path: ["count"] })
  .refine((p) => p.endMode !== "DATE" || p.endDate !== undefined, { message: "endDate is required.", path: ["endDate"] });

const contributeSchema = z.object({
  amount: money,
  accountId: z.string().uuid(),
  date: dateOnlySchema.optional(),
});

const deleteGoalSchema = z.object({
  returnToAccountId: z.string().uuid().optional(),
  // "Devolver a su origen": each contributing wallet gets its own share.
  returnToOrigin: z.boolean().optional(),
});

const todayQuery = z.object({ today: dateOnlySchema.optional() });

async function goalWithPlan(id: string, userId: string) {
  return prisma.goal.findFirst({ where: { id, userId }, include: { plan: true } });
}

export async function goalRoutes(app: FastifyInstance) {
  app.get("/goals", { preHandler: app.authenticate }, async (request) => {
    const today = resolveToday(todayQuery.parse(request.query).today);
    await processDuePlans(request.userId!, today);
    const goals = await prisma.goal.findMany({
      where: { userId: request.userId },
      include: { plan: true },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(goals.map((goal) => serializeGoal(goal, today)));
  });

  app.post("/goals", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createGoalSchema.parse(request.body);
    const principal = await principalOf(request.userId!);
    const goal = await prisma.goal.create({
      data: {
        userId: request.userId!,
        name: body.name,
        icon: body.icon ?? guessPlanIcon(body.name) ?? "other",
        targetAmountMinor: toMinor(body.targetAmount, principal),
        initialAmountMinor: toMinor(body.initialAmount ?? 0, principal),
        targetDate: body.targetDate ? parseDateOnly(body.targetDate) : null,
      },
      include: { plan: true },
    });
    reply.status(201);
    return serializeGoal(goal);
  });

  app.patch("/goals/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateGoalSchema.parse(request.body);

    const existing = await prisma.goal.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Goal not found." });
    }
    const principal = await principalOf(request.userId!);

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name: body.name,
        icon: body.icon,
        targetAmountMinor: body.targetAmount !== undefined ? toMinor(body.targetAmount, principal) : undefined,
        initialAmountMinor: body.initialAmount !== undefined ? toMinor(body.initialAmount, principal) : undefined,
        targetDate: body.targetDate === undefined ? undefined : body.targetDate === null ? null : parseDateOnly(body.targetDate),
      },
      include: { plan: true },
    });
    return serializeGoal(goal);
  });

  // "Abonar": a one-off contribution out of a wallet.
  app.post("/goals/:id/contribute", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = contributeSchema.parse(request.body);
    const userId = request.userId!;
    const goal = await goalWithPlan(id, userId);
    if (!goal) return reply.status(404).send({ error: "Goal not found." });
    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) return reply.status(422).send({ error: "Unknown wallet." });
    const principal = await principalOf(userId);
    await prisma.$transaction((tx) =>
      recordContribution(tx, goal, account.id, toMinor(body.amount, principal), body.date ? parseDateOnly(body.date) : new Date()),
    );
    return serializeGoal((await goalWithPlan(id, userId))!);
  });

  // "Aporte periódico": create or replace ("Aplicar").
  app.put("/goals/:id/plan", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = planSchema.parse(request.body);
    const userId = request.userId!;
    const goal = await prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) return reply.status(404).send({ error: "Goal not found." });
    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) return reply.status(422).send({ error: "Unknown wallet." });
    const principal = await principalOf(userId);
    const data = {
      amountMinor: toMinor(body.amount, principal),
      frequency: body.frequency,
      accountId: body.accountId,
      startDate: parseDateOnly(body.startDate),
      endMode: body.endMode,
      count: body.endMode === "COUNT" ? body.count! : null,
      endDate: body.endMode === "DATE" ? parseDateOnly(body.endDate!) : null,
      autoConfirm: body.autoConfirm,
      nextDate: parseDateOnly(body.startDate),
      doneCount: 0,
      active: true,
    };
    await prisma.goalPlan.upsert({ where: { goalId: id }, create: { goalId: id, userId, ...data }, update: data });
    return serializeGoal((await goalWithPlan(id, userId))!);
  });

  // "Quitar aporte periódico".
  app.delete("/goals/:id/plan", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const userId = request.userId!;
    const goal = await prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) return reply.status(404).send({ error: "Goal not found." });
    await prisma.goalPlan.deleteMany({ where: { goalId: id } });
    return serializeGoal((await goalWithPlan(id, userId))!);
  });

  // "Confirmar aporte": records the due contribution and advances the plan.
  app.post("/goals/:id/plan/confirm", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ amount: money.optional() }).parse(request.body ?? {});
    const userId = request.userId!;
    const goal = await goalWithPlan(id, userId);
    if (!goal?.plan) return reply.status(404).send({ error: "Goal plan not found." });
    if (!goal.plan.active) return reply.status(422).send({ error: "This plan has ended." });
    const plan = goal.plan;
    const principal = await principalOf(userId);
    await prisma.$transaction(async (tx) => {
      await recordContribution(tx, goal, plan.accountId, body.amount !== undefined ? toMinor(body.amount, principal) : plan.amountMinor, new Date());
      await advancePlan(tx, plan, goal, true);
    });
    return serializeGoal((await goalWithPlan(id, userId))!);
  });

  // "Omitir esta vez": advances the plan without a movement.
  app.post("/goals/:id/plan/skip", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const userId = request.userId!;
    const goal = await goalWithPlan(id, userId);
    if (!goal?.plan) return reply.status(404).send({ error: "Goal plan not found." });
    await prisma.$transaction((tx) => advancePlan(tx, goal.plan!, goal, false));
    return serializeGoal((await goalWithPlan(id, userId))!);
  });

  // A goal holds no money of its own — "progress" is just the sum of
  // linked transactions (computeProgress above). So closing a goal with
  // real progress needs to actually put that value somewhere: if
  // currentAmount > 0, returnToAccountId is required and a real, visible
  // INCOME transaction for that amount is created in the chosen wallet
  // (same "a real transaction, not a flag" pattern as settle-loan in
  // transactions.ts) before the goal itself is deleted. A goal at 0 just
  // deletes outright, same as before.
  app.delete("/goals/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = deleteGoalSchema.parse(request.body ?? {});
    const userId = request.userId!;

    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Goal not found." });
    }

    // Only the movements hold money; "Monto inicial" never left a wallet.
    const currentAmount = await computeProgress(id, 0n, userId);

    if (currentAmount > 0n) {
      let refunds: { accountId: string; amount: bigint }[]
      if (body.returnToOrigin) {
        refunds = await computeContributions(id);
        // Rows linked from INCOME or refunds can leave the per-wallet split
        // short of or above the total; the last wallet absorbs the rest.
        if (refunds.length === 0) {
          return reply.status(422).send({ error: "The goal has no contributing wallet to return funds to." });
        }
        const split = refunds.reduce((sum, r) => sum + r.amount, 0n);
        refunds[refunds.length - 1]!.amount += currentAmount - split;
        refunds = refunds.filter((r) => r.amount > 0n);
      } else if (body.returnToAccountId) {
        refunds = [{ accountId: body.returnToAccountId, amount: currentAmount }];
      } else {
        return reply.status(422).send({ error: "returnToAccountId or returnToOrigin is required to delete a goal with remaining funds." });
      }
      const destinations = await prisma.account.findMany({ where: { id: { in: refunds.map((r) => r.accountId) }, userId } });
      if (destinations.length !== new Set(refunds.map((r) => r.accountId)).size) {
        return reply.status(422).send({ error: "Destination wallet not found." });
      }
      const otherCategory = await prisma.category.findFirstOrThrow({ where: { userId: null, slug: "inc.other" } });

      await prisma.$transaction(async (tx) => {
        for (const refund of refunds) {
          const destination = destinations.find((d) => d.id === refund.accountId)!;
          await tx.transaction.create({
            data: {
              userId,
              accountId: destination.id,
              type: "INCOME",
              status: "COMPLETED",
              amountMinor: refund.amount,
              categoryId: otherCategory.id,
              paymentMethod: paymentMethodForAccountType(destination.type),
              description: `Fondos devueltos: ${existing.name}`,
              transactionDate: new Date(),
            },
          });
          await tx.account.update({
            where: { id: destination.id },
            data: { currentBalanceMinor: { increment: refund.amount } },
          });
        }
        await tx.goal.delete({ where: { id } });
      });
    } else {
      // Linked transactions keep their history; goalId is set null (onDelete: SetNull).
      await prisma.goal.delete({ where: { id } });
    }

    return reply.status(204).send();
  });
}

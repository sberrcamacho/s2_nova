import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GOAL_CATEGORY_IDS } from "../lib/goalCategories.js";
import { paymentMethodForAccountType } from "./transactions.js";
import { computeContributions, computeProgress, serializeGoal } from "../lib/goalProgress.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema } from "../lib/validation.js";

const themeIconSchema = z.enum(GOAL_CATEGORY_IDS);

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: z.number().int().positive(),
  targetDate: dateOnlySchema.optional(),
  themeIcon: themeIconSchema.optional(),
});

const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().int().positive().optional(),
  targetDate: dateOnlySchema.nullable().optional(),
  themeIcon: themeIconSchema.nullable().optional(),
});

const deleteGoalSchema = z.object({
  returnToAccountId: z.string().uuid().optional(),
  // "Devolver a su origen": each contributing wallet gets its own share.
  returnToOrigin: z.boolean().optional(),
});

export async function goalRoutes(app: FastifyInstance) {
  app.get("/goals", { preHandler: app.authenticate }, async (request) => {
    const goals = await prisma.goal.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(goals.map(serializeGoal));
  });

  app.post("/goals", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createGoalSchema.parse(request.body);
    const goal = await prisma.goal.create({
      data: {
        userId: request.userId!,
        name: body.name,
        targetAmountMinor: BigInt(body.targetAmount),
        targetDate: body.targetDate ? new Date(`${body.targetDate}T00:00:00.000Z`) : null,
        themeIcon: body.themeIcon,
      },
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

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name: body.name,
        targetAmountMinor: body.targetAmount !== undefined ? BigInt(body.targetAmount) : undefined,
        targetDate:
          body.targetDate === undefined
            ? undefined
            : body.targetDate === null
              ? null
              : new Date(`${body.targetDate}T00:00:00.000Z`),
        themeIcon: body.themeIcon,
      },
    });
    return serializeGoal(goal);
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

    const currentAmount = await computeProgress(id);

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
      const otherCategory = await prisma.category.findFirstOrThrow({ where: { slug: "other" } });

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

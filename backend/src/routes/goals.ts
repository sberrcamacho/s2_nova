import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BUDGET_GOAL_THEME_IDS } from "../lib/budgetGoalThemes.js";
import { paymentMethodForAccountType } from "./transactions.js";
import { prisma } from "../lib/prisma.js";

const themeIconSchema = z.enum(BUDGET_GOAL_THEME_IDS);

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: z.number().int().positive(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  themeIcon: themeIconSchema.optional(),
});

const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().int().positive().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  themeIcon: themeIconSchema.nullable().optional(),
});

const deleteGoalSchema = z.object({
  returnToAccountId: z.string().uuid().optional(),
});

async function computeProgress(goalId: string): Promise<bigint> {
  const rows = await prisma.transaction.findMany({
    where: { goalId, status: "COMPLETED" },
    select: { amountMinor: true },
  });
  return rows.reduce((sum, row) => sum + row.amountMinor, 0n);
}

async function serializeGoal(goal: {
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
      if (!body.returnToAccountId) {
        return reply.status(422).send({ error: "returnToAccountId is required to delete a goal with remaining funds." });
      }
      const destination = await prisma.account.findFirst({ where: { id: body.returnToAccountId, userId } });
      if (!destination) {
        return reply.status(422).send({ error: "Destination wallet not found." });
      }
      const otherCategory = await prisma.category.findFirstOrThrow({ where: { slug: "other" } });

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            accountId: destination.id,
            type: "INCOME",
            status: "COMPLETED",
            amountMinor: currentAmount,
            categoryId: otherCategory.id,
            paymentMethod: paymentMethodForAccountType(destination.type),
            description: `Fondos devueltos: ${existing.name}`,
            transactionDate: new Date(),
          },
        });
        await tx.account.update({
          where: { id: destination.id },
          data: { currentBalanceMinor: { increment: currentAmount } },
        });
        await tx.goal.delete({ where: { id } });
      });
    } else {
      // Linked transactions keep their history; goalId is set null (onDelete: SetNull).
      await prisma.goal.delete({ where: { id } });
    }

    return reply.status(204).send();
  });
}

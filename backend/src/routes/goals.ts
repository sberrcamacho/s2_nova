import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: z.number().int().positive(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().int().positive().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
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
      },
    });
    return serializeGoal(goal);
  });

  app.delete("/goals/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = await prisma.goal.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Goal not found." });
    }
    // Linked transactions keep their history; goalId is set null (onDelete: SetNull).
    await prisma.goal.delete({ where: { id } });
    return reply.status(204).send();
  });
}

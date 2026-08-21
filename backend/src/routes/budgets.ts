import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { currentMonthKey, monthEnd, monthStart } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);

const createBudgetSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().uuid(),
  amount: z.number().int().positive(),
  month: monthKeySchema.optional(),
});

const updateBudgetSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
  amount: z.number().int().positive().optional(),
});

const recommendationSchema = z.object({
  monthlyIncome: z.number().int().positive(),
  needsPct: z.number().min(0).max(100).default(50),
  wantsPct: z.number().min(0).max(100).default(30),
  savingsPct: z.number().min(0).max(100).default(20),
});

// A transaction contributes to a budget either by direct link
// (transaction.budgetId = budget.id) or, for budgets nothing links to
// directly yet, by the legacy category+month match — never both, so a
// transaction can't double-count (it either has budgetId set or it
// doesn't). See schema.prisma's Budget doc comment.
async function computeSpent(userId: string, budget: { id: string; categoryId: string; startDate: Date }): Promise<bigint> {
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

async function serializeBudget(userId: string, budget: {
  id: string;
  name: string | null;
  categoryId: string;
  amountMinor: bigint;
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
    month: `${budget.startDate.getUTCFullYear()}-${String(budget.startDate.getUTCMonth() + 1).padStart(2, "0")}`,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

export async function budgetRoutes(app: FastifyInstance) {
  app.get("/budgets", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ month: monthKeySchema.optional() }).parse(request.query);
    const start = monthStart(query.month ?? currentMonthKey());
    const budgets = await prisma.budget.findMany({
      where: { userId: request.userId, startDate: start },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(budgets.map((budget) => serializeBudget(request.userId!, budget)));
  });

  app.post("/budgets", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createBudgetSchema.parse(request.body);

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, OR: [{ userId: null }, { userId: request.userId }] },
    });
    if (!category) {
      return reply.status(422).send({ error: "Unknown category." });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: request.userId!,
        name: body.name,
        categoryId: body.categoryId,
        amountMinor: BigInt(body.amount),
        period: "MONTHLY",
        startDate: monthStart(body.month ?? currentMonthKey()),
      },
    });
    reply.status(201);
    return serializeBudget(request.userId!, budget);
  });

  app.patch("/budgets/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateBudgetSchema.parse(request.body);

    const existing = await prisma.budget.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Budget not found." });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: body.name,
        amountMinor: body.amount !== undefined ? BigInt(body.amount) : undefined,
      },
    });
    return serializeBudget(request.userId!, budget);
  });

  // Computes a split suggestion and stores it — never creates real budgets.
  // See ARCHITECTURE.md §"Budget suggestions": a recommendation is only
  // ever a stored suggestion; turning it into real budgets is a separate,
  // explicit user action via the normal POST /budgets endpoint.
  app.post("/budgets/recommendations", { preHandler: app.authenticate }, async (request, reply) => {
    const body = recommendationSchema.parse(request.body);
    if (body.needsPct + body.wantsPct + body.savingsPct !== 100) {
      return reply.status(422).send({ error: "needsPct + wantsPct + savingsPct must total 100." });
    }

    const recommendation = await prisma.budgetRecommendation.create({
      data: {
        userId: request.userId!,
        strategy: "50-30-20",
        needsPct: body.needsPct,
        wantsPct: body.wantsPct,
        savingsPct: body.savingsPct,
        basedOnIncomeMinor: BigInt(body.monthlyIncome),
      },
    });

    reply.status(201);
    return {
      id: recommendation.id,
      strategy: recommendation.strategy,
      needsPct: recommendation.needsPct,
      wantsPct: recommendation.wantsPct,
      savingsPct: recommendation.savingsPct,
      basedOnIncome: recommendation.basedOnIncomeMinor,
      needsAmount: Math.round((Number(body.monthlyIncome) * body.needsPct) / 100),
      wantsAmount: Math.round((Number(body.monthlyIncome) * body.wantsPct) / 100),
      savingsAmount: Math.round((Number(body.monthlyIncome) * body.savingsPct) / 100),
      acceptedAt: recommendation.acceptedAt,
      createdAt: recommendation.createdAt,
    };
  });

  // Marks the suggestion as acknowledged/accepted by the user. Does not
  // create Budget rows itself — there's no fixed mapping from a
  // needs/wants/savings split to specific categories, so turning this into
  // real per-category budgets stays an explicit POST /budgets action
  // (the client can pre-fill amounts from this recommendation's numbers).
  app.post("/budgets/recommendations/:id/accept", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = await prisma.budgetRecommendation.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Recommendation not found." });
    }
    const updated = await prisma.budgetRecommendation.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
    return { id: updated.id, acceptedAt: updated.acceptedAt };
  });
}

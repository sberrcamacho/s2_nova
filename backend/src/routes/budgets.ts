import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { serializeBudget } from "../lib/budgetProgress.js";
import { currentMonthKey, monthStart } from "../lib/dates.js";
import { BUDGET_GOAL_THEME_IDS } from "../lib/budgetGoalThemes.js";
import { prisma } from "../lib/prisma.js";
import { monthKeySchema } from "../lib/validation.js";

const themeIconSchema = z.enum(BUDGET_GOAL_THEME_IDS);

const createBudgetSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().uuid(),
  amount: z.number().int().positive(),
  month: monthKeySchema.optional(),
  themeIcon: themeIconSchema.optional(),
});

const updateBudgetSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
  amount: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  themeIcon: themeIconSchema.nullable().optional(),
});

const recommendationSchema = z.object({
  monthlyIncome: z.number().int().positive(),
  needsPct: z.number().min(0).max(100).default(50),
  wantsPct: z.number().min(0).max(100).default(30),
  savingsPct: z.number().min(0).max(100).default(20),
});

// Splits `total` into integer amounts proportional to `percentages`
// (summing to ~100) that themselves sum EXACTLY to `total` — three
// independent `Math.round`s (the previous implementation) can under/
// overshoot the total by a few units (e.g. splitting 100 into 33.3/33.3/
// 33.4 rounds to 33/33/33 = 99, losing 1). This is the standard
// largest-remainder allocation: floor every share, then hand the leftover
// units to the shares with the largest fractional remainder, in order.
function allocateByPercentage(total: number, percentages: number[]): number[] {
  const raw = percentages.map((pct) => (total * pct) / 100);
  const floors = raw.map(Math.floor);
  const remainders = raw.map((value, index) => ({ index, fraction: value - floors[index]! }));
  let leftover = total - floors.reduce((sum, value) => sum + value, 0);

  remainders.sort((a, b) => b.fraction - a.fraction);
  const amounts = [...floors];
  for (const { index } of remainders) {
    if (leftover <= 0) break;
    amounts[index]! += 1;
    leftover -= 1;
  }
  return amounts;
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

    const startDate = monthStart(body.month ?? currentMonthKey());
    // Nothing else stops two Budget rows for the same category/month, and
    // computeSpent's fallback (unlinked transactions matched by
    // category+month) would then count the same spend toward both budgets
    // at once — reject the duplicate instead of silently double-counting.
    const duplicate = await prisma.budget.findFirst({
      where: { userId: request.userId, categoryId: body.categoryId, startDate },
    });
    if (duplicate) {
      return reply.status(409).send({ error: "A budget for this category and month already exists." });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: request.userId!,
        name: body.name,
        categoryId: body.categoryId,
        amountMinor: BigInt(body.amount),
        period: "MONTHLY",
        startDate,
        themeIcon: body.themeIcon,
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

    // Moving a budget to another category keeps the create rules: the
    // category must be visible to the user and free for that month.
    if (body.categoryId !== undefined && body.categoryId !== existing.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, OR: [{ userId: null }, { userId: request.userId }] },
      });
      if (!category) {
        return reply.status(422).send({ error: "Unknown category." });
      }
      const duplicate = await prisma.budget.findFirst({
        where: { userId: request.userId, categoryId: body.categoryId, startDate: existing.startDate, NOT: { id } },
      });
      if (duplicate) {
        return reply.status(409).send({ error: "A budget for this category and month already exists." });
      }
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: body.name,
        categoryId: body.categoryId,
        amountMinor: body.amount !== undefined ? BigInt(body.amount) : undefined,
        themeIcon: body.themeIcon,
      },
    });
    return serializeBudget(request.userId!, budget);
  });

  // Budgets hold no money of their own — a budget is just a spend limit
  // computed by summing matching transactions (see computeSpent above), so
  // deleting one is a plain delete with no wallet-reassignment step.
  // Linked transactions keep their history; budgetId is set null
  // (onDelete: SetNull), same pattern as goals.ts.
  app.delete("/budgets/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = await prisma.budget.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Budget not found." });
    }
    await prisma.budget.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Computes a split suggestion and stores it — never creates real budgets.
  // See ARCHITECTURE.md §"Budget suggestions": a recommendation is only
  // ever a stored suggestion; turning it into real budgets is a separate,
  // explicit user action via the normal POST /budgets endpoint.
  app.post("/budgets/recommendations", { preHandler: app.authenticate }, async (request, reply) => {
    const body = recommendationSchema.parse(request.body);
    // A plain `!== 100` equality check on floats rejects mathematically-
    // valid splits due to binary floating-point representation (e.g.
    // 33.33 + 33.33 + 33.34 can fail to land on exactly 100) — compare
    // within a small epsilon instead.
    if (Math.abs(body.needsPct + body.wantsPct + body.savingsPct - 100) > 0.01) {
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

    const [needsAmount, wantsAmount, savingsAmount] = allocateByPercentage(Number(body.monthlyIncome), [
      body.needsPct,
      body.wantsPct,
      body.savingsPct,
    ]);

    reply.status(201);
    return {
      id: recommendation.id,
      strategy: recommendation.strategy,
      needsPct: recommendation.needsPct,
      wantsPct: recommendation.wantsPct,
      savingsPct: recommendation.savingsPct,
      basedOnIncome: recommendation.basedOnIncomeMinor,
      needsAmount,
      wantsAmount,
      savingsAmount,
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

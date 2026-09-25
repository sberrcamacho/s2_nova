import type { FastifyInstance } from "fastify";
import type { Budget } from "@prisma/client";
import { z } from "zod";
import { activeInMonth, serializeBudget } from "../lib/budgetProgress.js";
import { principalOf, toMinor } from "../lib/currency.js";
import { currentMonthKey, monthStart, parseDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { PLAN_ICON_KEYS } from "../lib/taxonomy.js";
import { dateOnlySchema, monthKeySchema } from "../lib/validation.js";

// PLANS.md §4: "Por categoría" (CATEGORY) budgets link expenses
// automatically by category scope + wallet set; "Personalizado" (CUSTOM)
// budgets count the movements assigned to them in Nuevo movimiento. Period
// "Mensual" resets on the 1st; "Rango personalizado" covers Desde..Hasta.

const planIconSchema = z.enum(PLAN_ICON_KEYS as [string, ...string[]]);

const budgetFields = {
  name: z.string().trim().min(1).max(80).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  icon: planIconSchema.nullable().optional(),
  walletIds: z.array(z.string().uuid()).max(50).optional(),
  amount: z.number().positive().max(1e12),
  period: z.enum(["MONTHLY", "CUSTOM"]).default("MONTHLY"),
  // MONTHLY: the month it starts (defaults to the current one).
  month: monthKeySchema.optional(),
  // CUSTOM: Desde / Hasta.
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
};

const createBudgetSchema = z
  .object({ kind: z.enum(["CATEGORY", "CUSTOM"]).default("CATEGORY"), ...budgetFields })
  .refine((b) => b.kind === "CUSTOM" || Boolean(b.categoryId), { message: "categoryId is required.", path: ["categoryId"] })
  .refine((b) => b.kind === "CATEGORY" || Boolean(b.name), { message: "name is required.", path: ["name"] })
  .refine((b) => b.period === "MONTHLY" || (b.startDate && b.endDate && b.startDate <= b.endDate), {
    message: "A custom range needs startDate <= endDate.",
    path: ["endDate"],
  });

const updateBudgetSchema = z.object({
  ...budgetFields,
  amount: budgetFields.amount.optional(),
  period: z.enum(["MONTHLY", "CUSTOM"]).optional(),
});

type Range = { startDate: Date; endDate: Date | null };

function rangeOf(body: { period?: "MONTHLY" | "CUSTOM"; month?: string; startDate?: string; endDate?: string }, fallback?: Range): Range {
  if (body.period === "CUSTOM") return { startDate: parseDateOnly(body.startDate!), endDate: parseDateOnly(body.endDate!) };
  if (body.period === "MONTHLY") return { startDate: monthStart(body.month ?? currentMonthKey()), endDate: null };
  return fallback!;
}

const overlaps = (a: Range, b: Range) =>
  (a.endDate === null || b.startDate <= a.endDate) && (b.endDate === null || a.startDate <= b.endDate);

// Same scope and overlapping period is a duplicate (PRODUCT_ARCHITECTURE §9).
async function hasDuplicate(userId: string, categoryId: string, range: Range, exceptId?: string) {
  const others = await prisma.budget.findMany({ where: { userId, kind: "CATEGORY", categoryId, NOT: exceptId ? { id: exceptId } : undefined } });
  return others.some((b: Budget) => overlaps(range, b));
}

async function validWallets(userId: string, walletIds: string[] | undefined) {
  if (!walletIds?.length) return true;
  return (await prisma.account.count({ where: { userId, id: { in: walletIds } } })) === new Set(walletIds).size;
}

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
    const month = query.month ?? currentMonthKey();
    const budgets = await prisma.budget.findMany({
      where: { userId: request.userId, ...activeInMonth(month) },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(budgets.map((budget) => serializeBudget(request.userId!, budget, month)));
  });

  app.post("/budgets", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createBudgetSchema.parse(request.body);
    const userId = request.userId!;

    if (body.kind === "CATEGORY") {
      const category = await prisma.category.findFirst({ where: { id: body.categoryId!, OR: [{ userId: null }, { userId }] } });
      if (!category) return reply.status(422).send({ error: "Unknown category." });
    }
    if (!(await validWallets(userId, body.walletIds))) return reply.status(422).send({ error: "Unknown wallet." });

    const range = rangeOf(body);
    if (body.kind === "CATEGORY" && (await hasDuplicate(userId, body.categoryId!, range))) {
      return reply.status(409).send({ error: "A budget for this category and period already exists." });
    }

    const principal = await principalOf(userId);
    const budget = await prisma.budget.create({
      data: {
        userId,
        kind: body.kind,
        name: body.name ?? null,
        categoryId: body.kind === "CATEGORY" ? body.categoryId! : null,
        icon: body.kind === "CUSTOM" ? (body.icon ?? "other") : null,
        walletIds: body.kind === "CATEGORY" ? (body.walletIds ?? []) : [],
        amountMinor: toMinor(body.amount, principal),
        period: body.period,
        ...range,
      },
    });
    reply.status(201);
    return serializeBudget(userId, budget);
  });

  app.patch("/budgets/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateBudgetSchema.parse(request.body);
    const userId = request.userId!;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Budget not found." });
    }
    if (body.period === "CUSTOM" && !(body.startDate && body.endDate && body.startDate <= body.endDate)) {
      return reply.status(422).send({ error: "A custom range needs startDate <= endDate." });
    }
    if (body.period === "MONTHLY" && !body.month) body.month = existing.period === "MONTHLY" ? undefined : currentMonthKey();
    const range =
      body.period === "MONTHLY" && !body.month && existing.period === "MONTHLY"
        ? { startDate: existing.startDate, endDate: null }
        : rangeOf(body, { startDate: existing.startDate, endDate: existing.endDate });

    if (existing.kind === "CATEGORY") {
      const categoryId = body.categoryId ?? existing.categoryId!;
      if (body.categoryId) {
        const category = await prisma.category.findFirst({ where: { id: body.categoryId, OR: [{ userId: null }, { userId }] } });
        if (!category) return reply.status(422).send({ error: "Unknown category." });
      }
      if ((body.categoryId || body.period) && (await hasDuplicate(userId, categoryId, range, id))) {
        return reply.status(409).send({ error: "A budget for this category and period already exists." });
      }
    }
    if (!(await validWallets(userId, body.walletIds))) return reply.status(422).send({ error: "Unknown wallet." });

    const principal = await principalOf(userId);
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: body.name,
        categoryId: existing.kind === "CATEGORY" && body.categoryId ? body.categoryId : undefined,
        icon: existing.kind === "CUSTOM" && body.icon ? body.icon : undefined,
        walletIds: existing.kind === "CATEGORY" ? body.walletIds : undefined,
        amountMinor: body.amount !== undefined ? toMinor(body.amount, principal) : undefined,
        period: body.period,
        ...range,
      },
    });
    return serializeBudget(userId, budget);
  });

  // Budgets hold no money of their own, so deleting one is a plain delete.
  // Linked and assigned movements keep their history (onDelete: SetNull).
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

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { serializeBudget } from "../lib/budgetProgress.js";
import { monthKeyOf, monthStart } from "../lib/dates.js";
import { serializeGoal } from "../lib/goalProgress.js";
import { loanRepaidMap, outstandingOf } from "../lib/loans.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema } from "../lib/validation.js";
import { resolveToday } from "./summary.js";

// The single rule set behind Android's alert card + bell and Web's
// "Alertas" grid (STAGE-2-INICIO §3). Returned in priority order:
//   1. Programados due today (or overdue) — they need a confirm to hit the balance
//   2. open loans with a due date
//   3. this month's budgets at >= 90% of their limit
//   4. goals at >= 90% but not yet complete
// Ids are stable per underlying condition (a series' id changes with its
// next occurrence, a budget's with its month) so clients can remember
// dismissed/read alerts locally. UI copy stays in the clients (i18n).

export const BUDGET_ALERT_PERCENTAGE = 90;
export const GOAL_ALERT_PERCENTAGE = 90;

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export async function alertRoutes(app: FastifyInstance) {
  app.get("/alerts", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ today: dateOnlySchema.optional() }).parse(request.query);
    const userId = request.userId!;
    const today = resolveToday(query.today);

    const [series, loans, budgets, goals] = await Promise.all([
      prisma.recurringSeries.findMany({
        where: { userId, active: true, nextOccurrenceDate: { lte: today } },
        orderBy: { nextOccurrenceDate: "asc" },
      }),
      prisma.transaction.findMany({
        where: { userId, status: "COMPLETED", loanKind: { not: null }, loanSettledAt: null, dueDate: { not: null } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.budget.findMany({ where: { userId, startDate: monthStart(monthKeyOf(today)) } }),
      prisma.goal.findMany({ where: { userId } }),
    ]);

    const repaid = await loanRepaidMap(loans.map((loan) => loan.id));
    const budgetProgress = await Promise.all(budgets.map((budget) => serializeBudget(userId, budget)));
    const goalProgress = await Promise.all(goals.map(serializeGoal));

    const seriesAlerts = series.map((item) => ({
      id: `series:${item.id}:${dateKey(item.nextOccurrenceDate)}`,
      kind: "SERIES_DUE" as const,
      seriesId: item.id,
      name: item.name,
      type: item.type,
      amount: item.amountMinor,
      categoryId: item.categoryId,
      dueDate: item.nextOccurrenceDate,
      overdue: item.nextOccurrenceDate < today,
    }));

    const loanAlerts = loans
      .map((loan) => ({ loan, outstanding: outstandingOf(loan, repaid.get(loan.id)) }))
      .filter(({ outstanding }) => outstanding > 0n)
      .map(({ loan, outstanding }) => ({
        id: `loan:${loan.id}`,
        kind: "LOAN_OPEN" as const,
        transactionId: loan.id,
        loanKind: loan.loanKind,
        counterpartyName: loan.counterpartyName,
        outstanding,
        dueDate: loan.dueDate,
        overdue: loan.dueDate! < today,
      }));

    const budgetAlerts = budgetProgress
      .filter((budget) => budget.percentage >= BUDGET_ALERT_PERCENTAGE)
      .sort((a, b) => b.percentage - a.percentage)
      .map((budget) => ({
        id: `budget:${budget.id}:${budget.month}`,
        kind: "BUDGET_AT_RISK" as const,
        budgetId: budget.id,
        name: budget.name,
        categoryId: budget.categoryId,
        spent: budget.spent,
        amount: budget.amount,
        percentage: budget.percentage,
      }));

    const goalAlerts = goalProgress
      .filter((goal) => goal.percentage >= GOAL_ALERT_PERCENTAGE && goal.percentage < 100)
      .sort((a, b) => b.percentage - a.percentage)
      .map((goal) => ({
        id: `goal:${goal.id}`,
        kind: "GOAL_NEAR" as const,
        goalId: goal.id,
        name: goal.name,
        themeIcon: goal.themeIcon,
        percentage: goal.percentage,
        remaining: goal.remaining,
      }));

    return [...seriesAlerts, ...loanAlerts, ...budgetAlerts, ...goalAlerts];
  });
}

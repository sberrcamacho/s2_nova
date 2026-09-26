import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { activeInMonth, serializeBudget } from "../lib/budgetProgress.js";
import { fromMinor, principalOf } from "../lib/currency.js";
import { processDueSeries } from "../lib/recurring.js";
import { dateKey, monthKeyOf } from "../lib/dates.js";
import { processDuePlans, serializeGoal } from "../lib/goalProgress.js";
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
//   5. "Aporte programado" due (plan with confirmation) — "Confirmar aporte"
//      / "Omitir esta vez" (PLANS.md §3)
//   6. "Aporte automático registrado" in the last 7 days
//   7. Programado movements (PLANNED) dated in the next 7 days
// Ids are stable per underlying condition (a series' id changes with its
// next occurrence, a budget's with its month) so clients can remember
// dismissed/read alerts locally. UI copy stays in the clients (i18n).

export const BUDGET_ALERT_PERCENTAGE = 90;
export const GOAL_ALERT_PERCENTAGE = 90;


export async function alertRoutes(app: FastifyInstance) {
  app.get("/alerts", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ today: dateOnlySchema.optional() }).parse(request.query);
    const userId = request.userId!;
    const today = resolveToday(query.today);
    // Automatic Programados and aportes are recorded before anything reads them.
    await processDueSeries(userId, today);
    await processDuePlans(userId, today);
    const principal = await principalOf(userId);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

    const [series, loans, budgets, goals] = await Promise.all([
      prisma.recurringSeries.findMany({
        where: { userId, active: true, autoConfirm: false, nextOccurrenceDate: { lte: today } },
        orderBy: { nextOccurrenceDate: "asc" },
      }),
      prisma.transaction.findMany({
        where: { userId, status: "COMPLETED", loanKind: { not: null }, loanSettledAt: null, dueDate: { not: null } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.budget.findMany({ where: { userId, ...activeInMonth(monthKeyOf(today)) } }),
      prisma.goal.findMany({ where: { userId }, include: { plan: true } }),
    ]);

    const repaid = await loanRepaidMap(loans.map((loan) => loan.id));
    const budgetProgress = await Promise.all(budgets.map((budget) => serializeBudget(userId, budget, monthKeyOf(today))));
    const goalProgress = await Promise.all(goals.map((goal) => serializeGoal(goal, today)));
    const autoContributions = await prisma.transaction.findMany({
      where: { userId, status: "COMPLETED", goal: { plan: { autoConfirm: true } }, transactionDate: { gte: weekAgo, lte: today } },
      include: { goal: true, account: true },
      orderBy: { transactionDate: "desc" },
    });

    const seriesAlerts = series.map((item) => ({
      id: `series:${item.id}:${dateKey(item.nextOccurrenceDate)}`,
      kind: "SERIES_DUE" as const,
      seriesId: item.id,
      name: item.name,
      type: item.type,
      amount: fromMinor(item.amountMinor, item.currency),
      currency: item.currency,
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
        icon: goal.icon,
        themeIcon: goal.themeIcon,
        percentage: goal.percentage,
        remaining: goal.remaining,
      }));

    const planDueAlerts = goalProgress
      .filter((goal) => goal.plan?.due)
      .map((goal) => ({
        id: `goalplan:${goal.id}:${dateKey(goal.plan!.nextDate)}`,
        kind: "GOAL_PLAN_DUE" as const,
        goalId: goal.id,
        name: goal.name,
        icon: goal.icon,
        amount: goal.plan!.amount,
        currency: principal,
        accountId: goal.plan!.accountId,
        dueDate: goal.plan!.nextDate,
        overdue: goal.plan!.nextDate < today,
      }));

    const autoAlerts = autoContributions.map((row) => ({
      id: `goalauto:${row.id}`,
      kind: "GOAL_PLAN_AUTO" as const,
      goalId: row.goalId!,
      name: row.goal!.name,
      icon: row.goal!.icon,
      amount: fromMinor(row.amountMinor, row.currency),
      currency: row.currency,
      accountId: row.accountId,
      walletName: row.account.name,
      date: row.transactionDate,
    }));

    // Movements dated in the next 7 days ("Programado", PLANNED) — the
    // mockup's "Cuota del curso de inglés se registra el 28 ago".
    const weekAhead = new Date(today.getTime() + 7 * 86_400_000);
    const planned = await prisma.transaction.findMany({
      where: { userId, status: "PLANNED", loanKind: null, transactionDate: { gte: today, lte: weekAhead } },
      include: { account: true },
      orderBy: { transactionDate: "asc" },
    });
    const plannedAlerts = planned.map((row) => ({
      id: `planned:${row.id}`,
      kind: "TX_PLANNED" as const,
      transactionId: row.id,
      name: row.description || row.note || "",
      categoryId: row.subcategoryId ?? row.categoryId,
      amount: fromMinor(row.amountMinor, row.currency),
      currency: row.currency,
      walletName: row.account.name,
      dueDate: row.transactionDate,
    }));

    return [...seriesAlerts, ...loanAlerts, ...budgetAlerts, ...goalAlerts, ...planDueAlerts, ...autoAlerts, ...plannedAlerts];
  });
}

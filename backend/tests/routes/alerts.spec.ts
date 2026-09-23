import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";

describe("alert routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function inject(user: TestUser, method: "GET" | "POST" | "PATCH", url: string, payload?: Record<string, unknown>) {
    return app.inject({ method, url: `/api/v1${url}`, headers: authHeader(user), payload });
  }

  async function alerts(user: TestUser, today: string) {
    const res = await inject(user, "GET", `/alerts?today=${today}`);
    expect(res.statusCode).toBe(200);
    return res.json() as Array<Record<string, unknown>>;
  }

  it("returns nothing for a fresh user", async () => {
    const user = await createTestUser();
    expect(await alerts(user, "2026-08-21")).toEqual([]);
  });

  it("flags active series due today or overdue, not future or paused ones", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id);
    const bills = await categoryBySlug("bills");
    const base = { type: "EXPENSE", amount: 380000, accountId: wallet.id, categoryId: bills.id, interval: "MONTHLY" };

    const due = (await inject(user, "POST", "/recurring-series", { ...base, name: "Administración", startDate: "2026-08-21" })).json();
    const overdue = (await inject(user, "POST", "/recurring-series", { ...base, name: "Gas", startDate: "2026-08-19" })).json();
    await inject(user, "POST", "/recurring-series", { ...base, name: "Netflix", startDate: "2026-08-24" });
    const paused = (await inject(user, "POST", "/recurring-series", { ...base, name: "Gym", startDate: "2026-08-20" })).json();
    await inject(user, "PATCH", `/recurring-series/${paused.id}`, { active: false });

    const result = await alerts(user, "2026-08-21");
    expect(result.map((alert) => alert.id)).toEqual([`series:${overdue.id}:2026-08-19`, `series:${due.id}:2026-08-21`]);
    expect(result[0]).toMatchObject({ kind: "SERIES_DUE", name: "Gas", overdue: true, amount: 380000, type: "EXPENSE" });
    expect(result[1]).toMatchObject({ kind: "SERIES_DUE", name: "Administración", overdue: false });
  });

  it("flags open loans with a due date using the live outstanding balance, and drops settled ones", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 5000000n });
    const other = await categoryBySlug("other");
    const loanBase = { accountId: wallet.id, categoryId: other.id, description: "Préstamo", date: "2026-08-01" };

    const open = (
      await inject(user, "POST", "/transactions", { ...loanBase, type: "EXPENSE", loanKind: "LENT", counterpartyName: "Camilo Restrepo", amount: 600000, dueDate: "2026-09-15" })
    ).json();
    await inject(user, "POST", `/transactions/${open.id}/settle-loan`, { amount: 180000 });

    const settled = (
      await inject(user, "POST", "/transactions", { ...loanBase, type: "INCOME", loanKind: "BORROWED", counterpartyName: "Ana María Ruiz", amount: 200000, dueDate: "2026-08-30" })
    ).json();
    await inject(user, "POST", `/transactions/${settled.id}/settle-loan`, {});

    // No due date → no alert.
    await inject(user, "POST", "/transactions", { ...loanBase, type: "EXPENSE", loanKind: "LENT", counterpartyName: "Sin fecha", amount: 10000 });

    const result = await alerts(user, "2026-08-21");
    expect(result).toEqual([
      expect.objectContaining({
        id: `loan:${open.id}`,
        kind: "LOAN_OPEN",
        loanKind: "LENT",
        counterpartyName: "Camilo Restrepo",
        outstanding: 420000,
        overdue: false,
      }),
    ]);
  });

  it("flags this month's budgets at or above 90%, riskiest first", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 5000000n });
    const bills = await categoryBySlug("bills");
    const food = await categoryBySlug("food");
    const transport = await categoryBySlug("transportation");

    const servicios = (await inject(user, "POST", "/budgets", { name: "Servicios", categoryId: bills.id, amount: 100000, month: "2026-08" })).json();
    const mercado = (await inject(user, "POST", "/budgets", { categoryId: food.id, amount: 100000, month: "2026-08" })).json();
    await inject(user, "POST", "/budgets", { categoryId: transport.id, amount: 100000, month: "2026-08" });
    const spend = (categoryId: string, amount: number) =>
      inject(user, "POST", "/transactions", { accountId: wallet.id, type: "EXPENSE", categoryId, amount, description: "x", date: "2026-08-10" });
    await spend(bills.id, 90000); // exactly 90%
    await spend(food.id, 120000); // over
    await spend(transport.id, 89000); // below threshold

    const result = await alerts(user, "2026-08-21");
    expect(result.map((alert) => alert.id)).toEqual([`budget:${mercado.id}:2026-08`, `budget:${servicios.id}:2026-08`]);
    expect(result[1]).toMatchObject({ kind: "BUDGET_AT_RISK", name: "Servicios", spent: 90000, amount: 100000, percentage: 90 });

    // A different month has its own budgets — none here.
    expect(await alerts(user, "2026-09-01")).toEqual([]);
  });

  it("flags goals between 90% and 100%, not completed ones", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 5000000n });
    const other = await categoryBySlug("other");
    const near = (await inject(user, "POST", "/goals", { name: "Viaje", targetAmount: 100000 })).json();
    const done = (await inject(user, "POST", "/goals", { name: "Bici", targetAmount: 100000 })).json();
    const contribute = (goalId: string, amount: number) =>
      inject(user, "POST", "/transactions", { accountId: wallet.id, type: "EXPENSE", categoryId: other.id, amount, goalId, description: "Aporte", date: "2026-08-10" });
    await contribute(near.id, 95000);
    await contribute(done.id, 100000);

    const result = await alerts(user, "2026-08-21");
    expect(result).toEqual([expect.objectContaining({ id: `goal:${near.id}`, kind: "GOAL_NEAR", name: "Viaje", percentage: 95, remaining: 5000 })]);
  });

  it("orders kinds series → loans → budgets → goals", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 5000000n });
    const other = await categoryBySlug("other");
    const bills = await categoryBySlug("bills");

    const goal = (await inject(user, "POST", "/goals", { name: "Meta", targetAmount: 100000 })).json();
    await inject(user, "POST", "/transactions", { accountId: wallet.id, type: "EXPENSE", categoryId: other.id, amount: 92000, goalId: goal.id, description: "Aporte", date: "2026-08-02" });
    await inject(user, "POST", "/budgets", { categoryId: bills.id, amount: 100000, month: "2026-08" });
    await inject(user, "POST", "/transactions", { accountId: wallet.id, type: "EXPENSE", categoryId: bills.id, amount: 95000, description: "Luz", date: "2026-08-03" });
    await inject(user, "POST", "/transactions", { accountId: wallet.id, type: "EXPENSE", categoryId: other.id, amount: 5000, loanKind: "LENT", counterpartyName: "X", dueDate: "2026-09-01", description: "Préstamo", date: "2026-08-04" });
    await inject(user, "POST", "/recurring-series", { name: "Internet", type: "EXPENSE", amount: 1, accountId: wallet.id, categoryId: bills.id, interval: "MONTHLY", startDate: "2026-08-21" });

    const kinds = (await alerts(user, "2026-08-21")).map((alert) => alert.kind);
    expect(kinds).toEqual(["SERIES_DUE", "LOAN_OPEN", "BUDGET_AT_RISK", "GOAL_NEAR"]);
  });

  it("requires auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/alerts" });
    expect(res.statusCode).toBe(401);
  });
});

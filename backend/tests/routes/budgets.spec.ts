import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";

async function spendAgainstBudget(
  app: FastifyInstance,
  user: Awaited<ReturnType<typeof createTestUser>>,
  walletId: string,
  categoryId: string,
  budgetId: string,
  amount: number,
) {
  await app.inject({
    method: "POST",
    url: "/api/v1/transactions",
    headers: authHeader(user),
    payload: {
      accountId: walletId,
      type: "EXPENSE",
      amount,
      categoryId,
      budgetId,
      description: "spend",
      date: "2026-06-01",
    },
  });
}

describe("budget routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /budgets", () => {
    it("creates a budget for the current month when no month is given", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 500000 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ amount: 500000, spent: 0, percentage: 0, status: "ON_TRACK" });
    });

    it("creates a budget for an explicit month", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 300000, month: "2026-09" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().month).toBe("2026-09");
    });

    it("rejects an unknown category with 422", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: "00000000-0000-0000-0000-000000000000", amount: 100000 },
      });
      expect(res.statusCode).toBe(422);
    });

    // Regression test for a real bug: nothing stopped two Budget rows for
    // the same category/month, and computeSpent's category+month fallback
    // would then count the same unlinked transactions toward both budgets
    // at once.
    it("rejects creating a second budget for the same category and month with 409", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("transportation");
      const first = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 200000, month: "2026-07" },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 200000, month: "2026-07" },
      });
      expect(second.statusCode).toBe(409);
    });

    // Monthly budgets reset every month from their start on, so a later
    // month overlaps (PRODUCT_ARCHITECTURE §9).
    it("rejects a second monthly budget for the same category in a later month", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("entertainment");
      await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2026-07" },
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2026-08" },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe("GET /budgets", () => {
    it("only returns the authenticated user's budgets for the requested month", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      const category = await categoryBySlug("food");
      await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(userA),
        payload: { categoryId: category.id, amount: 100000, month: "2026-10" },
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(userB),
        payload: { categoryId: category.id, amount: 100000, month: "2026-10" },
      });

      const res = await app.inject({ method: "GET", url: "/api/v1/budgets?month=2026-10", headers: authHeader(userA) });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it("lists a range budget that hasn't started yet, but not one that already ended", async () => {
      const user = await createTestUser();
      const post = (name: string, startDate: string, endDate: string) =>
        app.inject({
          method: "POST",
          url: "/api/v1/budgets",
          headers: authHeader(user),
          payload: { kind: "CUSTOM", name, amount: 100000, period: "CUSTOM", startDate, endDate },
        });
      expect((await post("Viaje de fin de año", "2026-12-01", "2027-01-15")).statusCode).toBe(201);
      expect((await post("Ya pasó", "2026-01-01", "2026-02-15")).statusCode).toBe(201);

      const res = await app.inject({ method: "GET", url: "/api/v1/budgets?month=2026-10", headers: authHeader(user) });
      expect(res.json().map((b: { name: string }) => b.name)).toEqual(["Viaje de fin de año"]);
    });

    it("computes status ON_TRACK below 65% spend", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const category = await categoryBySlug("food");
      const budgetRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2026-11" },
      });
      const budget = budgetRes.json();
      await spendAgainstBudget(app, user, wallet.id, category.id, budget.id, 60000);

      const res = await app.inject({ method: "GET", url: "/api/v1/budgets?month=2026-11", headers: authHeader(user) });
      const found = res.json().find((b: { id: string }) => b.id === budget.id);
      expect(found).toMatchObject({ spent: 60000, percentage: 60, status: "ON_TRACK" });
    });

    it("computes status NEAR_LIMIT from 65% spend", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const category = await categoryBySlug("food");
      const budgetRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2026-12" },
      });
      const budget = budgetRes.json();
      await spendAgainstBudget(app, user, wallet.id, category.id, budget.id, 85000);

      const res = await app.inject({ method: "GET", url: "/api/v1/budgets?month=2026-12", headers: authHeader(user) });
      const found = res.json().find((b: { id: string }) => b.id === budget.id);
      expect(found).toMatchObject({ percentage: 85, status: "NEAR_LIMIT" });
    });

    it("computes status OVER_BUDGET above 100% spend", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const category = await categoryBySlug("food");
      const budgetRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2027-01" },
      });
      const budget = budgetRes.json();
      await spendAgainstBudget(app, user, wallet.id, category.id, budget.id, 120000);

      const res = await app.inject({ method: "GET", url: "/api/v1/budgets?month=2027-01", headers: authHeader(user) });
      const found = res.json().find((b: { id: string }) => b.id === budget.id);
      expect(found).toMatchObject({ percentage: 120, status: "OVER_BUDGET" });
    });
  });

  describe("PATCH /budgets/:id", () => {
    it("updates the amount and name", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2027-02" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/budgets/${id}`,
        headers: authHeader(user),
        payload: { amount: 150000, name: "Groceries" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ amount: 150000, name: "Groceries" });
    });

    it("moves the budget to a free category and rejects a taken one with 409", async () => {
      const user = await createTestUser();
      const food = await categoryBySlug("food");
      const transport = await categoryBySlug("transportation");
      const bills = await categoryBySlug("bills");
      const create = (categoryId: string) =>
        app.inject({ method: "POST", url: "/api/v1/budgets", headers: authHeader(user), payload: { categoryId, amount: 100000, month: "2027-04" } })
      const id = (await create(food.id)).json().id;
      await create(transport.id);

      const moved = await app.inject({ method: "PATCH", url: `/api/v1/budgets/${id}`, headers: authHeader(user), payload: { categoryId: bills.id } });
      expect(moved.statusCode).toBe(200);
      expect(moved.json().categoryId).toBe(bills.id);

      const taken = await app.inject({ method: "PATCH", url: `/api/v1/budgets/${id}`, headers: authHeader(user), payload: { categoryId: transport.id } });
      expect(taken.statusCode).toBe(409);
    });

    it("returns 404 for another user's budget", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(owner),
        payload: { categoryId: category.id, amount: 100000, month: "2027-03" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/budgets/${id}`,
        headers: authHeader(stranger),
        payload: { amount: 1 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /budgets/:id", () => {
    it("deletes the budget; linked transactions keep their history", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const budgetRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(user),
        payload: { categoryId: category.id, amount: 100000, month: "2027-04" },
      });
      const budget = budgetRes.json();
      const txnRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 10000,
          categoryId: category.id,
          budgetId: budget.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      const txnId = txnRes.json().id;

      const deleteRes = await app.inject({ method: "DELETE", url: `/api/v1/budgets/${budget.id}`, headers: authHeader(user) });
      expect(deleteRes.statusCode).toBe(204);

      const listRes = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: authHeader(user) });
      const txn = listRes.json().find((t: { id: string }) => t.id === txnId);
      expect(txn).toBeDefined();
    });

    it("returns 404 for another user's budget", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets",
        headers: authHeader(owner),
        payload: { categoryId: category.id, amount: 100000, month: "2027-05" },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "DELETE", url: `/api/v1/budgets/${id}`, headers: authHeader(stranger) });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /budgets/recommendations", () => {
    it("rejects a split that doesn't total 100%", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets/recommendations",
        headers: authHeader(user),
        payload: { monthlyIncome: 3000000, needsPct: 50, wantsPct: 30, savingsPct: 10 },
      });
      expect(res.statusCode).toBe(422);
    });

    // Regression test for a real bug: a strict `!== 100` equality check on
    // floats rejected mathematically-valid splits (33.33 + 33.33 + 33.34
    // can fail to land on exactly 100 in binary floating point).
    it("accepts a split whose floats sum to ~100 within a small epsilon", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets/recommendations",
        headers: authHeader(user),
        payload: { monthlyIncome: 3000000, needsPct: 33.33, wantsPct: 33.33, savingsPct: 33.34 },
      });
      expect(res.statusCode).toBe(201);
    });

    // Regression test for a real bug: three independent Math.round calls
    // (one per bucket) didn't reconcile to monthlyIncome — e.g. rounding
    // three even thirds could under/overshoot the total by a unit.
    it("returns needs/wants/savings amounts that sum exactly to monthlyIncome", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/budgets/recommendations",
        headers: authHeader(user),
        payload: { monthlyIncome: 100, needsPct: 33.33, wantsPct: 33.33, savingsPct: 33.34 },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.needsAmount + body.wantsAmount + body.savingsAmount).toBe(100);
    });
  });

  describe("POST /budgets/recommendations/:id/accept", () => {
    it("marks the recommendation as accepted", async () => {
      const user = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets/recommendations",
        headers: authHeader(user),
        payload: { monthlyIncome: 2000000 },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/budgets/recommendations/${id}/accept`,
        headers: authHeader(user),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().acceptedAt).not.toBeNull();
    });

    it("returns 404 for another user's recommendation", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/budgets/recommendations",
        headers: authHeader(owner),
        payload: { monthlyIncome: 2000000 },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/budgets/recommendations/${id}/accept`,
        headers: authHeader(stranger),
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

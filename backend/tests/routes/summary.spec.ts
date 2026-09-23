import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";

describe("summary routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function post(user: TestUser, payload: Record<string, unknown>) {
    const res = await app.inject({ method: "POST", url: "/api/v1/transactions", headers: authHeader(user), payload });
    expect(res.statusCode).toBe(201);
    return res.json();
  }

  describe("GET /summary/months", () => {
    it("returns one bucket per month, oldest first, ending at `today`'s month", async () => {
      const user = await createTestUser();
      const res = await app.inject({ method: "GET", url: "/api/v1/summary/months?count=3&today=2026-08-21", headers: authHeader(user) });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([
        { month: "2026-06", income: 0, expenses: 0, net: 0 },
        { month: "2026-07", income: 0, expenses: 0, net: 0 },
        { month: "2026-08", income: 0, expenses: 0, net: 0 },
      ]);
    });

    it("sums COMPLETED income and expenses per month, excluding transfers and PLANNED", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const other = await createAccount(user.id, { name: "Ahorros" });
      const food = await categoryBySlug("food");
      const salary = await categoryBySlug("salary");
      const base = { accountId: wallet.id, categoryId: food.id, description: "x" };

      await post(user, { ...base, type: "INCOME", categoryId: salary.id, amount: 4000000, date: "2026-08-01" });
      await post(user, { ...base, type: "EXPENSE", amount: 150000, date: "2026-08-31" });
      await post(user, { ...base, type: "EXPENSE", amount: 90000, date: "2026-07-15" });
      await post(user, { ...base, type: "EXPENSE", status: "PLANNED", amount: 999, date: "2026-08-10" });
      await post(user, { ...base, type: "TRANSFER", transferToAccountId: other.id, amount: 500000, date: "2026-08-05" });
      // Outside the 2-month window.
      await post(user, { ...base, type: "EXPENSE", amount: 7, date: "2026-06-30" });

      const res = await app.inject({ method: "GET", url: "/api/v1/summary/months?count=2&today=2026-08-21", headers: authHeader(user) });
      expect(res.json()).toEqual([
        { month: "2026-07", income: 0, expenses: 90000, net: -90000 },
        { month: "2026-08", income: 4000000, expenses: 150000, net: 3850000 },
      ]);
    });

    it("never includes another user's transactions", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const wallet = await createAccount(owner.id);
      const food = await categoryBySlug("food");
      await post(owner, { accountId: wallet.id, categoryId: food.id, description: "x", type: "EXPENSE", amount: 100, date: "2026-08-02" });

      const res = await app.inject({ method: "GET", url: "/api/v1/summary/months?count=1&today=2026-08-21", headers: authHeader(stranger) });
      expect(res.json()).toEqual([{ month: "2026-08", income: 0, expenses: 0, net: 0 }]);
    });

    it("rejects an out-of-range count", async () => {
      const user = await createTestUser();
      const res = await app.inject({ method: "GET", url: "/api/v1/summary/months?count=0", headers: authHeader(user) });
      expect(res.statusCode).toBe(400);
    });

    it("requires auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/summary/months" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /summary/categories", () => {
    it("groups the month's COMPLETED expenses by category, largest first, with shares", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const food = await categoryBySlug("food");
      const transport = await categoryBySlug("transportation");
      const base = { accountId: wallet.id, description: "x", type: "EXPENSE" };

      await post(user, { ...base, categoryId: food.id, amount: 300000, date: "2026-08-03" });
      await post(user, { ...base, categoryId: food.id, amount: 450000, date: "2026-08-20" });
      await post(user, { ...base, categoryId: transport.id, amount: 250000, date: "2026-08-04" });
      await post(user, { ...base, categoryId: transport.id, amount: 1, date: "2026-07-31" });
      await post(user, { ...base, categoryId: transport.id, status: "PLANNED", amount: 5, date: "2026-08-04" });

      const res = await app.inject({ method: "GET", url: "/api/v1/summary/categories?month=2026-08", headers: authHeader(user) });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        month: "2026-08",
        total: 1000000,
        categories: [
          { categoryId: food.id, amount: 750000, percentage: 75 },
          { categoryId: transport.id, amount: 250000, percentage: 25 },
        ],
      });
    });

    it("defaults to `today`'s month and handles an empty month", async () => {
      const user = await createTestUser();
      const res = await app.inject({ method: "GET", url: "/api/v1/summary/categories?today=2026-02-10", headers: authHeader(user) });
      expect(res.json()).toEqual({ month: "2026-02", total: 0, categories: [] });
    });
  });
});

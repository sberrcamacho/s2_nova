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

  describe("GET /summary/report", () => {
    it("returns the range's totals, the month's categories, the Gastos tiles, income sources and balance history", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const [food, transport, bills, salary, freelance] = await Promise.all(
        ["food", "transportation", "bills", "salary", "freelance"].map((slug) => categoryBySlug(slug)),
      );
      const base = { accountId: wallet.id, description: "x" };
      const expense = (categoryId: string, amount: number, date: string) => post(user, { ...base, type: "EXPENSE", categoryId, amount, date });
      const income = (categoryId: string, merchant: string, amount: number, date: string) => post(user, { ...base, type: "INCOME", categoryId, merchant, amount, date });

      await income(salary.id, "Grupo Éxito", 4000000, "2026-08-01");
      await expense(food.id, 300000, "2026-08-08"); // Saturday
      await expense(transport.id, 200000, "2026-08-10");
      await expense(bills.id, 100000, "2026-08-05");
      await expense(transport.id, 100000, "2026-07-10");
      await income(freelance.id, "Estudio Andina", 500000, "2026-07-15");
      // The previous 3-month range.
      await income(salary.id, "Grupo Éxito", 1000000, "2026-05-01");
      await expense(food.id, 500000, "2026-05-02");

      const res = await app.inject({ method: "GET", url: "/api/v1/summary/report?range=3&today=2026-08-21", headers: authHeader(user) });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.months).toEqual([
        { month: "2026-06", income: 0, expenses: 0, net: 0 },
        { month: "2026-07", income: 500000, expenses: 100000, net: 400000 },
        { month: "2026-08", income: 4000000, expenses: 600000, net: 3400000 },
      ]);
      expect(body.totals).toEqual({ income: 4500000, expenses: 700000, savings: 3800000, savingsRate: 84 });
      expect(body.previousTotals).toEqual({ income: 1000000, expenses: 500000, savings: 500000, savingsRate: 50 });
      expect(body.categories).toEqual([
        { categoryId: food.id, amount: 300000, previousAmount: 0, change: null, rising: false },
        { categoryId: transport.id, amount: 200000, previousAmount: 100000, change: 100, rising: true },
        { categoryId: bills.id, amount: 100000, previousAmount: 0, change: null, rising: false },
      ]);
      expect(body.dailyAverage).toBe(28571);
      expect(body.peakWeekday).toBe(6);
      expect(body.fixedShare).toBe(14);
      expect(body.runwayMonths).toBe(22.7);
      expect(body.incomeSources).toEqual([
        { categoryId: salary.id, merchant: "Grupo Éxito", amount: 4000000, percentage: 89, monthlyMin: 0, monthlyMax: 4000000 },
        { categoryId: freelance.id, merchant: "Estudio Andina", amount: 500000, percentage: 11, monthlyMin: 0, monthlyMax: 500000 },
      ]);
      expect(body.netWorth.wallets).toBe(5300000);
      expect(body.netWorth.history).toEqual([
        { month: "2026-03", balance: 1000000 },
        { month: "2026-04", balance: 1000000 },
        { month: "2026-05", balance: 1500000 },
        { month: "2026-06", balance: 1500000 },
        { month: "2026-07", balance: 1900000 },
        { month: "2026-08", balance: 5300000 },
      ]);
    });

    it("summarises open and settled loans on each side", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 2000000n });
      const other = await categoryBySlug("other");
      const loan = { accountId: wallet.id, categoryId: other.id, description: "Préstamo", date: "2026-08-02" };
      const open = await post(user, { ...loan, type: "EXPENSE", loanKind: "LENT", counterpartyName: "Camilo Restrepo", amount: 600000 });
      const settled = await post(user, { ...loan, type: "EXPENSE", loanKind: "LENT", counterpartyName: "Ana María Ruiz", amount: 50000 });
      await app.inject({ method: "POST", url: `/api/v1/transactions/${open.id}/settle-loan`, headers: authHeader(user), payload: { amount: 180000 } });
      await app.inject({ method: "POST", url: `/api/v1/transactions/${settled.id}/settle-loan`, headers: authHeader(user), payload: {} });

      const res = await app.inject({ method: "GET", url: "/api/v1/summary/report?today=2026-08-21", headers: authHeader(user) });
      expect(res.json().netWorth.lent).toEqual({ outstanding: 420000, people: 1, settled: 1 });
      expect(res.json().netWorth.borrowed).toEqual({ outstanding: 0, people: 0, settled: 0 });
    });

    it("has empty figures for a new user and rejects other ranges", async () => {
      const user = await createTestUser();
      const res = await app.inject({ method: "GET", url: "/api/v1/summary/report?today=2026-08-21", headers: authHeader(user) });
      expect(res.json()).toMatchObject({ range: 6, month: "2026-08", categories: [], peakWeekday: null, fixedShare: null, runwayMonths: null, incomeSources: [] });
      expect(res.json().months).toHaveLength(6);
      const bad = await app.inject({ method: "GET", url: "/api/v1/summary/report?range=4", headers: authHeader(user) });
      expect(bad.statusCode).toBe(400);
    });
  });
});

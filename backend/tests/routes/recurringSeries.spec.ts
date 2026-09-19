import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

describe("recurring series routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /recurring-series", () => {
    it("creates a series and derives paymentMethod from the wallet's type, not the body", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { type: "NEQUI" });
      const category = await categoryBySlug("bills");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: {
          name: "Netflix",
          type: "EXPENSE",
          amount: 45000,
          accountId: wallet.id,
          categoryId: category.id,
          interval: "MONTHLY",
          startDate: "2026-06-15",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ name: "Netflix", paymentMethod: "NEQUI", active: true });
    });

    it("rejects an unknown wallet with 422", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("bills");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: {
          name: "Netflix",
          type: "EXPENSE",
          amount: 45000,
          accountId: "00000000-0000-0000-0000-000000000000",
          categoryId: category.id,
          interval: "MONTHLY",
          startDate: "2026-06-15",
        },
      });
      expect(res.statusCode).toBe(422);
    });

    it("rejects an unknown category with 422", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: {
          name: "Netflix",
          type: "EXPENSE",
          amount: 45000,
          accountId: wallet.id,
          categoryId: "00000000-0000-0000-0000-000000000000",
          interval: "MONTHLY",
          startDate: "2026-06-15",
        },
      });
      expect(res.statusCode).toBe(422);
    });
  });

  describe("GET /recurring-series", () => {
    it("only returns the authenticated user's own series", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      const walletA = await createAccount(userA.id);
      const walletB = await createAccount(userB.id);
      const category = await categoryBySlug("bills");

      await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(userA),
        payload: { name: "A's", type: "EXPENSE", amount: 1000, accountId: walletA.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(userB),
        payload: { name: "B's", type: "EXPENSE", amount: 1000, accountId: walletB.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });

      const res = await app.inject({ method: "GET", url: "/api/v1/recurring-series", headers: authHeader(userA) });
      expect(res.json().map((s: { name: string }) => s.name)).toEqual(["A's"]);
    });

    it("marks a series as due when its next occurrence is today or in the past and it's active", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("bills");
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Overdue", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: pastDate },
      });
      expect(createRes.json().isDue).toBe(true);
    });
  });

  describe("PATCH /recurring-series/:id", () => {
    it("re-derives paymentMethod when the wallet changes", async () => {
      const user = await createTestUser();
      const walletA = await createAccount(user.id, { type: "CASH" });
      const walletB = await createAccount(user.id, { type: "DAVIPLATA" });
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: walletA.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/recurring-series/${id}`,
        headers: authHeader(user),
        payload: { accountId: walletB.id },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().paymentMethod).toBe("DAVIPLATA");
    });

    it("rejects an unknown wallet or category on update", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/recurring-series/${id}`,
        headers: authHeader(user),
        payload: { categoryId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.statusCode).toBe(422);
    });

    it("updates interval, nextOccurrenceDate and active", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/recurring-series/${id}`,
        headers: authHeader(user),
        payload: { interval: "YEARLY", nextOccurrenceDate: "2026-12-25", active: false },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ interval: "YEARLY", active: false });
      expect(res.json().nextOccurrenceDate.slice(0, 10)).toBe("2026-12-25");
    });

    it("returns 404 for another user's series", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const wallet = await createAccount(owner.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(owner),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/recurring-series/${id}`,
        headers: authHeader(stranger),
        payload: { name: "Hijacked" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /recurring-series/:id", () => {
    it("deletes the series; already-materialized transactions keep their history with recurringSeriesId cleared", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Series", type: "EXPENSE", amount: 5000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const confirmRes = await app.inject({
        method: "POST",
        url: `/api/v1/recurring-series/${id}/confirm`,
        headers: authHeader(user),
        payload: {},
      });
      const txnId = confirmRes.json().transaction.id;

      const deleteRes = await app.inject({ method: "DELETE", url: `/api/v1/recurring-series/${id}`, headers: authHeader(user) });
      expect(deleteRes.statusCode).toBe(204);

      const txnAfter = await prisma.transaction.findUniqueOrThrow({ where: { id: txnId } });
      expect(txnAfter.recurringSeriesId).toBeNull();
    });

    it("returns 404 for another user's series", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const wallet = await createAccount(owner.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(owner),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "DELETE", url: `/api/v1/recurring-series/${id}`, headers: authHeader(stranger) });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /recurring-series/:id/confirm", () => {
    it("materializes an EXPENSE, decrements the wallet, and advances nextOccurrenceDate", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Rent", type: "EXPENSE", amount: 20000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "POST", url: `/api/v1/recurring-series/${id}/confirm`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(200);
      expect(res.json().transaction.type).toBe("EXPENSE");
      expect(res.json().series.nextOccurrenceDate.slice(0, 10)).toBe("2026-07-01");

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(80000n);
    });

    it("materializes an INCOME and increments the wallet balance", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 0n });
      const category = await categoryBySlug("salary");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Salary", type: "INCOME", amount: 2000000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      await app.inject({ method: "POST", url: `/api/v1/recurring-series/${id}/confirm`, headers: authHeader(user), payload: {} });

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(2000000n);
    });

    // Regression test for the addInterval month-rollover bug (see
    // unit/dates.spec.ts for the pure-function test): a series anchored on
    // the 31st must land on Feb 28 (a non-leap year), not drift into March.
    it("clamps to the last valid day of the month when advancing past a short month (Jan 31 -> Feb 28)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Month-end bill", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2027-01-31" },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "POST", url: `/api/v1/recurring-series/${id}/confirm`, headers: authHeader(user), payload: {} });
      expect(res.json().series.nextOccurrenceDate.slice(0, 10)).toBe("2027-02-28");
    });

    it("accepts an explicit amount/date that override the series defaults", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Variable bill", type: "EXPENSE", amount: 20000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/recurring-series/${id}/confirm`,
        headers: authHeader(user),
        payload: { amount: 35000, date: "2026-06-05" },
      });
      expect(res.json().transaction.amount).toBe(35000);
      expect(res.json().transaction.date.slice(0, 10)).toBe("2026-06-05");
    });

    it("rejects confirming a paused series", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(user),
        payload: { name: "Paused", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;
      await app.inject({ method: "PATCH", url: `/api/v1/recurring-series/${id}`, headers: authHeader(user), payload: { active: false } });

      const res = await app.inject({ method: "POST", url: `/api/v1/recurring-series/${id}/confirm`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(422);
    });

    it("returns 404 for another user's series", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const wallet = await createAccount(owner.id);
      const category = await categoryBySlug("bills");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/recurring-series",
        headers: authHeader(owner),
        payload: { name: "Series", type: "EXPENSE", amount: 1000, accountId: wallet.id, categoryId: category.id, interval: "MONTHLY", startDate: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "POST", url: `/api/v1/recurring-series/${id}/confirm`, headers: authHeader(stranger), payload: {} });
      expect(res.statusCode).toBe(404);
    });
  });
});

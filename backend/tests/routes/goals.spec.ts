import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

async function contribute(
  app: FastifyInstance,
  user: Awaited<ReturnType<typeof createTestUser>>,
  walletId: string,
  goalId: string,
  amount: number,
  status: "COMPLETED" | "PLANNED" = "COMPLETED",
) {
  const category = await categoryBySlug("other");
  return app.inject({
    method: "POST",
    url: "/api/v1/transactions",
    headers: authHeader(user),
    payload: {
      accountId: walletId,
      type: "EXPENSE",
      status,
      amount,
      categoryId: category.id,
      goalId,
      description: "contribution",
      date: "2026-06-01",
    },
  });
}

describe("goal routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /goals", () => {
    it("creates a goal with a target date and theme", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Emergency fund", targetAmount: 5000000, targetDate: "2027-01-01", themeIcon: "EMERGENCY" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ name: "Emergency fund", targetAmount: 5000000, currentAmount: 0, percentage: 0 });
    });

    it("creates a goal with no target date or theme", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Rainy day", targetAmount: 100000 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().targetDate).toBeNull();
    });
  });

  describe("GET /goals", () => {
    it("computes currentAmount/remaining/percentage from COMPLETED linked transactions only", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const goalRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Trip", targetAmount: 200000 },
      });
      const goal = goalRes.json();

      await contribute(app, user, wallet.id, goal.id, 50000, "COMPLETED");
      // A PLANNED contribution must not count toward progress yet.
      await contribute(app, user, wallet.id, goal.id, 999999, "PLANNED");

      const res = await app.inject({ method: "GET", url: "/api/v1/goals", headers: authHeader(user) });
      const found = res.json().find((g: { id: string }) => g.id === goal.id);
      expect(found).toMatchObject({ currentAmount: 50000, remaining: 150000, percentage: 25 });
    });

    it("caps percentage at 999 for a goal overfunded far beyond its target", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 10000000n });
      const goalRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Small goal", targetAmount: 1000 },
      });
      const goal = goalRes.json();
      await contribute(app, user, wallet.id, goal.id, 500000, "COMPLETED");

      const res = await app.inject({ method: "GET", url: "/api/v1/goals", headers: authHeader(user) });
      const found = res.json().find((g: { id: string }) => g.id === goal.id);
      expect(found.percentage).toBe(999);
    });

    it("only returns the authenticated user's own goals", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(userA),
        payload: { name: "A's goal", targetAmount: 1000 },
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(userB),
        payload: { name: "B's goal", targetAmount: 1000 },
      });

      const res = await app.inject({ method: "GET", url: "/api/v1/goals", headers: authHeader(userA) });
      expect(res.json().map((g: { name: string }) => g.name)).toEqual(["A's goal"]);
    });
  });

  describe("PATCH /goals/:id", () => {
    it("updates fields including clearing targetDate/themeIcon to null", async () => {
      const user = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Car", targetAmount: 300000, targetDate: "2027-06-01", themeIcon: "VEHICLE" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/goals/${id}`,
        headers: authHeader(user),
        payload: { name: "New Car", targetDate: null, themeIcon: null },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ name: "New Car", targetDate: null, themeIcon: null });
    });

    it("returns 404 for another user's goal", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(owner),
        payload: { name: "Owner's goal", targetAmount: 1000 },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/goals/${id}`,
        headers: authHeader(stranger),
        payload: { name: "Hijacked" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /goals/:id", () => {
    it("deletes outright when the goal has no progress", async () => {
      const user = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Empty goal", targetAmount: 1000 },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "DELETE", url: `/api/v1/goals/${id}`, headers: authHeader(user) });
      expect(res.statusCode).toBe(204);
    });

    it("requires returnToAccountId when the goal has funds", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const goalRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Funded goal", targetAmount: 100000 },
      });
      const goal = goalRes.json();
      await contribute(app, user, wallet.id, goal.id, 30000, "COMPLETED");

      const res = await app.inject({ method: "DELETE", url: `/api/v1/goals/${goal.id}`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(422);
    });

    it("rejects an unknown or another user's returnToAccountId", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const goalRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Funded goal", targetAmount: 100000 },
      });
      const goal = goalRes.json();
      await contribute(app, user, wallet.id, goal.id, 30000, "COMPLETED");

      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/goals/${goal.id}`,
        headers: authHeader(user),
        payload: { returnToAccountId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.statusCode).toBe(422);
    });

    it("returns the accumulated funds to the chosen wallet as a real INCOME transaction, then deletes the goal", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id, { name: "Source", initialBalanceMinor: 1000000n });
      const destination = await createAccount(user.id, { name: "Destination", initialBalanceMinor: 20000n });
      const goalRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(user),
        payload: { name: "Funded goal", targetAmount: 100000 },
      });
      const goal = goalRes.json();
      await contribute(app, user, source.id, goal.id, 40000, "COMPLETED");

      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/goals/${goal.id}`,
        headers: authHeader(user),
        payload: { returnToAccountId: destination.id },
      });
      expect(res.statusCode).toBe(204);

      const destinationAfter = await prisma.account.findUniqueOrThrow({ where: { id: destination.id } });
      expect(destinationAfter.currentBalanceMinor).toBe(60000n);

      const goalAfter = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(goalAfter).toBeNull();

      const listRes = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: authHeader(user) });
      const returned = listRes.json().find((t: { description: string }) => t.description.startsWith("Fondos devueltos"));
      expect(returned).toMatchObject({ type: "INCOME", amount: 40000, accountId: destination.id });
    });

    it("lists each wallet's contribution and returns every share to its origin", async () => {
      const user = await createTestUser();
      const a = await createAccount(user.id, { name: "A", initialBalanceMinor: 100000n });
      const b = await createAccount(user.id, { name: "B", initialBalanceMinor: 100000n });
      const goal = (
        await app.inject({ method: "POST", url: "/api/v1/goals", headers: authHeader(user), payload: { name: "Split goal", targetAmount: 100000 } })
      ).json();
      await contribute(app, user, a.id, goal.id, 30000);
      await contribute(app, user, b.id, goal.id, 10000);
      await contribute(app, user, a.id, goal.id, 5000);

      const listed = (await app.inject({ method: "GET", url: "/api/v1/goals", headers: authHeader(user) })).json()[0];
      expect(listed.contributions).toEqual(
        expect.arrayContaining([
          { accountId: a.id, amount: 35000 },
          { accountId: b.id, amount: 10000 },
        ]),
      );

      const res = await app.inject({ method: "DELETE", url: `/api/v1/goals/${goal.id}`, headers: authHeader(user), payload: { returnToOrigin: true } });
      expect(res.statusCode).toBe(204);
      expect((await prisma.account.findUniqueOrThrow({ where: { id: a.id } })).currentBalanceMinor).toBe(100000n);
      expect((await prisma.account.findUniqueOrThrow({ where: { id: b.id } })).currentBalanceMinor).toBe(100000n);
    });

    it("returns 404 for another user's goal", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/goals",
        headers: authHeader(owner),
        payload: { name: "Owner's goal", targetAmount: 1000 },
      });
      const id = createRes.json().id;

      const res = await app.inject({ method: "DELETE", url: `/api/v1/goals/${id}`, headers: authHeader(stranger) });
      expect(res.statusCode).toBe(404);
    });
  });
});

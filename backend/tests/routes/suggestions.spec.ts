import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

describe("suggestion routes", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const notice = (overrides: Record<string, unknown> = {}) => ({
    packageName: "com.todo1.mobile",
    appLabel: "Bancolombia",
    title: "Bancolombia",
    text: "Compraste $25.000 en EXITO CALLE 80 con tu tarjeta *1234.",
    postedAt: "2026-10-17T14:05:00.000Z",
    ...overrides,
  });
  const send = (user: TestUser, payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/v1/suggestions/from-notification", headers: authHeader(user), payload });

  it("turns a bank notification into a pending suggestion, once", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { name: "Bancolombia" });
    const groceries = await categoryBySlug("exp.food.groceries");

    const first = await send(user, notice({ accountId: wallet.id }));
    expect(first.statusCode).toBe(201);
    expect(first.json().suggestion).toMatchObject({
      appLabel: "Bancolombia", type: "EXPENSE", amount: 25000, currency: "COP", merchant: "EXITO CALLE 80",
      categoryId: groceries.id, accountId: wallet.id, occurredAt: "2026-10-17T14:05:00.000Z", status: "PENDING", parsedBy: "RULES",
    });
    // The same notification again (Android may deliver it twice).
    const again = await send(user, notice({ accountId: wallet.id }));
    expect(again.statusCode).toBe(200);
    expect(again.json().suggestion.id).toBe(first.json().suggestion.id);

    const list = await app.inject({ method: "GET", url: "/api/v1/suggestions", headers: authHeader(user) });
    expect(list.json()).toHaveLength(1);
    // The notification's text is not kept.
    const row = await prisma.movementSuggestion.findUniqueOrThrow({ where: { id: first.json().suggestion.id } });
    expect(JSON.stringify(row, (_, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("1234");
  });

  it("treats a re-posted notification as the same movement", async () => {
    const user = await createTestUser();
    const first = await send(user, notice());
    expect(first.statusCode).toBe(201);
    // The bank app updates it two minutes later: same movement, new time.
    const repost = await send(user, notice({ postedAt: "2026-10-17T14:07:00.000Z" }));
    expect(repost.statusCode).toBe(200);
    expect(repost.json().suggestion.id).toBe(first.json().suggestion.id);
    // The same purchase again much later is a new one.
    const later = await send(user, notice({ postedAt: "2026-10-17T18:00:00.000Z" }));
    expect(later.statusCode).toBe(201);
    // Two copies sent at once: one is created, the other gets it back.
    const both = await Promise.all([send(user, notice({ postedAt: "2026-10-18T09:00:00.000Z" })), send(user, notice({ postedAt: "2026-10-18T09:00:00.000Z" }))]);
    expect(both.map((r) => r.statusCode).sort()).toEqual([200, 201]);
    expect(both[0]!.json().suggestion.id).toBe(both[1]!.json().suggestion.id);
  });

  it("returns nothing for a notification that isn't a movement", async () => {
    const user = await createTestUser();
    const res = await send(user, notice({ text: "Tu código de verificación es 482913" }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ suggestion: null });
    expect(await prisma.movementSuggestion.count({ where: { userId: user.id } })).toBe(0);
  });

  it("ignores another user's wallet", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const theirs = await createAccount(other.id);
    const res = await send(user, notice({ accountId: theirs.id }));
    expect(res.json().suggestion.accountId).toBeNull();
  });

  it("confirms with the saved movement, or dismisses, only for its owner", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 1_000_000n });
    const food = await categoryBySlug("exp.food");
    const a = (await send(user, notice())).json().suggestion;
    const b = (await send(user, notice({ postedAt: "2026-10-17T15:00:00.000Z" }))).json().suggestion;
    const tx = (await app.inject({ method: "POST", url: "/api/v1/transactions", headers: authHeader(user), payload: { accountId: wallet.id, type: "EXPENSE", categoryId: food.id, amount: 25000, description: "Mercado", date: "2026-10-17" } })).json();

    // Someone else can't touch them.
    expect((await app.inject({ method: "POST", url: `/api/v1/suggestions/${a.id}/confirm`, headers: authHeader(other), payload: { transactionId: tx.id } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/api/v1/suggestions/${b.id}/dismiss`, headers: authHeader(other) })).statusCode).toBe(404);

    const confirmed = await app.inject({ method: "POST", url: `/api/v1/suggestions/${a.id}/confirm`, headers: authHeader(user), payload: { transactionId: tx.id } });
    expect(confirmed.json()).toMatchObject({ status: "CONFIRMED", transactionId: tx.id });
    expect((await app.inject({ method: "POST", url: `/api/v1/suggestions/${a.id}/confirm`, headers: authHeader(user), payload: { transactionId: tx.id } })).statusCode).toBe(409);
    expect((await app.inject({ method: "POST", url: `/api/v1/suggestions/${b.id}/dismiss`, headers: authHeader(user) })).statusCode).toBe(204);

    const list = await app.inject({ method: "GET", url: "/api/v1/suggestions", headers: authHeader(user) });
    expect(list.json()).toEqual([]);
  });

  it("validates the request and needs a session", async () => {
    const user = await createTestUser();
    expect((await send(user, notice({ postedAt: "ayer" }))).statusCode).toBe(400);
    expect((await send(user, notice({ text: "x".repeat(1001) }))).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/v1/suggestions" })).statusCode).toBe(401);
  });
});

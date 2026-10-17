import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { env } from "../../src/env.js";
import { prisma } from "../../src/lib/prisma.js";
import { ASSISTANT_DAILY_LIMIT } from "../../src/routes/assistant.js";

type Part = Record<string, unknown>;
const answer = (parts: Part[]) => new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts } }] }));

describe("assistant routes", () => {
  let app: FastifyInstance;
  const setKey = (key: string) => ((env as { GEMINI_API_KEY: string }).GEMINI_API_KEY = key);
  const original = env.GEMINI_API_KEY;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    setKey(original);
    await app.close();
  });
  afterEach(() => vi.unstubAllGlobals());

  const ask = (user: TestUser, text: string) =>
    app.inject({ method: "POST", url: "/api/v1/assistant/messages", headers: authHeader(user), payload: { messages: [{ role: "user", text }], today: "2026-10-17" } });

  it("is off without a key", async () => {
    setKey("");
    const user = await createTestUser();
    expect((await ask(user, "hola")).statusCode).toBe(501);
    expect((await app.inject({ method: "GET", url: "/api/v1/assistant/status", headers: authHeader(user) })).json()).toMatchObject({ available: false });
  });

  it("answers from the user's own data through read-only tools", async () => {
    setKey("test-key");
    const user = await createTestUser();
    const other = await createTestUser();
    const wallet = await createAccount(user.id, { initialBalanceMinor: 2_000_000n });
    const theirs = await createAccount(other.id, { initialBalanceMinor: 2_000_000n });
    const food = await categoryBySlug("exp.food");
    const spend = (u: TestUser, accountId: string, amount: number) =>
      app.inject({ method: "POST", url: "/api/v1/transactions", headers: authHeader(u), payload: { accountId, type: "EXPENSE", categoryId: food.id, amount, description: "Mercado", date: "2026-10-10" } });
    await spend(user, wallet.id, 300_000);
    await spend(other, theirs.id, 999_000);

    const sent: { contents: { role: string; parts: Part[] }[] }[] = [];
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      sent.push(body);
      if (sent.length === 1) return answer([{ functionCall: { name: "get_report", args: { from_month: "2026-10", to_month: "2026-10" } } }]);
      return answer([{ text: "Este mes gastaste $300.000 en Alimentación." }]);
    });
    vi.stubGlobal("fetch", fetcher);

    const res = await ask(user, "¿Cuánto gasté en comida este mes?");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ reply: "Este mes gastaste $300.000 en Alimentación.", proposals: [], remaining: ASSISTANT_DAILY_LIMIT - 1 });
    // The tool result went back to the model, with the user's figures and
    // category names instead of ids, and nothing of the other user's.
    const toolTurn = JSON.stringify(sent[1]!.contents.at(-1));
    expect(toolTurn).toContain('"expenses":300000');
    expect(toolTurn).toContain("Alimentación");
    expect(toolTurn).not.toContain(food.id);
    expect(toolTurn).not.toContain("999000");
  });

  it("proposes a movement without saving it", async () => {
    setKey("test-key");
    const user = await createTestUser();
    await createAccount(user.id);
    const restaurants = await categoryBySlug("exp.food.restaurants");
    let call = 0;
    vi.stubGlobal("fetch", vi.fn(async () =>
      ++call === 1
        ? answer([{ functionCall: { name: "propose_movement", args: { type: "EXPENSE", amount: 32000, description: "Almuerzo", category: "Restaurantes", date: "2026-10-17" } } }])
        : answer([{ text: "Listo, revisa el borrador y toca Registrar." }]),
    ));
    const res = await ask(user, "Registra un almuerzo de 32 mil");
    expect(res.json().proposals).toEqual([{ type: "EXPENSE", amount: 32000, description: "Almuerzo", categoryId: restaurants.id, date: "2026-10-17" }]);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it("stops at the daily limit and doesn't count failed calls", async () => {
    setKey("test-key");
    const user = await createTestUser();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    expect((await ask(user, "hola")).statusCode).toBe(503);
    expect((await app.inject({ method: "GET", url: "/api/v1/assistant/status", headers: authHeader(user) })).json()).toMatchObject({ available: true, remaining: ASSISTANT_DAILY_LIMIT });

    const today = new Date();
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    await prisma.assistantUsage.upsert({ where: { userId_day: { userId: user.id, day } }, create: { userId: user.id, day, count: ASSISTANT_DAILY_LIMIT }, update: { count: ASSISTANT_DAILY_LIMIT } });
    expect((await ask(user, "hola")).statusCode).toBe(429);
  });

  it("validates the conversation", async () => {
    setKey("test-key");
    const user = await createTestUser();
    const bad = (payload: unknown) => app.inject({ method: "POST", url: "/api/v1/assistant/messages", headers: authHeader(user), payload: payload as object });
    expect((await bad({ messages: [] })).statusCode).toBe(400);
    expect((await bad({ messages: [{ role: "model", text: "hola" }] })).statusCode).toBe(400);
    expect((await bad({ messages: Array.from({ length: 21 }, () => ({ role: "user", text: "x" })) })).statusCode).toBe(400);
    expect((await bad({ messages: [{ role: "user", text: "x".repeat(2001) }] })).statusCode).toBe(400);
  });
});

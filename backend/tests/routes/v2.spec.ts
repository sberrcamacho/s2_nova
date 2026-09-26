import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { categoryBySlug } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

// The v2 handoff: currencies, future/repeating movements, receipts, custom
// budgets and goal plans (design_handoff_s2_nova_v2/docs).

describe("v2 movements, currencies and plans", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function wallet(user: Awaited<ReturnType<typeof createTestUser>>, payload: Record<string, unknown>) {
    const res = await app.inject({ method: "POST", url: "/api/v1/accounts", headers: authHeader(user), payload });
    expect(res.statusCode).toBe(201);
    return res.json() as { id: string; currency: string };
  }

  it("stores a foreign-currency movement with its rate and moves the wallet by the converted amount", async () => {
    const user = await createTestUser();
    const cop = await wallet(user, { name: "Bancolombia", type: "BANK_DEBIT", initialBalance: 100000 });
    const streaming = await categoryBySlug("exp.entertainment.streaming");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: authHeader(user),
      payload: {
        accountId: cop.id,
        type: "EXPENSE",
        amount: 5.99,
        currency: "USD",
        categoryId: streaming.parentId,
        subcategoryId: streaming.id,
        date: "2026-08-21",
        time: "08:15",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ amount: 5.99, currency: "USD", fxRate: 3950, walletAmount: 23661, status: "COMPLETED" });
    expect(res.json().occurredAt).toBe("2026-08-21T08:15:00.000Z");
    const after = await prisma.account.findUniqueOrThrow({ where: { id: cop.id } });
    expect(after.currentBalanceMinor).toBe(100000n - 23661n);
  });

  it("saves a future-dated movement as PLANNED without touching the balance", async () => {
    const user = await createTestUser();
    const w = await wallet(user, { name: "Nequi", type: "NEQUI", initialBalance: 1000 });
    const rent = await categoryBySlug("exp.housing.rent");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: authHeader(user),
      payload: { accountId: w.id, type: "EXPENSE", amount: 500, categoryId: rent.parentId, subcategoryId: rent.id, date: "2099-09-01", time: "08:00" },
    });
    expect(res.json().status).toBe("PLANNED");
    expect((await prisma.account.findUniqueOrThrow({ where: { id: w.id } })).currentBalanceMinor).toBe(1000n);
  });

  it("'Guardar y repetir' creates the movement plus a Programado that ends after N", async () => {
    const user = await createTestUser();
    const w = await wallet(user, { name: "Efectivo", type: "CASH", initialBalance: 0 });
    const health = await categoryBySlug("exp.health");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: authHeader(user),
      payload: {
        accountId: w.id,
        type: "EXPENSE",
        amount: 80000,
        categoryId: health.id,
        date: "2026-08-21",
        repeat: { interval: "WEEKLY", occurrences: 2 },
      },
    });
    const seriesId = res.json().recurringSeriesId as string;
    const series = await prisma.recurringSeries.findUniqueOrThrow({ where: { id: seriesId } });
    expect(series).toMatchObject({ interval: "WEEKLY", occurrences: 2, occurrencesDone: 1, active: true });
    expect(series.nextOccurrenceDate.toISOString().slice(0, 10)).toBe("2026-08-28");

    const confirmed = await app.inject({ method: "POST", url: `/api/v1/recurring-series/${seriesId}/confirm`, headers: authHeader(user), payload: {} });
    expect(confirmed.json().series).toMatchObject({ occurrencesDone: 2, active: false });
  });

  it("records automatic Programados when they're read", async () => {
    const user = await createTestUser();
    const w = await wallet(user, { name: "Nequi", type: "NEQUI", initialBalance: 0 });
    const salary = await categoryBySlug("inc.work.salary");
    await app.inject({
      method: "POST",
      url: "/api/v1/recurring-series",
      headers: authHeader(user),
      payload: { name: "Salario", type: "INCOME", amount: 1000, accountId: w.id, categoryId: salary.parentId, subcategoryId: salary.id, interval: "DAILY", startDate: "2026-08-01", occurrences: 3, autoConfirm: true },
    });
    await app.inject({ method: "GET", url: "/api/v1/recurring-series?today=2026-08-10", headers: authHeader(user) });
    expect((await prisma.account.findUniqueOrThrow({ where: { id: w.id } })).currentBalanceMinor).toBe(3000n);
  });

  it("attaches, serves and removes a receipt", async () => {
    const user = await createTestUser();
    const w = await wallet(user, { name: "Efectivo", type: "CASH", initialBalance: 0 });
    const food = await categoryBySlug("exp.food");
    const tx = (
      await app.inject({ method: "POST", url: "/api/v1/transactions", headers: authHeader(user), payload: { accountId: w.id, type: "EXPENSE", amount: 1, categoryId: food.id, date: "2026-08-21" } })
    ).json();
    const put = await app.inject({
      method: "PUT",
      url: `/api/v1/transactions/${tx.id}/attachment`,
      headers: authHeader(user),
      payload: { name: "foto-recibo.jpg", mime: "image/jpeg", data: Buffer.from("receipt").toString("base64") },
    });
    expect(put.json()).toMatchObject({ kind: "IMAGE", name: "foto-recibo.jpg", size: 7 });
    const listed = (await app.inject({ method: "GET", url: `/api/v1/transactions/${tx.id}`, headers: authHeader(user) })).json();
    expect(listed.attachment).toMatchObject({ name: "foto-recibo.jpg" });
    const file = await app.inject({ method: "GET", url: `/api/v1/transactions/${tx.id}/attachment`, headers: authHeader(user) });
    expect(file.body).toBe("receipt");
    const stranger = await createTestUser();
    expect((await app.inject({ method: "GET", url: `/api/v1/transactions/${tx.id}/attachment`, headers: authHeader(stranger) })).statusCode).toBe(404);
    await app.inject({ method: "DELETE", url: `/api/v1/transactions/${tx.id}/attachment`, headers: authHeader(user) });
    expect(await prisma.attachment.count({ where: { transactionId: tx.id } })).toBe(0);
  });

  it("counts only assigned movements toward a custom budget, and wallets scope a category budget", async () => {
    const user = await createTestUser();
    const a = await wallet(user, { name: "A", type: "CASH", initialBalance: 0 });
    const b = await wallet(user, { name: "B", type: "CASH", initialBalance: 0 });
    const clothing = await categoryBySlug("exp.shopping.clothing");
    const custom = (
      await app.inject({ method: "POST", url: "/api/v1/budgets", headers: authHeader(user), payload: { kind: "CUSTOM", name: "Cumpleaños de Sofía", amount: 300000, period: "CUSTOM", startDate: "2026-09-01", endDate: "2026-09-20" } })
    ).json();
    expect(custom).toMatchObject({ kind: "CUSTOM", icon: "other" });
    const byCategory = (
      await app.inject({ method: "POST", url: "/api/v1/budgets", headers: authHeader(user), payload: { categoryId: clothing.parentId, amount: 100000, month: "2026-09", walletIds: [a.id] } })
    ).json();
    for (const [accountId, customBudgetId] of [[a.id, custom.id], [b.id, undefined]] as const) {
      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId, type: "EXPENSE", amount: 50000, categoryId: clothing.parentId, subcategoryId: clothing.id, customBudgetId, date: "2026-09-05" },
      });
    }
    const list = (await app.inject({ method: "GET", url: "/api/v1/budgets?month=2026-09", headers: authHeader(user) })).json() as { id: string; spent: number; assignedCount: number | null }[];
    expect(list.find((x) => x.id === custom.id)).toMatchObject({ spent: 50000, assignedCount: 1 });
    expect(list.find((x) => x.id === byCategory.id)).toMatchObject({ spent: 50000 });
  });

  it("goal: suggested icon, initial amount, periodic contribution confirm and skip", async () => {
    const user = await createTestUser();
    const w = await wallet(user, { name: "Bancolombia", type: "BANK_DEBIT", initialBalance: 1000000 });
    const goal = (
      await app.inject({ method: "POST", url: "/api/v1/goals", headers: authHeader(user), payload: { name: "Portátil nuevo", targetAmount: 1000000, initialAmount: 200000 } })
    ).json();
    expect(goal).toMatchObject({ icon: "technology", currentAmount: 200000, percentage: 20 });

    const planned = await app.inject({
      method: "PUT",
      url: `/api/v1/goals/${goal.id}/plan`,
      headers: authHeader(user),
      payload: { amount: 250000, frequency: "MONTHLY", accountId: w.id, startDate: "2026-08-21" },
    });
    expect(planned.json().plan).toMatchObject({ amount: 250000, endMode: "GOAL", autoConfirm: false });

    const alerts = (await app.inject({ method: "GET", url: "/api/v1/alerts?today=2026-08-21", headers: authHeader(user) })).json() as { kind: string }[];
    expect(alerts.some((x) => x.kind === "GOAL_PLAN_DUE")).toBe(true);

    const confirmed = (await app.inject({ method: "POST", url: `/api/v1/goals/${goal.id}/plan/confirm`, headers: authHeader(user), payload: {} })).json();
    expect(confirmed).toMatchObject({ currentAmount: 450000 });
    expect(confirmed.plan.nextDate.slice(0, 10)).toBe("2026-09-21");
    const skipped = (await app.inject({ method: "POST", url: `/api/v1/goals/${goal.id}/plan/skip`, headers: authHeader(user), payload: {} })).json();
    expect(skipped.plan.nextDate.slice(0, 10)).toBe("2026-10-21");
    expect((await prisma.account.findUniqueOrThrow({ where: { id: w.id } })).currentBalanceMinor).toBe(750000n);
  });

  it("currencies: principal in first run, add and remove others", async () => {
    const user = await createTestUser();
    const headers = authHeader(user);
    const principal = await app.inject({ method: "PUT", url: "/api/v1/me/currencies/principal", headers, payload: { code: "COP" } });
    expect(principal.json()[0]).toMatchObject({ code: "COP", isPrincipal: true });
    await app.inject({ method: "POST", url: "/api/v1/me/currencies", headers, payload: { code: "USD" } });
    await wallet(user, { name: "Wise", type: "SAVINGS", initialBalance: 320, currency: "USD" });
    const blocked = await app.inject({ method: "DELETE", url: "/api/v1/me/currencies/USD", headers });
    expect(blocked.statusCode).toBe(409);
    const list = (await app.inject({ method: "GET", url: "/api/v1/me/currencies", headers })).json();
    expect(list.find((c: { code: string }) => c.code === "USD")).toMatchObject({ rate: 3950, wallets: 1 });
    const changeLater = await app.inject({ method: "PUT", url: "/api/v1/me/currencies/principal", headers, payload: { code: "USD" } });
    expect(changeLater.statusCode).toBe(409);
  });

  it("currencies: adding one keeps the implicit COP principal", async () => {
    const user = await createTestUser();
    const headers = authHeader(user);
    await wallet(user, { name: "Efectivo", type: "CASH", initialBalance: 0 });
    const list = (await app.inject({ method: "POST", url: "/api/v1/me/currencies", headers, payload: { code: "USD" } })).json();
    expect(list.map((c: { code: string; isPrincipal: boolean }) => [c.code, c.isPrincipal])).toEqual([
      ["COP", true],
      ["USD", false],
    ]);
  });
});

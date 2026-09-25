import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/lib/prisma.js";
import { hashRefreshToken } from "../../src/lib/tokens.js";
import { createTestApp } from "../helpers/app.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const SAFARI_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("security routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(user: TestUser, userAgent: string) {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "user-agent": userAgent },
      payload: { email: user.email, password: user.password },
    });
    const body = res.json();
    return { accessToken: body.accessToken as string, refreshToken: body.refreshToken as string };
  }

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
  const refresh = (refreshToken: string) =>
    app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
  // Refreshing a revoked token would trip reuse detection and close every
  // session, so revocation is read from the table instead.
  const isOpen = async (refreshToken: string) =>
    (await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashRefreshToken(refreshToken) } })).revokedAt === null;

  it("lists one row per login, labels the device and marks the caller's session", async () => {
    const user = await createTestUser();
    const desktop = await login(user, CHROME_WINDOWS);
    await login(user, SAFARI_IPAD);
    await login(user, "S2Nova-Android/1.0.0 (Pixel 8)");

    // A rotation stays the same session.
    const rotated = (await refresh(desktop.refreshToken)).json();

    const res = await app.inject({ method: "GET", url: "/api/v1/me/sessions", headers: bearer(rotated.accessToken) });
    expect(res.statusCode).toBe(200);
    const sessions = res.json();
    expect(sessions).toHaveLength(3);
    expect(sessions[0]).toMatchObject({ device: "Chrome · Windows", kind: "desktop", current: true });
    expect(sessions.slice(1).map((s: { device: string }) => s.device).sort()).toEqual(["S2 Nova app · Pixel 8", "Safari · iPad"]);
    expect(sessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
  });

  it("closes one session, or every session but the caller's", async () => {
    const user = await createTestUser();
    const desktop = await login(user, CHROME_WINDOWS);
    const tablet = await login(user, SAFARI_IPAD);
    const phone = await login(user, "S2Nova-Android/1.0.0 (Pixel 8)");

    const list = (await app.inject({ method: "GET", url: "/api/v1/me/sessions", headers: bearer(desktop.accessToken) })).json();
    const tabletId = list.find((s: { device: string }) => s.device === "Safari · iPad").id;

    const one = await app.inject({ method: "DELETE", url: `/api/v1/me/sessions/${tabletId}`, headers: bearer(desktop.accessToken) });
    expect(one.statusCode).toBe(204);
    expect(await isOpen(tablet.refreshToken)).toBe(false);
    expect(await isOpen(phone.refreshToken)).toBe(true);

    const others = await app.inject({ method: "DELETE", url: "/api/v1/me/sessions", headers: bearer(desktop.accessToken) });
    expect(others.statusCode).toBe(204);
    expect(await isOpen(phone.refreshToken)).toBe(false);
    expect(await isOpen(desktop.refreshToken)).toBe(true);

    const missing = await app.inject({ method: "DELETE", url: `/api/v1/me/sessions/${tabletId}`, headers: bearer(desktop.accessToken) });
    expect(missing.statusCode).toBe(404);
  });

  it("changing the password keeps the caller's session and closes the rest", async () => {
    const user = await createTestUser();
    const desktop = await login(user, CHROME_WINDOWS);
    const phone = await login(user, "S2Nova-Android/1.0.0 (Pixel 8)");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/me/password",
      headers: bearer(desktop.accessToken),
      payload: { currentPassword: user.password, newPassword: "Otra1234x" },
    });
    expect(res.statusCode).toBe(204);
    expect(await isOpen(phone.refreshToken)).toBe(false);
    expect(await isOpen(desktop.refreshToken)).toBe(true);

    const me = (await app.inject({ method: "GET", url: "/api/v1/me", headers: authHeader(user) })).json();
    expect(Date.now() - new Date(me.passwordChangedAt).getTime()).toBeLessThan(60_000);
  });

  it("rejects a new password without a number, shorter than 8, or equal to the current one", async () => {
    const user = await createTestUser();
    for (const newPassword of ["SinNumeros", "Corta1", user.password]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/password",
        headers: authHeader(user),
        payload: { currentPassword: user.password, newPassword },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it("counts what deleting the account removes", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id);
    const food = await categoryBySlug("food");
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, accountId: wallet.id, type: "EXPENSE", amountMinor: 1000n, categoryId: food.id, paymentMethod: "CASH", description: "Almuerzo", transactionDate: new Date("2026-08-01") },
        { userId: user.id, accountId: wallet.id, type: "EXPENSE", amountMinor: 5000n, categoryId: food.id, paymentMethod: "CASH", description: "Préstamo", loanKind: "LENT", counterpartyName: "Ana", transactionDate: new Date("2026-08-02") },
      ],
    });
    await prisma.budget.create({ data: { userId: user.id, categoryId: food.id, amountMinor: 100000n, startDate: new Date("2026-08-01") } });

    const res = await app.inject({ method: "GET", url: "/api/v1/me/footprint", headers: authHeader(user) });
    expect(res.json()).toEqual({ transactions: 2, budgets: 1, goals: 0, loans: 1, wallets: 1, recurringSeries: 0 });
  });

  it("exports movements, budgets, goals and loans as one CSV", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { name: "Nequi" });
    const food = await categoryBySlug("food");
    await prisma.transaction.create({
      data: { userId: user.id, accountId: wallet.id, type: "EXPENSE", amountMinor: 18500n, categoryId: food.id, paymentMethod: "CASH", description: "Almuerzo, ejecutivo", transactionDate: new Date("2026-08-01") },
    });

    const res = await app.inject({ method: "GET", url: "/api/v1/me/export", headers: authHeader(user) });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.body).toContain('2026-08-01,Gasto,Registrado,"Almuerzo, ejecutivo",,Alimentación,,Nequi,,18500,');
    for (const title of ["Movimientos", "Presupuestos", "Metas", "Préstamos"]) expect(res.body).toContain(`\r\n${title}\r\n`.slice(title === "Movimientos" ? 2 : 0));
  });

  it("deletes the account and everything in it only with the right password", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id);
    const food = await categoryBySlug("food");
    await prisma.transaction.create({
      data: { userId: user.id, accountId: wallet.id, type: "EXPENSE", amountMinor: 1000n, categoryId: food.id, paymentMethod: "CASH", description: "x", transactionDate: new Date("2026-08-01") },
    });
    await prisma.budget.create({ data: { userId: user.id, categoryId: food.id, amountMinor: 1000n, startDate: new Date("2026-08-01") } });

    const wrong = await app.inject({ method: "DELETE", url: "/api/v1/me", headers: authHeader(user), payload: { password: "nope" } });
    expect(wrong.statusCode).toBe(401);

    const res = await app.inject({ method: "DELETE", url: "/api/v1/me", headers: authHeader(user), payload: { password: user.password } });
    expect(res.statusCode).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: user.id } })).toBe(0);
  });
});

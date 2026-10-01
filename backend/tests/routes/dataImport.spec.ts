import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/lib/prisma.js";
import { createTestApp } from "../helpers/app.js";
import { createAccount } from "../helpers/factories.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";

describe("POST /me/import/transactions", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (user: Awaited<ReturnType<typeof createTestUser>>, payload: unknown) =>
    app.inject({ method: "POST", url: "/api/v1/me/import/transactions", headers: authHeader(user), payload });

  it("imports valid rows, matching wallet and category by name, and updates the balance", async () => {
    const user = await createTestUser();
    const wallet = await createAccount(user.id, { name: "Nequi" });
    const before = (await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } })).currentBalanceMinor;

    const res = await post(user, {
      rows: [
        { date: "2026-08-01", title: "Almuerzo", amount: 18500, type: "EXPENSE", category: "alimentacion", wallet: "nequi" },
        { date: "2026-08-02", title: "Pago", amount: 1000, type: "INCOME", wallet: "Nequi" },
      ],
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ imported: 2 });

    const rows = await prisma.transaction.findMany({ where: { userId: user.id }, include: { category: true }, orderBy: { transactionDate: "asc" } });
    expect(rows.map((r) => r.description)).toEqual(["Almuerzo", "Pago"]);
    expect(rows[0].category.slug.startsWith("exp.food")).toBe(true);
    expect(rows[1].category.slug).toBe("inc.other");
    const after = (await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } })).currentBalanceMinor;
    expect(after).not.toBe(before);
  });

  it("dry run reports bad rows without writing; a real run with bad rows imports nothing", async () => {
    const user = await createTestUser();
    await createAccount(user.id, { name: "Nequi" });
    const rows = [
      { date: "2026-08-01", title: "Ok", amount: 10, type: "EXPENSE", wallet: "Nequi" },
      { date: "2026-08-01", title: "Sin billetera", amount: 10, type: "EXPENSE", wallet: "Nope" },
      { date: "no-date", title: "Mala fecha", amount: 10, type: "EXPENSE", wallet: "Nequi" },
    ];

    const dry = await post(user, { rows, dryRun: true });
    expect(dry.statusCode).toBe(200);
    expect(dry.json()).toMatchObject({ total: 3, valid: 1, invalid: 2, rows: [{ row: 2, error: "wallet" }, { row: 3, error: "invalid" }] });

    const real = await post(user, { rows });
    expect(real.statusCode).toBe(422);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });
});

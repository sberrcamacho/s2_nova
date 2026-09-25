import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CURRENCY_CATALOG, CURRENCY_CODES, principalOf, rateOn } from "../lib/currency.js";
import { prisma } from "../lib/prisma.js";

// Ajustes › Monedas and the first-run "Tu moneda principal" step
// (CURRENCIES_AND_WALLETS.md §3, ONBOARDING.md §2).

const codeSchema = z.enum(CURRENCY_CODES);

async function listFor(userId: string) {
  const [rows, principal, wallets] = await Promise.all([
    prisma.userCurrency.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    principalOf(userId),
    prisma.account.groupBy({ by: ["currency"], where: { userId }, _count: { _all: true } }),
  ]);
  const walletsOf = new Map(wallets.map((w) => [w.currency, w._count._all]));
  const codes = rows.length ? rows : [{ code: principal, isPrincipal: true }];
  return Promise.all(
    codes
      .sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal))
      .map(async (c) => ({
        code: c.code,
        name: CURRENCY_CATALOG[c.code]?.name ?? c.code,
        symbol: CURRENCY_CATALOG[c.code]?.symbol ?? c.code,
        decimals: CURRENCY_CATALOG[c.code]?.decimals ?? 2,
        isPrincipal: c.isPrincipal,
        // "1 USD = $3.950": principal units per one of this currency.
        rate: await rateOn(c.code, principal),
        wallets: walletsOf.get(c.code) ?? 0,
      })),
  );
}

export async function currencyRoutes(app: FastifyInstance) {
  // "+ Agregar moneda" catalog, with today's rate to the principal.
  app.get("/currencies", { preHandler: app.authenticate }, async (request) => {
    const principal = await principalOf(request.userId!);
    return Promise.all(
      Object.entries(CURRENCY_CATALOG).map(async ([code, c]) => ({ code, ...c, rate: await rateOn(code, principal) })),
    );
  });

  app.get("/me/currencies", { preHandler: app.authenticate }, async (request) => listFor(request.userId!));

  app.post("/me/currencies", { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = z.object({ code: codeSchema }).parse(request.body);
    const userId = request.userId!;
    const hasPrincipal = await prisma.userCurrency.count({ where: { userId, isPrincipal: true } });
    await prisma.userCurrency.upsert({
      where: { userId_code: { userId, code } },
      create: { userId, code, isPrincipal: hasPrincipal === 0 },
      update: {},
    });
    reply.status(201);
    return listFor(userId);
  });

  // "Quitar" only when no wallet uses it; movements keep amount and rate.
  app.delete("/me/currencies/:code", { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = z.object({ code: codeSchema }).parse(request.params);
    const userId = request.userId!;
    const row = await prisma.userCurrency.findUnique({ where: { userId_code: { userId, code } } });
    if (!row) return reply.status(404).send({ error: "Currency not found." });
    if (row.isPrincipal) return reply.status(409).send({ error: "La moneda principal no se puede quitar." });
    if (await prisma.account.count({ where: { userId, currency: code } })) {
      return reply.status(409).send({ error: "Hay billeteras en esta moneda." });
    }
    await prisma.userCurrency.delete({ where: { userId_code: { userId, code } } });
    return listFor(userId);
  });

  // Sets the principal currency. Only before the first wallet exists (first
  // run); changing it later is a follow-up (CURRENCIES_AND_WALLETS.md §3).
  app.put("/me/currencies/principal", { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = z.object({ code: codeSchema }).parse(request.body);
    const userId = request.userId!;
    const current = await principalOf(userId);
    if (current !== code && (await prisma.account.count({ where: { userId } })) > 0) {
      return reply.status(409).send({ error: "La moneda principal se elige antes de crear billeteras." });
    }
    await prisma.$transaction(async (tx) => {
      await tx.userCurrency.updateMany({ where: { userId }, data: { isPrincipal: false } });
      await tx.userCurrency.upsert({
        where: { userId_code: { userId, code } },
        create: { userId, code, isPrincipal: true },
        update: { isPrincipal: true },
      });
      // Legacy display preference (COP/USD) mirrors it while it exists.
      if (code === "COP" || code === "USD") {
        await tx.userPreferences.updateMany({ where: { userId }, data: { currency: code } });
      }
    });
    return listFor(userId);
  });
}

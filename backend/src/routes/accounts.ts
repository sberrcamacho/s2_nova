import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Account } from "@prisma/client";
import { convertMinor, CURRENCY_CODES, fromMinor, principalOf, toMinor } from "../lib/currency.js";
import { applyBalanceEffect, effectOf } from "../lib/movements.js";
import { prisma } from "../lib/prisma.js";

// "Wallet" in both clients — see the Account model's doc comment in
// schema.prisma for why the table itself keeps its original name.
const accountTypeEnum = z.enum(["CASH", "BANK_DEBIT", "BANK_CREDIT", "SAVINGS", "CRYPTO", "NEQUI", "DAVIPLATA", "OTHER"]);

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: accountTypeEnum,
  initialBalance: z.number().min(-1e12).max(1e12).default(0),
  // One currency per wallet; defaults to the principal.
  currency: z.enum(CURRENCY_CODES).optional(),
});

const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  type: accountTypeEnum.optional(),
});

function serializeAccount(account: Account, principal: string, movements?: number) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: fromMinor(account.initialBalanceMinor, account.currency),
    currentBalance: fromMinor(account.currentBalanceMinor, account.currency),
    // "≈ $1.264.000" line for wallets in another currency.
    principalBalance: fromMinor(convertMinor(account.currentBalanceMinor, account.currency, principal), principal),
    movements: movements ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function accountRoutes(app: FastifyInstance) {
  app.get("/accounts", { preHandler: app.authenticate }, async (request) => {
    const userId = request.userId!;
    const [accounts, principal, counts] = await Promise.all([
      prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      principalOf(userId),
      prisma.transaction.groupBy({ by: ["accountId"], where: { userId }, _count: { _all: true } }),
    ]);
    const countOf = new Map(counts.map((c) => [c.accountId, c._count._all]));
    return accounts.map((account) => serializeAccount(account, principal, countOf.get(account.id) ?? 0));
  });

  app.post("/accounts", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    const userId = request.userId!;
    const principal = await principalOf(userId);
    const currency = body.currency ?? principal;
    const account = await prisma.$transaction(async (tx) => {
      // A wallet's currency is one of the user's currencies (Ajustes › Monedas).
      await tx.userCurrency.upsert({
        where: { userId_code: { userId, code: currency } },
        create: { userId, code: currency, isPrincipal: false },
        update: {},
      });
      return tx.account.create({
        data: {
          userId,
          name: body.name,
          type: body.type,
          currency,
          initialBalanceMinor: toMinor(body.initialBalance, currency),
          currentBalanceMinor: toMinor(body.initialBalance, currency),
        },
      });
    });
    reply.status(201);
    return serializeAccount(account, principal, 0);
  });

  app.patch("/accounts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateAccountSchema.parse(request.body);

    const existing = await prisma.account.findFirst({ where: { id, userId: request.userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Wallet not found." });
    }

    const account = await prisma.account.update({
      where: { id },
      data: { name: body.name, type: body.type },
    });
    return serializeAccount(account, await principalOf(request.userId!));
  });

  // Deleting a wallet (CURRENCIES_AND_WALLETS.md §4). The last wallet can
  // never go. With reassignToAccountId every movement, Programado and aporte
  // moves to that wallet together with the balance (same currency only);
  // without it the wallet's movements are deleted with it — the two-step
  // confirmation lists how many — and any transfers into other wallets are
  // reversed there first so their balances stay true.
  app.delete("/accounts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ reassignToAccountId: z.string().uuid().optional() }).parse(request.body ?? {});
    const userId = request.userId!;

    const source = await prisma.account.findFirst({ where: { id, userId } });
    if (!source) {
      return reply.status(404).send({ error: "Wallet not found." });
    }
    if ((await prisma.account.count({ where: { userId } })) <= 1) {
      return reply.status(409).send({ error: "Necesitas al menos una billetera para usar S2 Nova." });
    }

    if (body.reassignToAccountId) {
      if (body.reassignToAccountId === source.id) {
        return reply.status(422).send({ error: "Destination must be a different wallet." });
      }
      const destination = await prisma.account.findFirst({ where: { id: body.reassignToAccountId, userId } });
      if (!destination) {
        return reply.status(422).send({ error: "Destination wallet not found." });
      }
      await prisma.$transaction(async (tx) => {
        await tx.transaction.updateMany({ where: { accountId: source.id }, data: { accountId: destination.id } });
        await tx.transaction.updateMany({ where: { transferToAccountId: source.id }, data: { transferToAccountId: destination.id } });
        await tx.recurringSeries.updateMany({ where: { accountId: source.id }, data: { accountId: destination.id } });
        await tx.goalPlan.updateMany({ where: { accountId: source.id }, data: { accountId: destination.id } });
        await tx.account.update({
          where: { id: destination.id },
          data: { currentBalanceMinor: { increment: convertMinor(source.currentBalanceMinor, source.currency, destination.currency) } },
        });
        await tx.account.delete({ where: { id: source.id } });
      });
      return reply.status(204).send();
    }

    const fallback = await prisma.account.findFirstOrThrow({ where: { userId, NOT: { id: source.id } }, orderBy: { createdAt: "asc" } });
    await prisma.$transaction(async (tx) => {
      const outgoing = await tx.transaction.findMany({
        where: { accountId: source.id, type: "TRANSFER", status: "COMPLETED", transferToAccountId: { not: null } },
      });
      for (const row of outgoing) {
        // Undo only the destination side; the source wallet is going away.
        await applyBalanceEffect(tx, { ...effectOf(row), accountId: row.transferToAccountId!, type: "INCOME", walletAmountMinor: row.walletAmountMinor ?? row.amountMinor, transferToAccountId: null }, -1);
      }
      const incoming = await tx.transaction.findMany({ where: { transferToAccountId: source.id, status: "COMPLETED" } });
      for (const row of incoming) {
        await applyBalanceEffect(tx, { ...effectOf(row), type: "EXPENSE", walletAmountMinor: null, transferToAccountId: null }, -1);
      }
      await tx.transaction.deleteMany({ where: { OR: [{ accountId: source.id }, { transferToAccountId: source.id }] } });
      await tx.goalPlan.updateMany({ where: { accountId: source.id }, data: { accountId: fallback.id } });
      await tx.account.delete({ where: { id: source.id } });
    });

    return reply.status(204).send();
  });
}

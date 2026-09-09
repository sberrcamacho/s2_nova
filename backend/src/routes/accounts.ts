import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// "Wallet" in both clients — see the Account model's doc comment in
// schema.prisma for why the table itself keeps its original name.
const accountTypeEnum = z.enum(["CASH", "BANK_DEBIT", "BANK_CREDIT", "SAVINGS", "CRYPTO", "NEQUI", "DAVIPLATA", "OTHER"]);

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: accountTypeEnum,
  initialBalance: z.number().int().default(0),
});

const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  type: accountTypeEnum.optional(),
});

function serializeAccount(account: {
  id: string;
  name: string;
  type: string;
  initialBalanceMinor: bigint;
  currentBalanceMinor: bigint;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalanceMinor,
    currentBalance: account.currentBalanceMinor,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function accountRoutes(app: FastifyInstance) {
  app.get("/accounts", { preHandler: app.authenticate }, async (request) => {
    const accounts = await prisma.account.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "asc" },
    });
    return accounts.map(serializeAccount);
  });

  app.post("/accounts", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    const account = await prisma.account.create({
      data: {
        userId: request.userId!,
        name: body.name,
        type: body.type,
        initialBalanceMinor: BigInt(body.initialBalance),
        currentBalanceMinor: BigInt(body.initialBalance),
      },
    });
    reply.status(201);
    return serializeAccount(account);
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
    return serializeAccount(account);
  });

  // Account.transactions/recurringSeries both cascade-delete on their FK
  // (see schema.prisma) — deleting a wallet outright would silently destroy
  // its whole transaction history and any active recurring definitions on
  // it. So this always moves everything to another wallet first: every
  // Transaction.accountId and Transaction.transferToAccountId pointing at
  // the source, and every RecurringSeries.accountId, get reassigned to
  // reassignToAccountId, its balance is added to the destination's, and
  // only then is the now-empty source account deleted — all inside one
  // transaction so a failure partway through can't leave history stranded.
  app.delete("/accounts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ reassignToAccountId: z.string().uuid() }).parse(request.body);
    const userId = request.userId!;

    const source = await prisma.account.findFirst({ where: { id, userId } });
    if (!source) {
      return reply.status(404).send({ error: "Wallet not found." });
    }
    if (body.reassignToAccountId === source.id) {
      return reply.status(422).send({ error: "Destination must be a different wallet." });
    }
    const destination = await prisma.account.findFirst({ where: { id: body.reassignToAccountId, userId } });
    if (!destination) {
      return reply.status(422).send({ error: "Destination wallet not found." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({ where: { accountId: source.id }, data: { accountId: destination.id } });
      await tx.transaction.updateMany({
        where: { transferToAccountId: source.id },
        data: { transferToAccountId: destination.id },
      });
      await tx.recurringSeries.updateMany({ where: { accountId: source.id }, data: { accountId: destination.id } });
      await tx.account.update({
        where: { id: destination.id },
        data: { currentBalanceMinor: { increment: source.currentBalanceMinor } },
      });
      await tx.account.delete({ where: { id: source.id } });
    });

    return reply.status(204).send();
  });
}

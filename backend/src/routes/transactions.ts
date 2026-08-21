import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { parseDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const transactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const transactionStatusEnum = z.enum(["COMPLETED", "PLANNED"]);
const loanKindEnum = z.enum(["LENT", "BORROWED"]);
const paymentMethodEnum = z.enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "NEQUI", "DAVIPLATA"]);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createTransactionSchema = z
  .object({
    accountId: z.string().uuid(),
    transferToAccountId: z.string().uuid().optional(),
    type: transactionTypeEnum,
    status: transactionStatusEnum.default("COMPLETED"),
    amount: z.number().int().positive(),
    categoryId: z.string().uuid(),
    productId: z.string().uuid().optional(),
    budgetId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional(),
    loanKind: loanKindEnum.optional(),
    counterpartyName: z.string().trim().min(1).max(120).optional(),
    dueDate: dateOnly.optional(),
    paymentMethod: paymentMethodEnum,
    description: z.string().trim().min(1).max(200),
    merchant: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    date: dateOnly,
  })
  .refine((data) => data.type !== "TRANSFER" || Boolean(data.transferToAccountId), {
    message: "transferToAccountId is required when type is TRANSFER.",
    path: ["transferToAccountId"],
  })
  .refine((data) => data.type === "TRANSFER" || !data.transferToAccountId, {
    message: "transferToAccountId is only allowed when type is TRANSFER.",
    path: ["transferToAccountId"],
  })
  .refine((data) => !data.transferToAccountId || data.transferToAccountId !== data.accountId, {
    message: "transferToAccountId must differ from accountId.",
    path: ["transferToAccountId"],
  });

// accountId/type/transferToAccountId are fixed at creation — changing the
// fundamental shape of a transaction means deleting and recreating it, so
// PATCH only needs to reconcile amount/status changes, not re-validate the
// account/type combination from scratch. Loan settlement is NOT handled
// here — see POST /transactions/:id/settle-loan, which creates a real
// opposite-direction transaction instead of just flipping a flag.
const updateTransactionSchema = z.object({
  amount: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  productId: z.string().uuid().nullable().optional(),
  budgetId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  status: transactionStatusEnum.optional(),
  counterpartyName: z.string().trim().min(1).max(120).nullable().optional(),
  dueDate: dateOnly.nullable().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  description: z.string().trim().min(1).max(200).optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  date: dateOnly.optional(),
});

const listQuerySchema = z.object({
  type: transactionTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  loanKind: loanKindEnum.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

interface BalanceEffectInput {
  accountId: string;
  transferToAccountId: string | null;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountMinor: bigint;
}

// direction 1 applies the transaction's effect on wallet balances,
// -1 reverses it (used before reconciling an edit/delete of a COMPLETED
// transaction). A PLANNED ("Upcoming") transaction never calls this.
async function applyBalanceEffect(tx: Tx, effect: BalanceEffectInput, direction: 1 | -1) {
  const signed = direction === 1 ? effect.amountMinor : -effect.amountMinor;

  if (effect.type === "EXPENSE") {
    await tx.account.update({
      where: { id: effect.accountId },
      data: { currentBalanceMinor: { increment: -signed } },
    });
  } else if (effect.type === "INCOME") {
    await tx.account.update({
      where: { id: effect.accountId },
      data: { currentBalanceMinor: { increment: signed } },
    });
  } else {
    await tx.account.update({
      where: { id: effect.accountId },
      data: { currentBalanceMinor: { increment: -signed } },
    });
    await tx.account.update({
      where: { id: effect.transferToAccountId! },
      data: { currentBalanceMinor: { increment: signed } },
    });
  }
}

function serializeTransaction(row: {
  id: string;
  accountId: string;
  transferToAccountId: string | null;
  type: string;
  status: string;
  amountMinor: bigint;
  categoryId: string;
  productId: string | null;
  budgetId: string | null;
  goalId: string | null;
  recurringSeriesId: string | null;
  loanKind: string | null;
  counterpartyName: string | null;
  dueDate: Date | null;
  loanSettledAt: Date | null;
  settledByTransactionId: string | null;
  paymentMethod: string;
  description: string;
  merchant: string | null;
  note: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    accountId: row.accountId,
    transferToAccountId: row.transferToAccountId,
    type: row.type,
    status: row.status,
    amount: row.amountMinor,
    categoryId: row.categoryId,
    productId: row.productId,
    budgetId: row.budgetId,
    goalId: row.goalId,
    recurringSeriesId: row.recurringSeriesId,
    loanKind: row.loanKind,
    counterpartyName: row.counterpartyName,
    dueDate: row.dueDate,
    loanSettledAt: row.loanSettledAt,
    settledByTransactionId: row.settledByTransactionId,
    paymentMethod: row.paymentMethod,
    description: row.description,
    merchant: row.merchant,
    note: row.note,
    date: row.transactionDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertOwned(userId: string, table: "account" | "category" | "budget" | "goal", id: string) {
  const scoped = table === "category" ? { id, OR: [{ userId: null }, { userId }] } : { id, userId };
  const row = await (prisma[table] as { findFirst: (args: unknown) => Promise<unknown> }).findFirst({ where: scoped });
  if (!row) {
    throw Object.assign(new Error(`Unknown or inaccessible ${table}.`), { statusCode: 422 });
  }
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get("/transactions", { preHandler: app.authenticate }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const userId = request.userId!;

    const where: Prisma.TransactionWhereInput = {
      userId,
      type: query.type,
      status: query.status,
      accountId: query.accountId,
      categoryId: query.categoryId,
      budgetId: query.budgetId,
      goalId: query.goalId,
      loanKind: query.loanKind,
    };
    if (query.from || query.to) {
      where.transactionDate = {
        gte: query.from ? parseDateOnly(query.from) : undefined,
        lte: query.to ? parseDateOnly(query.to) : undefined,
      };
    }
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { merchant: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: query.limit,
      skip: query.offset,
    });
    return rows.map(serializeTransaction);
  });

  app.post("/transactions", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createTransactionSchema.parse(request.body);
    const userId = request.userId!;

    await assertOwned(userId, "account", body.accountId);
    if (body.transferToAccountId) await assertOwned(userId, "account", body.transferToAccountId);
    await assertOwned(userId, "category", body.categoryId);
    if (body.budgetId) await assertOwned(userId, "budget", body.budgetId);
    if (body.goalId) await assertOwned(userId, "goal", body.goalId);

    const transactionDate = parseDateOnly(body.date);

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.transaction.create({
        data: {
          userId,
          accountId: body.accountId,
          transferToAccountId: body.transferToAccountId ?? null,
          type: body.type,
          status: body.status,
          amountMinor: BigInt(body.amount),
          categoryId: body.categoryId,
          productId: body.productId,
          budgetId: body.budgetId,
          goalId: body.goalId,
          loanKind: body.loanKind,
          counterpartyName: body.counterpartyName,
          dueDate: body.dueDate ? parseDateOnly(body.dueDate) : null,
          paymentMethod: body.paymentMethod,
          description: body.description,
          merchant: body.merchant,
          note: body.note,
          transactionDate,
        },
      });

      if (row.status === "COMPLETED") {
        await applyBalanceEffect(
          tx,
          { accountId: row.accountId, transferToAccountId: row.transferToAccountId, type: body.type, amountMinor: row.amountMinor },
          1,
        );
      }

      return row;
    });

    reply.status(201);
    return serializeTransaction(created);
  });

  app.patch("/transactions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateTransactionSchema.parse(request.body);
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }

    if (body.categoryId) await assertOwned(userId, "category", body.categoryId);
    if (body.budgetId) await assertOwned(userId, "budget", body.budgetId);
    if (body.goalId) await assertOwned(userId, "goal", body.goalId);

    const nextAmount = body.amount !== undefined ? BigInt(body.amount) : existing.amountMinor;
    const nextStatus = body.status ?? existing.status;
    const nextDate = body.date ? parseDateOnly(body.date) : existing.transactionDate;

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.status === "COMPLETED") {
        await applyBalanceEffect(
          tx,
          {
            accountId: existing.accountId,
            transferToAccountId: existing.transferToAccountId,
            type: existing.type,
            amountMinor: existing.amountMinor,
          },
          -1,
        );
      }

      const row = await tx.transaction.update({
        where: { id },
        data: {
          amountMinor: nextAmount,
          categoryId: body.categoryId,
          productId: body.productId,
          budgetId: body.budgetId,
          goalId: body.goalId,
          status: nextStatus,
          counterpartyName: body.counterpartyName,
          dueDate: body.dueDate === undefined ? undefined : body.dueDate ? parseDateOnly(body.dueDate) : null,
          paymentMethod: body.paymentMethod,
          description: body.description,
          merchant: body.merchant,
          note: body.note,
          transactionDate: nextDate,
        },
      });

      if (row.status === "COMPLETED") {
        await applyBalanceEffect(
          tx,
          { accountId: row.accountId, transferToAccountId: row.transferToAccountId, type: row.type, amountMinor: row.amountMinor },
          1,
        );
      }

      return row;
    });

    return serializeTransaction(updated);
  });

  // Creates a real, opposite-direction transaction for the repayment
  // (money actually moving) instead of just flipping loanSettledAt — see
  // schema.prisma's `settledByTransactionId` doc comment. The original
  // loan transaction is never modified beyond linking to the settlement,
  // so it can't be double-counted.
  app.post("/transactions/:id/settle-loan", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ date: dateOnly.optional() }).parse(request.body ?? {});
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }
    if (!existing.loanKind) {
      return reply.status(422).send({ error: "This transaction isn't a Lent/Borrowed record." });
    }
    if (existing.loanSettledAt) {
      return reply.status(409).send({ error: "This loan has already been settled." });
    }

    // LENT was money leaving your wallet (EXPENSE) — repayment brings it
    // back (INCOME). BORROWED was money entering your wallet (INCOME) —
    // repayment sends it back out (EXPENSE).
    const settlementType = existing.loanKind === "LENT" ? "INCOME" : "EXPENSE";
    const settlementDate = body.date ? parseDateOnly(body.date) : new Date();
    const description = existing.counterpartyName
      ? existing.loanKind === "LENT"
        ? `Pago recibido de ${existing.counterpartyName}`
        : `Pago realizado a ${existing.counterpartyName}`
      : existing.loanKind === "LENT"
        ? "Pago de préstamo recibido"
        : "Pago de préstamo realizado";

    const result = await prisma.$transaction(async (tx) => {
      const settlement = await tx.transaction.create({
        data: {
          userId,
          accountId: existing.accountId,
          type: settlementType,
          status: "COMPLETED",
          amountMinor: existing.amountMinor,
          categoryId: existing.categoryId,
          paymentMethod: existing.paymentMethod,
          description,
          counterpartyName: existing.counterpartyName,
          transactionDate: settlementDate,
        },
      });

      await applyBalanceEffect(
        tx,
        { accountId: settlement.accountId, transferToAccountId: null, type: settlementType, amountMinor: settlement.amountMinor },
        1,
      );

      const updatedOriginal = await tx.transaction.update({
        where: { id: existing.id },
        data: { loanSettledAt: new Date(), settledByTransactionId: settlement.id },
      });

      return { settlement, updatedOriginal };
    });

    return {
      original: serializeTransaction(result.updatedOriginal),
      settlement: serializeTransaction(result.settlement),
    };
  });

  app.delete("/transactions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.status === "COMPLETED") {
        await applyBalanceEffect(
          tx,
          {
            accountId: existing.accountId,
            transferToAccountId: existing.transferToAccountId,
            type: existing.type,
            amountMinor: existing.amountMinor,
          },
          -1,
        );
      }
      await tx.transaction.delete({ where: { id } });
    });

    return reply.status(204).send();
  });
}

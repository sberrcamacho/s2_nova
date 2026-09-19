import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { parseDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema } from "../lib/validation.js";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const transactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const transactionStatusEnum = z.enum(["COMPLETED", "PLANNED"]);
const loanKindEnum = z.enum(["LENT", "BORROWED"]);
const dateOnly = dateOnlySchema;

// A transaction's payment method is never chosen by the client — it's
// derived from its wallet's AccountType, so "which wallet" and "how it was
// paid" can never disagree (see schema.prisma's PaymentMethod doc
// comment). CASH/NEQUI/DAVIPLATA wallets carry their own name straight
// across; every card/bank-like wallet (debit, credit, savings, crypto,
// other) reads as an electronic movement, BANK_TRANSFER.
export function paymentMethodForAccountType(
  type: "CASH" | "BANK_DEBIT" | "BANK_CREDIT" | "SAVINGS" | "CRYPTO" | "NEQUI" | "DAVIPLATA" | "OTHER",
): "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "NEQUI" | "DAVIPLATA" {
  switch (type) {
    case "CASH":
      return "CASH";
    case "NEQUI":
      return "NEQUI";
    case "DAVIPLATA":
      return "DAVIPLATA";
    default:
      return "BANK_TRANSFER";
  }
}

const createTransactionSchema = z
  .object({
    accountId: z.string().uuid(),
    transferToAccountId: z.string().uuid().optional(),
    type: transactionTypeEnum,
    status: transactionStatusEnum.default("COMPLETED"),
    amount: z.number().int().positive(),
    categoryId: z.string().uuid(),
    subcategoryId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    budgetId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional(),
    loanKind: loanKindEnum.optional(),
    counterpartyName: z.string().trim().min(1).max(120).optional(),
    dueDate: dateOnly.optional(),
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
  })
  .refine((data) => !data.loanKind || data.type === (data.loanKind === "LENT" ? "EXPENSE" : "INCOME"), {
    message: "loanKind LENT requires type EXPENSE, and BORROWED requires type INCOME.",
    path: ["loanKind"],
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
  subcategoryId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  budgetId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  status: transactionStatusEnum.optional(),
  // Loan edits only — the account a Lent/Borrowed record lives in, and its
  // direction (which flips `type` too: LENT↔EXPENSE, BORROWED↔INCOME). See
  // the PATCH handler below for why this composes safely with the existing
  // reverse-then-reapply balance logic.
  accountId: z.string().uuid().optional(),
  loanKind: loanKindEnum.optional(),
  counterpartyName: z.string().trim().min(1).max(120).nullable().optional(),
  dueDate: dateOnly.nullable().optional(),
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
  subcategoryId: string | null;
  productId: string | null;
  budgetId: string | null;
  goalId: string | null;
  recurringSeriesId: string | null;
  loanKind: string | null;
  counterpartyName: string | null;
  dueDate: Date | null;
  loanSettledAt: Date | null;
  settledByTransactionId: string | null;
  parentLoanId: string | null;
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
    subcategoryId: row.subcategoryId,
    productId: row.productId,
    budgetId: row.budgetId,
    goalId: row.goalId,
    recurringSeriesId: row.recurringSeriesId,
    loanKind: row.loanKind,
    counterpartyName: row.counterpartyName,
    dueDate: row.dueDate,
    loanSettledAt: row.loanSettledAt,
    settledByTransactionId: row.settledByTransactionId,
    parentLoanId: row.parentLoanId,
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

// zod alone can't check the parent/child relationship between two ids, so
// this runs a real lookup: subcategoryId must be a Category row whose
// parentId is exactly the transaction's (possibly just-updated) categoryId.
async function assertValidSubcategory(userId: string, subcategoryId: string, categoryId: string) {
  const subcategory = await prisma.category.findFirst({ where: { id: subcategoryId, OR: [{ userId: null }, { userId }] } });
  if (!subcategory || subcategory.parentId !== categoryId) {
    throw Object.assign(new Error("subcategoryId must be a subcategory of categoryId."), { statusCode: 422 });
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

    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) {
      throw Object.assign(new Error("Unknown or inaccessible account."), { statusCode: 422 });
    }
    if (body.transferToAccountId) await assertOwned(userId, "account", body.transferToAccountId);
    await assertOwned(userId, "category", body.categoryId);
    if (body.budgetId) await assertOwned(userId, "budget", body.budgetId);
    if (body.goalId) await assertOwned(userId, "goal", body.goalId);
    if (body.subcategoryId) await assertValidSubcategory(userId, body.subcategoryId, body.categoryId);

    const paymentMethod = paymentMethodForAccountType(account.type);
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
          subcategoryId: body.subcategoryId ?? null,
          productId: body.productId,
          budgetId: body.budgetId,
          goalId: body.goalId,
          loanKind: body.loanKind,
          counterpartyName: body.counterpartyName,
          dueDate: body.dueDate ? parseDateOnly(body.dueDate) : null,
          paymentMethod,
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
    if (body.accountId) await assertOwned(userId, "account", body.accountId);
    if (body.subcategoryId) {
      await assertValidSubcategory(userId, body.subcategoryId, body.categoryId ?? existing.categoryId);
    }
    if (body.loanKind && !existing.loanKind) {
      return reply.status(422).send({ error: "This transaction isn't a Lent/Borrowed record." });
    }
    // transferToAccountId itself isn't PATCH-able, but accountId is (for
    // loan-record edits) — without this check, patching accountId to equal
    // a TRANSFER's existing (immutable) transferToAccountId would silently
    // net the balance effect to zero (applyBalanceEffect decrements then
    // increments the same account) while still storing a nonsensical
    // same-account transfer.
    if (existing.type === "TRANSFER" && body.accountId && body.accountId === existing.transferToAccountId) {
      return reply.status(422).send({ error: "accountId must differ from this transfer's destination account." });
    }

    const nextAmount = body.amount !== undefined ? BigInt(body.amount) : existing.amountMinor;
    const nextStatus = body.status ?? existing.status;
    const nextDate = body.date ? parseDateOnly(body.date) : existing.transactionDate;
    const nextType = body.loanKind ? (body.loanKind === "LENT" ? "EXPENSE" : "INCOME") : existing.type;

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
          subcategoryId: body.subcategoryId,
          productId: body.productId,
          budgetId: body.budgetId,
          goalId: body.goalId,
          status: nextStatus,
          accountId: body.accountId,
          loanKind: body.loanKind,
          type: nextType,
          counterpartyName: body.counterpartyName,
          dueDate: body.dueDate === undefined ? undefined : body.dueDate ? parseDateOnly(body.dueDate) : null,
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
    const body = z
      .object({ date: dateOnly.optional(), amount: z.number().int().positive().optional(), accountId: z.string().uuid().optional() })
      .parse(request.body ?? {});
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }
    if (!existing.loanKind) {
      return reply.status(422).send({ error: "This transaction isn't a Lent/Borrowed record." });
    }
    // A PLANNED loan was never disbursed/received — it never called
    // applyBalanceEffect, so settling it would still create a real,
    // balance-affecting settlement transaction for money that never
    // actually moved.
    if (existing.status !== "COMPLETED") {
      return reply.status(422).send({ error: "This loan hasn't been confirmed yet — nothing to settle." });
    }
    if (existing.loanSettledAt) {
      return reply.status(409).send({ error: "This loan has already been settled." });
    }
    if (body.accountId) await assertOwned(userId, "account", body.accountId);

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
      // Row-lock the original loan for the duration of this transaction so
      // two concurrent settle-loan calls (e.g. a double-submit) can't both
      // read the same `paidSoFar` before either writes — without this, both
      // could pass the `<= outstanding` check below and jointly overpay.
      // Partial repayments are tracked as their own settlement rows linked
      // by parentLoanId (see schema.prisma) rather than a running "paid"
      // column, so `outstanding` has to be a live sum read under this lock,
      // not something computed once outside the transaction.
      await tx.$queryRaw`SELECT id FROM transactions WHERE id = ${existing.id} FOR UPDATE`;

      const paidSoFar = await tx.transaction.aggregate({
        where: { parentLoanId: existing.id },
        _sum: { amountMinor: true },
      });
      const outstandingMinor = existing.amountMinor - (paidSoFar._sum.amountMinor ?? BigInt(0));
      const amountMinor = body.amount !== undefined ? BigInt(body.amount) : outstandingMinor;
      if (amountMinor <= BigInt(0) || amountMinor > outstandingMinor) {
        throw Object.assign(new Error("Invalid settlement amount."), { statusCode: 422 });
      }
      const isFinalPayment = amountMinor === outstandingMinor;

      const settlement = await tx.transaction.create({
        data: {
          userId,
          accountId: body.accountId ?? existing.accountId,
          type: settlementType,
          status: "COMPLETED",
          amountMinor,
          categoryId: existing.categoryId,
          paymentMethod: existing.paymentMethod,
          description,
          counterpartyName: existing.counterpartyName,
          transactionDate: settlementDate,
          parentLoanId: existing.id,
        },
      });

      await applyBalanceEffect(
        tx,
        { accountId: settlement.accountId, transferToAccountId: null, type: settlementType, amountMinor: settlement.amountMinor },
        1,
      );

      const updatedOriginal = isFinalPayment
        ? await tx.transaction.update({
            where: { id: existing.id },
            data: { loanSettledAt: new Date(), settledByTransactionId: settlement.id },
          })
        : existing;

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

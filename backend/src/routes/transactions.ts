import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { convertMinor, CURRENCY_CODES, fromMinor, rateOn, toMinor } from "../lib/currency.js";
import { addInterval, parseDateOnly } from "../lib/dates.js";
import { loanRepaidMap } from "../lib/loans.js";
import {
  applyBalanceEffect,
  attachmentMetaSelect,
  effectOf,
  serializeTransaction,
  walletCurrencyMap,
} from "../lib/movements.js";
import { prisma } from "../lib/prisma.js";
import { seriesEnded } from "../lib/recurring.js";
import { dateOnlySchema } from "../lib/validation.js";

const transactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const transactionStatusEnum = z.enum(["COMPLETED", "PLANNED"]);
const loanKindEnum = z.enum(["LENT", "BORROWED"]);
const counterpartyKindEnum = z.enum(["EMPLOYER", "CLIENT", "FAMILY", "FRIEND", "OTHER"]);
const currencyEnum = z.enum(CURRENCY_CODES);
const dateOnly = dateOnlySchema;
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm.");
const amountSchema = z.number().positive().max(1e12);

// "Repetir" (NEW_MOVEMENT.md §5): the movement is the first occurrence of a
// new Programado.
const repeatSchema = z.object({
  interval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  // Total number of occurrences including this movement ("Después de" N).
  occurrences: z.number().int().min(2).max(999).optional(),
  endDate: dateOnly.optional(),
  autoConfirm: z.boolean().default(false),
});

// A transaction's payment method is never chosen by the client — it's
// derived from its wallet's AccountType, so "which wallet" and "how it was
// paid" can never disagree (see schema.prisma's PaymentMethod doc
// comment).
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
    // Omitted: PLANNED when the date/time is in the future, else COMPLETED.
    status: transactionStatusEnum.optional(),
    amount: amountSchema,
    // Original currency of `amount`; defaults to the wallet's.
    currency: currencyEnum.optional(),
    // Required except for transfers, which use the reserved transfer node.
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    budgetId: z.string().uuid().optional(),
    customBudgetId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional(),
    loanKind: loanKindEnum.optional(),
    counterpartyName: z.string().trim().min(1).max(120).optional(),
    counterpartyKind: counterpartyKindEnum.optional(),
    dueDate: dateOnly.optional(),
    // "Título (opcional)". Never suggested; may be empty.
    description: z.string().trim().max(200).default(""),
    merchant: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    date: dateOnly,
    time: timeOfDay.optional(),
    repeat: repeatSchema.optional(),
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
  .refine((data) => data.type === "TRANSFER" || Boolean(data.categoryId), {
    message: "categoryId is required.",
    path: ["categoryId"],
  })
  .refine((data) => !data.loanKind || data.type === (data.loanKind === "LENT" ? "EXPENSE" : "INCOME"), {
    message: "loanKind LENT requires type EXPENSE, and BORROWED requires type INCOME.",
    path: ["loanKind"],
  });

// accountId/type/transferToAccountId are fixed at creation, except for the
// loan-record edits below. Loan settlement is POST /:id/settle-loan.
const updateTransactionSchema = z.object({
  amount: amountSchema.optional(),
  currency: currencyEnum.optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  budgetId: z.string().uuid().nullable().optional(),
  customBudgetId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  status: transactionStatusEnum.optional(),
  accountId: z.string().uuid().optional(),
  loanKind: loanKindEnum.optional(),
  counterpartyName: z.string().trim().min(1).max(120).nullable().optional(),
  counterpartyKind: counterpartyKindEnum.nullable().optional(),
  dueDate: dateOnly.nullable().optional(),
  description: z.string().trim().max(200).optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  date: dateOnly.optional(),
  time: timeOfDay.optional(),
});

const listQuerySchema = z.object({
  type: transactionTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  customBudgetId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  loanKind: loanKindEnum.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  data: z.string().min(1), // base64
});

function occurredAtOf(date: string, time: string | undefined): Date {
  return new Date(`${date}T${time ?? "12:00"}:00.000Z`);
}

async function assertOwned(userId: string, table: "account" | "category" | "budget" | "goal", id: string) {
  const scoped = table === "category" ? { id, OR: [{ userId: null }, { userId }] } : { id, userId };
  const row = await (prisma[table] as { findFirst: (args: unknown) => Promise<unknown> }).findFirst({ where: scoped });
  if (!row) {
    throw Object.assign(new Error(`Unknown or inaccessible ${table}.`), { statusCode: 422 });
  }
}

async function assertCustomBudget(userId: string, id: string) {
  const budget = await prisma.budget.findFirst({ where: { id, userId, kind: "CUSTOM" } });
  if (!budget) throw Object.assign(new Error("Unknown custom budget."), { statusCode: 422 });
}

// subcategoryId must be a Category row whose parentId is exactly the
// transaction's (possibly just-updated) categoryId.
async function assertValidSubcategory(userId: string, subcategoryId: string, categoryId: string) {
  const subcategory = await prisma.category.findFirst({ where: { id: subcategoryId, OR: [{ userId: null }, { userId }] } });
  if (!subcategory || subcategory.parentId !== categoryId) {
    throw Object.assign(new Error("subcategoryId must be a subcategory of categoryId."), { statusCode: 422 });
  }
}

// Amount in the movement's currency, and what the wallet moves by when the
// currencies differ (rate of the movement's day, frozen on the row).
async function priced(amount: number, currency: string, walletCurrency: string, day: Date) {
  const amountMinor = toMinor(amount, currency);
  if (currency === walletCurrency) return { amountMinor, fxRate: null, walletAmountMinor: null };
  const rate = await rateOn(currency, walletCurrency, day);
  return { amountMinor, fxRate: rate, walletAmountMinor: convertMinor(amountMinor, currency, walletCurrency, rate) };
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
      budgetId: query.budgetId,
      customBudgetId: query.customBudgetId,
      goalId: query.goalId,
      loanKind: query.loanKind,
    };
    const and: Prisma.TransactionWhereInput[] = [];
    // A parent category also matches its subcategories' movements.
    if (query.categoryId) and.push({ OR: [{ categoryId: query.categoryId }, { subcategoryId: query.categoryId }] });
    if (query.from || query.to) {
      where.transactionDate = {
        gte: query.from ? parseDateOnly(query.from) : undefined,
        lte: query.to ? parseDateOnly(query.to) : undefined,
      };
    }
    // Movimientos' search matches what a row shows: title, note, merchant,
    // "De", category and wallet.
    if (query.search) {
      const contains = { contains: query.search, mode: "insensitive" as const };
      and.push({
        OR: [
          { description: contains },
          { note: contains },
          { merchant: contains },
          { counterpartyName: contains },
          { category: { name: contains } },
          { subcategory: { name: contains } },
          { account: { name: contains } },
          { transferToAccount: { name: contains } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const [rows, currencies] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { attachment: attachmentMetaSelect },
        orderBy: [{ transactionDate: "desc" }, { occurredAt: "desc" }, { createdAt: "desc" }],
        take: query.limit,
        skip: query.offset,
      }),
      walletCurrencyMap(prisma, userId),
    ]);
    const repaid = await loanRepaidMap(rows.filter((row) => row.loanKind).map((row) => row.id));
    return rows.map((row) => serializeTransaction(row, currencies, repaid.get(row.id)));
  });

  app.get("/transactions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const userId = request.userId!;
    const row = await prisma.transaction.findFirst({ where: { id, userId }, include: { attachment: attachmentMetaSelect } });
    if (!row) return reply.status(404).send({ error: "Transaction not found." });
    const repaid = row.loanKind ? await loanRepaidMap([row.id]) : new Map<string, bigint>();
    return serializeTransaction(row, await walletCurrencyMap(prisma, userId), repaid.get(row.id));
  });

  app.post("/transactions", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createTransactionSchema.parse(request.body);
    const userId = request.userId!;

    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) {
      throw Object.assign(new Error("Unknown or inaccessible account."), { statusCode: 422 });
    }
    const destination = body.transferToAccountId
      ? await prisma.account.findFirst({ where: { id: body.transferToAccountId, userId } })
      : null;
    if (body.transferToAccountId && !destination) {
      throw Object.assign(new Error("Unknown or inaccessible account."), { statusCode: 422 });
    }
    const categoryId =
      body.categoryId ?? (await prisma.category.findFirstOrThrow({ where: { userId: null, slug: "transfer" } })).id;
    if (body.categoryId) await assertOwned(userId, "category", body.categoryId);
    if (body.budgetId) await assertOwned(userId, "budget", body.budgetId);
    if (body.customBudgetId) await assertCustomBudget(userId, body.customBudgetId);
    if (body.goalId) await assertOwned(userId, "goal", body.goalId);
    if (body.subcategoryId) await assertValidSubcategory(userId, body.subcategoryId, categoryId);

    const transactionDate = parseDateOnly(body.date);
    const occurredAt = occurredAtOf(body.date, body.time);
    const status = body.status ?? (occurredAt.getTime() > Date.now() ? "PLANNED" : "COMPLETED");

    // A transfer moves the source wallet's currency; the destination
    // receives it converted (stored in walletAmountMinor).
    const currency = body.type === "TRANSFER" ? account.currency : (body.currency ?? account.currency);
    const pricing =
      body.type === "TRANSFER"
        ? await priced(body.amount, currency, destination!.currency, transactionDate)
        : await priced(body.amount, currency, account.currency, transactionDate);

    const created = await prisma.$transaction(async (tx) => {
      let seriesId: string | null = null;
      if (body.repeat && body.type !== "TRANSFER") {
        const next = addInterval(transactionDate, body.repeat.interval);
        const draft = {
          occurrences: body.repeat.occurrences ?? null,
          occurrencesDone: 1,
          endDate: body.repeat.endDate ? parseDateOnly(body.repeat.endDate) : null,
        };
        const series = await tx.recurringSeries.create({
          data: {
            userId,
            name: body.description,
            type: body.type,
            amountMinor: pricing.amountMinor,
            currency,
            accountId: body.accountId,
            categoryId,
            subcategoryId: body.subcategoryId ?? null,
            customBudgetId: body.customBudgetId ?? null,
            note: body.note ?? null,
            counterpartyName: body.counterpartyName ?? null,
            counterpartyKind: body.counterpartyKind ?? null,
            paymentMethod: paymentMethodForAccountType(account.type),
            interval: body.repeat.interval,
            nextOccurrenceDate: next,
            autoConfirm: body.repeat.autoConfirm,
            ...draft,
            active: !seriesEnded(draft, next),
          },
        });
        seriesId = series.id;
      }

      const row = await tx.transaction.create({
        data: {
          userId,
          accountId: body.accountId,
          transferToAccountId: body.transferToAccountId ?? null,
          type: body.type,
          status,
          ...pricing,
          currency,
          categoryId,
          subcategoryId: body.subcategoryId ?? null,
          productId: body.productId,
          budgetId: body.budgetId,
          customBudgetId: body.customBudgetId ?? null,
          goalId: body.goalId,
          recurringSeriesId: seriesId,
          loanKind: body.loanKind,
          counterpartyName: body.counterpartyName,
          counterpartyKind: body.counterpartyKind ?? null,
          dueDate: body.dueDate ? parseDateOnly(body.dueDate) : null,
          paymentMethod: paymentMethodForAccountType(account.type),
          description: body.description,
          merchant: body.merchant,
          note: body.note,
          transactionDate,
          occurredAt,
        },
      });

      if (row.status === "COMPLETED") await applyBalanceEffect(tx, effectOf(row), 1);
      return row;
    });

    reply.status(201);
    return serializeTransaction({ ...created, attachment: null }, await walletCurrencyMap(prisma, userId));
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
    if (body.customBudgetId) await assertCustomBudget(userId, body.customBudgetId);
    if (body.goalId) await assertOwned(userId, "goal", body.goalId);
    if (body.accountId) await assertOwned(userId, "account", body.accountId);
    if (body.subcategoryId) {
      await assertValidSubcategory(userId, body.subcategoryId, body.categoryId ?? existing.categoryId);
    }
    if (body.loanKind && !existing.loanKind) {
      return reply.status(422).send({ error: "This transaction isn't a Lent/Borrowed record." });
    }
    // Patching accountId to equal a TRANSFER's destination would net its
    // balance effect to zero while storing a same-account transfer.
    if (existing.type === "TRANSFER" && body.accountId && body.accountId === existing.transferToAccountId) {
      return reply.status(422).send({ error: "accountId must differ from this transfer's destination account." });
    }

    const nextStatus = body.status ?? existing.status;
    const nextDate = body.date ? parseDateOnly(body.date) : existing.transactionDate;
    const nextType = body.loanKind ? (body.loanKind === "LENT" ? "EXPENSE" : "INCOME") : existing.type;
    const nextAccountId = body.accountId ?? existing.accountId;
    const walletId = existing.type === "TRANSFER" ? existing.transferToAccountId : nextAccountId;
    const wallet = walletId ? await prisma.account.findFirst({ where: { id: walletId, userId } }) : null;
    const currency = existing.type === "TRANSFER" ? existing.currency : (body.currency ?? existing.currency);
    // Re-price when the amount, its currency or the wallet changed.
    const repriced =
      body.amount !== undefined || body.currency !== undefined || body.accountId !== undefined
        ? await priced(body.amount ?? fromMinor(existing.amountMinor, existing.currency), currency, wallet?.currency ?? currency, nextDate)
        : null;
    const occurredAt =
      body.date || body.time
        ? occurredAtOf(
            body.date ?? existing.transactionDate.toISOString().slice(0, 10),
            body.time ?? (existing.occurredAt ?? existing.transactionDate).toISOString().slice(11, 16),
          )
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.status === "COMPLETED") await applyBalanceEffect(tx, effectOf(existing), -1);

      const row = await tx.transaction.update({
        where: { id },
        data: {
          ...(repriced ?? {}),
          currency,
          categoryId: body.categoryId,
          subcategoryId: body.subcategoryId,
          productId: body.productId,
          budgetId: body.budgetId,
          customBudgetId: body.customBudgetId,
          goalId: body.goalId,
          status: nextStatus,
          accountId: body.accountId,
          loanKind: body.loanKind,
          type: nextType,
          counterpartyName: body.counterpartyName,
          counterpartyKind: body.counterpartyKind,
          dueDate: body.dueDate === undefined ? undefined : body.dueDate ? parseDateOnly(body.dueDate) : null,
          description: body.description,
          merchant: body.merchant,
          note: body.note,
          transactionDate: nextDate,
          occurredAt,
        },
        include: { attachment: attachmentMetaSelect },
      });

      if (row.status === "COMPLETED") await applyBalanceEffect(tx, effectOf(row), 1);
      return row;
    });

    const repaid = updated.loanKind ? await loanRepaidMap([updated.id]) : new Map<string, bigint>();
    return serializeTransaction(updated, await walletCurrencyMap(prisma, userId), repaid.get(updated.id));
  });

  // Creates a real, opposite-direction transaction for the repayment
  // (money actually moving) instead of just flipping loanSettledAt — see
  // schema.prisma's `settledByTransactionId` doc comment.
  app.post("/transactions/:id/settle-loan", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({ date: dateOnly.optional(), amount: amountSchema.optional(), accountId: z.string().uuid().optional() })
      .parse(request.body ?? {});
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }
    if (!existing.loanKind) {
      return reply.status(422).send({ error: "This transaction isn't a Lent/Borrowed record." });
    }
    // A PLANNED loan was never disbursed/received — settling it would move
    // money that never moved.
    if (existing.status !== "COMPLETED") {
      return reply.status(422).send({ error: "This loan hasn't been confirmed yet — nothing to settle." });
    }
    if (existing.loanSettledAt) {
      return reply.status(409).send({ error: "This loan has already been settled." });
    }
    if (body.accountId) await assertOwned(userId, "account", body.accountId);
    const settlementAccount = await prisma.account.findFirstOrThrow({ where: { id: body.accountId ?? existing.accountId } });

    // LENT was money leaving your wallet (EXPENSE) — repayment brings it
    // back (INCOME). BORROWED reverses it.
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
      // Row-lock the loan so two concurrent settle-loan calls can't both
      // read the same paid-so-far and jointly overpay.
      await tx.$queryRaw`SELECT id FROM transactions WHERE id = ${existing.id} FOR UPDATE`;

      const paidSoFar = await tx.transaction.aggregate({
        where: { parentLoanId: existing.id },
        _sum: { amountMinor: true },
      });
      const outstandingMinor = existing.amountMinor - (paidSoFar._sum.amountMinor ?? BigInt(0));
      const amountMinor = body.amount !== undefined ? toMinor(body.amount, existing.currency) : outstandingMinor;
      if (amountMinor <= BigInt(0) || amountMinor > outstandingMinor) {
        throw Object.assign(new Error("Invalid settlement amount."), { statusCode: 422 });
      }
      const isFinalPayment = amountMinor === outstandingMinor;
      const foreign = existing.currency !== settlementAccount.currency;
      const fxRate = foreign ? await rateOn(existing.currency, settlementAccount.currency, settlementDate) : null;

      const settlement = await tx.transaction.create({
        data: {
          userId,
          accountId: settlementAccount.id,
          type: settlementType,
          status: "COMPLETED",
          amountMinor,
          currency: existing.currency,
          fxRate,
          walletAmountMinor: foreign ? convertMinor(amountMinor, existing.currency, settlementAccount.currency, fxRate!) : null,
          categoryId: existing.categoryId,
          paymentMethod: existing.paymentMethod,
          description,
          counterpartyName: existing.counterpartyName,
          transactionDate: settlementDate,
          occurredAt: new Date(),
          parentLoanId: existing.id,
        },
      });

      await applyBalanceEffect(tx, effectOf(settlement), 1);

      const updatedOriginal = isFinalPayment
        ? await tx.transaction.update({
            where: { id: existing.id },
            data: { loanSettledAt: new Date(), settledByTransactionId: settlement.id },
          })
        : existing;

      return { settlement, updatedOriginal };
    });

    const repaid = await loanRepaidMap([result.updatedOriginal.id]);
    const currencies = await walletCurrencyMap(prisma, userId);
    return {
      original: serializeTransaction(result.updatedOriginal, currencies, repaid.get(result.updatedOriginal.id)),
      settlement: serializeTransaction(result.settlement, currencies),
    };
  });

  app.delete("/transactions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = z.object({ series: z.enum(["keep", "delete"]).default("keep") }).parse(request.query);
    const userId = request.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({ error: "Transaction not found." });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.status === "COMPLETED") await applyBalanceEffect(tx, effectOf(existing), -1);
      await tx.transaction.delete({ where: { id } });
      // "Eliminar" on a repeating movement also stops its future repetitions.
      if (query.series === "delete" && existing.recurringSeriesId) {
        await tx.recurringSeries.deleteMany({ where: { id: existing.recurringSeriesId, userId } });
      }
    });

    return reply.status(204).send();
  });

  // ---- Comprobante (NEW_MOVEMENT.md §7) -----------------------------------
  // One attachment per movement; PUT replaces it ("Reemplazar").

  app.put(
    "/transactions/:id/attachment",
    { preHandler: app.authenticate, bodyLimit: 15 * 1024 * 1024 },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = attachmentSchema.parse(request.body);
      const userId = request.userId!;
      const existing = await prisma.transaction.findFirst({ where: { id, userId }, select: { id: true } });
      if (!existing) return reply.status(404).send({ error: "Transaction not found." });

      const data = Buffer.from(body.data, "base64");
      if (data.length === 0 || data.length > MAX_ATTACHMENT_BYTES) {
        return reply.status(413).send({ error: "El archivo supera 10 MB." });
      }
      const kind = body.mime === "application/pdf" ? "PDF" : "IMAGE";
      const row = await prisma.attachment.upsert({
        where: { transactionId: id },
        create: { transactionId: id, kind, mime: body.mime, name: body.name, size: data.length, data },
        update: { kind, mime: body.mime, name: body.name, size: data.length, data, createdAt: new Date() },
        select: attachmentMetaSelect.select,
      });
      return row;
    },
  );

  app.get("/transactions/:id/attachment", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const row = await prisma.attachment.findFirst({ where: { transactionId: id, transaction: { userId: request.userId! } } });
    if (!row) return reply.status(404).send({ error: "Attachment not found." });
    reply.header("Content-Type", row.mime);
    reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(row.name)}"`);
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(Buffer.from(row.data));
  });

  app.delete("/transactions/:id/attachment", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.attachment.deleteMany({ where: { transactionId: id, transaction: { userId: request.userId! } } });
    return reply.status(204).send();
  });
}

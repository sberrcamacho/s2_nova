import type { FastifyInstance } from "fastify";
import type { RecurringSeries } from "@prisma/client";
import { z } from "zod";
import { CURRENCY_CODES, fromMinor, toMinor } from "../lib/currency.js";
import { parseDateOnly } from "../lib/dates.js";
import { advanceData, materializeOccurrence, processDueSeries } from "../lib/recurring.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema } from "../lib/validation.js";
import { paymentMethodForAccountType } from "./transactions.js";
import { resolveToday } from "./summary.js";

// Recurring definitions ("Netflix, $45,000/month") — see schema.prisma's
// RecurringSeries doc comment for why this is a separate model from
// Transaction. A series only produces a real Transaction when the client
// explicitly confirms an occurrence (POST /:id/confirm); nothing here runs
// on a timer, so re-opening either app never creates a duplicate.

const intervalEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
const money = z.number().positive().max(1e12);
const seriesTypeEnum = z.enum(["INCOME", "EXPENSE"]);
const dateOnly = dateOnlySchema;

const createSeriesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: seriesTypeEnum,
  amount: money,
  currency: z.enum(CURRENCY_CODES).optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().optional(),
  interval: intervalEnum,
  startDate: dateOnly,
  occurrences: z.number().int().min(1).max(999).nullable().optional(),
  endDate: dateOnly.nullable().optional(),
  autoConfirm: z.boolean().optional(),
});

const updateSeriesSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  type: seriesTypeEnum.optional(),
  amount: money.optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  interval: intervalEnum.optional(),
  nextOccurrenceDate: dateOnly.optional(),
  active: z.boolean().optional(),
  occurrences: z.number().int().min(1).max(999).nullable().optional(),
  endDate: dateOnly.nullable().optional(),
  autoConfirm: z.boolean().optional(),
});

const confirmSchema = z.object({
  date: dateOnly.optional(),
  amount: money.optional(),
});

function serializeSeries(series: RecurringSeries) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return {
    id: series.id,
    name: series.name,
    type: series.type,
    amount: fromMinor(series.amountMinor, series.currency),
    currency: series.currency,
    accountId: series.accountId,
    categoryId: series.categoryId,
    subcategoryId: series.subcategoryId,
    paymentMethod: series.paymentMethod,
    interval: series.interval,
    nextOccurrenceDate: series.nextOccurrenceDate,
    occurrences: series.occurrences,
    occurrencesDone: series.occurrencesDone,
    endDate: series.endDate,
    autoConfirm: series.autoConfirm,
    isDue: series.active && !series.autoConfirm && series.nextOccurrenceDate <= today,
    active: series.active,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };
}

export async function recurringSeriesRoutes(app: FastifyInstance) {
  app.get("/recurring-series", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ today: dateOnly.optional() }).parse(request.query);
    await processDueSeries(request.userId!, resolveToday(query.today));
    const series = await prisma.recurringSeries.findMany({
      where: { userId: request.userId },
      orderBy: { nextOccurrenceDate: "asc" },
    });
    return series.map(serializeSeries);
  });

  app.post("/recurring-series", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createSeriesSchema.parse(request.body);
    const userId = request.userId!;

    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) return reply.status(422).send({ error: "Unknown wallet." });
    const category = await prisma.category.findFirst({ where: { id: body.categoryId, OR: [{ userId: null }, { userId }] } });
    if (!category) return reply.status(422).send({ error: "Unknown category." });

    const series = await prisma.recurringSeries.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        amountMinor: toMinor(body.amount, body.currency ?? account.currency),
        currency: body.currency ?? account.currency,
        accountId: body.accountId,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId ?? null,
        paymentMethod: paymentMethodForAccountType(account.type),
        interval: body.interval,
        nextOccurrenceDate: parseDateOnly(body.startDate),
        occurrences: body.occurrences ?? null,
        endDate: body.endDate ? parseDateOnly(body.endDate) : null,
        autoConfirm: body.autoConfirm ?? false,
      },
    });

    reply.status(201);
    return serializeSeries(series);
  });

  app.patch("/recurring-series/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateSeriesSchema.parse(request.body);
    const userId = request.userId!;

    const existing = await prisma.recurringSeries.findFirst({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ error: "Recurring series not found." });

    // Changing wallet re-derives paymentMethod from the new wallet's type,
    // same as creation — a series' payment method must never disagree with
    // the wallet it's actually on.
    let paymentMethod: ReturnType<typeof paymentMethodForAccountType> | undefined;
    if (body.accountId) {
      const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
      if (!account) return reply.status(422).send({ error: "Unknown wallet." });
      paymentMethod = paymentMethodForAccountType(account.type);
    }
    if (body.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: body.categoryId, OR: [{ userId: null }, { userId }] } });
      if (!category) return reply.status(422).send({ error: "Unknown category." });
    }

    const series = await prisma.recurringSeries.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        amountMinor: body.amount !== undefined ? toMinor(body.amount, body.currency ?? existing.currency) : undefined,
        currency: body.currency,
        accountId: body.accountId,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId,
        occurrences: body.occurrences,
        endDate: body.endDate === undefined ? undefined : body.endDate ? parseDateOnly(body.endDate) : null,
        autoConfirm: body.autoConfirm,
        paymentMethod,
        interval: body.interval,
        nextOccurrenceDate: body.nextOccurrenceDate ? parseDateOnly(body.nextOccurrenceDate) : undefined,
        active: body.active,
      },
    });
    return serializeSeries(series);
  });

  app.delete("/recurring-series/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = await prisma.recurringSeries.findFirst({ where: { id, userId: request.userId } });
    if (!existing) return reply.status(404).send({ error: "Recurring series not found." });

    // Past materialized transactions keep their own history — their
    // recurringSeriesId just goes null (onDelete: SetNull).
    await prisma.recurringSeries.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Materializes the next occurrence as a real, balance-affecting
  // Transaction and advances nextOccurrenceDate — the only place a
  // Transaction is ever created from a series, and only on explicit
  // request (Android calls this from its Recurring screen), never
  // automatically.
  app.post("/recurring-series/:id/confirm", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = confirmSchema.parse(request.body ?? {});
    const userId = request.userId!;

    const series = await prisma.recurringSeries.findFirst({ where: { id, userId } });
    if (!series) return reply.status(404).send({ error: "Recurring series not found." });
    if (!series.active) return reply.status(422).send({ error: "This recurring series is paused." });

    const transactionDate = body.date ? parseDateOnly(body.date) : new Date();
    const amountMinor = body.amount !== undefined ? toMinor(body.amount, series.currency) : series.amountMinor;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await materializeOccurrence(tx, series, transactionDate, amountMinor);
      const updatedSeries = await tx.recurringSeries.update({ where: { id: series.id }, data: advanceData(series) });
      return { transaction, updatedSeries };
    });

    return {
      series: serializeSeries(result.updatedSeries),
      transaction: {
        id: result.transaction.id,
        accountId: result.transaction.accountId,
        type: result.transaction.type,
        amount: fromMinor(result.transaction.amountMinor, result.transaction.currency),
        categoryId: result.transaction.categoryId,
        description: result.transaction.description,
        date: result.transaction.transactionDate,
      },
    };
  });

  // Skips the next occurrence without creating a Transaction — Web's
  // "Omitir esta vez". Advances nextOccurrenceDate by one interval, the same
  // rule confirm uses, so neither client re-implements the date math.
  app.post("/recurring-series/:id/skip", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const series = await prisma.recurringSeries.findFirst({ where: { id, userId: request.userId! } });
    if (!series) return reply.status(404).send({ error: "Recurring series not found." });
    if (!series.active) return reply.status(422).send({ error: "This recurring series is paused." });

    const updated = await prisma.recurringSeries.update({
      where: { id: series.id },
      data: advanceData(series),
    });
    return serializeSeries(updated);
  });
}

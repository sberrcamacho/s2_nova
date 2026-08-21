import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addInterval, parseDateOnly } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";

// Recurring definitions ("Netflix, $45,000/month") — see schema.prisma's
// RecurringSeries doc comment for why this is a separate model from
// Transaction. A series only produces a real Transaction when the client
// explicitly confirms an occurrence (POST /:id/confirm); nothing here runs
// on a timer, so re-opening either app never creates a duplicate.

const intervalEnum = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);
const seriesTypeEnum = z.enum(["INCOME", "EXPENSE"]);
const paymentMethodEnum = z.enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "NEQUI", "DAVIPLATA"]);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSeriesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: seriesTypeEnum,
  amount: z.number().int().positive(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  paymentMethod: paymentMethodEnum.default("BANK_TRANSFER"),
  interval: intervalEnum,
  startDate: dateOnly,
});

const updateSeriesSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  amount: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

const confirmSchema = z.object({
  date: dateOnly.optional(),
  amount: z.number().int().positive().optional(),
});

function serializeSeries(series: {
  id: string;
  name: string;
  type: string;
  amountMinor: bigint;
  accountId: string;
  categoryId: string;
  paymentMethod: string;
  interval: string;
  nextOccurrenceDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return {
    id: series.id,
    name: series.name,
    type: series.type,
    amount: series.amountMinor,
    accountId: series.accountId,
    categoryId: series.categoryId,
    paymentMethod: series.paymentMethod,
    interval: series.interval,
    nextOccurrenceDate: series.nextOccurrenceDate,
    isDue: series.active && series.nextOccurrenceDate <= today,
    active: series.active,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };
}

export async function recurringSeriesRoutes(app: FastifyInstance) {
  app.get("/recurring-series", { preHandler: app.authenticate }, async (request) => {
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
        amountMinor: BigInt(body.amount),
        accountId: body.accountId,
        categoryId: body.categoryId,
        paymentMethod: body.paymentMethod,
        interval: body.interval,
        nextOccurrenceDate: parseDateOnly(body.startDate),
      },
    });

    reply.status(201);
    return serializeSeries(series);
  });

  app.patch("/recurring-series/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateSeriesSchema.parse(request.body);

    const existing = await prisma.recurringSeries.findFirst({ where: { id, userId: request.userId } });
    if (!existing) return reply.status(404).send({ error: "Recurring series not found." });

    const series = await prisma.recurringSeries.update({
      where: { id },
      data: {
        name: body.name,
        amountMinor: body.amount !== undefined ? BigInt(body.amount) : undefined,
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
    const amountMinor = body.amount !== undefined ? BigInt(body.amount) : series.amountMinor;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: series.accountId,
          type: series.type,
          status: "COMPLETED",
          amountMinor,
          categoryId: series.categoryId,
          paymentMethod: series.paymentMethod,
          description: series.name,
          recurringSeriesId: series.id,
          transactionDate,
        },
      });

      if (series.type === "EXPENSE") {
        await tx.account.update({ where: { id: series.accountId }, data: { currentBalanceMinor: { decrement: amountMinor } } });
      } else {
        await tx.account.update({ where: { id: series.accountId }, data: { currentBalanceMinor: { increment: amountMinor } } });
      }

      const updatedSeries = await tx.recurringSeries.update({
        where: { id: series.id },
        data: { nextOccurrenceDate: addInterval(series.nextOccurrenceDate, series.interval as "WEEKLY" | "MONTHLY" | "YEARLY") },
      });

      return { transaction, updatedSeries };
    });

    return {
      series: serializeSeries(result.updatedSeries),
      transaction: {
        id: result.transaction.id,
        accountId: result.transaction.accountId,
        type: result.transaction.type,
        amount: result.transaction.amountMinor,
        categoryId: result.transaction.categoryId,
        description: result.transaction.description,
        date: result.transaction.transactionDate,
      },
    };
  });
}

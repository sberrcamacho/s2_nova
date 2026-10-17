import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { MovementSuggestion } from "@prisma/client";
import { z } from "zod";
import { fromMinor, toMinor } from "../lib/currency.js";
import { prisma } from "../lib/prisma.js";
import { parseNotification } from "../services/notificationParser.js";

// "Registrar desde notificaciones": Android reads a bank or wallet app's
// notification and posts it here; what it reports becomes a suggestion both
// clients list under "Por confirmar" on Inicio. Confirming is an ordinary
// POST /transactions (the user reviews it in the normal form) followed by
// /confirm with the new movement's id. The notification text is parsed and
// dropped, never stored (services/notificationParser.ts).

const NOTIFICATION_RATE_LIMIT = { max: 30, timeWindow: "1 minute" } as const;

const fromNotificationSchema = z.object({
  packageName: z.string().trim().min(1).max(200),
  appLabel: z.string().trim().min(1).max(80),
  title: z.string().max(300).default(""),
  text: z.string().max(1000).default(""),
  postedAt: z.string().datetime(),
  // The wallet the user mapped to that app, if any.
  accountId: z.string().uuid().optional(),
  // "Usar IA para avisos que no reconozca".
  allowAi: z.boolean().default(false),
});

const idParams = z.object({ id: z.string().uuid() });

async function serialize(row: MovementSuggestion, categoryIds: Map<string, string>) {
  return {
    id: row.id,
    sourceApp: row.sourceApp,
    appLabel: row.appLabel,
    type: row.type,
    amount: fromMinor(row.amountMinor, row.currency),
    currency: row.currency,
    merchant: row.merchant,
    categoryId: row.categorySlug ? (categoryIds.get(row.categorySlug) ?? null) : null,
    accountId: row.accountId,
    occurredAt: row.occurredAt.toISOString(),
    status: row.status,
    transactionId: row.transactionId,
    parsedBy: row.parsedBy,
  };
}

// Built-in category ids for the slugs a list of suggestions guessed.
async function categoryIdsFor(rows: MovementSuggestion[]): Promise<Map<string, string>> {
  const slugs = [...new Set(rows.map((r) => r.categorySlug).filter((s): s is string => !!s))];
  if (slugs.length === 0) return new Map();
  const found = await prisma.category.findMany({ where: { userId: null, slug: { in: slugs } }, select: { id: true, slug: true } });
  return new Map(found.map((c) => [c.slug, c.id]));
}

export async function suggestionRoutes(app: FastifyInstance) {
  app.post(
    "/suggestions/from-notification",
    { preHandler: app.authenticate, config: { rateLimit: NOTIFICATION_RATE_LIMIT } },
    async (request, reply) => {
      const body = fromNotificationSchema.parse(request.body);
      const userId = request.userId!;
      const dedupeKey = createHash("sha256").update([body.packageName, body.postedAt, body.title, body.text].join("\u0000")).digest("hex");

      const existing = await prisma.movementSuggestion.findUnique({ where: { userId_dedupeKey: { userId, dedupeKey } } });
      if (existing) return reply.send({ suggestion: await serialize(existing, await categoryIdsFor([existing])) });

      const parsed = await parseNotification({ appLabel: body.appLabel, title: body.title, text: body.text }, { allowAi: body.allowAi });
      if (!parsed) return reply.send({ suggestion: null });

      // Only one of the user's own wallets.
      const account = body.accountId ? await prisma.account.findFirst({ where: { id: body.accountId, userId }, select: { id: true } }) : null;
      const row = await prisma.movementSuggestion.create({
        data: {
          userId,
          sourceApp: body.packageName,
          appLabel: body.appLabel,
          type: parsed.type,
          amountMinor: toMinor(parsed.amount, parsed.currency),
          currency: parsed.currency,
          merchant: parsed.merchant,
          categorySlug: parsed.categorySlug,
          accountId: account?.id ?? null,
          occurredAt: new Date(body.postedAt),
          dedupeKey,
          parsedBy: parsed.parsedBy,
        },
      });
      return reply.status(201).send({ suggestion: await serialize(row, await categoryIdsFor([row])) });
    },
  );

  // "Por confirmar": the pending ones, newest first.
  app.get("/suggestions", { preHandler: app.authenticate }, async (request) => {
    const rows = await prisma.movementSuggestion.findMany({
      where: { userId: request.userId!, status: "PENDING" },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });
    const categoryIds = await categoryIdsFor(rows);
    return Promise.all(rows.map((row) => serialize(row, categoryIds)));
  });

  // The user saved the movement (POST /transactions): link it.
  app.post("/suggestions/:id/confirm", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const { transactionId } = z.object({ transactionId: z.string().uuid() }).parse(request.body);
    const userId = request.userId!;
    const [suggestion, transaction] = await Promise.all([
      prisma.movementSuggestion.findFirst({ where: { id, userId } }),
      prisma.transaction.findFirst({ where: { id: transactionId, userId }, select: { id: true } }),
    ]);
    if (!suggestion || !transaction) return reply.status(404).send({ error: "NotFound", message: "Suggestion or movement not found." });
    if (suggestion.status !== "PENDING") return reply.status(409).send({ error: "Conflict", message: "This suggestion was already handled." });
    const row = await prisma.movementSuggestion.update({ where: { id }, data: { status: "CONFIRMED", transactionId } });
    return serialize(row, await categoryIdsFor([row]));
  });

  app.post("/suggestions/:id/dismiss", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const { count } = await prisma.movementSuggestion.updateMany({ where: { id, userId: request.userId!, status: "PENDING" }, data: { status: "DISMISSED" } });
    if (count === 0) return reply.status(404).send({ error: "NotFound", message: "Suggestion not found." });
    return reply.status(204).send();
  });
}

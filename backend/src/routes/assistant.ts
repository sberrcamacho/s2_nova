import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { INTERNAL_HEADER, INTERNAL_TOKEN } from "../lib/internalRequest.js";
import { prisma } from "../lib/prisma.js";
import { TAXONOMY_NODES } from "../lib/taxonomy.js";
import { AssistantUnavailableError, runAssistant } from "../services/assistant.js";
import { resolveToday } from "./summary.js";

// "Asistente": POST /assistant/messages answers a chat turn from the user's
// own data (services/assistant.ts). The conversation lives on the client;
// nothing is stored here but a per-day message count, the free-tier quota.
// Without GEMINI_API_KEY the assistant is off: /assistant/status says so and
// the clients hide it.

export const ASSISTANT_DAILY_LIMIT = 20;
const ASSISTANT_RATE_LIMIT = { max: 10, timeWindow: "1 minute" } as const;

const messagesSchema = z.object({
  messages: z
    // The user's turns are capped at 2000 characters; the assistant's own
    // replies (up to 1024 output tokens) come back as history and may be longer.
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), text: z.string().trim().min(1).max(2000) }),
        z.object({ role: z.literal("model"), text: z.string().trim().min(1).max(8000) }),
      ]),
    )
    .min(1)
    .max(20)
    .refine((list) => list.at(-1)?.role === "user", { message: "The last message must be the user's." }),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function usedToday(userId: string): Promise<number> {
  const row = await prisma.assistantUsage.findUnique({ where: { userId_day: { userId, day: utcDay(new Date()) } } });
  return row?.count ?? 0;
}

// Category ids in tool results become the names the user sees, in their
// language; a proposal's category name maps back to an id.
async function categoryNames(userId: string, language: "es" | "en") {
  const rows = await prisma.category.findMany({ where: { OR: [{ userId: null }, { userId }] }, select: { id: true, slug: true, name: true, userId: true } });
  const overrides = await prisma.categoryOverride.findMany({ where: { userId }, select: { categoryId: true, name: true } });
  const renamed = new Map(overrides.filter((o) => o.name).map((o) => [o.categoryId, o.name!]));
  const english = new Map(TAXONOMY_NODES.map((n) => [n.id, n.nameEn]));
  const idToName = new Map<string, string>();
  const nameToId = new Map<string, string>();
  for (const row of rows) {
    const own = renamed.get(row.id) ?? (row.userId === null && language === "en" ? (english.get(row.slug) ?? row.name) : row.name);
    idToName.set(row.id, own);
    for (const name of [own, row.name, english.get(row.slug)]) if (name) nameToId.set(name.trim().toLowerCase(), row.id);
  }
  return { idToName, nameToId };
}

function withNames(value: unknown, idToName: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => withNames(v, idToName));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if ((key === "categoryId" || key === "subcategoryId") && typeof v === "string") out[key === "categoryId" ? "category" : "subcategory"] = idToName.get(v) ?? null;
      else out[key] = withNames(v, idToName);
    }
    return out;
  }
  return value;
}

export async function assistantRoutes(app: FastifyInstance) {
  app.get("/assistant/status", { preHandler: app.authenticate }, async (request) => {
    const available = !!env.GEMINI_API_KEY;
    return { available, dailyLimit: ASSISTANT_DAILY_LIMIT, remaining: available ? Math.max(0, ASSISTANT_DAILY_LIMIT - (await usedToday(request.userId!))) : 0 };
  });

  app.post("/assistant/messages", { preHandler: app.authenticate, config: { rateLimit: ASSISTANT_RATE_LIMIT } }, async (request: FastifyRequest, reply) => {
    if (!env.GEMINI_API_KEY) return reply.status(501).send({ error: "NotImplemented", message: "The assistant isn't available." });
    const body = messagesSchema.parse(request.body);
    const userId = request.userId!;
    const day = utcDay(new Date());

    // Count the message first, so parallel requests can't pass the limit.
    const usage = await prisma.assistantUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (usage.count > ASSISTANT_DAILY_LIMIT) {
      return reply.status(429).send({ error: "QuotaExceeded", message: "Daily assistant limit reached.", remaining: 0 });
    }

    const prefs = await prisma.userPreferences.findUnique({ where: { userId }, select: { language: true } });
    const language = prefs?.language === "en" ? "en" : "es";
    const { idToName, nameToId } = await categoryNames(userId, language);
    // Each tool is a GET of this API with the caller's own session.
    const read = async (path: string) => {
      const res = await app.inject({ method: "GET", url: `/api/v1${path}`, headers: { authorization: request.headers.authorization ?? "", [INTERNAL_HEADER]: INTERNAL_TOKEN } });
      if (res.statusCode !== 200) throw new Error(res.json<{ message?: string }>().message ?? `HTTP ${res.statusCode}`);
      return withNames(res.json(), idToName);
    };

    try {
      const today = body.today ?? resolveToday(undefined).toISOString().slice(0, 10);
      const result = await runAssistant(body.messages, { language, today, read });
      return {
        reply: result.reply,
        proposals: result.proposals.map((p) => ({
          type: p.type,
          amount: p.amount,
          description: p.description,
          categoryId: p.category ? (nameToId.get(p.category.trim().toLowerCase()) ?? null) : null,
          date: p.date,
        })),
        remaining: Math.max(0, ASSISTANT_DAILY_LIMIT - usage.count),
      };
    } catch (err) {
      if (err instanceof AssistantUnavailableError) {
        // A failed call doesn't use up the day's quota.
        await prisma.assistantUsage.update({ where: { userId_day: { userId, day } }, data: { count: { decrement: 1 } } });
        return reply.status(503).send({ error: "Unavailable", message: "The assistant couldn't answer right now." });
      }
      throw err;
    }
  });
}

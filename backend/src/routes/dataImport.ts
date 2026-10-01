import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { toMinor } from "../lib/currency.js";
import { parseDateOnly } from "../lib/dates.js";
import { applyBalanceEffect, effectOf } from "../lib/movements.js";
import { prisma } from "../lib/prisma.js";
import { dateOnlySchema } from "../lib/validation.js";
import { paymentMethodForAccountType } from "./transactions.js";

const MAX_ROWS = 500;

// One CSV line as the Web client parses it from the template (fecha, título,
// monto, tipo, categoría, billetera). Names are matched on the server so the
// file can use what the user sees in the app.
const rowSchema = z.object({
  date: dateOnlySchema,
  title: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(1e12),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().max(120).optional(),
  wallet: z.string().trim().min(1).max(120),
});

const importSchema = z.object({
  rows: z.array(z.unknown()).min(1).max(MAX_ROWS),
  dryRun: z.boolean().default(false),
});

// "Alimentación" and "alimentacion " are the same name.
function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

export type RowReport = { row: number; ok: boolean; error?: "invalid" | "wallet" };

// Ajustes › Importar datos (Web): movements from the CSV template. A dry run
// reports every row; the real import is all-or-nothing so a half-imported
// file never has to be untangled.
export async function dataImportRoutes(app: FastifyInstance) {
  app.post(
    "/me/import/transactions",
    { preHandler: app.authenticate, config: { rateLimit: { max: 10, timeWindow: "1 minute" } }, bodyLimit: 2 * 1024 * 1024 },
    async (request, reply) => {
      const body = importSchema.parse(request.body);
      const userId = request.userId!;

      const [accounts, categories] = await Promise.all([
        prisma.account.findMany({ where: { userId } }),
        prisma.category.findMany({ where: { OR: [{ userId: null }, { userId }] } }),
      ]);
      const walletByName = new Map(accounts.map((account) => [normalize(account.name), account]));
      const otherByType = {
        EXPENSE: categories.find((c) => c.userId === null && c.slug === "exp.other"),
        INCOME: categories.find((c) => c.userId === null && c.slug === "inc.other"),
      };

      const reports: RowReport[] = [];
      const parsed: { data: z.infer<typeof rowSchema>; accountId: string; currency: string; accountType: (typeof accounts)[number]["type"]; categoryId: string }[] = [];

      body.rows.forEach((raw, index) => {
        const result = rowSchema.safeParse(raw);
        if (!result.success) return reports.push({ row: index + 1, ok: false, error: "invalid" });
        const data = result.data;
        const account = walletByName.get(normalize(data.wallet));
        if (!account) return reports.push({ row: index + 1, ok: false, error: "wallet" });
        const wanted = data.category ? normalize(data.category) : null;
        const match = wanted
          ? categories.find((c) => normalize(c.name) === wanted && (c.kind === "BOTH" || c.kind === data.type))
          : undefined;
        const categoryId = (match ?? otherByType[data.type])?.id;
        if (!categoryId) return reports.push({ row: index + 1, ok: false, error: "invalid" });
        reports.push({ row: index + 1, ok: true });
        parsed.push({ data, accountId: account.id, currency: account.currency, accountType: account.type, categoryId });
      });

      const invalid = reports.filter((report) => !report.ok).length;
      const summary = { total: reports.length, valid: reports.length - invalid, invalid, rows: reports.filter((r) => !r.ok) };

      if (body.dryRun) return summary;
      if (invalid > 0) return reply.status(422).send({ error: "Some rows are invalid.", ...summary });

      const today = new Date().toISOString().slice(0, 10);
      await prisma.$transaction(
        async (tx) => {
          for (const item of parsed) {
            const { data } = item;
            const row = await tx.transaction.create({
              data: {
                userId,
                accountId: item.accountId,
                type: data.type,
                status: data.date > today ? "PLANNED" : "COMPLETED",
                amountMinor: toMinor(data.amount, item.currency as Parameters<typeof toMinor>[1]),
                currency: item.currency,
                categoryId: item.categoryId,
                paymentMethod: paymentMethodForAccountType(item.accountType),
                description: data.title,
                transactionDate: parseDateOnly(data.date),
                occurredAt: new Date(`${data.date}T12:00:00.000Z`),
              },
            });
            if (row.status === "COMPLETED") await applyBalanceEffect(tx, effectOf(row), 1);
          }
        },
        { timeout: 60_000 },
      );
      return reply.status(201).send({ imported: parsed.length });
    },
  );
}

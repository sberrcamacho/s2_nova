import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { customSlug, VIS_KEYS, visColor } from "../lib/taxonomy.js";

// Ajustes › Categorías (CATEGORY_SYSTEM.md §7b). The taxonomy rows are
// global (userId null, slug = stable dotted id); a user renames, re-icons or
// hides a built-in through CategoryOverride, and creates custom nodes as
// their own rows. The reserved "transfer" row is never listed.

const typeEnum = z.enum(["EXPENSE", "INCOME"]);

const createSchema = z.object({
  type: typeEnum,
  parentId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40),
  icon: z.enum(VIS_KEYS as [string, ...string[]]).optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  icon: z.enum(VIS_KEYS as [string, ...string[]]).optional(),
  hidden: z.boolean().optional(),
});

type Row = Awaited<ReturnType<typeof visibleRows>>[number];

async function visibleRows(userId: string) {
  return prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }], NOT: { slug: "transfer" } },
    include: { overrides: { where: { userId } } },
    orderBy: [{ createdAt: "asc" }],
  });
}

function serialize(row: Row, byId: Map<string, Row>, usage: Map<string, number>) {
  const override = row.overrides[0];
  const parent = row.parentId ? byId.get(row.parentId) : undefined;
  // Subcategories inherit the parent's identity (icon override included).
  const parentIcon = parent ? (parent.overrides[0]?.icon ?? parent.icon) : null;
  const icon = parentIcon ?? override?.icon ?? row.icon;
  return {
    id: row.id,
    slug: row.slug,
    name: override?.name ?? row.name,
    defaultName: row.name,
    icon,
    color: row.isCustom || override?.icon || parentIcon ? visColor(icon) : row.color,
    kind: row.kind,
    parentId: row.parentId,
    isCustom: row.isCustom,
    hidden: override?.hidden ?? false,
    usage: usage.get(row.id) ?? 0,
  };
}

async function usageCounts(userId: string) {
  const [byCategory, bySub] = await Promise.all([
    prisma.transaction.groupBy({ by: ["categoryId"], where: { userId }, _count: { _all: true } }),
    prisma.transaction.groupBy({ by: ["subcategoryId"], where: { userId, subcategoryId: { not: null } }, _count: { _all: true } }),
  ]);
  const usage = new Map<string, number>();
  for (const r of byCategory) usage.set(r.categoryId, r._count._all);
  for (const r of bySub) usage.set(r.subcategoryId!, r._count._all);
  return usage;
}

async function listFor(userId: string) {
  const [rows, usage] = await Promise.all([visibleRows(userId), usageCounts(userId)]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r) => serialize(r, byId, usage));
}

// Names are unique among siblings (built-in names as the user sees them).
async function assertUniqueName(userId: string, kind: "EXPENSE" | "INCOME", parentId: string | null, name: string, exceptId?: string) {
  const siblings = (await listFor(userId)).filter((c) => c.parentId === parentId && c.kind === kind && c.id !== exceptId);
  if (siblings.some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw Object.assign(new Error("Ya existe una categoría con ese nombre."), { statusCode: 409 });
  }
}

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/categories", { preHandler: app.authenticate }, async (request) => listFor(request.userId!));

  app.post("/categories", { preHandler: app.authenticate }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const userId = request.userId!;

    let parent = null;
    if (body.parentId) {
      parent = await prisma.category.findFirst({ where: { id: body.parentId, OR: [{ userId: null }, { userId }] } });
      if (!parent || parent.parentId || parent.kind !== body.type) {
        return reply.status(422).send({ error: "Unknown parent category." });
      }
    }
    await assertUniqueName(userId, body.type, parent?.id ?? null, body.name);

    const base = parent ? parent.slug : body.type === "EXPENSE" ? "exp" : "inc";
    let slug = customSlug(base, body.name);
    for (let i = 2; await prisma.category.findFirst({ where: { slug, OR: [{ userId: null }, { userId }] } }); i++) {
      slug = `${customSlug(base, body.name)}_${i}`;
    }
    const icon = parent ? parent.icon : (body.icon ?? "other");
    const created = await prisma.category.create({
      data: {
        userId,
        parentId: parent?.id ?? null,
        slug,
        name: body.name,
        icon,
        color: parent ? parent.color : visColor(icon),
        kind: body.type,
        isCustom: true,
      },
    });
    reply.status(201);
    return (await listFor(userId)).find((c) => c.id === created.id);
  });

  app.patch("/categories/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateSchema.parse(request.body);
    const userId = request.userId!;

    const row = await prisma.category.findFirst({ where: { id, OR: [{ userId: null }, { userId }] } });
    if (!row || row.slug === "transfer") return reply.status(404).send({ error: "Category not found." });
    if (body.name) await assertUniqueName(userId, row.kind as "EXPENSE" | "INCOME", row.parentId, body.name, row.id);
    // Only parents carry an icon of their own; children inherit it.
    const icon = row.parentId ? undefined : body.icon;

    if (row.isCustom) {
      await prisma.$transaction(async (tx) => {
        await tx.category.update({
          where: { id },
          data: { name: body.name, icon, color: icon ? visColor(icon) : undefined },
        });
        if (icon) await tx.category.updateMany({ where: { parentId: id }, data: { icon, color: visColor(icon) } });
        if (body.hidden !== undefined) {
          await tx.categoryOverride.upsert({
            where: { userId_categoryId: { userId, categoryId: id } },
            create: { userId, categoryId: id, hidden: body.hidden },
            update: { hidden: body.hidden },
          });
        }
      });
    } else {
      // A rename back to the built-in name clears the override.
      const name = body.name === undefined ? undefined : body.name === row.name ? null : body.name;
      const iconOverride = icon === undefined ? undefined : icon === row.icon ? null : icon;
      await prisma.categoryOverride.upsert({
        where: { userId_categoryId: { userId, categoryId: id } },
        create: { userId, categoryId: id, name: name ?? null, icon: iconOverride ?? null, hidden: body.hidden ?? false },
        update: { name, icon: iconOverride, hidden: body.hidden },
      });
    }
    return (await listFor(userId)).find((c) => c.id === id);
  });

  // Custom categories only. Their movements (and budgets) move to the parent
  // for a subcategory, or to "Otros gastos" / "Otros ingresos" for a parent.
  app.delete("/categories/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const userId = request.userId!;
    const row = await prisma.category.findFirst({ where: { id, userId, isCustom: true } });
    if (!row) return reply.status(404).send({ error: "Only custom categories can be deleted." });

    const fallback = await prisma.category.findFirstOrThrow({
      where: { userId: null, slug: row.kind === "INCOME" ? "inc.other" : "exp.other" },
    });
    const children = await prisma.category.findMany({ where: { parentId: id }, select: { id: true } });
    const doomed = [id, ...children.map((c) => c.id)];

    await prisma.$transaction(async (tx) => {
      if (row.parentId) {
        await tx.transaction.updateMany({ where: { userId, subcategoryId: id }, data: { subcategoryId: null } });
        await tx.recurringSeries.updateMany({ where: { userId, subcategoryId: id }, data: { subcategoryId: null } });
        await tx.budget.updateMany({ where: { userId, categoryId: id }, data: { categoryId: row.parentId } });
      } else {
        await tx.transaction.updateMany({ where: { userId, categoryId: id }, data: { categoryId: fallback.id, subcategoryId: null } });
        await tx.recurringSeries.updateMany({ where: { userId, categoryId: id }, data: { categoryId: fallback.id, subcategoryId: null } });
        await tx.budget.updateMany({ where: { userId, categoryId: { in: doomed } }, data: { categoryId: fallback.id } });
        await tx.product.updateMany({ where: { categoryId: { in: doomed } }, data: { categoryId: null } });
      }
      await tx.category.deleteMany({ where: { id: { in: doomed } } });
    });
    return reply.status(204).send();
  });
}

import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function categoryRoutes(app: FastifyInstance) {
  // Global (userId null) + this user's own categories — no user-created
  // categories exist yet (no flow creates them), so today this is just the
  // seeded global list, but the query already supports it.
  app.get("/categories", { preHandler: app.authenticate }, async (request) => {
    const categories = await prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId: request.userId }] },
      orderBy: { name: "asc" },
    });
    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      color: category.color,
      kind: category.kind,
    }));
  });
}

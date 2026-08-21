import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Separate DB-touching check — lets a deploy target probe process
  // liveness (/health) and DB readiness (/health/db) independently.
  app.get("/health/db", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (error) {
      app.log.error(error);
      return reply.status(503).send({ status: "error" });
    }
  });
}

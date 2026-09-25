import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { describeDevice } from "../lib/devices.js";
import { verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { COOKIE_PATH, REFRESH_COOKIE } from "./auth.js";

const ACCOUNT_RATE_LIMIT = { max: 10, timeWindow: "1 minute" } as const;

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// Ajustes › Seguridad (Web): active sessions, what deleting the account
// removes, and the deletion itself.
export async function securityRoutes(app: FastifyInstance) {
  // One row per login session with a live refresh token. The live token is
  // the session's latest rotation, so its createdAt is the last time that
  // device refreshed — close enough to "last active" at a 15-minute access
  // token TTL.
  app.get("/me/sessions", { preHandler: app.authenticate }, async (request) => {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: request.userId!, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { sessionId: true, deviceLabel: true, createdAt: true },
    });

    const seen = new Set<string>();
    const sessions = tokens
      .filter((token) => (seen.has(token.sessionId) ? false : (seen.add(token.sessionId), true)))
      .map((token) => {
        const device = describeDevice(token.deviceLabel);
        return {
          id: token.sessionId,
          device: device.name,
          kind: device.kind,
          lastActiveAt: token.createdAt,
          current: token.sessionId === request.sessionId,
        };
      });

    // "Este dispositivo" leads the list, the rest stay most recent first.
    return sessions.sort((a, b) => Number(b.current) - Number(a.current));
  });

  // Closing the other sessions keeps the caller's own session open.
  app.delete("/me/sessions", { preHandler: app.authenticate }, async (request, reply) => {
    await prisma.refreshToken.updateMany({
      where: {
        userId: request.userId!,
        revokedAt: null,
        ...(request.sessionId ? { sessionId: { not: request.sessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return reply.status(204).send();
  });

  app.delete("/me/sessions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const { count } = await prisma.refreshToken.updateMany({
      where: { userId: request.userId!, sessionId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return reply.status(404).send({ error: "Session not found." });
    return reply.status(204).send();
  });

  // The "Qué se borra" counts on the delete-account screen.
  app.get("/me/footprint", { preHandler: app.authenticate }, async (request) => {
    const userId = request.userId!;
    const [transactions, budgets, goals, loans, wallets, recurringSeries] = await Promise.all([
      prisma.transaction.count({ where: { userId } }),
      prisma.budget.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId, loanKind: { not: null } } }),
      prisma.account.count({ where: { userId } }),
      prisma.recurringSeries.count({ where: { userId } }),
    ]);
    return { transactions, budgets, goals, loans, wallets, recurringSeries };
  });

  // Permanent deletion, confirmed with the current password. Rows that
  // reference categories with ON DELETE RESTRICT go first so the user's
  // cascade never trips over them; everything else cascades from users.
  app.delete(
    "/me",
    { preHandler: app.authenticate, config: { rateLimit: ACCOUNT_RATE_LIMIT } },
    async (request, reply) => {
      const body = deleteAccountSchema.parse(request.body);
      const userId = request.userId!;

      const identity = await prisma.authIdentity.findUnique({
        where: { userId_provider: { userId, provider: "PASSWORD" } },
      });
      if (!identity?.credentialHash) {
        return reply.status(409).send({ error: "Set a password before deleting your account." });
      }
      if (!(await verifyPassword(identity.credentialHash, body.password))) {
        return reply.status(401).send({ error: "Incorrect password." });
      }

      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { userId } }),
        prisma.recurringSeries.deleteMany({ where: { userId } }),
        prisma.budget.deleteMany({ where: { userId } }),
        prisma.goal.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);

      if (request.cookies[REFRESH_COOKIE]) {
        reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      }
      return reply.status(204).send();
    },
  );
}

import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
  }
}

// Every route outside auth/*, health*, and the public product-barcode
// lookup should use this as a preHandler. userId always comes from the
// verified token, never from a client-supplied field — see
// ARCHITECTURE.md §"Security model" / backend/AGENTS.md.
const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", undefined);

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing access token." });
    }

    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      request.userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired access token." });
    }
  });
};

export default fp(authPlugin);

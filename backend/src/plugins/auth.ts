import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { SessionEndedError, assertSessionOpen } from "../lib/sessions.js";
import { verifyAccessToken } from "../lib/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    sessionId?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
  }
}

// A 401 from here always carries a `code`: "token_invalid" (renew the access
// token and retry), or "session_ended"/"session_idle" (the session is over;
// sign out). Any other 401 — e.g. a wrong current password — is the route's
// own answer, and clients must not treat it as an expired session.
//
// Every route outside auth/*, health*, and the public product-barcode
// lookup should use this as a preHandler. userId always comes from the
// verified token, never from a client-supplied field — see
// ARCHITECTURE.md §"Security model" / backend/AGENTS.md.
const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", undefined);
  app.decorateRequest("sessionId", undefined);

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing access token.", code: "token_invalid" });
    }

    let payload;
    try {
      payload = verifyAccessToken(header.slice("Bearer ".length));
    } catch {
      return reply.status(401).send({ error: "Invalid or expired access token.", code: "token_invalid" });
    }
    // Every access token belongs to a login session, and that session must
    // still be open (see lib/sessions.ts).
    if (!payload.sid) return reply.status(401).send({ error: "Invalid or expired access token.", code: "token_invalid" });
    try {
      await assertSessionOpen(payload.sub, payload.sid);
    } catch (error) {
      if (error instanceof SessionEndedError) return reply.status(401).send({ error: "Session ended.", code: error.code });
      throw error;
    }
    request.userId = payload.sub;
    request.sessionId = payload.sid;
  });
};

export default fp(authPlugin);

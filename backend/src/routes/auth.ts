import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { GoogleNotConfiguredError, verifyGoogleIdToken } from "../lib/googleAuth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "../lib/tokens.js";

// Web sends the refresh token as an httpOnly cookie; Android/other native
// clients have no cookie jar, so they send/receive it in the JSON body
// instead. The client declares which mode it wants via this header (there's
// no cookie yet to infer it from at register/login time) — see
// ARCHITECTURE.md §"Google Sign-In flow" / §6 for the rationale.
const REFRESH_COOKIE = "s2nova_refresh";
const COOKIE_PATH = "/api/v1/auth";
const AUTH_RATE_LIMIT = { max: 10, timeWindow: "1 minute" } as const;

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  idToken: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

function isWebClient(request: FastifyRequest): boolean {
  return request.headers["x-client-platform"] === "web";
}

export async function authRoutes(app: FastifyInstance) {
  async function issueSession(
    request: FastifyRequest,
    reply: FastifyReply,
    userId: string,
    opts?: { web?: boolean },
  ) {
    const web = opts?.web ?? isWebClient(request);
    const accessToken = signAccessToken(userId);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        deviceLabel: request.headers["user-agent"]?.toString().slice(0, 255) ?? null,
      },
    });

    if (web) {
      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: COOKIE_PATH,
        expires: expiresAt,
      });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return {
      accessToken,
      ...(web ? {} : { refreshToken }),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  app.post("/auth/register", { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "An account with that email already exists." });
    }

    const credentialHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        authIdentities: { create: { provider: "PASSWORD", credentialHash } },
        preferences: { create: {} },
      },
    });

    reply.status(201);
    return issueSession(request, reply, user.id);
  });

  app.post("/auth/login", { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const email = body.email.toLowerCase();

    const identity = await prisma.authIdentity.findFirst({
      where: { provider: "PASSWORD", user: { email } },
    });

    if (!identity?.credentialHash || !(await verifyPassword(identity.credentialHash, body.password))) {
      return reply.status(401).send({ error: "Invalid email or password." });
    }

    return issueSession(request, reply, identity.userId);
  });

  app.post("/auth/google", { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = googleSchema.parse(request.body);

    let identity;
    try {
      identity = await verifyGoogleIdToken(body.idToken);
    } catch (error) {
      if (error instanceof GoogleNotConfiguredError) {
        return reply.status(501).send({ error: "Google Sign-In is not configured on this server." });
      }
      return reply.status(401).send({ error: "Invalid Google token." });
    }

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider: "GOOGLE", providerUserId: identity.sub } },
    });

    let userId: string;
    if (existingIdentity) {
      userId = existingIdentity.userId;
    } else {
      // A verified Google email matching an existing user links into that
      // user instead of creating a duplicate identity — this is the step
      // the brief requires: the same person never ends up with two
      // accounts just because they used a different sign-in method.
      const linkableUser = identity.emailVerified
        ? await prisma.user.findUnique({ where: { email: identity.email } })
        : null;

      if (linkableUser) {
        await prisma.authIdentity.create({
          data: { userId: linkableUser.id, provider: "GOOGLE", providerUserId: identity.sub },
        });
        userId = linkableUser.id;
      } else {
        const created = await prisma.user.create({
          data: {
            name: identity.name,
            email: identity.email,
            emailVerifiedAt: identity.emailVerified ? new Date() : null,
            authIdentities: { create: { provider: "GOOGLE", providerUserId: identity.sub } },
            preferences: { create: {} },
          },
        });
        userId = created.id;
      }
    }

    return issueSession(request, reply, userId);
  });

  app.post("/auth/refresh", async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE];
    const bodyToken = refreshBodySchema.parse(request.body ?? {}).refreshToken;
    const presentedToken = cookieToken ?? bodyToken;

    if (!presentedToken) {
      return reply.status(401).send({ error: "Missing refresh token." });
    }

    const tokenHash = hashRefreshToken(presentedToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Refresh token is invalid or expired." });
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    return issueSession(request, reply, stored.userId, { web: Boolean(cookieToken) });
  });

  app.post("/auth/logout", async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE];
    const bodyToken = refreshBodySchema.parse(request.body ?? {}).refreshToken;
    const presentedToken = cookieToken ?? bodyToken;

    if (presentedToken) {
      const tokenHash = hashRefreshToken(presentedToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (cookieToken) {
      reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
    }

    return reply.status(204).send();
  });
}

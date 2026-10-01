import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { GoogleNotConfiguredError, verifyGoogleIdToken } from "../lib/googleAuth.js";
import { sendPasswordResetMail } from "../lib/mailer.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { ROTATION_GRACE_MS, SESSION_MAX_AGE_MS, isIdle, revokeSession } from "../lib/sessions.js";
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "../lib/tokens.js";

// Web sends the refresh token as an httpOnly cookie; Android/other native
// clients have no cookie jar, so they send/receive it in the JSON body
// instead. The client declares which mode it wants via this header (there's
// no cookie yet to infer it from at register/login time) — see
// ARCHITECTURE.md §"Google Sign-In flow" / §6 for the rationale.
export const REFRESH_COOKIE = "s2nova_refresh";
export const COOKIE_PATH = "/api/v1/auth";
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

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

// Same rules as Ajustes › Cambiar contraseña: 8+ characters with a number.
const resetPasswordSchema = z.object({
  token: z.string().min(16).max(200),
  newPassword: z.string().min(8).max(200).regex(/\d/, "Must include a number."),
});

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

type Rotation = {
  from: { id: string; sessionId: string; deviceLabel: string | null; sessionStartedAt: Date; lastActivityAt: Date };
};

class RefreshRaceError extends Error {}

const INVALID_REFRESH = { error: "Refresh token is invalid or expired." } as const;

function isWebClient(request: FastifyRequest): boolean {
  return request.headers["x-client-platform"] === "web";
}

export async function authRoutes(app: FastifyInstance) {
  async function issueSession(
    request: FastifyRequest,
    reply: FastifyReply,
    userId: string,
    opts?: { web?: boolean; rotate?: Rotation },
  ) {
    const web = opts?.web ?? isWebClient(request);
    const rotate = opts?.rotate;
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken(
      rotate ? new Date(rotate.from.sessionStartedAt.getTime() + SESSION_MAX_AGE_MS) : undefined,
    );
    const data = {
      userId,
      tokenHash,
      expiresAt,
      deviceLabel: request.headers["user-agent"]?.toString().slice(0, 255) ?? null,
    };

    let sessionId: string;
    if (rotate) {
      // Retiring the presented token and issuing its successor is one
      // transaction, so the session is never without an open token (the
      // auth plugin checks for one) and, of two racing refreshes, only the
      // one that actually retired the token gets a successor.
      const { from } = rotate;
      sessionId = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const { count } = await tx.refreshToken.updateMany({
          where: { id: from.id, revokedAt: null },
          data: { revokedAt: now, rotatedAt: now },
        });
        if (count === 0) throw new RefreshRaceError();
        // A rotation keeps the login's session, device, start and activity.
        const created = await tx.refreshToken.create({
          data: {
            ...data,
            sessionId: from.sessionId,
            deviceLabel: from.deviceLabel,
            sessionStartedAt: from.sessionStartedAt,
            lastActivityAt: from.lastActivityAt,
          },
        });
        return created.sessionId;
      });
    } else {
      // A fresh login starts a new session.
      sessionId = (await prisma.refreshToken.create({ data })).sessionId;
    }
    const accessToken = signAccessToken(userId, sessionId);

    if (web) {
      // Web (GitHub Pages) and the API (Render) are different registrable
      // domains in production, so this is a genuinely cross-site cookie —
      // SameSite=Lax is silently dropped by browsers on cross-site fetch()
      // calls (it only survives top-level navigations), which is why a
      // page reload was landing back on /login instead of restoring the
      // session. SameSite=None (paired with Secure, which browsers
      // require for None) fixes that. Local dev keeps Lax since
      // localhost:8443 and localhost:3000 are same-site (same registrable
      // domain, different port) and don't need it — also, None without
      // Secure would be rejected by the browser over plain http://.
      const crossSite = env.NODE_ENV === "production";
      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: crossSite,
        sameSite: crossSite ? "none" : "lax",
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
        authIdentities: { create: { provider: "PASSWORD", credentialHash, credentialUpdatedAt: new Date() } },
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
        // An UNVERIFIED Google email can't auto-link (see the comment
        // above — anyone can claim an unverified email at Google), but a
        // `users.email` row for it may already exist from a different
        // account. Attempting to INSERT a second user with that same email
        // would hit the column's unique constraint and 500 instead of
        // failing cleanly, so check for it explicitly and reject with 409.
        const emailTaken = await prisma.user.findUnique({ where: { email: identity.email } });
        if (emailTaken) {
          return reply.status(409).send({
            error: "An account with that email already exists. Sign in with your password, or verify this email with Google first.",
          });
        }

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
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { preferences: { select: { autoLockMinutes: true } } } } },
    });

    if (!stored) {
      return reply.status(401).send(INVALID_REFRESH);
    }

    if (stored.revokedAt) {
      // Only a token that was *rotated* can be reused: presenting one well
      // after its successor was issued means either a badly stale client or
      // someone replaying a stolen token, and the standard rotation-reuse
      // mitigation is to treat it as compromise and revoke every active
      // session for this user. Within ROTATION_GRACE_MS it's two requests
      // of the same client racing to refresh — just reject the loser. A
      // token revoked by logout, "Cerrar sesión" or idle timeout is plain
      // rejected: that session is simply over.
      const reused = stored.rotatedAt && Date.now() - stored.rotatedAt.getTime() > ROTATION_GRACE_MS;
      if (reused) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return reply.status(401).send(INVALID_REFRESH);
    }

    if (stored.expiresAt < new Date()) {
      return reply.status(401).send(INVALID_REFRESH);
    }

    // "Cierre automático": a session left idle longer than the user's
    // setting ends here too, even if no client is around to log it out.
    if (isIdle(stored.lastActivityAt, stored.user.preferences?.autoLockMinutes ?? 0)) {
      await revokeSession(stored.sessionId);
      return reply.status(401).send({ error: "Session ended.", code: "session_idle" });
    }

    try {
      return await issueSession(request, reply, stored.userId, { web: Boolean(cookieToken), rotate: { from: stored } });
    } catch (error) {
      if (error instanceof RefreshRaceError) return reply.status(401).send(INVALID_REFRESH);
      throw error;
    }
  });

  // The clients call this (at most once a minute) while the user is
  // interacting, which is what keeps the session clear of "Cierre
  // automático". Background requests don't count as activity.
  app.post("/auth/activity", { preHandler: app.authenticate }, async (request, reply) => {
    await prisma.refreshToken.updateMany({
      where: { sessionId: request.sessionId!, revokedAt: null },
      data: { lastActivityAt: new Date() },
    });
    return reply.status(204).send();
  });

  // "Olvidaste la contraseña": always answers 204 so the endpoint can't be
  // used to find out which emails have an account. The one-time token is
  // mailed; only its hash is stored.
  app.post(
    "/auth/forgot-password",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = forgotPasswordSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (user) {
        const { token, tokenHash } = generateRefreshToken();
        await prisma.$transaction([
          prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
          prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
          }),
        ]);
        const link = `${env.WEB_APP_URL.replace(/\/$/, "")}/restablecer?token=${encodeURIComponent(token)}`;
        try {
          await sendPasswordResetMail({ to: user.email, name: user.name, link, token });
        } catch (error) {
          request.log.error({ err: error }, "password reset email failed");
        }
      }
      return reply.status(204).send();
    },
  );

  // Consumes the emailed token, sets the new password (creating the password
  // identity for a Google-only user) and closes every session.
  app.post(
    "/auth/reset-password",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = resetPasswordSchema.parse(request.body);
      const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashRefreshToken(body.token) } });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return reply.status(400).send({ error: "Reset link is invalid or expired." });
      }

      const credentialHash = await hashPassword(body.newPassword);
      const now = new Date();
      await prisma.$transaction([
        prisma.authIdentity.upsert({
          where: { userId_provider: { userId: record.userId, provider: "PASSWORD" } },
          update: { credentialHash, credentialUpdatedAt: now },
          create: { userId: record.userId, provider: "PASSWORD", credentialHash, credentialUpdatedAt: now },
        }),
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }),
        prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } }),
      ]);
      return reply.status(204).send();
    },
  );

  app.post("/auth/logout", async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE];
    const bodyToken = refreshBodySchema.parse(request.body ?? {}).refreshToken;
    const presentedToken = cookieToken ?? bodyToken;

    // Logging out ends the whole session (every token of that login), so
    // its access token stops working at once too (plugins/auth.ts).
    if (presentedToken) {
      const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(presentedToken) } });
      if (stored) await revokeSession(stored.sessionId);
    }

    if (cookieToken) {
      reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
    }

    return reply.status(204).send();
  });
}

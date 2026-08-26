import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

const ACCOUNT_RATE_LIMIT = { max: 10, timeWindow: "1 minute" } as const;

function serializeMe(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  authIdentities: { provider: string }[];
  preferences: {
    language: string;
    currency: string;
    theme: string;
    notifications: boolean;
    biometricLogin: boolean;
    onboardingCompletedAt: Date | null;
    tutorialCompletedAt: Date | null;
  } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    hasPassword: user.authIdentities.some((identity) => identity.provider === "PASSWORD"),
    preferences: user.preferences
      ? {
          language: user.preferences.language,
          currency: user.preferences.currency,
          theme: user.preferences.theme,
          notifications: user.preferences.notifications,
          biometricLogin: user.preferences.biometricLogin,
          onboardingCompleted: user.preferences.onboardingCompletedAt !== null,
          tutorialCompleted: user.preferences.tutorialCompletedAt !== null,
        }
      : null,
  };
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  currentPassword: z.string().min(1).optional(),
});

const setPasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).max(200),
});

const updatePreferencesSchema = z.object({
  language: z.string().min(2).max(5).optional(),
  currency: z.enum(["COP", "USD"]).optional(),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  notifications: z.boolean().optional(),
  biometricLogin: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  tutorialCompleted: z.boolean().optional(),
});

// First protected routes — GET /me exists since Phase 3 to prove the
// access-token preHandler works end to end. PATCH /me/preferences backs
// onboarding/tutorial completion (and general preference edits) with the
// backend as source of truth, alongside Android's local DataStore flag
// used for the fast/offline splash-time gate check — see
// android/.../data/local/OnboardingStore.kt.
export async function meRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      include: { preferences: true, authIdentities: { where: { provider: "PASSWORD" }, select: { provider: true } } },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    return serializeMe(user);
  });

  // The account model is deliberately minimal — name, email, and login
  // method(s) only (see ARCHITECTURE.md's account-fields decision). Editing
  // name/email requires the current password so a stolen access token
  // alone can't take over the account; a Google-only user (no PASSWORD
  // identity yet) can still rename themselves, but must set a password
  // first (POST /me/password) before they can change their email, since
  // email is otherwise tied to the linked Google identity.
  app.patch(
    "/me",
    { preHandler: app.authenticate, config: { rateLimit: ACCOUNT_RATE_LIMIT } },
    async (request, reply) => {
      const body = updateProfileSchema.parse(request.body);

      if (body.email !== undefined) {
        const passwordIdentity = await prisma.authIdentity.findUnique({
          where: { userId_provider: { userId: request.userId!, provider: "PASSWORD" } },
        });

        if (!passwordIdentity) {
          return reply
            .status(409)
            .send({ error: "Set a password before changing your email." });
        }

        if (!body.currentPassword || !(await verifyPassword(passwordIdentity.credentialHash!, body.currentPassword))) {
          return reply.status(401).send({ error: "Incorrect password." });
        }

        const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (existing && existing.id !== request.userId) {
          return reply.status(409).send({ error: "An account with that email already exists." });
        }
      }

      const user = await prisma.user.update({
        where: { id: request.userId! },
        data: {
          name: body.name,
          email: body.email?.toLowerCase(),
        },
        include: { preferences: true, authIdentities: { where: { provider: "PASSWORD" }, select: { provider: true } } },
      });

      return serializeMe(user);
    },
  );

  // Two modes: an existing PASSWORD identity requires currentPassword to
  // rotate the hash; a Google-only user with no PASSWORD identity yet can
  // set one for the first time without proving an old password (there
  // isn't one). Either way, every other refresh token for this user is
  // revoked afterward — password changes force re-login everywhere,
  // including the device that made the change, which is the simplest
  // correct behavior since this route can't tell which refresh token (if
  // any) belongs to the "current" session.
  app.post(
    "/me/password",
    { preHandler: app.authenticate, config: { rateLimit: ACCOUNT_RATE_LIMIT } },
    async (request, reply) => {
      const body = setPasswordSchema.parse(request.body);

      const existingIdentity = await prisma.authIdentity.findUnique({
        where: { userId_provider: { userId: request.userId!, provider: "PASSWORD" } },
      });

      const newHash = await hashPassword(body.newPassword);

      if (existingIdentity) {
        if (!body.currentPassword || !(await verifyPassword(existingIdentity.credentialHash!, body.currentPassword))) {
          return reply.status(401).send({ error: "Incorrect password." });
        }
        await prisma.authIdentity.update({
          where: { id: existingIdentity.id },
          data: { credentialHash: newHash },
        });
      } else {
        await prisma.authIdentity.create({
          data: { userId: request.userId!, provider: "PASSWORD", credentialHash: newHash },
        });
      }

      await prisma.refreshToken.updateMany({
        where: { userId: request.userId!, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return reply.status(204).send();
    },
  );

  app.patch("/me/preferences", { preHandler: app.authenticate }, async (request, reply) => {
    const body = updatePreferencesSchema.parse(request.body);

    await prisma.userPreferences.upsert({
      where: { userId: request.userId! },
      create: {
        userId: request.userId!,
        language: body.language,
        currency: body.currency,
        theme: body.theme,
        notifications: body.notifications,
        biometricLogin: body.biometricLogin,
        onboardingCompletedAt: body.onboardingCompleted ? new Date() : undefined,
        tutorialCompletedAt: body.tutorialCompleted ? new Date() : undefined,
      },
      update: {
        language: body.language,
        currency: body.currency,
        theme: body.theme,
        notifications: body.notifications,
        biometricLogin: body.biometricLogin,
        onboardingCompletedAt: body.onboardingCompleted === undefined ? undefined : body.onboardingCompleted ? new Date() : null,
        tutorialCompletedAt: body.tutorialCompleted === undefined ? undefined : body.tutorialCompleted ? new Date() : null,
      },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId },
      include: { preferences: true, authIdentities: { where: { provider: "PASSWORD" }, select: { provider: true } } },
    });

    return serializeMe(user);
  });
}

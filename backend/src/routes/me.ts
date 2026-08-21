import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

function serializeMe(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
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
      include: { preferences: true },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    return serializeMe(user);
  });

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
      include: { preferences: true },
    });

    return serializeMe(user);
  });
}

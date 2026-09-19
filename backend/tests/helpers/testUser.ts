import { randomUUID } from "node:crypto";
import { hashPassword } from "../../src/lib/password.js";
import { prisma } from "../../src/lib/prisma.js";
import { signAccessToken } from "../../src/lib/tokens.js";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
}

// Creates a real user + password identity + preferences row directly via
// Prisma and mints a real access token via the same signing function the
// route layer uses — bypasses POST /auth/register on purpose so route
// tests that just need "a logged-in user" don't also spend one of
// /auth/register's rate-limit allowance (see auth.ts's AUTH_RATE_LIMIT).
// Only auth.spec.ts should exercise /auth/register itself.
export async function createTestUser(overrides?: { name?: string; email?: string; password?: string }): Promise<TestUser> {
  const email = overrides?.email ?? `test-${randomUUID()}@example.com`;
  const password = overrides?.password ?? "Test1234";
  const credentialHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: overrides?.name ?? "Test User",
      email,
      authIdentities: { create: { provider: "PASSWORD", credentialHash } },
      preferences: { create: {} },
    },
  });

  return { id: user.id, email, password, accessToken: signAccessToken(user.id) };
}

export function authHeader(user: TestUser): { authorization: string } {
  return { authorization: `Bearer ${user.accessToken}` };
}

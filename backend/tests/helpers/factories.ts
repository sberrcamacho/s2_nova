import { prisma } from "../../src/lib/prisma.js";

// categories are seeded once in globalSetup.ts (matches prisma/seed.ts) and
// never truncated between tests — look one up by slug rather than creating
// a fresh one per test.
export async function categoryBySlug(slug: string) {
  return prisma.category.findUniqueOrThrow({ where: { slug } });
}

export async function createAccount(userId: string, overrides?: { name?: string; type?: string; initialBalanceMinor?: bigint }) {
  return prisma.account.create({
    data: {
      userId,
      name: overrides?.name ?? "Cuenta de prueba",
      type: (overrides?.type ?? "CASH") as never,
      initialBalanceMinor: overrides?.initialBalanceMinor ?? 0n,
      currentBalanceMinor: overrides?.initialBalanceMinor ?? 0n,
    },
  });
}

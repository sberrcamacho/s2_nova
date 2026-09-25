import { prisma } from "../../src/lib/prisma.js";
import taxonomy from "../../src/lib/taxonomy.json" with { type: "json" };

// categories are seeded by the v2 migration (the taxonomy in
// src/lib/taxonomy.json) and never truncated between tests — look one up by
// slug rather than creating a fresh one per test. Legacy slugs ("food",
// "food-groceries") resolve through the taxonomy's CAT_LEGACY map.
export async function categoryBySlug(slug: string) {
  const id = slug.includes(".") || slug === "transfer" ? slug : ((taxonomy.legacy as Record<string, string>)[slug] ?? slug);
  return prisma.category.findFirstOrThrow({ where: { userId: null, slug: id } });
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

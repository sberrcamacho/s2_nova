import { PrismaClient } from "@prisma/client";

// Pool and statement limits, added to DATABASE_URL when it doesn't set
// them already: a request waits at most 20 s for a pooled connection and
// no single query or lock wait can hold one for more than 15 s, so a stuck
// query fails fast instead of leaving the client waiting indefinitely.
export function withPoolLimits(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const defaults: Record<string, string> = {
    connection_limit: "10",
    pool_timeout: "20",
    connect_timeout: "15",
    options: "-c statement_timeout=15000 -c lock_timeout=10000",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

// Single shared client per process, per Prisma's own guidance — avoids
// exhausting Postgres connections under tsx's dev-mode module reloads.
const url = withPoolLimits(process.env.DATABASE_URL);
export const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

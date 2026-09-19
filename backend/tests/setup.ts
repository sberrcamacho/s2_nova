import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";

// Every per-user table a test can write to, truncated before each test so
// no test's data can leak into the next one. Deliberately excludes:
//  - `categories`, seeded once in globalSetup.ts and treated as read-only
//    reference data by every route (see routes/categories.ts).
//  - `users` itself — every test creates its own randomly-emailed user
//    (see helpers/testUser.ts), so leftover rows from other tests can never
//    collide with or leak into a new test's assertions (all queries are
//    scoped by userId). This matters beyond just performance: `categories`
//    has a nullable `user_id` FK to `users`, and a plain `TRUNCATE users
//    CASCADE` cascades into *any* table with an FK to it — including
//    `categories` — deleting the seeded global rows even though their
//    `user_id` is NULL. Truncating only the tables below (all of which
//    reference `users`, never the other way around) avoids that entirely.
const TRUNCATE_TABLES = [
  "refresh_tokens",
  "budget_recommendations",
  "budgets",
  "goals",
  "recurring_series",
  "transactions",
  "accounts",
  "user_preferences",
  "auth_identities",
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TRUNCATE_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

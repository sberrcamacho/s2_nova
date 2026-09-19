import { execSync } from "node:child_process";

const TEST_DATABASE_URL = "postgresql://s2nova:s2nova@localhost:5432/s2nova_test?schema=public";

// Runs once before the whole test run: makes sure the `s2nova_test`
// database exists (separate from local dev's `s2nova`, same Postgres
// container started by `docker compose up -d`), then applies every Prisma
// migration and seeds the global categories against it — the same two
// commands `backend/AGENTS.md` documents for local dev, just pointed at
// the test database via an explicit DATABASE_URL override.
export default async function globalSetup() {
  try {
    execSync(`docker compose exec -T postgres psql -U s2nova -d s2nova -c "CREATE DATABASE s2nova_test"`, {
      stdio: "pipe",
    });
  } catch (error) {
    const message = String((error as { stderr?: Buffer })?.stderr ?? error);
    if (!message.includes("already exists")) {
      console.error(
        "Could not create the s2nova_test database. Is `docker compose up -d` running in backend/?\n" + message,
      );
      throw error;
    }
  }

  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env });
  execSync("pnpm exec prisma db seed", { stdio: "inherit", env });
}

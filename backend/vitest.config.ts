import { defineConfig } from "vitest/config";

// Every test hits the real Fastify app (via app.inject(), no open port)
// backed by a real Postgres test database (see tests/globalSetup.ts) —
// this is an integration suite, not mocked-Prisma unit tests, so it
// exercises the actual route → Zod → Prisma → Postgres path per
// backend/AGENTS.md's own convention of no ad-hoc validation shortcuts.
//
// fileParallelism is off because every test file shares one physical test
// database and truncates shared tables between tests (tests/setup.ts) —
// running files concurrently would let them stomp on each other's data.
export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://s2nova:s2nova@localhost:5432/s2nova_test?schema=public",
      JWT_SECRET: "test-only-secret-do-not-use-in-any-real-environment",
      GOOGLE_CLIENT_IDS: "test-android-client.apps.googleusercontent.com,test-web-client.apps.googleusercontent.com",
      CORS_ORIGINS: "http://localhost:8443",
    },
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
    },
  },
});

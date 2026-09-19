import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";

// One Fastify instance per test file (call from `beforeAll`, close in
// `afterAll`) — this also means each file gets its own in-memory
// @fastify/rate-limit store, so one file's auth-rate-limit test can never
// throttle a different file's tests.
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

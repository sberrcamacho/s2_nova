import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";

describe("GET /api/v1/categories", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the seeded global categories, including subcategories", async () => {
    const user = await createTestUser();
    const res = await app.inject({ method: "GET", url: "/api/v1/categories", headers: authHeader(user) });
    expect(res.statusCode).toBe(200);
    const categories = res.json() as { slug: string; parentId: string | null }[];
    expect(categories.length).toBeGreaterThanOrEqual(40);
    expect(categories.some((c) => c.slug === "food" && c.parentId === null)).toBe(true);
    expect(categories.some((c) => c.slug === "food-groceries" && c.parentId !== null)).toBe(true);
  });

  it("returns 401 without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/categories" });
    expect(res.statusCode).toBe(401);
  });
});

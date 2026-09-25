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
    expect(categories.some((c) => c.slug === "exp.food" && c.parentId === null)).toBe(true);
    expect(categories.some((c) => c.slug === "exp.food.groceries" && c.parentId !== null)).toBe(true);
    expect(categories.some((c) => c.slug === "transfer")).toBe(false);
  });

  it("creates, renames, hides and deletes categories (Ajustes › Categorías)", async () => {
    const user = await createTestUser();
    const headers = authHeader(user);
    const list = (await app.inject({ method: "GET", url: "/api/v1/categories", headers })).json() as { id: string; slug: string }[];
    const food = list.find((c) => c.slug === "exp.food")!;

    const sub = await app.inject({ method: "POST", url: "/api/v1/categories", headers, payload: { type: "EXPENSE", parentId: food.id, name: "Brunch" } });
    expect(sub.statusCode).toBe(201);
    expect(sub.json()).toMatchObject({ slug: "exp.food.u_brunch", isCustom: true, icon: "food" });

    const dup = await app.inject({ method: "POST", url: "/api/v1/categories", headers, payload: { type: "EXPENSE", parentId: food.id, name: "mercado" } });
    expect(dup.statusCode).toBe(409);

    const renamed = await app.inject({ method: "PATCH", url: `/api/v1/categories/${food.id}`, headers, payload: { name: "Comida", hidden: true } });
    expect(renamed.json()).toMatchObject({ name: "Comida", defaultName: "Alimentación", hidden: true, slug: "exp.food" });

    const builtIn = await app.inject({ method: "DELETE", url: `/api/v1/categories/${food.id}`, headers });
    expect(builtIn.statusCode).toBe(404);
    const custom = await app.inject({ method: "DELETE", url: `/api/v1/categories/${sub.json().id}`, headers });
    expect(custom.statusCode).toBe(204);

    const other = await createTestUser();
    const theirs = (await app.inject({ method: "GET", url: "/api/v1/categories", headers: authHeader(other) })).json() as { slug: string; name: string }[];
    expect(theirs.find((c) => c.slug === "exp.food")!.name).toBe("Alimentación");
  });

  it("returns 401 without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/categories" });
    expect(res.statusCode).toBe(401);
  });
});

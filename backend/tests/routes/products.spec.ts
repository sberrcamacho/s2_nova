import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/lib/prisma.js";
import { guessCategorySlug, parseAiAnswer } from "../../src/services/productLookup.js";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("products (scanner catalog)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/products/7702004001234" });
    expect(res.statusCode).toBe(401);
  });

  it("serves a known product from the local table without any external call", async () => {
    const user = await createTestUser();
    const code = `770${Date.now()}`.slice(0, 13);
    await prisma.product.create({ data: { barcode: code, name: "Local", brand: "Marca", description: "seed" } });
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await app.inject({ method: "GET", url: `/api/v1/products/${code}`, headers: authHeader(user) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ barcode: code, name: "Local", source: "seed" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("falls through a failing provider, caches the first external hit and then serves it locally", async () => {
    const user = await createTestUser();
    const code = `${Date.now()}`.slice(-13).padStart(13, "9");
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("openfoodfacts")) throw new Error("timeout");
      if (url.includes("openbeautyfacts")) return json({ status: 1, product: { product_name: "Jabón Test", brands: "Marca X, Otra", categories_tags: ["en:soaps"] } });
      return json({ status: 0 });
    });
    const first = await app.inject({ method: "GET", url: `/api/v1/products/${code}`, headers: authHeader(user) });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ barcode: code, name: "Jabón Test", brand: "Marca X", source: "openbeautyfacts" });
    const calls = spy.mock.calls.length;
    const second = await app.inject({ method: "GET", url: `/api/v1/products/${code}`, headers: authHeader(user) });
    expect(second.json().id).toBe(first.json().id);
    expect(spy.mock.calls.length).toBe(calls);
  });

  it("returns 404 when no database knows the code, and never calls out for non-numeric QR payloads", async () => {
    const user = await createTestUser();
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ status: 0, items: [] }));
    const unknown = await app.inject({ method: "GET", url: "/api/v1/products/0000000000017", headers: authHeader(user) });
    expect(unknown.statusCode).toBe(404);
    spy.mockClear();
    const qr = await app.inject({ method: "GET", url: `/api/v1/products/${encodeURIComponent("https://example.com/p/1")}`, headers: authHeader(user) });
    expect(qr.statusCode).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns a product by id", async () => {
    const user = await createTestUser();
    const headers = authHeader(user);
    const created = await prisma.product.create({ data: { barcode: `id-${Date.now()}`, name: "Por id", description: "seed" } });
    const res = await app.inject({ method: "GET", url: `/api/v1/products/id/${created.id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Por id");
    const missing = await app.inject({ method: "GET", url: "/api/v1/products/id/00000000-0000-4000-8000-000000000000", headers });
    expect(missing.statusCode).toBe(404);
  });

  it("parses AI answers and rejects unconfirmed ones", () => {
    expect(parseAiAnswer('```json\n{"found": true, "name": "Galletas Saltín 300g", "brand": "Noel", "category": "snack"}\n```')).toMatchObject({
      name: "Galletas Saltín 300g",
      brand: "Noel",
      hints: ["snack"],
    });
    expect(parseAiAnswer('{"found": false}')).toBeNull();
    expect(parseAiAnswer("No sé qué producto es")).toBeNull();
  });

  it("maps provider category hints to taxonomy slugs", () => {
    expect(guessCategorySlug(["en:beverages"])).toBe("exp.food");
    expect(guessCategorySlug(["en:soaps"])).toBe("exp.health");
    expect(guessCategorySlug([])).toBe("exp.other");
  });
});

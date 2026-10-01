import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { lookupProduct, productSelect, serializeProduct } from "../services/productLookup.js";

// Scanner product catalog (ARCHITECTURE.md §11). Global, not per-user: the
// same barcode is the same product for everyone.

const codeSchema = z.string().trim().min(1).max(200);

export async function productRoutes(app: FastifyInstance) {
  // The product linked to a movement (Movimientos detail on Web).
  app.get("/products/id/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const row = await prisma.product.findUnique({ where: { id }, select: productSelect });
    if (!row) return reply.status(404).send({ error: "Product not found." });
    return serializeProduct(row);
  });

  // Barcode (EAN/UPC) or QR payload -> product; 404 when no database knows it.
  app.get("/products/:code", { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = z.object({ code: codeSchema }).parse(request.params);
    const product = await lookupProduct(code);
    if (!product) return reply.status(404).send({ error: "Product not found." });
    return product;
  });
}

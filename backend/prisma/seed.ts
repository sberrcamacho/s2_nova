// Seeds (or refreshes) the global category taxonomy every user sees, from
// src/lib/taxonomy.json — generated from design_handoff_s2_nova_v2/
// s2-categories.js by scripts/gen-taxonomy.mjs. The v2 migration already
// inserts these rows; this keeps names/colors in sync after a taxonomy
// change. `slug` is the node's stable dotted id.
import { readFileSync } from "node:fs";
import { PrismaClient, CategoryKind } from "@prisma/client";

const prisma = new PrismaClient();
const taxonomy = JSON.parse(readFileSync(new URL("../src/lib/taxonomy.json", import.meta.url), "utf8")) as {
  nodes: { id: string; type: "expense" | "income"; parentId: string | null; name: string; vis: string; color: string }[];
};

async function upsert(slug: string, data: { name: string; icon: string; color: string; kind: CategoryKind; parentId: string | null }) {
  const existing = await prisma.category.findFirst({ where: { userId: null, slug } });
  if (existing) return prisma.category.update({ where: { id: existing.id }, data });
  return prisma.category.create({ data: { slug, ...data } });
}

async function main() {
  const ids = new Map<string, string>();
  const kind = (t: string) => (t === "income" ? CategoryKind.INCOME : CategoryKind.EXPENSE);
  for (const node of taxonomy.nodes.filter((n) => !n.parentId)) {
    const row = await upsert(node.id, { name: node.name, icon: node.vis, color: node.color, kind: kind(node.type), parentId: null });
    ids.set(node.id, row.id);
  }
  for (const node of taxonomy.nodes.filter((n) => n.parentId)) {
    await upsert(node.id, { name: node.name, icon: node.vis, color: node.color, kind: kind(node.type), parentId: ids.get(node.parentId!)! });
  }
  await upsert("transfer", { name: "Transferencia", icon: "transfer", color: "#6c5ce7", kind: CategoryKind.BOTH, parentId: null });
  console.log(`Seeded ${taxonomy.nodes.length} taxonomy nodes.`);
  await seedProducts();
}

// Demo/offline fallback for the scanner: these barcodes always resolve even
// without internet. Everything else is looked up in public product databases
// and cached on first scan (src/services/productLookup.ts).
const DEMO_PRODUCTS: [barcode: string, name: string, brand: string, slug: string][] = [
  ["7702004001234", "Leche Entera 1L", "Alquería", "exp.food"],
  ["7702004005678", "Huevos AA x30", "Kikes", "exp.food"],
  ["7702090011452", "Arroz Diana x1000g", "Diana", "exp.food"],
  ["7702025105891", "Coca-Cola 1.5L", "Coca-Cola", "exp.food"],
  ["7702025400391", "Bon Yourt Fresa 200g", "Alpina", "exp.food"],
  ["7702011014322", "Pan Tajado Blanco", "Bimbo", "exp.food"],
  ["7702870005416", "Café Molido 500g", "Juan Valdez", "exp.food"],
  ["7501234567895", "Papas Margarita 150g", "Margarita", "exp.food"],
  ["7702285001129", "Jabón en Barra x3", "Protex", "exp.health"],
  ["7891024137459", "Crema Dental 90g", "Colgate", "exp.health"],
  ["7702180000456", "Acetaminofén 500mg x20", "MK", "exp.health"],
  ["7702112233445", "Detergente Líquido 1L", "Fab", "exp.shopping"],
  ["7501055363437", "Cuaderno Cuadriculado 100h", "Norma", "exp.education"],
  ["7702123456780", "Audífonos Bluetooth", "JBL", "exp.shopping"],
  ["7896004000123", "Gaseosa Postobón 1.5L", "Postobón", "exp.food"],
  ["5449000000996", "Coca-Cola 330ml", "Coca-Cola", "exp.food"],
  ["3017620422003", "Nutella 400g", "Ferrero", "exp.food"],
];

async function seedProducts() {
  for (const [barcode, name, brand, slug] of DEMO_PRODUCTS) {
    const category = await prisma.category.findFirst({ where: { userId: null, slug }, select: { id: true } });
    await prisma.product.upsert({
      where: { barcode },
      create: { barcode, name, brand, categoryId: category?.id ?? null, description: "seed" },
      update: { name, brand, categoryId: category?.id ?? null },
    });
  }
  console.log(`Seeded ${DEMO_PRODUCTS.length} demo products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

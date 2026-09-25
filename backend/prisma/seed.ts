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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

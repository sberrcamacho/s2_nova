// Generates the platform copies of the category taxonomy and plan icons from
// the canonical design_handoff_s2_nova_v2/s2-categories.js (CATEGORY_SYSTEM.md
// §7 "Regenerate client modules whenever s2-categories.js changes").
//
//   node scripts/gen-taxonomy.mjs
//
// Writes the same JSON to backend, web and android. IDs never change.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "design_handoff_s2_nova_v2/s2-categories.js"), "utf8");
const data = new Function(
  `${source}\nreturn { CAT_VIS, CAT_NODES, CAT_TRANSFER, CAT_LEGACY, CAT_KEYWORDS, PLAN_ICONS };`,
)();

const out = {
  sourceHash: createHash("sha256").update(source).digest("hex").slice(0, 16),
  vis: Object.fromEntries(Object.entries(data.CAT_VIS).map(([k, [color, glyph]]) => [k, { color, glyph }])),
  nodes: data.CAT_NODES.filter((n) => n.type !== "goal").map((n) => ({
    id: n.id,
    type: n.type,
    parentId: n.parentId,
    name: n.name,
    vis: n.vis,
    color: n.color,
    glyph: n.glyph,
  })),
  transfer: { id: "transfer", name: data.CAT_TRANSFER.name, color: data.CAT_TRANSFER.color, glyph: data.CAT_TRANSFER.glyph },
  legacy: data.CAT_LEGACY,
  keywords: { expense: data.CAT_KEYWORDS.expense, income: data.CAT_KEYWORDS.income },
  planIcons: data.PLAN_ICONS.map((p) => ({ key: p.key, name: p.name, kw: p.kw, color: p.color, glyph: p.glyph })),
};

const json = JSON.stringify(out, null, 1) + "\n";
const targets = [
  "backend/src/lib/taxonomy.json",
  "web/src/lib/taxonomy.json",
  "android/app/src/main/assets/taxonomy.json",
];
for (const t of targets) writeFileSync(resolve(root, t), json);
console.log(`taxonomy ${out.sourceHash}: ${out.nodes.length} nodes, ${out.planIcons.length} plan icons → ${targets.join(", ")}`);

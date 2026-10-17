import taxonomy from "./taxonomy.json" with { type: "json" };

// The unified category taxonomy and plan icons, generated from
// design_handoff_s2_nova_v2/s2-categories.js by scripts/gen-taxonomy.mjs
// (never edit taxonomy.json by hand). Category rows store the node id in
// `slug`; see CATEGORY_SYSTEM.md.

export interface TaxonomyNode {
  id: string;
  type: "expense" | "income";
  parentId: string | null;
  name: string;
  nameEn: string;
  vis: string;
  color: string;
}

export const TAXONOMY_NODES = taxonomy.nodes as TaxonomyNode[];
export const VIS_KEYS = Object.keys(taxonomy.vis);
export const PLAN_ICON_KEYS = taxonomy.planIcons.map((p) => p.key);
export const TRANSFER_SLUG = "transfer";

export function visColor(vis: string): string {
  return (taxonomy.vis as Record<string, { color: string }>)[vis]?.color ?? taxonomy.vis.other.color;
}

// First keyword hit wins; null when nothing matches (PLANS.md §1).
export function guessPlanIcon(text: string): string | null {
  const n = text.toLowerCase();
  if (!n.trim()) return null;
  return taxonomy.planIcons.find((p) => p.kw.some((k) => n.includes(k)))?.key ?? null;
}

// Custom node id: "<parent id>.u_<slug>" or "<exp|inc>.u_<slug>".
export function customSlug(base: string, name: string): string {
  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "custom";
  return `${base}.u_${slug}`;
}

// Built-in category slugs whose English name contains `text` (case and
// accents ignored), so Movimientos' search finds "Groceries" in an English
// session: the rows store the Spanish name, and a suggested title is the
// category's name in whichever language it was saved.
export function slugsMatchingEnglish(text: string): string[] {
  const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const needle = fold(text);
  return TAXONOMY_NODES.filter((n) => fold(n.nameEn).includes(needle)).map((n) => n.id);
}

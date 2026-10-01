import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

// Barcode / QR product lookup (ARCHITECTURE.md §11). Products are global:
// the local table is tried first, then public product databases in order.
// The first external hit is cached into `Product`, so the next scan of the
// same code is served locally. One provider failing or timing out never
// breaks the scan — it just falls through to the next one.

export interface ExternalProduct {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  // Free-form provider category hints (tags, names) used for slug mapping.
  hints: string[];
}

export interface ProductProvider {
  name: string;
  timeoutMs?: number;
  fetch(code: string, signal: AbortSignal): Promise<ExternalProduct | null>;
}

const TIMEOUT_MS = 3000;
const USER_AGENT = "S2Nova/1.0 (personal finance app)";

// Open Food/Beauty/Products/Pet Food Facts share the same v2 API.
function openFacts(name: string, host: string): ProductProvider {
  return {
    name,
    async fetch(code, signal) {
      const url = `https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,categories_tags,image_front_small_url`;
      const res = await fetch(url, { signal, headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          product_name_es?: string;
          brands?: string;
          categories_tags?: string[];
          image_front_small_url?: string;
        };
      };
      const p = body.product;
      const title = (p?.product_name_es || p?.product_name || "").trim();
      if (body.status !== 1 || !title) return null;
      return {
        name: title,
        brand: p?.brands?.split(",")[0]?.trim() || null,
        imageUrl: p?.image_front_small_url || null,
        hints: p?.categories_tags ?? [],
      };
    },
  };
}

const upcItemDb: ProductProvider = {
  name: "upcitemdb",
  async fetch(code, signal) {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`, {
      signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: { title?: string; brand?: string; category?: string; images?: string[] }[] };
    const item = body.items?.[0];
    if (!item?.title) return null;
    return {
      name: item.title.trim(),
      brand: item.brand?.trim() || null,
      imageUrl: item.images?.[0] ?? null,
      hints: item.category ? [item.category] : [],
    };
  },
};

// Last resort: an AI with web search identifies the product from its code when
// no database has it. Each provider only runs when its API key is configured
// and only trusts an answer the model marks as found.
const aiPrompt = (code: string) =>
  `Identify the retail product with barcode (EAN/UPC/GTIN) ${code}. Search the web for it. ` +
  `Reply with ONLY a JSON object: {"found": boolean, "name": string, "brand": string, "category": string}. ` +
  `"name" is the product name as sold, with size/quantity; "category" is a short generic word (e.g. beverage, snack, soap, electronics). ` +
  `If you cannot confirm the product from a source, answer {"found": false}. Never guess.`;

export function parseAiAnswer(text: string): ExternalProduct | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const out = JSON.parse(match[0]) as { found?: boolean; name?: string; brand?: string; category?: string };
  if (!out.found || !out.name?.trim()) return null;
  return { name: out.name.trim(), brand: out.brand?.trim() || null, imageUrl: null, hints: out.category ? [out.category] : [] };
}

const geminiIdentify: ProductProvider = {
  name: "gemini",
  timeoutMs: 25000,
  async fetch(code, signal) {
    if (!env.GEMINI_API_KEY) return null;
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt(code) }] }], tools: [{ google_search: {} }] }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return parseAiAnswer((body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join(""));
  },
};

const claudeIdentify: ProductProvider = {
  name: "claude",
  timeoutMs: 25000,
  async fetch(code, signal) {
    if (!env.ANTHROPIC_API_KEY) return null;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: aiPrompt(code) }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    return parseAiAnswer((body.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join(""));
  },
};

// Order matters: food first (the common supermarket case), the rate-limited
// trial API last. Append more providers here.
export const PROVIDERS: ProductProvider[] = [
  openFacts("openfoodfacts", "world.openfoodfacts.org"),
  openFacts("openbeautyfacts", "world.openbeautyfacts.org"),
  openFacts("openproductsfacts", "world.openproductsfacts.org"),
  openFacts("openpetfoodfacts", "world.openpetfoodfacts.org"),
  upcItemDb,
  geminiIdentify,
  claudeIdentify,
];

// Keyword -> taxonomy slug (src/lib/taxonomy.json). First match wins.
const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/beverage|bebida|drink|snack|food|aliment|dairy|l[aá]cteo|meat|carne|fruit|fruta|cereal|bread|pan\b|sauce|salsa|chocolate|candy|dulce|galleta|biscuit|coffee|caf[eé]|tea\b|agua|water|juice|jugo|pasta|rice|arroz|oil|aceite/i, "exp.food"],
  [/beauty|cosmetic|hygiene|higiene|health|salud|shampoo|soap|jab[oó]n|cream|crema|medic|vitamin|toothpaste|dental/i, "exp.health"],
  [/baby|infant|beb[eé]|diaper|pa[nñ]al|pet|mascota|dog|cat\b/i, "exp.family"],
  [/clean|limpieza|detergent|electronic|electr[oó]nic|cloth|ropa|toy|juguete|home|hogar|tool|herramienta/i, "exp.shopping"],
];

export function guessCategorySlug(hints: string[]): string {
  const text = hints.join(" ");
  return CATEGORY_KEYWORDS.find(([re]) => re.test(text))?.[1] ?? "exp.other";
}

async function categoryIdForSlug(slug: string): Promise<string | null> {
  const row = await prisma.category.findFirst({ where: { userId: null, slug }, select: { id: true } });
  return row?.id ?? null;
}

export const productSelect = {
  id: true,
  barcode: true,
  name: true,
  brand: true,
  categoryId: true,
  imageUrl: true,
  description: true,
} as const;

export type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  description: string | null;
};

// `description` stores the provider name for cached rows ("source" in the API).
export function serializeProduct(row: ProductRow) {
  const { description, ...rest } = row;
  return { ...rest, source: description ?? "user" };
}

export async function lookupProduct(rawCode: string, providers: ProductProvider[] = PROVIDERS) {
  const code = rawCode.trim();
  const local = await prisma.product.findUnique({ where: { barcode: code }, select: productSelect });
  if (local) return serializeProduct(local);

  // Only numeric product codes mean something to the public databases; a QR
  // payload (URL, free text) is only ever found locally or user-created.
  if (!/^\d{6,14}$/.test(code)) return null;

  for (const provider of providers) {
    try {
      const found = await provider.fetch(code, AbortSignal.timeout(provider.timeoutMs ?? TIMEOUT_MS));
      if (!found) continue;
      const categoryId = await categoryIdForSlug(guessCategorySlug(found.hints));
      // upsert: two concurrent scans of the same new code must not collide.
      const row = await prisma.product.upsert({
        where: { barcode: code },
        create: { barcode: code, name: found.name, brand: found.brand, imageUrl: found.imageUrl, categoryId, description: provider.name },
        update: {},
        select: productSelect,
      });
      return serializeProduct(row);
    } catch {
      // Timeout / network / bad JSON: try the next provider.
    }
  }
  return null;
}

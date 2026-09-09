// Seeds the global (user_id = null) categories every user sees, matching
// web/src/data/categories.ts and android's MockCategories.kt exactly so a
// later client migration (ARCHITECTURE.md §9/§8) can map today's hardcoded
// CategoryId values onto these rows by `slug` with no data loss.
import { PrismaClient, CategoryKind } from "@prisma/client";

const prisma = new PrismaClient();

const categories: { slug: string; name: string; icon: string; color: string; kind: CategoryKind }[] = [
  { slug: "food", name: "Alimentación", icon: "UtensilsCrossed", color: "#E8A23D", kind: CategoryKind.EXPENSE },
  { slug: "transportation", name: "Transporte", icon: "Car", color: "#3D8BE8", kind: CategoryKind.EXPENSE },
  { slug: "shopping", name: "Compras", icon: "ShoppingBag", color: "#3DBBA8", kind: CategoryKind.EXPENSE },
  { slug: "health", name: "Salud", icon: "HeartPulse", color: "#E85D6B", kind: CategoryKind.EXPENSE },
  { slug: "education", name: "Educación", icon: "GraduationCap", color: "#5D6BE8", kind: CategoryKind.EXPENSE },
  { slug: "entertainment", name: "Entretenimiento", icon: "Popcorn", color: "#B25DE8", kind: CategoryKind.EXPENSE },
  { slug: "bills", name: "Servicios", icon: "Receipt", color: "#8A8A99", kind: CategoryKind.EXPENSE },
  { slug: "subscriptions", name: "Suscripciones", icon: "RefreshCcw", color: "#D95DB2", kind: CategoryKind.EXPENSE },
  { slug: "salary", name: "Salario", icon: "Wallet", color: "#22A06B", kind: CategoryKind.INCOME },
  { slug: "freelance", name: "Freelance", icon: "Laptop", color: "#6657E8", kind: CategoryKind.INCOME },
  { slug: "other", name: "Otros", icon: "CircleEllipsis", color: "#9C9CAA", kind: CategoryKind.BOTH },
];

// Subcategories hang off one of the top-level slugs above, matched by
// `parentSlug` at seed time (real UUID resolved after the parent pass).
// They inherit their parent's icon/color/kind — Android never renders a
// subcategory's own icon, only its parent's (see CategoryIcon.kt), so these
// columns exist purely to satisfy the NOT NULL schema, not for display.
const subcategories: { slug: string; name: string; parentSlug: string }[] = [
  { slug: "food-groceries", name: "Mercado", parentSlug: "food" },
  { slug: "food-restaurants", name: "Restaurantes", parentSlug: "food" },
  { slug: "food-delivery", name: "Domicilios", parentSlug: "food" },
  { slug: "food-coffee", name: "Café y snacks", parentSlug: "food" },
  { slug: "transportation-public-transit", name: "Transporte público", parentSlug: "transportation" },
  { slug: "transportation-fuel", name: "Combustible", parentSlug: "transportation" },
  { slug: "transportation-rideshare", name: "Taxi / Apps", parentSlug: "transportation" },
  { slug: "transportation-parking", name: "Parqueadero y peajes", parentSlug: "transportation" },
  { slug: "shopping-clothing", name: "Ropa", parentSlug: "shopping" },
  { slug: "shopping-electronics", name: "Electrónica", parentSlug: "shopping" },
  { slug: "shopping-home", name: "Hogar", parentSlug: "shopping" },
  { slug: "shopping-personal-care", name: "Cuidado personal", parentSlug: "shopping" },
  { slug: "health-pharmacy", name: "Farmacia", parentSlug: "health" },
  { slug: "health-doctor", name: "Consultas médicas", parentSlug: "health" },
  { slug: "health-insurance", name: "Seguro médico", parentSlug: "health" },
  { slug: "health-fitness", name: "Gimnasio", parentSlug: "health" },
  { slug: "education-tuition", name: "Matrícula", parentSlug: "education" },
  { slug: "education-supplies", name: "Libros y materiales", parentSlug: "education" },
  { slug: "education-courses", name: "Cursos y certificaciones", parentSlug: "education" },
  { slug: "entertainment-streaming", name: "Streaming y cine", parentSlug: "entertainment" },
  { slug: "entertainment-events", name: "Eventos y conciertos", parentSlug: "entertainment" },
  { slug: "entertainment-hobbies", name: "Hobbies y juegos", parentSlug: "entertainment" },
  { slug: "bills-electricity", name: "Electricidad", parentSlug: "bills" },
  { slug: "bills-water", name: "Agua", parentSlug: "bills" },
  { slug: "bills-internet", name: "Internet y teléfono", parentSlug: "bills" },
  { slug: "bills-rent", name: "Arriendo", parentSlug: "bills" },
  { slug: "subscriptions-streaming", name: "Apps de streaming", parentSlug: "subscriptions" },
  { slug: "subscriptions-software", name: "Software / SaaS", parentSlug: "subscriptions" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, color: category.color, kind: category.kind },
      create: category,
    });
  }
  console.log(`Seeded ${categories.length} global categories.`);

  for (const sub of subcategories) {
    const parent = await prisma.category.findUniqueOrThrow({ where: { slug: sub.parentSlug } });
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, icon: parent.icon, color: parent.color, kind: parent.kind, parentId: parent.id },
      create: { slug: sub.slug, name: sub.name, icon: parent.icon, color: parent.color, kind: parent.kind, parentId: parent.id },
    });
  }
  console.log(`Seeded ${subcategories.length} subcategories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, color: category.color, kind: category.kind },
      create: category,
    });
  }
  console.log(`Seeded ${categories.length} global categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

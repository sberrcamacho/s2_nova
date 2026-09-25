-- CreateEnum
CREATE TYPE "budget_kind" AS ENUM ('CATEGORY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "goal_plan_end" AS ENUM ('GOAL', 'COUNT', 'DATE');

-- CreateEnum
CREATE TYPE "attachment_kind" AS ENUM ('IMAGE', 'PDF');

-- AlterEnum
ALTER TYPE "budget_period" ADD VALUE 'CUSTOM';

-- AlterEnum
ALTER TYPE "recurrence_interval" ADD VALUE 'DAILY';

-- DropIndex
DROP INDEX "categories_slug_key";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP';

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "kind" "budget_kind" NOT NULL DEFAULT 'CATEGORY',
ADD COLUMN     "wallet_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_custom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "initial_amount_minor" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recurring_series" ADD COLUMN     "auto_confirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "counterparty_kind" TEXT,
ADD COLUMN     "counterparty_name" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN     "custom_budget_id" TEXT,
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "occurrences" INTEGER,
ADD COLUMN     "occurrences_done" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subcategory_id" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "counterparty_kind" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN     "custom_budget_id" TEXT,
ADD COLUMN     "fx_rate" DECIMAL(18,6),
ADD COLUMN     "occurred_at" TIMESTAMP(3),
ADD COLUMN     "wallet_amount_minor" BIGINT;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "guides_off" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guides_seen" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "category_overrides" (
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT,
    "icon" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_overrides_pkey" PRIMARY KEY ("user_id","category_id")
);

-- CreateTable
CREATE TABLE "user_currencies" (
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_currencies_pkey" PRIMARY KEY ("user_id","code")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("base","quote","date")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "kind" "attachment_kind" NOT NULL,
    "mime" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_plans" (
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "frequency" "recurrence_interval" NOT NULL,
    "account_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_mode" "goal_plan_end" NOT NULL DEFAULT 'GOAL',
    "count" INTEGER,
    "end_date" DATE,
    "auto_confirm" BOOLEAN NOT NULL DEFAULT false,
    "next_date" DATE NOT NULL,
    "done_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_plans_pkey" PRIMARY KEY ("goal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attachments_transaction_id_key" ON "attachments"("transaction_id");

-- CreateIndex
CREATE INDEX "goal_plans_user_id_idx" ON "goal_plans"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_slug_key" ON "categories"("user_id", "slug");

-- CreateIndex
CREATE INDEX "transactions_custom_budget_id_idx" ON "transactions"("custom_budget_id");

-- AddForeignKey
ALTER TABLE "category_overrides" ADD CONSTRAINT "category_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_overrides" ADD CONSTRAINT "category_overrides_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_currencies" ADD CONSTRAINT "user_currencies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_custom_budget_id_fkey" FOREIGN KEY ("custom_budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_plans" ADD CONSTRAINT "goal_plans_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_plans" ADD CONSTRAINT "goal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Data: unified category taxonomy (CATEGORY_SYSTEM.md §7). Seeds every node of
-- s2-categories.js (slug = stable dotted id), re-points transactions, series,
-- budgets and products from the legacy slugs through CAT_LEGACY, then drops
-- the legacy rows. Generated from src/lib/taxonomy.json.
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.work', 'Trabajo', 'work', '#22A06B', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.business', 'Negocio', 'business', '#A8963D', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.investments', 'Inversiones', 'investments', '#6657E8', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.property', 'Propiedades', 'property', '#9A7B5C', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.transfers', 'Transferencias recibidas', 'transfers', '#D95DB2', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.financial', 'Financieros', 'financial', '#7A86A8', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'inc.other', 'Otros ingresos', 'other', '#9C9CAA', 'INCOME', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.food', 'Alimentación', 'food', '#E8A23D', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.housing', 'Vivienda', 'housing', '#D9784A', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.utilities', 'Servicios públicos', 'utilities', '#8A8A99', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.transportation', 'Transporte', 'transportation', '#3D8BE8', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.education', 'Educación', 'education', '#5D6BE8', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.health', 'Salud', 'health', '#E85D6B', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.shopping', 'Compras', 'shopping', '#3DBBA8', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.entertainment', 'Entretenimiento', 'entertainment', '#B25DE8', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.travel', 'Viajes', 'travel', '#2FA7C9', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.debt', 'Deudas', 'debt', '#C2566F', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.financial', 'Financieros', 'financial', '#7A86A8', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.business', 'Negocio', 'business', '#A8963D', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.family', 'Familia', 'family', '#E85D9C', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'exp.other', 'Otros gastos', 'other', '#9C9CAA', 'EXPENSE', false);
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.work.salary', 'Salario', 'work', '#22A06B', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.work';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.work.overtime', 'Horas extra', 'work', '#22A06B', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.work';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.work.bonuses', 'Bonificaciones', 'work', '#22A06B', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.work';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.work.commissions', 'Comisiones', 'work', '#22A06B', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.work';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.work.freelance', 'Freelance', 'work', '#22A06B', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.work';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.business.sales', 'Ventas', 'business', '#A8963D', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.business.services', 'Servicios prestados', 'business', '#A8963D', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.business.commissions', 'Comisiones', 'business', '#A8963D', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.business.other', 'Otros ingresos del negocio', 'business', '#A8963D', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.investments.dividends', 'Dividendos', 'investments', '#6657E8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.investments';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.investments.interest', 'Intereses', 'investments', '#6657E8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.investments';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.investments.returns', 'Rendimientos', 'investments', '#6657E8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.investments';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.investments.sale', 'Venta de inversiones', 'investments', '#6657E8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.investments';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.property.rent', 'Arriendos recibidos', 'property', '#9A7B5C', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.property';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.property.sale', 'Venta de propiedad', 'property', '#9A7B5C', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.property';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.property.other', 'Otros ingresos de propiedad', 'property', '#9A7B5C', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.property';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.transfers.gifts', 'Regalos', 'transfers', '#D95DB2', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.transfers';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.transfers.donations', 'Donaciones', 'transfers', '#D95DB2', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.transfers';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.transfers.assistance', 'Ayuda económica', 'transfers', '#D95DB2', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.transfers';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.transfers.reimbursements', 'Reembolsos', 'transfers', '#D95DB2', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.transfers';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.financial.refunds', 'Devoluciones', 'financial', '#7A86A8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.financial.purchase_reimbursements', 'Reintegros de compras', 'financial', '#7A86A8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.financial.adjustments', 'Ajustes', 'financial', '#7A86A8', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.other.prizes', 'Premios', 'other', '#9C9CAA', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.other';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.other.occasional', 'Ingresos ocasionales', 'other', '#9C9CAA', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.other';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'inc.other.other', 'Otros', 'other', '#9C9CAA', 'INCOME', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'inc.other';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.food.groceries', 'Mercado', 'food', '#E8A23D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.food';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.food.restaurants', 'Restaurantes', 'food', '#E8A23D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.food';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.food.delivery', 'Domicilios', 'food', '#E8A23D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.food';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.food.cafes', 'Cafés', 'food', '#E8A23D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.food';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.housing.rent', 'Arriendo', 'housing', '#D9784A', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.housing';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.housing.mortgage', 'Hipoteca', 'housing', '#D9784A', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.housing';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.housing.maintenance', 'Mantenimiento', 'housing', '#D9784A', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.housing';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.housing.furniture', 'Muebles', 'housing', '#D9784A', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.housing';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.housing.decoration', 'Decoración', 'housing', '#D9784A', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.housing';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.utilities.electricity', 'Electricidad', 'utilities', '#8A8A99', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.utilities';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.utilities.water', 'Agua', 'utilities', '#8A8A99', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.utilities';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.utilities.gas', 'Gas', 'utilities', '#8A8A99', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.utilities';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.utilities.internet', 'Internet', 'utilities', '#8A8A99', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.utilities';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.utilities.phone', 'Telefonía', 'utilities', '#8A8A99', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.utilities';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.transportation.public_transit', 'Transporte público', 'transportation', '#3D8BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.transportation';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.transportation.fuel', 'Combustible', 'transportation', '#3D8BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.transportation';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.transportation.rideshare', 'Taxi / Apps', 'transportation', '#3D8BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.transportation';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.transportation.parking', 'Parqueadero', 'transportation', '#3D8BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.transportation';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.transportation.maintenance', 'Mantenimiento', 'transportation', '#3D8BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.transportation';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.education.tuition', 'Matrícula', 'education', '#5D6BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.education';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.education.courses', 'Cursos', 'education', '#5D6BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.education';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.education.books', 'Libros', 'education', '#5D6BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.education';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.education.materials', 'Materiales', 'education', '#5D6BE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.education';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.health.appointments', 'Citas médicas', 'health', '#E85D6B', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.health';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.health.medication', 'Medicamentos', 'health', '#E85D6B', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.health';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.health.tests', 'Exámenes', 'health', '#E85D6B', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.health';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.health.insurance', 'Seguros', 'health', '#E85D6B', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.health';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.health.dental', 'Odontología', 'health', '#E85D6B', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.health';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.shopping.clothing', 'Ropa', 'shopping', '#3DBBA8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.shopping';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.shopping.technology', 'Tecnología', 'shopping', '#3DBBA8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.shopping';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.shopping.home', 'Hogar', 'shopping', '#3DBBA8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.shopping';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.shopping.personal_care', 'Cuidado personal', 'shopping', '#3DBBA8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.shopping';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.entertainment.games', 'Juegos', 'entertainment', '#B25DE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.entertainment';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.entertainment.cinema', 'Cine', 'entertainment', '#B25DE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.entertainment';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.entertainment.streaming', 'Streaming', 'entertainment', '#B25DE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.entertainment';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.entertainment.events', 'Eventos', 'entertainment', '#B25DE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.entertainment';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.entertainment.hobbies', 'Hobbies', 'entertainment', '#B25DE8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.entertainment';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.travel.transport', 'Transporte', 'travel', '#2FA7C9', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.travel';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.travel.accommodation', 'Alojamiento', 'travel', '#2FA7C9', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.travel';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.travel.food', 'Comida', 'travel', '#2FA7C9', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.travel';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.travel.activities', 'Actividades', 'travel', '#2FA7C9', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.travel';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.debt.credit_card', 'Tarjeta de crédito', 'debt', '#C2566F', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.debt';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.debt.loans', 'Préstamos', 'debt', '#C2566F', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.debt';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.debt.interest', 'Intereses', 'debt', '#C2566F', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.debt';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.debt.installments', 'Cuotas', 'debt', '#C2566F', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.debt';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.financial.bank_fees', 'Comisiones bancarias', 'financial', '#7A86A8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.financial.taxes', 'Impuestos', 'financial', '#7A86A8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.financial.insurance', 'Seguros', 'financial', '#7A86A8', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.financial';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.supplies', 'Insumos', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.suppliers', 'Proveedores', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.advertising', 'Publicidad', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.tools', 'Herramientas', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.transport', 'Transporte', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.business.services', 'Servicios', 'business', '#A8963D', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.business';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.family.children', 'Hijos', 'family', '#E85D9C', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.family';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.family.pets', 'Mascotas', 'family', '#E85D9C', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.family';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.family.assistance', 'Apoyo familiar', 'family', '#E85D9C', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.family';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.family.other', 'Otros', 'family', '#E85D9C', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.family';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.other.unexpected', 'Imprevistos', 'other', '#9C9CAA', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.other';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) SELECT gen_random_uuid()::text, NULL, p.id, 'exp.other.misc', 'Gastos varios', 'other', '#9C9CAA', 'EXPENSE', false FROM categories p WHERE p.user_id IS NULL AND p.slug = 'exp.other';
INSERT INTO categories (id, user_id, parent_id, slug, name, icon, color, kind, is_custom) VALUES (gen_random_uuid()::text, NULL, NULL, 'transfer', 'Transferencia', 'transfer', '#6c5ce7', 'BOTH', false);

CREATE TEMP TABLE cat_map (old_slug TEXT PRIMARY KEY, new_slug TEXT NOT NULL);
INSERT INTO cat_map (old_slug, new_slug) VALUES
  ('food', 'exp.food'),
  ('alimentación', 'exp.food'),
  ('food-groceries', 'exp.food.groceries'),
  ('food-restaurants', 'exp.food.restaurants'),
  ('food-delivery', 'exp.food.delivery'),
  ('food-coffee', 'exp.food.cafes'),
  ('transportation', 'exp.transportation'),
  ('transporte', 'exp.transportation'),
  ('transportation-public-transit', 'exp.transportation.public_transit'),
  ('transportation-fuel', 'exp.transportation.fuel'),
  ('transportation-rideshare', 'exp.transportation.rideshare'),
  ('transportation-parking', 'exp.transportation.parking'),
  ('shopping', 'exp.shopping'),
  ('compras', 'exp.shopping'),
  ('shopping-clothing', 'exp.shopping.clothing'),
  ('shopping-electronics', 'exp.shopping.technology'),
  ('shopping-home', 'exp.shopping.home'),
  ('shopping-personal-care', 'exp.shopping.personal_care'),
  ('health', 'exp.health'),
  ('salud', 'exp.health'),
  ('health-pharmacy', 'exp.health.medication'),
  ('health-doctor', 'exp.health.appointments'),
  ('health-insurance', 'exp.health.insurance'),
  ('health-fitness', 'exp.health'),
  ('education', 'exp.education'),
  ('educación', 'exp.education'),
  ('education-tuition', 'exp.education.tuition'),
  ('education-supplies', 'exp.education.books'),
  ('education-courses', 'exp.education.courses'),
  ('entertainment', 'exp.entertainment'),
  ('entretenimiento', 'exp.entertainment'),
  ('entertainment-streaming', 'exp.entertainment.streaming'),
  ('entertainment-events', 'exp.entertainment.events'),
  ('entertainment-hobbies', 'exp.entertainment.hobbies'),
  ('bills', 'exp.utilities'),
  ('servicios', 'exp.utilities'),
  ('bills-electricity', 'exp.utilities.electricity'),
  ('bills-water', 'exp.utilities.water'),
  ('bills-internet', 'exp.utilities.internet'),
  ('bills-rent', 'exp.housing.rent'),
  ('subscriptions', 'exp.entertainment.streaming'),
  ('suscripciones', 'exp.entertainment.streaming'),
  ('subscriptions-streaming', 'exp.entertainment.streaming'),
  ('subscriptions-software', 'exp.business.tools'),
  ('salary', 'inc.work.salary'),
  ('salario', 'inc.work.salary'),
  ('freelance', 'inc.work.freelance'),
  ('gift', 'inc.transfers.gifts'),
  ('obsequio', 'inc.transfers.gifts'),
  ('other', 'exp.other'),
  ('otros', 'exp.other'),
  ('transferencia', 'transfer');

-- A legacy row is any global category whose slug isn't a dotted id.
CREATE TEMP TABLE legacy_cat AS
  SELECT id, slug FROM categories WHERE user_id IS NULL AND slug NOT LIKE '%.%' AND slug <> 'transfer';

-- Transactions: the most specific legacy slug decides the new node; "other"
-- splits by type; transfers get the reserved transfer node.
CREATE TEMP TABLE tx_new AS
  SELECT t.id,
    CASE
      WHEN t.type = 'TRANSFER' THEN 'transfer'
      WHEN COALESCE(sc.slug, c.slug) = 'other' AND t.type = 'INCOME' THEN 'inc.other'
      ELSE COALESCE(m.new_slug, CASE WHEN t.type = 'INCOME' THEN 'inc.other' ELSE 'exp.other' END)
    END AS new_slug
  FROM transactions t
  JOIN legacy_cat c ON c.id = t.category_id
  LEFT JOIN categories sc ON sc.id = t.subcategory_id
  LEFT JOIN cat_map m ON m.old_slug = COALESCE(sc.slug, c.slug);

UPDATE transactions t
SET category_id = COALESCE(n.parent_id, n.id),
    subcategory_id = CASE WHEN n.parent_id IS NULL THEN NULL ELSE n.id END
FROM tx_new x
JOIN categories n ON n.user_id IS NULL AND n.slug = x.new_slug
WHERE t.id = x.id;

UPDATE recurring_series r
SET category_id = COALESCE(n.parent_id, n.id),
    subcategory_id = CASE WHEN n.parent_id IS NULL THEN NULL ELSE n.id END
FROM legacy_cat c
LEFT JOIN cat_map m ON m.old_slug = c.slug
JOIN categories n ON n.user_id IS NULL AND n.slug = COALESCE(m.new_slug, 'exp.other')
WHERE r.category_id = c.id AND NOT (c.slug = 'other' AND r.type = 'INCOME');

UPDATE recurring_series r
SET category_id = n.id, subcategory_id = NULL
FROM legacy_cat c, categories n
WHERE r.category_id = c.id AND c.slug = 'other' AND r.type = 'INCOME' AND n.user_id IS NULL AND n.slug = 'inc.other';

-- Budgets keep their scope: a legacy parent maps to the new parent ("Todas"),
-- a legacy subcategory to its leaf.
UPDATE budgets b
SET category_id = n.id
FROM legacy_cat c
LEFT JOIN cat_map m ON m.old_slug = c.slug
JOIN categories n ON n.user_id IS NULL AND n.slug = COALESCE(m.new_slug, 'exp.other')
WHERE b.category_id = c.id;

UPDATE products p
SET category_id = n.id
FROM legacy_cat c
LEFT JOIN cat_map m ON m.old_slug = c.slug
JOIN categories n ON n.user_id IS NULL AND n.slug = COALESCE(m.new_slug, 'exp.other')
WHERE p.category_id = c.id;

-- Anything still pointing at a legacy row (a user subcategory, say) falls
-- back to "Otros".
UPDATE transactions t SET subcategory_id = NULL WHERE subcategory_id IN (SELECT id FROM legacy_cat);

DELETE FROM categories WHERE id IN (SELECT id FROM legacy_cat) AND parent_id IS NOT NULL;
DELETE FROM categories WHERE id IN (SELECT id FROM legacy_cat);

-- Goals: legacy goal category → plan icon (PLAN_ICON_FROM_GOAL).
UPDATE goals SET icon = CASE theme_icon
  WHEN 'EMERGENCY' THEN 'savings'
  WHEN 'RETIREMENT' THEN 'savings'
  WHEN 'TRAVEL' THEN 'travel'
  WHEN 'EDUCATION' THEN 'education'
  WHEN 'HOUSING' THEN 'housing'
  WHEN 'VEHICLE' THEN 'transportation'
  WHEN 'TECHNOLOGY' THEN 'technology'
  WHEN 'HEALTH' THEN 'health'
  WHEN 'DEBT' THEN 'debt'
  ELSE 'other'
END;

-- Monthly budgets now run from their start month on and reset each month.
UPDATE budgets SET end_date = NULL WHERE period = 'MONTHLY';

-- Every existing wallet and movement is COP; so is each user's principal
-- currency (the old USD preference only converted COP figures for display).
INSERT INTO user_currencies (user_id, code, is_principal) SELECT id, 'COP', true FROM users;

-- Movements before this release only had a date; keep their creation time.
UPDATE transactions SET occurred_at = transaction_date + (created_at::time);


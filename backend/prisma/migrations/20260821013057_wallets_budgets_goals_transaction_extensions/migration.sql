-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('COMPLETED', 'PLANNED');

-- CreateEnum
CREATE TYPE "recurrence_interval" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "loan_kind" AS ENUM ('LENT', 'BORROWED');

-- AlterEnum
ALTER TYPE "account_type" ADD VALUE 'CRYPTO';

-- AlterEnum
ALTER TYPE "transaction_type" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "budget_id" TEXT,
ADD COLUMN     "goal_id" TEXT,
ADD COLUMN     "loan_kind" "loan_kind",
ADD COLUMN     "loan_settled_at" TIMESTAMP(3),
ADD COLUMN     "next_occurrence_date" DATE,
ADD COLUMN     "recurrence_interval" "recurrence_interval" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "status" "transaction_status" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "transfer_to_account_id" TEXT;

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount_minor" BIGINT NOT NULL,
    "target_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "transactions_budget_id_idx" ON "transactions"("budget_id");

-- CreateIndex
CREATE INDEX "transactions_goal_id_idx" ON "transactions"("goal_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_to_account_id_fkey" FOREIGN KEY ("transfer_to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

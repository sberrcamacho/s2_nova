-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "next_occurrence_date",
DROP COLUMN "recurrence_interval",
ADD COLUMN     "counterparty_name" TEXT,
ADD COLUMN     "due_date" DATE,
ADD COLUMN     "recurring_series_id" TEXT,
ADD COLUMN     "settled_by_transaction_id" TEXT;

-- CreateTable
CREATE TABLE "recurring_series" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "interval" "recurrence_interval" NOT NULL,
    "next_occurrence_date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_series_user_id_idx" ON "recurring_series"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_settled_by_transaction_id_key" ON "transactions"("settled_by_transaction_id");

-- CreateIndex
CREATE INDEX "transactions_recurring_series_id_idx" ON "transactions"("recurring_series_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_series_id_fkey" FOREIGN KEY ("recurring_series_id") REFERENCES "recurring_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_settled_by_transaction_id_fkey" FOREIGN KEY ("settled_by_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "parent_loan_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_parent_loan_id_idx" ON "transactions"("parent_loan_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_loan_id_fkey" FOREIGN KEY ("parent_loan_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

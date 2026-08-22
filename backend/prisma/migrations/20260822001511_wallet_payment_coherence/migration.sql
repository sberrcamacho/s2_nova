-- Replaces the flat BANK account type with BANK_DEBIT/BANK_CREDIT (a bank
-- wallet now always carries the debit/credit distinction), and moves
-- NEQUI/DAVIPLATA from PaymentMethod to AccountType (they're wallets a user
-- holds a balance in, not just a way of paying — see schema.prisma's
-- AccountType/PaymentMethod doc comments).
--
-- Any existing BANK account is data-migrated to BANK_DEBIT (debit is the
-- more common default for a plain "bank account"; there's no way to know
-- which the row actually meant, so this is a documented choice, not
-- discovered fact) as part of the enum swap's USING cast, rather than a
-- separate UPDATE, since the column can't hold the old BANK value once the
-- new enum type is in place.
BEGIN;
CREATE TYPE "account_type_new" AS ENUM ('CASH', 'BANK_DEBIT', 'BANK_CREDIT', 'SAVINGS', 'CRYPTO', 'NEQUI', 'DAVIPLATA', 'OTHER');
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "account_type_new" USING (
  CASE WHEN "type"::text = 'BANK' THEN 'BANK_DEBIT' ELSE "type"::text END
)::"account_type_new";
ALTER TYPE "account_type" RENAME TO "account_type_old";
ALTER TYPE "account_type_new" RENAME TO "account_type";
DROP TYPE "public"."account_type_old";
COMMIT;

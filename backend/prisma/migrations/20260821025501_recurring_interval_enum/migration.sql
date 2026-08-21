-- AlterEnum
BEGIN;
CREATE TYPE "recurrence_interval_new" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');
ALTER TABLE "public"."transactions" ALTER COLUMN "recurrence_interval" DROP DEFAULT;
ALTER TABLE "public"."transactions" ALTER COLUMN "recurrence_interval" TYPE "recurrence_interval_new" USING ("recurrence_interval"::text::"recurrence_interval_new");
ALTER TYPE "recurrence_interval" RENAME TO "recurrence_interval_old";
ALTER TYPE "recurrence_interval_new" RENAME TO "recurrence_interval";
DROP TYPE "public"."recurrence_interval_old";
COMMIT;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "auto_lock_minutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "blur_balance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT;

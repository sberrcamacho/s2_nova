-- CreateEnum
CREATE TYPE "suggestion_status" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateTable
CREATE TABLE "movement_suggestions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_app" TEXT NOT NULL,
    "app_label" TEXT NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "merchant" TEXT,
    "category_slug" TEXT,
    "account_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "status" "suggestion_status" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "parsed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_usage" (
    "user_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assistant_usage_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateIndex
CREATE INDEX "movement_suggestions_user_id_status_idx" ON "movement_suggestions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "movement_suggestions_user_id_dedupe_key_key" ON "movement_suggestions"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "movement_suggestions" ADD CONSTRAINT "movement_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_usage" ADD CONSTRAINT "assistant_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

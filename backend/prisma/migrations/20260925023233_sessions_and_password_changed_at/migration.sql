-- AlterTable
ALTER TABLE "auth_identities" ADD COLUMN     "credential_updated_at" TIMESTAMP(3);

-- A password set before this column existed dates from the identity itself.
UPDATE "auth_identities" SET "credential_updated_at" = "created_at" WHERE "credential_hash" IS NOT NULL;

-- AlterTable: existing refresh tokens each become their own session.
ALTER TABLE "refresh_tokens" ADD COLUMN     "session_id" TEXT;
UPDATE "refresh_tokens" SET "session_id" = "id";
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

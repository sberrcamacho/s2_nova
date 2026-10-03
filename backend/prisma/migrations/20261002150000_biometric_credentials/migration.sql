-- CreateTable
CREATE TABLE "biometric_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_secret_hash_key" ON "biometric_credentials"("secret_hash");

-- CreateIndex
CREATE INDEX "biometric_credentials_user_id_idx" ON "biometric_credentials"("user_id");

-- AddForeignKey
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

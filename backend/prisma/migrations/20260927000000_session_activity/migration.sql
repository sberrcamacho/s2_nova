-- AlterTable: rotation marker, login time and last activity per session.
ALTER TABLE "refresh_tokens" ADD COLUMN     "rotated_at" TIMESTAMP(3),
ADD COLUMN     "session_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing sessions date from their first token; activity starts now.
UPDATE "refresh_tokens" AS t SET "session_started_at" = s."started"
FROM (SELECT "session_id", MIN("created_at") AS "started" FROM "refresh_tokens" GROUP BY "session_id") AS s
WHERE t."session_id" = s."session_id";

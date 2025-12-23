-- Add stable badge metadata fields
ALTER TABLE "Badge" ADD COLUMN "key" TEXT;
UPDATE "Badge" SET "key" = "id" WHERE "key" IS NULL;
ALTER TABLE "Badge" ALTER COLUMN "key" SET NOT NULL;
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

ALTER TABLE "Badge" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'milestone';
ALTER TABLE "Badge" ADD COLUMN "rarity" TEXT NOT NULL DEFAULT 'common';
ALTER TABLE "Badge" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'ribbon-outline';
ALTER TABLE "Badge" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

-- Track which event triggered a badge
ALTER TABLE "UserBadge" ADD COLUMN "eventId" TEXT;

CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX "UserBadge_eventId_idx" ON "UserBadge"("eventId");

ALTER TABLE "UserBadge"
  ADD CONSTRAINT "UserBadge_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;




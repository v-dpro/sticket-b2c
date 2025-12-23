-- Venue Page additions: venue address, tips categories + per-user upvotes, seat view thumbnails

-- Add address to Venue
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "address" TEXT;

-- Add thumbnailUrl to SeatView
ALTER TABLE "SeatView" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- Add category to VenueTip
ALTER TABLE "VenueTip" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';

-- Create TipUpvote table
CREATE TABLE IF NOT EXISTS "TipUpvote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tipId" TEXT NOT NULL,
  CONSTRAINT "TipUpvote_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for one upvote per user per tip
CREATE UNIQUE INDEX IF NOT EXISTS "TipUpvote_userId_tipId_key" ON "TipUpvote"("userId", "tipId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TipUpvote_userId_fkey'
  ) THEN
    ALTER TABLE "TipUpvote" ADD CONSTRAINT "TipUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TipUpvote_tipId_fkey'
  ) THEN
    ALTER TABLE "TipUpvote" ADD CONSTRAINT "TipUpvote_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "VenueTip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Remove the legacy aggregate upvotes counter (we now count TipUpvote rows)
ALTER TABLE "VenueTip" DROP COLUMN IF EXISTS "upvotes";

-- Index for tips by venue
CREATE INDEX IF NOT EXISTS "VenueTip_venueId_idx" ON "VenueTip"("venueId");




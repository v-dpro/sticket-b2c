-- Add fields required for Settings (mobile)

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "activityVisibility" "PrivacySetting" NOT NULL DEFAULT 'FRIENDS',
  ADD COLUMN IF NOT EXISTS "showInSuggestions" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allowTagging" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "homeCity" TEXT,
  ADD COLUMN IF NOT EXISTS "distanceUnit" TEXT NOT NULL DEFAULT 'miles',
  ADD COLUMN IF NOT EXISTS "spotifyUsername" TEXT;




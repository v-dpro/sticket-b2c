-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ticketUrl" TEXT;

-- AlterTable
ALTER TABLE "Presale" ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "spotifyEnrichedAt" TIMESTAMP(3),
ADD COLUMN     "spotifyGenres" TEXT[],
ADD COLUMN     "spotifyTopArtists" TEXT[],
ADD COLUMN     "spotifyTopTracks" JSONB;

-- AlterTable
ALTER TABLE "UserArtistFollow" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX "Presale_eventId_idx" ON "Presale"("eventId");

-- AddForeignKey
ALTER TABLE "Presale" ADD CONSTRAINT "Presale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

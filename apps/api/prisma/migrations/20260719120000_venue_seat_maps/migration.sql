-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "seatMapData" JSONB,
ADD COLUMN     "seatMapFetchedAt" TIMESTAMP(3);

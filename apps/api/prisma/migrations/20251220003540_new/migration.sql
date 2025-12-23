-- AlterTable
ALTER TABLE "Badge" ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "rarity" DROP DEFAULT,
ALTER COLUMN "icon" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "UserTicket_userId_idx" ON "UserTicket"("userId");

-- CreateIndex
CREATE INDEX "UserTicket_eventId_idx" ON "UserTicket"("eventId");

-- CreateIndex
CREATE INDEX "UserTicket_status_idx" ON "UserTicket"("status");

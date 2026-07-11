-- CreateEnum
CREATE TYPE "ComparisonResult" AS ENUM ('WIN', 'LOSS', 'TIE');

-- CreateEnum
CREATE TYPE "CoAuthorStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "tourId" TEXT;

-- AlterTable
ALTER TABLE "SeatView" ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "UserLog" ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "scoreRank" DOUBLE PRECISION,
ADD COLUMN     "sharedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogComparison" (
    "id" TEXT NOT NULL,
    "result" "ComparisonResult" NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "opponentLogId" TEXT NOT NULL,

    CONSTRAINT "LogComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogCoAuthor" (
    "id" TEXT NOT NULL,
    "status" "CoAuthorStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "logId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LogCoAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tour_artistId_idx" ON "Tour"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_artistId_name_key" ON "Tour"("artistId", "name");

-- CreateIndex
CREATE INDEX "LogComparison_logId_idx" ON "LogComparison"("logId");

-- CreateIndex
CREATE INDEX "LogComparison_opponentLogId_idx" ON "LogComparison"("opponentLogId");

-- CreateIndex
CREATE INDEX "LogComparison_userId_idx" ON "LogComparison"("userId");

-- CreateIndex
CREATE INDEX "LogCoAuthor_userId_idx" ON "LogCoAuthor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LogCoAuthor_logId_userId_key" ON "LogCoAuthor"("logId", "userId");

-- CreateIndex
CREATE INDEX "Event_tourId_idx" ON "Event"("tourId");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogComparison" ADD CONSTRAINT "LogComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogComparison" ADD CONSTRAINT "LogComparison_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogComparison" ADD CONSTRAINT "LogComparison_opponentLogId_fkey" FOREIGN KEY ("opponentLogId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogCoAuthor" ADD CONSTRAINT "LogCoAuthor_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogCoAuthor" ADD CONSTRAINT "LogCoAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

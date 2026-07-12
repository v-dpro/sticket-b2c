-- CreateEnum
CREATE TYPE "PartyVisibility" AS ENUM ('PUBLIC', 'INVITE');

-- CreateEnum
CREATE TYPE "PartyMemberStatus" AS ENUM ('HOST', 'INVITED', 'REQUESTED', 'GOING', 'DECLINED');

-- CreateEnum
CREATE TYPE "SetlistVote" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "DiscoveryRadius" AS ENUM ('OFF', 'FRIENDS', 'FOF', 'EVERYONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sameShowRadius" "DiscoveryRadius" NOT NULL DEFAULT 'FRIENDS',
ADD COLUMN     "showInGalleries" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tasteRadius" "DiscoveryRadius" NOT NULL DEFAULT 'FOF';

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3),
    "visibility" "PartyVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMember" (
    "id" TEXT NOT NULL,
    "status" "PartyMemberStatus" NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyAnnouncement" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "PartyAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venueId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "VenueQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAnswer" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "VenueAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAnswerUpvote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VenueAnswerUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetlistEntry" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "songTitle" TEXT NOT NULL,
    "confirmCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "SetlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetlistConfirm" (
    "id" TEXT NOT NULL,
    "vote" "SetlistVote" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SetlistConfirm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Party_eventId_idx" ON "Party"("eventId");

-- CreateIndex
CREATE INDEX "Party_hostId_idx" ON "Party"("hostId");

-- CreateIndex
CREATE INDEX "PartyMember_userId_idx" ON "PartyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyMember_partyId_userId_key" ON "PartyMember"("partyId", "userId");

-- CreateIndex
CREATE INDEX "PartyAnnouncement_partyId_idx" ON "PartyAnnouncement"("partyId");

-- CreateIndex
CREATE INDEX "VenueQuestion_venueId_idx" ON "VenueQuestion"("venueId");

-- CreateIndex
CREATE INDEX "VenueAnswer_questionId_idx" ON "VenueAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueAnswerUpvote_answerId_userId_key" ON "VenueAnswerUpvote"("answerId", "userId");

-- CreateIndex
CREATE INDEX "SetlistEntry_eventId_idx" ON "SetlistEntry"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SetlistEntry_eventId_position_songTitle_key" ON "SetlistEntry"("eventId", "position", "songTitle");

-- CreateIndex
CREATE UNIQUE INDEX "SetlistConfirm_entryId_userId_key" ON "SetlistConfirm"("entryId", "userId");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyAnnouncement" ADD CONSTRAINT "PartyAnnouncement_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyAnnouncement" ADD CONSTRAINT "PartyAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueQuestion" ADD CONSTRAINT "VenueQuestion_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueQuestion" ADD CONSTRAINT "VenueQuestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAnswer" ADD CONSTRAINT "VenueAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VenueQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAnswer" ADD CONSTRAINT "VenueAnswer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAnswerUpvote" ADD CONSTRAINT "VenueAnswerUpvote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "VenueAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAnswerUpvote" ADD CONSTRAINT "VenueAnswerUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistEntry" ADD CONSTRAINT "SetlistEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistConfirm" ADD CONSTRAINT "SetlistConfirm_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SetlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistConfirm" ADD CONSTRAINT "SetlistConfirm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

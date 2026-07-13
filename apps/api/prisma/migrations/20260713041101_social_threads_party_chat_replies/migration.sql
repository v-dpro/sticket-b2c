-- CreateTable
CREATE TABLE "TourThread" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tourId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "TourThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadReport" (
    "id" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT,
    "messageId" TEXT,
    "reporterId" TEXT NOT NULL,

    CONSTRAINT "ThreadReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "PartyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TourThread_tourId_idx" ON "TourThread"("tourId");

-- CreateIndex
CREATE INDEX "ThreadMessage_threadId_idx" ON "ThreadMessage"("threadId");

-- CreateIndex
CREATE INDEX "ThreadReport_threadId_idx" ON "ThreadReport"("threadId");

-- CreateIndex
CREATE INDEX "PartyMessage_partyId_idx" ON "PartyMessage"("partyId");

-- AddForeignKey
ALTER TABLE "TourThread" ADD CONSTRAINT "TourThread_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourThread" ADD CONSTRAINT "TourThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "TourThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReport" ADD CONSTRAINT "ThreadReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "TourThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReport" ADD CONSTRAINT "ThreadReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ThreadMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReport" ADD CONSTRAINT "ThreadReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMessage" ADD CONSTRAINT "PartyMessage_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMessage" ADD CONSTRAINT "PartyMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

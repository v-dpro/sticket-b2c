-- CreateTable
CREATE TABLE "ShowReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowReminder_userId_idx" ON "ShowReminder"("userId");

-- CreateIndex
CREATE INDEX "ShowReminder_eventId_idx" ON "ShowReminder"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowReminder_userId_eventId_key" ON "ShowReminder"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "ShowReminder" ADD CONSTRAINT "ShowReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowReminder" ADD CONSTRAINT "ShowReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

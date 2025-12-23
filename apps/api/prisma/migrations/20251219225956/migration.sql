-- CreateTable
CREATE TABLE "LogTag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taggedUserId" TEXT NOT NULL,

    CONSTRAINT "LogTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogTag_taggedUserId_idx" ON "LogTag"("taggedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LogTag_logId_taggedUserId_key" ON "LogTag"("logId", "taggedUserId");

-- AddForeignKey
ALTER TABLE "LogTag" ADD CONSTRAINT "LogTag_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogTag" ADD CONSTRAINT "LogTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogTag" ADD CONSTRAINT "LogTag_taggedUserId_fkey" FOREIGN KEY ("taggedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

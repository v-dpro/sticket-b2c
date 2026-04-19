-- AlterTable
ALTER TABLE "Badge" ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "rarity" DROP DEFAULT,
ALTER COLUMN "icon" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "LogPhoto" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "mediaKind" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN     "thumbUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "education" TEXT,
ADD COLUMN     "ethnicity" TEXT,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "xpTotal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShowMedia" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storagePath" TEXT,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "ShowMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presale" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "tourName" TEXT,
    "venueName" TEXT NOT NULL,
    "venueCity" TEXT NOT NULL,
    "venueState" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "presaleType" TEXT NOT NULL,
    "presaleStart" TIMESTAMP(3) NOT NULL,
    "presaleEnd" TIMESTAMP(3),
    "onsaleStart" TIMESTAMP(3),
    "code" TEXT,
    "signupUrl" TEXT,
    "signupDeadline" TIMESTAMP(3),
    "ticketUrl" TEXT,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresaleAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presaleId" TEXT NOT NULL,
    "notifyStart" BOOLEAN NOT NULL DEFAULT true,
    "notifyCode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresaleAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangThread" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowMedia_userId_idx" ON "ShowMedia"("userId");

-- CreateIndex
CREATE INDEX "ShowMedia_eventId_idx" ON "ShowMedia"("eventId");

-- CreateIndex
CREATE INDEX "ShowMedia_uploadedAt_idx" ON "ShowMedia"("uploadedAt");

-- CreateIndex
CREATE INDEX "Presale_artistName_idx" ON "Presale"("artistName");

-- CreateIndex
CREATE INDEX "Presale_presaleStart_idx" ON "Presale"("presaleStart");

-- CreateIndex
CREATE INDEX "Presale_eventDate_idx" ON "Presale"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "Presale_artistName_venueName_eventDate_presaleType_key" ON "Presale"("artistName", "venueName", "eventDate", "presaleType");

-- CreateIndex
CREATE INDEX "PresaleAlert_userId_idx" ON "PresaleAlert"("userId");

-- CreateIndex
CREATE INDEX "PresaleAlert_presaleId_idx" ON "PresaleAlert"("presaleId");

-- CreateIndex
CREATE UNIQUE INDEX "PresaleAlert_userId_presaleId_key" ON "PresaleAlert"("userId", "presaleId");

-- CreateIndex
CREATE INDEX "LogLike_logId_idx" ON "LogLike"("logId");

-- CreateIndex
CREATE UNIQUE INDEX "LogLike_userId_logId_key" ON "LogLike"("userId", "logId");

-- CreateIndex
CREATE INDEX "XpEntry_userId_createdAt_idx" ON "XpEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCheckin_userId_eventId_key" ON "UserCheckin"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "HangThread_eventId_key" ON "HangThread"("eventId");

-- AddForeignKey
ALTER TABLE "ShowMedia" ADD CONSTRAINT "ShowMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowMedia" ADD CONSTRAINT "ShowMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresaleAlert" ADD CONSTRAINT "PresaleAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresaleAlert" ADD CONSTRAINT "PresaleAlert_presaleId_fkey" FOREIGN KEY ("presaleId") REFERENCES "Presale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogLike" ADD CONSTRAINT "LogLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogLike" ADD CONSTRAINT "LogLike_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEntry" ADD CONSTRAINT "XpEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEntry" ADD CONSTRAINT "XpEntry_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCheckin" ADD CONSTRAINT "UserCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCheckin" ADD CONSTRAINT "UserCheckin_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangThread" ADD CONSTRAINT "HangThread_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangMessage" ADD CONSTRAINT "HangMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "HangThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangMessage" ADD CONSTRAINT "HangMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

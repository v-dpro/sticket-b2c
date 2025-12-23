-- Add tier to UserArtistFollow
ALTER TABLE "UserArtistFollow" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'following';
CREATE INDEX "UserArtistFollow_userId_idx" ON "UserArtistFollow"("userId");
CREATE INDEX "UserArtistFollow_tier_idx" ON "UserArtistFollow"("tier");

-- Create UserFanclub table
CREATE TABLE "UserFanclub" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "fanclubName" TEXT NOT NULL,
    "isMember" BOOLEAN NOT NULL DEFAULT false,
    "memberSince" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "signupUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserFanclub_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFanclub_userId_artistId_key" ON "UserFanclub"("userId", "artistId");
CREATE INDEX "UserFanclub_userId_idx" ON "UserFanclub"("userId");
CREATE INDEX "UserFanclub_renewalDate_idx" ON "UserFanclub"("renewalDate");

ALTER TABLE "UserFanclub" ADD CONSTRAINT "UserFanclub_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create UserEventTracking table
CREATE TABLE "UserEventTracking" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "maxPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "UserEventTracking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserEventTracking_userId_eventId_key" ON "UserEventTracking"("userId", "eventId");
CREATE INDEX "UserEventTracking_userId_idx" ON "UserEventTracking"("userId");
CREATE INDEX "UserEventTracking_status_idx" ON "UserEventTracking"("status");

ALTER TABLE "UserEventTracking" ADD CONSTRAINT "UserEventTracking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserEventTracking" ADD CONSTRAINT "UserEventTracking_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;



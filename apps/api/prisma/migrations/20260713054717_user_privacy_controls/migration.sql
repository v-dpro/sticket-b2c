-- CreateEnum
CREATE TYPE "AudienceSetting" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowMentions" "AudienceSetting" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "allowPartyInvites" "AudienceSetting" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "appearInTasteMatch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultLogVisibility" "PrivacySetting" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "profileVisibility" "PrivacySetting" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "showCollection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showMapCities" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTimeline" BOOLEAN NOT NULL DEFAULT true;

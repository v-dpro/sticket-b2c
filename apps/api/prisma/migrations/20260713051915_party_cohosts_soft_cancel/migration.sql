-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PartyMemberStatus" ADD VALUE 'COHOST';

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE';

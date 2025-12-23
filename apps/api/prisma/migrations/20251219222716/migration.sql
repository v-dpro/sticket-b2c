-- DropForeignKey
ALTER TABLE "TipUpvote" DROP CONSTRAINT "TipUpvote_tipId_fkey";

-- DropForeignKey
ALTER TABLE "TipUpvote" DROP CONSTRAINT "TipUpvote_userId_fkey";

-- AddForeignKey
ALTER TABLE "TipUpvote" ADD CONSTRAINT "TipUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipUpvote" ADD CONSTRAINT "TipUpvote_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "VenueTip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add fields required for Ticket Wallet (mobile)

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketSource') THEN
    CREATE TYPE "TicketSource" AS ENUM ('EMAIL', 'MANUAL', 'SCAN', 'TRANSFER');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "UserTicket"
  ADD COLUMN IF NOT EXISTS "isGeneralAdmission" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "barcodeFormat" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "barcodeImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "TicketSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "askingPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmationNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "rawEmailId" TEXT;

-- Align uniqueness with schema (allow multiple NULL barcodes)
DROP INDEX IF EXISTS "UserTicket_userId_eventId_section_row_seat_key";
CREATE UNIQUE INDEX IF NOT EXISTS "UserTicket_userId_eventId_barcode_key" ON "UserTicket"("userId", "eventId", "barcode");




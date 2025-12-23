-- Add optional phone number for contacts sync
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;

-- Unique when present; allows multiple NULLs
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");





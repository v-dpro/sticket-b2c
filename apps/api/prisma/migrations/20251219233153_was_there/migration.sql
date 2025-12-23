-- CreateTable
CREATE TABLE "WasThere" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,

    CONSTRAINT "WasThere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WasThere_userId_logId_key" ON "WasThere"("userId", "logId");

-- AddForeignKey
ALTER TABLE "WasThere" ADD CONSTRAINT "WasThere_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasThere" ADD CONSTRAINT "WasThere_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UserLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

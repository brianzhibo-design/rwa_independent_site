-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "walletAddress" TEXT;

-- CreateTable
CREATE TABLE "MintJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MintJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MintJob_orderId_key" ON "MintJob"("orderId");

-- CreateIndex
CREATE INDEX "MintJob_status_createdAt_idx" ON "MintJob"("status", "createdAt");

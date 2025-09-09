/*
  Warnings:

  - You are about to drop the column `amount` on the `Order` table. All the data in the column will be lost.
  - You are about to alter the column `amountFiat` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(14,2)`.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[address]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `affiliateId` to the `Commission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountCrypto` to the `Commission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountFiat` to the `Commission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `Commission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `custodyHash` to the `InventoryLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lotNo` to the `InventoryLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qtyAvailable` to the `InventoryLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qtyTotal` to the `InventoryLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseId` to the `InventoryLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chainId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contract` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCrypto` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceFiat` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `redeemPolicy` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rwaType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `Redemption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Redemption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chainId` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('bank', 'usdt', 'other');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'fulfilled');

-- DropIndex
DROP INDEX "Order_productId_idx";

-- DropIndex
DROP INDEX "Order_userId_idx";

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "affiliateId" TEXT NOT NULL,
ADD COLUMN     "amountCrypto" DECIMAL(32,8) NOT NULL,
ADD COLUMN     "amountFiat" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "rate" DECIMAL(5,4) NOT NULL,
ADD COLUMN     "status" "CommissionStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "InventoryLot" ADD COLUMN     "custodyHash" TEXT NOT NULL,
ADD COLUMN     "expiryAt" TIMESTAMP(3),
ADD COLUMN     "insurer" TEXT,
ADD COLUMN     "lotNo" TEXT NOT NULL,
ADD COLUMN     "qtyAvailable" INTEGER NOT NULL,
ADD COLUMN     "qtyTotal" INTEGER NOT NULL,
ADD COLUMN     "warehouseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "amount",
ADD COLUMN     "couponId" TEXT,
ALTER COLUMN "amountFiat" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "amountCrypto" SET DATA TYPE DECIMAL(32,8),
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "chainId" INTEGER NOT NULL,
ADD COLUMN     "contract" TEXT NOT NULL,
ADD COLUMN     "priceCrypto" DECIMAL(32,8) NOT NULL,
ADD COLUMN     "priceFiat" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "redeemPolicy" JSONB NOT NULL,
ADD COLUMN     "rwaType" TEXT NOT NULL,
ADD COLUMN     "sku" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "tokenType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN     "burnTxid" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "kycCheck" TEXT,
ADD COLUMN     "qty" INTEGER NOT NULL,
ADD COLUMN     "shippingAddressId" TEXT,
ADD COLUMN     "shippingStatus" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "l1" TEXT,
ADD COLUMN     "l2" TEXT,
ADD COLUMN     "l3" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "chainId" INTEGER NOT NULL,
ADD COLUMN     "kyc" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "totalAmountFiat" DECIMAL(14,2) NOT NULL,
    "totalAmountCrypto" DECIMAL(32,8) NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(14,2) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

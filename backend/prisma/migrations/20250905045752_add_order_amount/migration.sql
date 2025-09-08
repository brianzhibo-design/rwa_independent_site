/*
  Warnings:

  - You are about to drop the column `baseAmount` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `beneficiaryId` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `payoutCurrency` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `txid` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `vestingAt` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `custodyHash` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `expiryAt` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `insurer` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `lotNo` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `qtyAvailable` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `qtyTotal` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to drop the column `warehouseId` on the `InventoryLot` table. All the data in the column will be lost.
  - You are about to alter the column `amountCrypto` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(32,8)` to `Decimal(18,8)`.
  - You are about to drop the column `chainId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `contract` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `priceFiat` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `priceToken` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `redeemPolicy` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `rwaType` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tokenType` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `burnTxid` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `kycCheck` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressId` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `shippingStatus` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Redemption` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `l1` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `l2` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `l3` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `chainId` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `kyc` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_beneficiaryId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_userId_fkey";

-- DropIndex
DROP INDEX "Product_sku_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "Wallet_address_key";

-- AlterTable
ALTER TABLE "Commission" DROP COLUMN "baseAmount",
DROP COLUMN "beneficiaryId",
DROP COLUMN "level",
DROP COLUMN "payoutCurrency",
DROP COLUMN "rate",
DROP COLUMN "status",
DROP COLUMN "txid",
DROP COLUMN "vestingAt";

-- AlterTable
ALTER TABLE "InventoryLot" DROP COLUMN "custodyHash",
DROP COLUMN "expiryAt",
DROP COLUMN "insurer",
DROP COLUMN "lotNo",
DROP COLUMN "qtyAvailable",
DROP COLUMN "qtyTotal",
DROP COLUMN "warehouseId";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ALTER COLUMN "amountFiat" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "amountCrypto" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "chainId",
DROP COLUMN "contract",
DROP COLUMN "priceFiat",
DROP COLUMN "priceToken",
DROP COLUMN "redeemPolicy",
DROP COLUMN "rwaType",
DROP COLUMN "sku",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "tokenType";

-- AlterTable
ALTER TABLE "Redemption" DROP COLUMN "burnTxid",
DROP COLUMN "createdAt",
DROP COLUMN "kycCheck",
DROP COLUMN "qty",
DROP COLUMN "shippingAddressId",
DROP COLUMN "shippingStatus",
DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "active",
DROP COLUMN "l1",
DROP COLUMN "l2",
DROP COLUMN "l3";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "email";

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "address",
DROP COLUMN "chainId",
DROP COLUMN "kyc",
DROP COLUMN "type";

-- DropTable
DROP TABLE "AuditLog";

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "Order"("productId");

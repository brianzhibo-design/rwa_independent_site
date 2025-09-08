// scripts/runOnce.ts
import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  try {
    const order = await db.order.create({
      data: {
        userId: "cmf2fg73v0000e9j1hpov3qc2",
        productId: "cmf2eq53r0000vg7z5jq7sfl1",
        qty: 1,
        amountFiat: new Prisma.Decimal("199"),
        amountCrypto: new Prisma.Decimal("0"),
        status: "paid",
        payRef: null
        // 不要写 amount
      },
      select: { id: true }
    });
    console.log("Created:", order);
  } catch (e: any) {
    console.error("Code:", e.code);
    console.error("Message:", e.message);
    console.error("Meta:", e.meta);
  } finally {
    await db.$disconnect();
  }
}

main();

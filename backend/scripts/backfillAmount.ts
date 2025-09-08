// scripts/backfillAmount.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const res = await db.$executeRawUnsafe(
    'UPDATE "Order" SET "amount" = "amountFiat" WHERE "amount" = 0'
  );
  console.log("Rows updated:", res);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });


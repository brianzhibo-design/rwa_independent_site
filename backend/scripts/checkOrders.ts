// scripts/checkOrders.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const orders = await db.order.findMany({
    select: { id: true, amountFiat: true, amount: true },
    take: 5
  });
  console.table(orders);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });


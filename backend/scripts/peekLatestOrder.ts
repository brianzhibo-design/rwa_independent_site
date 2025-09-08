import { PrismaClient, Prisma } from "@prisma/client";
const db = new PrismaClient();

const isDecimal = (v:any) =>
  !!v && (v instanceof (Prisma as any).Decimal ||
         v?.constructor?.name === "Decimal" ||
         typeof (Prisma as any).Decimal?.isDecimal === "function" && (Prisma as any).Decimal.isDecimal(v));

function dec2str(x:any):any{
  if (x == null) return x;
  if (isDecimal(x)) return x.toString();
  if (x instanceof Date) return x.toISOString();
  if (Array.isArray(x)) return x.map(dec2str);
  if (typeof x === "object") { const o:any = {}; for (const k of Object.keys(x)) o[k] = dec2str(x[k]); return o; }
  return x;
}

async function main() {
  const o = await db.order.findFirst({
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true }
  });
  if (!o) { console.log("No orders yet"); return; }
  console.log("ORDER_ID:", o.id);
  console.log(JSON.stringify(dec2str(o), null, 2));
}
main().finally(() => db.$disconnect());

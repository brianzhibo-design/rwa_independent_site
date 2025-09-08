import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function dec2str(x:any):any{
  if (x == null) return x;
  if (typeof x === 'object') {
    if (typeof x.toString === 'function' && Object.getPrototypeOf(x)?.constructor?.name === 'Decimal') return x.toString();
    if (Array.isArray(x)) return x.map(dec2str);
    const o:any = {}; for (const k of Object.keys(x)) o[k] = dec2str(x[k]); return o;
  }
  return x;
}

(async () => {
  const p = await db.product.findFirst(); // 不带 select
  if (!p) { console.log('No product'); process.exit(0); }
  const obj = dec2str(p);
  console.log('keys:', Object.keys(obj));
  console.log(obj);
  await db.$disconnect();
})();
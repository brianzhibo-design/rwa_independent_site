// src/routes/orders.js
import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { mint1155 } from '../services/chain/mint.js'

const router = Router()
const prisma = new PrismaClient()

/* ---------- 小工具 ---------- */
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isAddr  = (s) => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s)
const toInt = (v, d = 1) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : d
}
const toNum = (v, d = 0) => {
  if (v == null) return d
  const s = typeof v === 'object' && v?.toString ? v.toString() : String(v)
  const n = Number(s)
  return Number.isFinite(n) ? n : d
}

/* ---------- Decimal / Date 序列化 ---------- */
const isDecimal = (v) =>
  !!v && (
    v instanceof Prisma.Decimal ||
    v?.constructor?.name === 'Decimal' ||
    (typeof Prisma.Decimal?.isDecimal === 'function' && Prisma.Decimal.isDecimal(v))
  );

const dec2str = (data) => {
  if (data == null) return data;
  if (isDecimal(data)) return data.toString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(dec2str);
  if (typeof data === 'object') {
    const out = {};
    for (const k of Object.keys(data)) out[k] = dec2str(data[k]);
    return out;
  }
  return data;
};

/* ---------- 业务辅助 ---------- */
// 热修复：email 当前不是唯一键，用 findFirst；等你加上 @unique 再切回 findUnique
// 临时：用 name 存邮箱字符串，待后续新增真正的 email 字段
async function ensureUserByEmail(email) {
  let u = await prisma.user.findFirst({ where: { name: email } });
  if (!u) {
    u = await prisma.user.create({
      data: { name: email },
      select: { id: true, name: true }
    });
  }
  return u;
}


function tokenIdFromProduct(p) {
  if (p?.tokenId != null) return Number(p.tokenId) || 1
  if (p?.sku) {
    let h = 0
    for (const b of Buffer.from(String(p.sku))) h = (h * 131 + b) % 1_000_000_007
    return (h % 1_000_000) || 1
  }
  return 1
}

/* ---------- 创建订单（mock支付） ---------- */
router.post('/mock', async (req, res) => {
  try {
    const { userEmail, productId, qty = 1, uplines = [], walletAddress } = req.body || {}

    // 参数校验
    if (!isEmail(userEmail)) return res.status(400).json({ ok: false, error: 'userEmail 格式不正确' })
    if (!productId || typeof productId !== 'string') return res.status(400).json({ ok: false, error: 'productId 必填' })
    const q = Math.max(1, toInt(qty, 1))

    const buyer = await ensureUserByEmail(userEmail)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' })

    const unit  = toNum(product.priceFiat, undefined) ?? toNum(product.price, 199)
    const total = unit * q

    // 事务：订单 + 佣金
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          qty: q,
          amountFiat:   new Prisma.Decimal(total.toString()),
          amountCrypto: new Prisma.Decimal('0'),
          amount:       new Prisma.Decimal(total.toString()),
          status: 'paid',
          payRef: null
        },
        select: { id: true }
      })

      const rates  = [0.06, 0.03, 0.01]
      const emails = Array.isArray(uplines) ? [...new Set(uplines.filter(Boolean))].slice(0, 3) : []
      if (emails.length) {
        const rows = []
        for (let i = 0; i < emails.length; i++) {
          if (!isEmail(emails[i])) continue
          const up = await ensureUserByEmail(emails[i])
          rows.push({
            level: i + 1,
            beneficiaryId: up.id,
            baseAmount: new Prisma.Decimal(total.toString()),
            rate: rates[i],
            payoutCurrency: 'fiat',
            status: 'pending',
            orderId: o.id
          })
        }
        if (rows.length) await tx.commission.createMany({ data: rows, skipDuplicates: true })
      }
      return o
    })

    // 铸造放事务外
    let mintTx = null
    try {
      if (walletAddress && isAddr(walletAddress)) {
        const tokenId = tokenIdFromProduct(product)
        mintTx = await mint1155(walletAddress, tokenId, q)
        try { await prisma.order.update({ where: { id: order.id }, data: { mintHash: mintTx } }) } catch {}
      }
    } catch (e) {
      console.warn('[Mint] failed:', e?.message || e)
    }

    return res.json({ ok: true, orderId: order.id, mintTx })
  } catch (err) {
    // B：开发期详细报错，生产隐藏
    console.error('[orders.mock] fatal', err)
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        ok: false,
        error: err?.message || 'internal_error',
        meta: err?.meta
      })
    }
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

// ---- 查询订单明细（去掉不存在字段的排序，必要时内存排序） ----
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, product: true } // 不指定具体字段，避免模型变更报错
    })
    if (!order) return res.status(404).json({ ok:false, error:'order not found' })

    // 不使用数据库 orderBy，以免引用不存在的列
    let commissions = await prisma.commission.findMany({
      where: { orderId: id }
    })

    // 若存在 level 字段，则在内存里按 level 升序；否则不排序
    if (Array.isArray(commissions) && commissions.length > 0 && 'level' in commissions[0]) {
      commissions = commissions.sort((a, b) => {
        const la = a.level ?? Number.POSITIVE_INFINITY
        const lb = b.level ?? Number.POSITIVE_INFINITY
        return la - lb
      })
    }

    return res.json(dec2str({ ok:true, order, commissions }))
  } catch (e) {
    console.error('[orders.get] fatal', e)
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ ok:false, error: e?.message || 'internal_error', meta: e?.meta })
    }
    return res.status(500).json({ ok:false, error:'internal_error' })
  }
})


/* ---------- 订单列表（分页） ---------- */
router.get('/', async (req, res) => {
  try {
    const take = Math.min(100, Math.max(1, toInt(req.query.limit ?? '20', 20)))
    const skip = Math.max(0, toInt(req.query.offset ?? '0', 0))
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }, take, skip,
      select: { id: true, status: true, qty: true, amountFiat: true, amount: true, createdAt: true }
    })
    return res.json(dec2str({ ok: true, orders, nextOffset: skip + orders.length }))
  } catch (e) {
    console.error('[orders.list] fatal', e)
    res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

export default router

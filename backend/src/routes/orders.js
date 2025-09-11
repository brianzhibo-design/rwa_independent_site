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
async function ensureUserByEmail(email) {
  return prisma.user.upsert({
    where: { email },
    create: { email },
    update: {}
  })
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

/* ---------- 创建订单（pending，返回支付链接，可选优惠券） ---------- */
router.post('/', async (req, res) => {
  try {
    const { userEmail, productId, qty = 1, couponCode, walletAddress } = req.body || {}

    if (!isEmail(userEmail)) return res.status(400).json({ ok: false, error: 'userEmail 格式不正确' })
    if (!productId || typeof productId !== 'string') return res.status(400).json({ ok: false, error: 'productId 必填' })
    const q = Math.max(1, toInt(qty, 1))

    const buyer = await ensureUserByEmail(userEmail)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' })

    let coupon = null
    if (couponCode) {
      const now = new Date()
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
      if (!coupon || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now) || (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)) {
        return res.status(400).json({ ok: false, error: 'coupon invalid' })
      }
    }

    const unitFiat = new Prisma.Decimal(product.priceFiat)
    const unitCrypto = new Prisma.Decimal(product.priceCrypto)
    let finalFiat = unitFiat
    if (coupon) {
      const discount = new Prisma.Decimal(coupon.discountValue)
      if (coupon.discountType === 'percentage') {
        finalFiat = unitFiat.mul(new Prisma.Decimal('100').minus(discount)).div(100)
      } else if (coupon.discountType === 'fixed') {
        finalFiat = unitFiat.minus(discount)
      }
      if (finalFiat.lt(0)) finalFiat = new Prisma.Decimal('0')
    }
    const amountFiat = finalFiat.mul(q)
    const amountCrypto = unitCrypto.mul(q)

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          qty: q,
          amountFiat,
          amountCrypto,
          status: 'pending',
          couponId: coupon?.id || null,
          walletAddress: walletAddress || null,
        },
        select: { id: true }
      })
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } }
        })
      }
      return o
    })

    const payUrl = `https://pay.mock/${order.id}`
    return res.json({ ok: true, orderId: order.id, payUrl })
  } catch (err) {
    console.error('[orders.create] fatal', err)
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ ok: false, error: err?.message || 'internal_error', meta: err?.meta })
    }
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

/* ---------- 创建订单（mock支付） ---------- */
router.post('/mock', async (req, res) => {
  try {
    const { userEmail, productId, qty = 1, walletAddress } = req.body || {}

    if (!isEmail(userEmail)) return res.status(400).json({ ok: false, error: 'userEmail 格式不正确' })
    if (!productId || typeof productId !== 'string') return res.status(400).json({ ok: false, error: 'productId 必填' })
    const q = Math.max(1, toInt(qty, 1))

    const buyer = await ensureUserByEmail(userEmail)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' })

    const unit  = toNum(product.priceFiat, undefined) ?? 199
    const total = unit * q
    const totalDec = new Prisma.Decimal(total.toString())

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          qty: q,
          amountFiat: totalDec,
          amountCrypto: new Prisma.Decimal('0'),
          status: 'paid',
          payRef: null
        },
        select: { id: true }
      })

      const referral = await tx.referral.findUnique({ where: { userId: buyer.id } })
      const uplineIds = [referral?.l1, referral?.l2, referral?.l3].filter(Boolean)
      const rates  = [0.06, 0.03, 0.01]

      for (let i = 0; i < uplineIds.length && i < 3; i++) {
        const rateDec = new Prisma.Decimal(rates[i].toString())
        const comAmount = totalDec.mul(rateDec)
        await tx.commission.create({
          data: {
            orderId: o.id,
            affiliateId: uplineIds[i],
            rate: rateDec,
            amountFiat: comAmount,
            amountCrypto: new Prisma.Decimal('0'),
            status: 'pending'
          }
        })
      }
      return o
    })

    let mintTx = null
    try {
      if (walletAddress && isAddr(walletAddress)) {
        const tokenId = tokenIdFromProduct(product)
        mintTx = await mint1155(walletAddress, tokenId, q)
        console.log(`[Mint] success, tx=${mintTx}`)
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { mintHash: mintTx }
        })
        console.log(`[Order Update] set mintHash=${updated.mintHash} for order ${order.id}`)
      }
    } catch (e) {
      console.warn('[Mint] failed:', e?.message || e)
    }

    return res.json({ ok: true, orderId: order.id, mintTx })
  } catch (err) {
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

/* ---------- 查询订单明细 ---------- */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, product: true, coupon: true }
    })
    if (!order) return res.status(404).json({ ok:false, error:'order not found' })

    const commissions = await prisma.commission.findMany({
      where: { orderId: id },
      include: { affiliate: true }
    })

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
      select: { id: true, status: true, qty: true, amountFiat: true, amountCrypto: true, createdAt: true }
    })
    return res.json(dec2str({ ok: true, orders, nextOffset: skip + orders.length }))
  } catch (e) {
    console.error('[orders.list] fatal', e)
    res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

export default router

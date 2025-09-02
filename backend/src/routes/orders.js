import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const r = Router()

// 保证邮箱对应的用户存在，并返回 user.id
async function getUserIdByEmail(email) {
  if (!email) return null
  const u = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  })
  console.log(`[User] ensured user for email=${email}, id=${u.id}`)
  return u.id
}

// 计算佣金
const calc = (net, ids = [], rates = [0.06, 0.03, 0.01]) =>
  ids.slice(0, 3).map((id, i) => id ? {
    level: i + 1,
    beneficiaryId: id,
    baseAmount: net,
    rate: rates[i],
    payoutCurrency: 'fiat',
    status: 'pending'
  } : null).filter(Boolean)

// 模拟支付成功，创建订单 + 佣金
r.post('/mock', async (req, res) => {
  try {
    const { userEmail, productId, qty = 1, uplines = [] } = req.body || {}
    if (!userEmail || !productId) return res.status(400).json({ ok: false, msg: 'userEmail & productId required' })

    // 确保买家存在
    const buyer = await prisma.user.upsert({ where: { email: userEmail }, update: {}, create: { email: userEmail } })
    console.log(`[Order] buyer=${buyer.email}, id=${buyer.id}`)

    // 确保上级用户存在
    const uplineIds = []
    for (const mail of uplines) {
      const id = await getUserIdByEmail(mail)
      uplineIds.push(id)
    }

    // 查询商品
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ ok: false, msg: 'product not found' })

    // 订单金额
    const amountFiat = Number(product.priceFiat) * qty

    // 创建订单（直接标记为 paid）
    const order = await prisma.order.create({
      data: { userId: buyer.id, productId, qty, amountFiat, amountCrypto: 0, status: 'paid' }
    })
    console.log(`[Order] created order=${order.id}, amount=${amountFiat}`)

    // 创建佣金
    const cms = calc(amountFiat, uplineIds).map(c => ({ ...c, orderId: order.id }))
    if (cms.length) {
      await prisma.commission.createMany({ data: cms })
      console.log(`[Commission] created ${cms.length} commissions`)
    }

    res.json({ ok: true, orderId: order.id, commissions: cms })
  } catch (e) {
    console.error(e)
    res.status(500).json({ ok: false, msg: 'server error' })
  }
})

export default r



r.get('/:id', async (req,res)=>{
  const o = await prisma.order.findUnique({
    where:{ id:req.params.id },
    include:{ commissions:true, product:true, user:true }
  })
  if(!o) return res.status(404).json({ok:false})
  res.json({ok:true, order:o})
})



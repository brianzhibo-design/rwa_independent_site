import { Router } from 'express'
import crypto from 'crypto'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const r = Router()

// Stripe example (minimal verification placeholder)
r.post('/stripe', async (req,res)=>{
  // TODO: verify signature using STRIPE_WEBHOOK_SECRET
  const event = req.body
  if(event.type === 'checkout.session.completed'){
    // mark order paid, enqueue mint
    console.log('[stripe] paid:', event.data?.object?.id)
  }
  res.json({received:true})
})

// Coinbase Commerce example (shared secret HMAC)
r.post('/coinbase', async (req,res)=>{
  // TODO: verify X-CC-Webhook-Signature with COINBASE_WEBHOOK_SHARED_SECRET
  const event = req.body
  console.log('[coinbase] event:', event.type)
  res.json({received:true})
})

// Generic payment webhook with idempotency via payRef
r.post('/payments', async (req, res) => {
  const { payRef, orderId } = req.body
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } })
      if (!order) throw new Error('notfound')
      if (order.payRef === payRef && order.status === 'paid') return

      await tx.order.update({
        where: { id: orderId },
        data: { payRef, status: 'paid' }
      })

      const referral = await tx.referral.findUnique({ where: { userId: order.userId } })
      const uplineIds = [referral?.l1, referral?.l2, referral?.l3].filter(Boolean)
      const rates = [0.06, 0.03, 0.01]
      for (let i = 0; i < uplineIds.length && i < 3; i++) {
        const rateDec = new Prisma.Decimal(rates[i].toString())
        await tx.commission.create({
          data: {
            orderId,
            affiliateId: uplineIds[i],
            rate: rateDec,
            amountFiat: order.amountFiat.mul(rateDec),
            amountCrypto: order.amountCrypto.mul(rateDec),
            status: 'pending'
          }
        })
      }
    })
    res.json({ ok: true })
  } catch (err) {
    if (err.message === 'notfound') return res.status(404).json({ error: 'order not found' })
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  }
})

export default r

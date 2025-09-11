import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const r = Router()

// helper to safely create Decimal
const toDec = (v) => {
  try {
    return new Prisma.Decimal(v ?? 0)
  } catch {
    return null
  }
}

// Create a payout request with basic validation
r.post('/', async (req, res) => {
  const { affiliateId, totalAmountFiat, totalAmountCrypto, method } = req.body || {}

  const fiat = toDec(totalAmountFiat)
  const crypto = toDec(totalAmountCrypto)

  if (!affiliateId) return res.status(400).json({ error: 'affiliateId required' })
  if (!fiat || fiat.lt(0) || !crypto || crypto.lt(0)) {
    return res.status(400).json({ error: 'invalid amount' })
  }
  if (!['bank', 'usdt', 'other'].includes(method)) {
    return res.status(400).json({ error: 'invalid method' })
  }

  try {
    const payout = await prisma.payout.create({
      data: { affiliateId, totalAmountFiat: fiat, totalAmountCrypto: crypto, method },
    })
    res.json(payout)
  } catch (err) {
    console.error('[payouts.create] fatal', err)
    res.status(500).json({ error: 'internal error' })
  }
})

export default r

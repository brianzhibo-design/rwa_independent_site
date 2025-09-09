import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const r = Router()

// Create a payout request
r.post('/', async (req, res) => {
  const { affiliateId, totalAmountFiat = 0, totalAmountCrypto = 0, method } = req.body
  try {
    const payout = await prisma.payout.create({
      data: { affiliateId, totalAmountFiat, totalAmountCrypto, method },
    })
    res.json(payout)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  }
})

export default r

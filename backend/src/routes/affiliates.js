import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const r = Router()

// List commissions for an affiliate
r.get('/:id/commissions', async (req, res) => {
  const { id } = req.params
  const { status } = req.query
  const commissions = await prisma.commission.findMany({
    where: { affiliateId: id, ...(status ? { status } : {}) },
  })
  res.json(commissions)
})

export default r

import { Router } from 'express'
import { mint1155 } from '../services/chain/mint.js'

const router = Router()

router.get('/env', (_req, res) => {
  const mask = (s='') => s && s.length>8 ? s.slice(0,4)+'****'+s.slice(-4) : s
  res.json({
    ok: true,
    RWA_ERC1155_ADDRESS: process.env.RWA_ERC1155_ADDRESS || null,
    CHAIN_RPC_URL: process.env.CHAIN_RPC_URL ? 'set' : 'missing',
    PRIVATE_KEY: process.env.PRIVATE_KEY ? mask(process.env.PRIVATE_KEY) : 'missing'
  })
})

router.post('/mint', async (req, res) => {
  try {
    const { to, id = 1, amount = 1 } = req.body || {}
    if (!to) return res.status(400).json({ ok:false, error:'missing to' })
    const tx = await mint1155(to, id, amount)
    res.json({ ok:true, tx })
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) })
  }
})

export default router

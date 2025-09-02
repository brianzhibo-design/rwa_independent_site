
import { Router } from 'express'
import crypto from 'crypto'

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

export default r

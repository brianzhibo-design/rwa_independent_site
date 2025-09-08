import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import webhookRoutes from './routes/webhooks.js'
import redemptionRoutes from './routes/redemptions.js'
import orderRoutes from './routes/orders.js'
import affiliateRoutes from './routes/affiliates.js'
import payoutRoutes from './routes/payouts.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_, res) => res.json({ ok: true }))
app.use('/webhooks', webhookRoutes)
app.use('/redemptions', redemptionRoutes)
app.use('/orders', orderRoutes)
app.use('/affiliates', affiliateRoutes)
app.use('/payouts', payoutRoutes)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`[API] listening on :${port}`))


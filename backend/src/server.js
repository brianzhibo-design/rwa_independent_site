import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Import routes
import ordersRouter from './routes/orders.js'
import webhooksRouter from './routes/webhooks.js'
import debugRouter from './routes/debug.js'
import affiliatesRouter from './routes/affiliates.js'
import payoutsRouter from './routes/payouts.js'
import redemptionsRouter from './routes/redemptions.js'
import paymentsRouter from './routes/payments.js'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())

// Special middleware for webhooks (raw body needed for signature verification)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }))

// Regular JSON middleware for other routes
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// API routes
app.use('/orders', ordersRouter)
app.use('/webhooks', webhooksRouter)
app.use('/debug', debugRouter)
app.use('/affiliates', affiliatesRouter)
app.use('/payouts', payoutsRouter)
app.use('/redemptions', redemptionsRouter)
app.use('/payments', paymentsRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ 
    ok: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RWA Backend running on port ${PORT}`)
  console.log(`📱 Health check: http://localhost:${PORT}/health`)
  
  // Environment validation
  const requiredEnvVars = [
    'DATABASE_URL',
    'CHAIN_RPC_URL', 
    'RWA_ERC1155_ADDRESS',
    'PRIVATE_KEY',
    'CHAIN_ID'
  ]
  
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`)
    console.warn('⚠️  Some features may not work properly')
  }

  // Stripe configuration check
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set - payments will not work')
  } else {
    console.log('✅ Stripe configured')
  }

  // Optional inline worker (Phase 3)
  if (process.env.ENABLE_INLINE_WORKER === 'true') {
    console.log('🔄 Inline mint worker enabled')
    // Note: Worker implementation will be added in Phase 3
  }
})

export default app
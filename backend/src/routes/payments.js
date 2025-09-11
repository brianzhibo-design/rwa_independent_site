import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const router = Router()
const prisma = new PrismaClient()

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * Create Stripe Checkout Session
 * POST /payments/stripe/checkout
 * Body: { orderId: string, successUrl: string, cancelUrl: string }
 */
router.post('/stripe/checkout', async (req, res) => {
  try {
    const { orderId, successUrl, cancelUrl } = req.body || {}

    // Input validation
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'orderId is required and must be a string' 
      })
    }

    if (!successUrl || typeof successUrl !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'successUrl is required and must be a string' 
      })
    }

    if (!cancelUrl || typeof cancelUrl !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'cancelUrl is required and must be a string' 
      })
    }

    // Validate order exists and is pending
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        user: { select: { email: true } },
        product: { select: { title: true, sku: true } }
      }
    })

    if (!order) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Order not found' 
      })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        ok: false, 
        error: `Order status is '${order.status}', must be 'pending' to create checkout` 
      })
    }

    // Validate amount is positive
    const amountFiat = Number(order.amountFiat)
    if (amountFiat <= 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Order amount must be greater than 0' 
      })
    }

    // Build line items for Stripe
    const lineItems = [{
      price_data: {
        currency: 'usd', // TODO: Support multiple currencies
        product_data: {
          name: order.product.title,
          metadata: {
            sku: order.product.sku,
            orderId: order.id,
          }
        },
        unit_amount: Math.round(amountFiat * 100), // Convert to cents, rounded
      },
      quantity: order.qty,
    }]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        userEmail: order.user.email,
      },
      customer_email: order.user.email,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    })

    return res.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    })

  } catch (error) {
    console.error('[Payments] Checkout creation failed:', error)
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        ok: false, 
        error: `Stripe error: ${error.message}` 
      })
    }

    // Generic error for production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ 
        ok: false, 
        error: 'Internal server error' 
      })
    }

    // Detailed error for development
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error',
      meta: error.meta 
    })
  }
})

export default router
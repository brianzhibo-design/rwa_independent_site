import { Router } from 'express'
import Stripe from 'stripe'
import { PrismaClient, Prisma } from '@prisma/client'
import { 
  validateOrderExists, 
  processCommissionDistribution, 
  handleWebhookError,
  validateAmount 
} from '../services/webhookProcessor.js'
import { createMintJob } from '../services/mintQueue.js'

const prisma = new PrismaClient()
const router = Router()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

/**
 * 从 Product SKU 生成 tokenId
 */
function tokenIdFromSku(sku) {
  if (!sku) return 1
  let hash = 0
  for (const char of sku) {
    hash = (hash * 131 + char.charCodeAt(0)) % 1000000007
  }
  return (hash % 1000000) || 1
}

/**
 * 验证 Stripe webhook 签名
 */
function verifyStripeSignature(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    return event
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error.message)
    throw new Error(`Webhook signature verification failed: ${error.message}`)
  }
}

/**
 * 确保事件幂等性
 */
async function ensureEventIdempotency(eventId) {
  try {
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        provider: 'stripe',
        type: 'unknown',
        payload: {}
      }
    })
    return false // 第一次处理
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      console.log(`[Webhook] Event ${eventId} already processed (idempotent)`)
      return true // 已处理过
    }
    throw error
  }
}

/**
 * 处理支付成功事件
 */
async function processPaymentSuccess(event) {
  const session = event.data.object
  const { orderId, userEmail } = session.metadata || {}

  if (!orderId) {
    console.warn(`[Webhook] No orderId in metadata for session ${session.id}`)
    return { success: false, reason: 'missing_order_id' }
  }

  console.log(`[Webhook] Processing payment for order ${orderId}`)

  try {
    // 验证订单存在
    const order = await validateOrderExists(orderId)
    
    // 验证用户邮箱匹配
    if (userEmail && order.user.email !== userEmail) {
      console.warn(`[Webhook] Email mismatch: order=${order.user.email}, session=${userEmail}`)
    }

    // 验证金额匹配
    const isAmountValid = validateAmount(
      order.amountFiat, 
      session.amount_total, 
      session.currency
    )
    
    if (!isAmountValid) {
      console.error(`[Webhook] Amount validation failed for order ${orderId}`)
      return { success: false, reason: 'amount_mismatch' }
    }

    const payRef = session.payment_intent || session.id

    // 使用事务处理订单更新和佣金创建
    const result = await prisma.$transaction(async (tx) => {
      // 检查订单是否已经支付且 payRef 相同（幂等性）
      if (order.status === 'paid' && order.payRef === payRef) {
        console.log(`[Webhook] Order ${orderId} already paid with same payRef (idempotent)`)
        return { updated: false, commissions: [], mintJobCreated: false }
      }

      // 更新订单状态
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: 'paid', 
          payRef: payRef 
        }
      })

      // 处理佣金分发
      const commissions = await processCommissionDistribution(updatedOrder, tx)

      // 创建铸造任务（如果有钱包地址）
      let mintJobCreated = false
      if (updatedOrder.walletAddress) {
        try {
          // 获取产品信息以生成 tokenId
          const product = await tx.product.findUnique({ 
            where: { id: updatedOrder.productId },
            select: { sku: true }
          })
          
          const tokenId = tokenIdFromSku(product?.sku)
          
          // 创建铸造任务（在事务外创建，因为 createMintJob 有自己的幂等处理）
          console.log(`[Webhook] Creating mint job for order ${updatedOrder.id}, wallet: ${updatedOrder.walletAddress}`)
          mintJobCreated = true
          
          // 注意：这里我们标记需要创建 mint job，但实际创建在事务外进行
          // 以避免事务嵌套问题
          
        } catch (error) {
          console.error(`[Webhook] Failed to prepare mint job for order ${orderId}:`, error.message)
          // 不阻塞支付处理，铸造可以稍后手动重试
        }
      } else {
        console.log(`[Webhook] No wallet address for order ${orderId}, skipping mint job creation`)
      }

      return { updated: true, commissions, mintJobCreated, updatedOrder }
    })

    // 在事务外创建 mint job（避免嵌套事务问题）
    if (result.mintJobCreated && result.updatedOrder) {
      try {
        const product = await prisma.product.findUnique({ 
          where: { id: result.updatedOrder.productId },
          select: { sku: true }
        })
        
        const tokenId = tokenIdFromSku(product?.sku)
        
        await createMintJob(
          result.updatedOrder.id,
          result.updatedOrder.walletAddress,
          tokenId,
          result.updatedOrder.qty
        )
        
        console.log(`[Webhook] Successfully created mint job for order ${orderId}`)
      } catch (error) {
        console.error(`[Webhook] Failed to create mint job for order ${orderId}:`, error.message)
        // 记录错误但不阻塞 webhook 处理
      }
    }

    console.log(`[Webhook] Successfully processed payment for order ${orderId}`)
    return { success: true, ...result }

  } catch (error) {
    handleWebhookError(error, event.id)
    throw error
  }
}

/**
 * Stripe webhook 主处理器
 */
router.post('/stripe', async (req, res) => {
  // 调试信息
  console.log('[DEBUG] ===== Webhook Debug Info =====')
  console.log('[DEBUG] Headers received:', Object.keys(req.headers))
  console.log('[DEBUG] Stripe signature header:', req.headers['stripe-signature'] ? 'present' : 'missing')
  console.log('[DEBUG] Request body type:', typeof req.body)
  console.log('[DEBUG] Request body length:', req.body?.length)
  console.log('[DEBUG] Webhook secret configured:', process.env.STRIPE_WEBHOOK_SECRET ? 'yes' : 'no')
  console.log('[DEBUG] Raw body sample:', req.body?.toString()?.substring(0, 100))
  console.log('[DEBUG] ================================')
  
  const signature = req.headers['stripe-signature']
  
  if (!signature) {
    console.warn('[Webhook] Missing Stripe signature')
    return res.status(400).json({ error: 'Missing signature' })
  }

  try {
    // 验证签名
    const event = verifyStripeSignature(req.body, signature)
    console.log(`[Webhook] Signature verified for event: ${event.id}, type: ${event.type}`)
    
    // 检查事件幂等性
    const alreadyProcessed = await ensureEventIdempotency(event.id)
    if (alreadyProcessed) {
      return res.json({ received: true, processed: 'idempotent' })
    }

    // 更新 webhook 事件记录
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { 
        type: event.type,
        payload: event
      }
    })

    console.log(`[Webhook] Processing ${event.type} event: ${event.id}`)

    // 处理支持的事件类型
    switch (event.type) {
      case 'checkout.session.completed':
        await processPaymentSuccess(event)
        break
        
      case 'payment_intent.succeeded':
        console.log(`[Webhook] Payment intent succeeded: ${event.data.object.id}`)
        break
        
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    res.json({ received: true, processed: true })

  } catch (error) {
    console.error('[Webhook] Processing failed:', error.message)
    console.error('[Webhook] Error stack:', error.stack)
    
    // 对于签名验证失败，返回 400
    if (error.message.includes('signature verification')) {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // 对于其他错误，返回 200 避免 Stripe 重试风暴
    res.status(200).json({ 
      received: true, 
      processed: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : error.message
    })
  }
})

// Coinbase Commerce webhook
router.post('/coinbase', async (req, res) => {
  console.log('[Coinbase] Webhook received:', req.body?.type)
  res.json({ received: true })
})

// 通用支付 webhook（向后兼容）
router.post('/payments', async (req, res) => {
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

export default router
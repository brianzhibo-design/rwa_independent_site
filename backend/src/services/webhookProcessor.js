import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 验证订单是否存在
 */
export async function validateOrderExists(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true }
  })
  
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }
  
  return order
}

/**
 * 处理佣金分发
 */
export async function processCommissionDistribution(order, tx = prisma) {
  const referral = await tx.referral.findUnique({ 
    where: { userId: order.userId } 
  })
  
  if (!referral) {
    console.log(`[Commission] No referral found for user ${order.userId}`)
    return []
  }

  const uplineIds = [referral.l1, referral.l2, referral.l3].filter(Boolean)
  const rates = [0.06, 0.03, 0.01] // 6% -> 3% -> 1%
  const commissions = []

  for (let i = 0; i < uplineIds.length && i < 3; i++) {
    const rateDec = new Prisma.Decimal(rates[i].toString())
    const amountFiat = order.amountFiat.mul(rateDec)
    const amountCrypto = order.amountCrypto.mul(rateDec)

    const commission = await tx.commission.create({
      data: {
        orderId: order.id,
        affiliateId: uplineIds[i],
        rate: rateDec,
        amountFiat,
        amountCrypto,
        status: 'pending'
      }
    })
    
    commissions.push(commission)
    console.log(`[Commission] Created L${i+1} commission: ${amountFiat} for ${uplineIds[i]}`)
  }

  return commissions
}

/**
 * 处理 webhook 错误
 */
export function handleWebhookError(error, eventId) {
  console.error(`[Webhook] Error processing event ${eventId}:`, error)
}

/**
 * 验证金额匹配（允许小额误差）
 */
export function validateAmount(orderAmount, stripeAmount, currency = 'usd') {
  if (currency !== 'usd') {
    console.warn(`[Amount] Unsupported currency: ${currency}`)
    return false
  }

  const orderCents = Math.round(Number(orderAmount) * 100)
  const stripeCents = stripeAmount
  const tolerance = 1 // 允许 1 分钱误差

  const isValid = Math.abs(orderCents - stripeCents) <= tolerance
  
  if (!isValid) {
    console.warn(`[Amount] Mismatch: order=${orderCents}¢, stripe=${stripeCents}¢`)
  }

  return isValid
}

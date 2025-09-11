import { test, describe, before, after, mock } from 'node:test'
import assert from 'node:assert'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: mock.fn()
    }
  }
}

// Mock the payments router with mocked Stripe
mock.method(await import('stripe'), 'default', () => mockStripe)

const { default: paymentsRouter } = await import('../routes/payments.js')

// Test helper to simulate Express request/response
function createMockReqRes(body = {}, params = {}, query = {}) {
  const req = { body, params, query }
  const res = {
    status: mock.fn(function() { return this }),
    json: mock.fn(function() { return this }),
    send: mock.fn(function() { return this })
  }
  return { req, res }
}

describe('Payments Router', () => {
  let testUser, testProduct, testOrder

  before(async () => {
    // Cleanup any existing test data
    await prisma.order.deleteMany({ where: { user: { email: 'test@example.com' } } })
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } })
    await prisma.product.deleteMany({ where: { sku: 'TEST-SKU-001' } })

    // Create test data
    testUser = await prisma.user.create({
      data: { email: 'test@example.com' }
    })

    testProduct = await prisma.product.create({
      data: {
        title: 'Test Product',
        sku: 'TEST-SKU-001',
        priceFiat: '199.99',
        priceCrypto: '0.1',
        rwaType: 'commodity',
        chainId: 11155111, // Sepolia
        contract: '0x1234567890123456789012345678901234567890',
        tokenType: 'ERC1155',
        redeemPolicy: {},
        status: 'active'
      }
    })

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        productId: testProduct.id,
        qty: 1,
        amountFiat: '199.99',
        amountCrypto: '0.1',
        status: 'pending'
      }
    })
  })

  after(async () => {
    // Cleanup test data
    await prisma.order.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.$disconnect()
  })

  test('POST /stripe/checkout - 正常创建支付会话', async () => {
    // Mock successful Stripe response
    const mockSession = {
      id: 'cs_test_123456',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123456'
    }
    mockStripe.checkout.sessions.create.mock.mockImplementationOnce(() => mockSession)

    const { req, res } = createMockReqRes({
      orderId: testOrder.id,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    // Find and execute the route handler
    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    // Verify Stripe was called with correct parameters
    const stripeCall = mockStripe.checkout.sessions.create.mock.calls[0][0]
    assert.strictEqual(stripeCall.mode, 'payment')
    assert.strictEqual(stripeCall.metadata.orderId, testOrder.id)
    assert.strictEqual(stripeCall.metadata.userEmail, 'test@example.com')
    assert.strictEqual(stripeCall.line_items[0].price_data.unit_amount, 19999) // $199.99 in cents

    // Verify response
    assert.strictEqual(res.json.mock.calls[0][0].ok, true)
    assert.strictEqual(res.json.mock.calls[0][0].url, mockSession.url)
    assert.strictEqual(res.json.mock.calls[0][0].sessionId, mockSession.id)
  })

  test('POST /stripe/checkout - 订单不存在', async () => {
    const { req, res } = createMockReqRes({
      orderId: 'non-existent-order',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    assert.strictEqual(res.status.mock.calls[0][0], 404)
    assert.strictEqual(res.json.mock.calls[0][0].ok, false)
    assert.match(res.json.mock.calls[0][0].error, /Order not found/)
  })

  test('POST /stripe/checkout - 订单非 pending 状态', async () => {
    // Create a paid order
    const paidOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        productId: testProduct.id,
        qty: 1,
        amountFiat: '199.99',
        amountCrypto: '0.1',
        status: 'paid'
      }
    })

    const { req, res } = createMockReqRes({
      orderId: paidOrder.id,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    assert.strictEqual(res.status.mock.calls[0][0], 400)
    assert.strictEqual(res.json.mock.calls[0][0].ok, false)
    assert.match(res.json.mock.calls[0][0].error, /must be 'pending'/)

    // Cleanup
    await prisma.order.delete({ where: { id: paidOrder.id } })
  })

  test('POST /stripe/checkout - 金额为零', async () => {
    // Create zero amount order
    const zeroOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        productId: testProduct.id,
        qty: 1,
        amountFiat: '0',
        amountCrypto: '0',
        status: 'pending'
      }
    })

    const { req, res } = createMockReqRes({
      orderId: zeroOrder.id,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    assert.strictEqual(res.status.mock.calls[0][0], 400)
    assert.strictEqual(res.json.mock.calls[0][0].ok, false)
    assert.match(res.json.mock.calls[0][0].error, /must be greater than 0/)

    // Cleanup
    await prisma.order.delete({ where: { id: zeroOrder.id } })
  })

  test('POST /stripe/checkout - 缺少必填参数', async () => {
    const { req, res } = createMockReqRes({
      orderId: testOrder.id,
      // Missing successUrl and cancelUrl
    })

    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    assert.strictEqual(res.status.mock.calls[0][0], 400)
    assert.strictEqual(res.json.mock.calls[0][0].ok, false)
    assert.match(res.json.mock.calls[0][0].error, /successUrl is required/)
  })

  test('POST /stripe/checkout - Stripe API 失败', async () => {
    // Mock Stripe API failure
    mockStripe.checkout.sessions.create.mock.mockImplementationOnce(() => {
      const error = new Error('Your card was declined.')
      error.type = 'StripeCardError'
      throw error
    })

    const { req, res } = createMockReqRes({
      orderId: testOrder.id,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    const route = paymentsRouter.stack.find(r => r.route?.path === '/stripe/checkout')
    const handler = route.route.stack.find(s => s.method === 'post').handle

    await handler(req, res)

    assert.strictEqual(res.status.mock.calls[0][0], 400)
    assert.strictEqual(res.json.mock.calls[0][0].ok, false)
    assert.match(res.json.mock.calls[0][0].error, /Stripe error/)
  })
})
import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('Payments Router Tests', () => {
  
  test('应该能正确导入 payments 路由', async () => {
    const { default: paymentsRouter } = await import('../routes/payments.js')
    assert.ok(paymentsRouter)
    assert.ok(paymentsRouter.stack)
    console.log('✓ Payments router imported successfully')
  })

  test('应该能正确导入 Stripe', async () => {
    try {
      const Stripe = (await import('stripe')).default
      assert.ok(Stripe)
      console.log('✓ Stripe module imported successfully')
    } catch (error) {
      assert.fail(`Stripe import failed: ${error.message}`)
    }
  })

  test('应该有正确的环境变量配置', () => {
    import('dotenv').then(dotenv => dotenv.config())
    
    // 检查是否有 Stripe 密钥
    const hasStripeKey = process.env.STRIPE_SECRET_KEY && 
                        process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
    
    assert.ok(hasStripeKey, 'STRIPE_SECRET_KEY should be set and start with sk_test_')
    console.log('✓ Environment variables configured correctly')
  })

  test('Stripe 密钥格式应该正确', () => {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    assert.ok(stripeKey, 'STRIPE_SECRET_KEY should be set')
    assert.ok(stripeKey.startsWith('sk_test_'), 'Should be test key')
    assert.ok(stripeKey.length > 50, 'Key should be sufficiently long')
    console.log('✓ Stripe key format is correct')
  })

  test('应该能创建 Stripe 客户端', async () => {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16'
      })
      assert.ok(stripe)
      console.log('✓ Stripe client created successfully')
    } catch (error) {
      assert.fail(`Stripe client creation failed: ${error.message}`)
    }
  })

  test('路由应该有 checkout 端点', async () => {
    const { default: paymentsRouter } = await import('../routes/payments.js')
    
    // 查找 checkout 路由
    const checkoutRoute = paymentsRouter.stack.find(layer => 
      layer.route && layer.route.path === '/stripe/checkout'
    )
    
    assert.ok(checkoutRoute, 'Should have /stripe/checkout route')
    
    // 检查是否有 POST 方法
    const postMethod = checkoutRoute.route.stack.find(layer => 
      layer.method === 'post'
    )
    
    assert.ok(postMethod, 'Checkout route should accept POST method')
    console.log('✓ Checkout endpoint configured correctly')
  })
})

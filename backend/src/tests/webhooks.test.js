import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('Webhook Tests', () => {
  test('应该能导入 webhook 处理器', async () => {
    const { default: webhooksRouter } = await import('../routes/webhooks.js')
    assert.ok(webhooksRouter)
    console.log('✓ Webhooks router imported successfully')
  })

  test('应该能导入 webhook 服务', async () => {
    const services = await import('../services/webhookProcessor.js')
    assert.ok(services.validateOrderExists)
    assert.ok(services.processCommissionDistribution)
    assert.ok(services.handleWebhookError)
    console.log('✓ Webhook services imported successfully')
  })

  test('金额验证应该正常工作', async () => {
    const { validateAmount } = await import('../services/webhookProcessor.js')
    
    // 测试正确的金额
    assert.ok(validateAmount('199.99', 19999))
    
    // 测试允许的误差范围
    assert.ok(validateAmount('199.99', 19998)) // 1分误差
    
    // 测试超出误差范围
    assert.ok(!validateAmount('199.99', 19990)) // 9分误差
    
    console.log('✓ Amount validation works correctly')
  })

  test('环境变量应该包含必要配置', () => {
    const hasStripeSecret = typeof process.env.STRIPE_SECRET_KEY === 'string'
    const hasWebhookSecret = typeof process.env.STRIPE_WEBHOOK_SECRET === 'string'
    
    assert.ok(hasStripeSecret, 'Should have STRIPE_SECRET_KEY')
    console.log('✓ Environment configuration checked')
  })
})

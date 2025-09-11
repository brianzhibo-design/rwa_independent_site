import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCompleteFlow() {
  const orderId = 'cmff1bdmf0003mg2n8jeidhg9'
  
  try {
    // 模拟 webhook 处理：将订单标记为已支付
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'paid',
        payRef: 'test_payment_' + Date.now()
      }
    })
    
    console.log(`订单 ${orderId} 已标记为 paid`)
    
    // 模拟创建铸造任务
    const { createMintJob } = await import('./src/services/mintQueue.js')
    
    if (order.walletAddress) {
      const tokenId = 1 // 简化的 tokenId
      await createMintJob(orderId, order.walletAddress, tokenId, order.qty)
      console.log(`已为订单 ${orderId} 创建铸造任务`)
      
      // 等待 worker 处理
      console.log('等待 worker 处理铸造任务...')
      
      // 检查铸造状态
      setTimeout(async () => {
        const job = await prisma.mintJob.findUnique({ where: { orderId } })
        const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } })
        
        console.log('铸造任务状态:', job?.status)
        console.log('订单 mintHash:', updatedOrder?.mintHash || 'None')
        
        await prisma.$disconnect()
      }, 10000) // 10秒后检查
      
    } else {
      console.log('订单没有钱包地址')
      await prisma.$disconnect()
    }
    
  } catch (error) {
    console.error('测试失败:', error.message)
    await prisma.$disconnect()
  }
}

testCompleteFlow()

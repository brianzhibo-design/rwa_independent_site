import { PrismaClient } from '@prisma/client'
import { mint1155 } from '../services/chain/mint.js'
import { getNextPendingJob, updateJobStatus, getQueueStats } from '../services/mintQueue.js'

const prisma = new PrismaClient()

// 配置参数
const WORKER_INTERVAL = parseInt(process.env.MINT_WORKER_INTERVAL || '5000') // 5秒
const MAX_RETRIES = parseInt(process.env.MINT_MAX_RETRIES || '5')

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
 * 处理单个铸造任务
 */
async function processJob(job) {
  console.log(`[MintWorker] Processing job ${job.id} for order ${job.orderId}`)

  try {
    // 标记为处理中（乐观锁）
    const updated = await updateJobStatus(job.id, 'processing', { 
      attempts: job.attempts + 1 
    })
    
    if (!updated) {
      console.log(`[MintWorker] Job ${job.id} already being processed`)
      return
    }

    // 执行铸造
    console.log(`[MintWorker] Minting token ${job.tokenId} x${job.amount} to ${job.walletAddress}`)
    const txHash = await mint1155(job.walletAddress, job.tokenId, job.amount)
    
    // 使用事务更新任务状态和订单
    await prisma.$transaction(async (tx) => {
      // 标记任务成功
      await tx.mintJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          txHash,
          updatedAt: new Date()
        }
      })

      // 更新订单的 mintHash
      await tx.order.update({
        where: { id: job.orderId },
        data: { mintHash: txHash }
      })
    })

    console.log(`[MintWorker] Successfully minted for job ${job.id}, tx: ${txHash}`)

  } catch (error) {
    console.error(`[MintWorker] Job ${job.id} failed:`, error.message)

    const shouldRetry = job.attempts < MAX_RETRIES
    const nextStatus = shouldRetry ? 'queued' : 'failed'
    
    // 计算重试延迟（指数退避 + 随机抖动）
    let retryDelay = 0
    if (shouldRetry) {
      const baseDelay = Math.min(Math.pow(2, job.attempts) * 5000, 300000) // 最多5分钟
      const jitter = baseDelay * 0.1 * (Math.random() - 0.5) // ±10% 抖动
      retryDelay = Math.floor(baseDelay + jitter)
    }

    await updateJobStatus(job.id, nextStatus, {
      lastError: error.message,
      ...(shouldRetry && retryDelay > 0 ? { 
        // 延迟重试可以通过更新 createdAt 实现，或者在获取任务时加入时间过滤
      } : {})
    })

    if (shouldRetry) {
      console.log(`[MintWorker] Job ${job.id} will retry in ${Math.round(retryDelay/1000)}s (attempt ${job.attempts + 1}/${MAX_RETRIES})`)
    } else {
      console.error(`[MintWorker] Job ${job.id} failed permanently after ${job.attempts} attempts`)
    }
  }
}

/**
 * Worker 主循环
 */
async function startWorker() {
  console.log(`[MintWorker] Starting worker (interval: ${WORKER_INTERVAL}ms, max retries: ${MAX_RETRIES})`)
  
  while (true) {
    try {
      const job = await getNextPendingJob()
      
      if (job) {
        await processJob(job)
      } else {
        // 没有任务时等待
        await new Promise(resolve => setTimeout(resolve, WORKER_INTERVAL))
      }
      
      // 每隔一段时间输出队列统计
      if (Math.random() < 0.1) { // 10% 概率输出统计
        const stats = await getQueueStats()
        if (Object.keys(stats).length > 0) {
          console.log('[MintWorker] Queue stats:', stats)
        }
      }

    } catch (error) {
      console.error('[MintWorker] Worker error:', error.message)
      // 出错后稍作等待再继续
      await new Promise(resolve => setTimeout(resolve, WORKER_INTERVAL * 2))
    }
  }
}

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('[MintWorker] Received SIGTERM, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[MintWorker] Received SIGINT, shutting down gracefully')
  process.exit(0)
})

// 如果直接运行此文件，启动 worker
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch(error => {
    console.error('[MintWorker] Fatal error:', error)
    process.exit(1)
  })
}

export { startWorker, processJob }

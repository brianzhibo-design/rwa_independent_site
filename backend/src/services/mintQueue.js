import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 创建铸造任务（幂等性）
 */
export async function createMintJob(orderId, walletAddress, tokenId, amount) {
  try {
    const job = await prisma.mintJob.create({
      data: {
        orderId,
        walletAddress,
        tokenId,
        amount,
        status: 'queued'
      }
    })
    console.log(`[MintQueue] Created job ${job.id} for order ${orderId}`)
    return job
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint on orderId
      console.log(`[MintQueue] Job for order ${orderId} already exists (idempotent)`)
      return await prisma.mintJob.findUnique({ where: { orderId } })
    }
    throw error
  }
}

/**
 * 获取下一个待处理任务
 */
export async function getNextPendingJob() {
  const job = await prisma.mintJob.findFirst({
    where: {
      OR: [
        { status: 'queued' },
        { 
          status: 'processing',
          updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } // 10分钟超时
        }
      ]
    },
    orderBy: { createdAt: 'asc' }
  })

  return job
}

/**
 * 更新任务状态（乐观锁）
 */
export async function updateJobStatus(jobId, status, data = {}) {
  try {
    const updated = await prisma.mintJob.update({
      where: { 
        id: jobId,
        // 乐观锁：只有当前状态允许的情况下才更新
        ...(status === 'processing' ? { status: { in: ['queued'] } } : {})
      },
      data: {
        status,
        updatedAt: new Date(),
        ...data
      }
    })
    return updated
  } catch (error) {
    if (error.code === 'P2025') { // Record not found (乐观锁失败)
      console.log(`[MintQueue] Job ${jobId} already being processed by another worker`)
      return null
    }
    throw error
  }
}

/**
 * 获取队列统计
 */
export async function getQueueStats() {
  const stats = await prisma.mintJob.groupBy({
    by: ['status'],
    _count: { status: true }
  })
  
  return stats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.status
    return acc
  }, {})
}

import { PrismaClient } from '@prisma/client'
import { createPrismaClientOptions } from '../lib/prisma-client-options'

const prisma = new PrismaClient(createPrismaClientOptions())

async function verifyData() {
  console.log('🔍 驗證數據庫數據...\n')

  // 檢查用戶
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log('👥 用戶列表:')
  console.log('─'.repeat(80))
  users.forEach(user => {
    const roleBadge = user.role === 'ADMIN' ? '🛡️  ADMIN' : '👤 USER'
    console.log(`ID: ${user.id.toString().padEnd(12)} | ${user.email.padEnd(30)} | ${user.name?.padEnd(15) || 'N/A'} | ${roleBadge}`)
  })
  console.log('─'.repeat(80))
  console.log(`總用戶數: ${users.length}`)
  console.log(`管理員數: ${users.filter(u => u.role === 'ADMIN').length}`)
  console.log(`一般用戶數: ${users.filter(u => u.role === 'USER').length}\n`)

  // 檢查日記
  const diaries = await prisma.diary.findMany({
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log('📔 日記列表:')
  console.log('─'.repeat(80))
  diaries.forEach(diary => {
    const roleBadge = diary.user.role === 'ADMIN' ? 'ADMIN' : 'USER'
    console.log(`ID: ${diary.id.toString().padEnd(12)} | ${diary.title.padEnd(30)} | 作者: ${diary.user.email} (${roleBadge})`)
  })
  console.log('─'.repeat(80))
  console.log(`總日記數: ${diaries.length}\n`)

  // 檢查統計數據
  const stats = {
    users: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { role: 'ADMIN' } }),
    regularUsers: await prisma.user.count({ where: { role: 'USER' } }),
    diaries: await prisma.diary.count(),
    alerts: await prisma.alert.count(),
    transactions: await prisma.transaction.count()
  }

  console.log('📊 系統統計:')
  console.log('─'.repeat(40))
  console.log(`用戶總數:     ${stats.users}`)
  console.log(`  - 管理員:   ${stats.adminUsers}`)
  console.log(`  - 一般用戶: ${stats.regularUsers}`)
  console.log(`日記總數:     ${stats.diaries}`)
  console.log(`提醒總數:     ${stats.alerts}`)
  console.log(`交易總數:     ${stats.transactions}`)
  console.log('─'.repeat(40))

  console.log('\n✅ 驗證完成！')
  console.log('\n🔑 測試帳號:')
  console.log('   管理員: admin@example.com / password123')
  console.log('   用戶1:  test@example.com / password123')
  console.log('   用戶2:  user2@example.com / password123')
}

verifyData()
  .catch((e) => {
    console.error('❌ 驗證失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

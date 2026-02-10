import { PrismaClient, TransactionType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 清理現有數據（可選，用於重新生成種子數據）
  // await prisma.transaction.deleteMany()
  // await prisma.alert.deleteMany()
  // await prisma.diary.deleteMany()
  // await prisma.user.deleteMany()

  // 創建測試用戶
  const hashedPassword = await bcrypt.hash('password123', 10)

  // 管理員用戶 - 系統管理員
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: '系統管理員',
      role: UserRole.ADMIN,
      expectedMonthlyTrades: 50,
      expectedProfit: 10000.00,
      expectedAvgHolding: 500000.00
    }
  })

  // 用戶 1 - 主要測試用戶
  const user1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: '測試用戶',
      role: UserRole.USER,
      expectedMonthlyTrades: 20,
      expectedProfit: 5000.00,
      expectedAvgHolding: 100000.00
    }
  })

  // 用戶 2 - 第二個測試用戶（用於測試數據隔離）
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      password: hashedPassword,
      name: '投資者二號',
      role: UserRole.USER,
      expectedMonthlyTrades: 10,
      expectedProfit: 3000.00,
      expectedAvgHolding: 50000.00
    }
  })

  console.log('創建測試用戶:')
  console.log('- admin@example.com / password123 (ADMIN)')
  console.log('- test@example.com / password123 (USER)')
  console.log('- user2@example.com / password123 (USER)')

  // 建立範例日記（屬於用戶 1）
  const diary1 = await prisma.diary.create({
    data: {
      userId: user1.id,
      title: '市場分析 - 2025年2月',
      content: '# AAPL 分析\n\n蘋果公司今日表現強勁，財報超出預期。\n\n## 重點\n- 營收成長 15%\n- iPhone 銷量創新高\n\n## 未來展望\n預計下季持續看好。',
      transactions: {
        create: [
          {
            symbol: 'AAPL',
            type: TransactionType.BUY,
            quantity: 100,
            price: 150.25,
            tradeDate: new Date('2025-02-01T09:30:00Z')
          },
          {
            symbol: 'TSLA',
            type: TransactionType.BUY,
            quantity: 50,
            price: 200.50,
            tradeDate: new Date('2025-02-01T10:00:00Z')
          }
        ]
      }
    }
  })

  // 建立範例提醒
  await prisma.alert.create({
    data: {
      diaryId: diary1.id,
      message: '檢視 AAPL 部位 - 財報後評估',
      triggerAt: new Date('2025-03-01T09:00:00Z')
    }
  })

  // 建立第二篇日記（屬於用戶 1）
  const diary2 = await prisma.diary.create({
    data: {
      userId: user1.id,
      title: '投資策略調整',
      content: '決定增加科技股比重，減少傳統產業配置。',
      transactions: {
        create: [
          {
            symbol: 'NVDA',
            type: TransactionType.BUY,
            quantity: 30,
            price: 450.00,
            tradeDate: new Date('2025-02-05T09:30:00Z')
          },
          {
            symbol: 'MSFT',
            type: TransactionType.BUY,
            quantity: 40,
            price: 320.00,
            tradeDate: new Date('2025-02-05T10:00:00Z')
          }
        ]
      }
    }
  })

  // 建立第二個提醒
  await prisma.alert.create({
    data: {
      diaryId: diary2.id,
      message: '重新評估投資組合',
      triggerAt: new Date('2025-04-01T09:00:00Z')
    }
  })

  // 建立第三篇日記 - 包含賣出交易（屬於用戶 1）
  const diary3 = await prisma.diary.create({
    data: {
      userId: user1.id,
      title: '獲利了結',
      content: '今日賣出部分 TSLA 持股，獲利 20%。',
      transactions: {
        create: [
          {
            symbol: 'TSLA',
            type: TransactionType.SELL,
            quantity: 25,
            price: 240.60,
            tradeDate: new Date('2025-02-10T14:30:00Z')
          }
        ]
      }
    }
  })

  // 為用戶 2 創建一些日記（用於測試數據隔離）
  const diary4 = await prisma.diary.create({
    data: {
      userId: user2.id,
      title: '用戶2的投資日記',
      content: '這是用戶2的私人日記，用戶1不應該看到。',
      transactions: {
        create: [
          {
            symbol: 'GOOGL',
            type: TransactionType.BUY,
            quantity: 20,
            price: 140.00,
            tradeDate: new Date('2025-02-15T09:30:00Z')
          }
        ]
      }
    }
  })

  console.log('\n種子資料建立完成！')
  console.log('用戶數量:', await prisma.user.count())
  console.log('日記數量:', await prisma.diary.count())
  console.log('提醒數量:', await prisma.alert.count())
  console.log('交易數量:', await prisma.transaction.count())
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

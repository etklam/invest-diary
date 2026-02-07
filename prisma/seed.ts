import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 建立範例日記
  const diary1 = await prisma.diary.create({
    data: {
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

  // 建立第二篇日記
  const diary2 = await prisma.diary.create({
    data: {
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

  // 建立第三篇日記 - 包含賣出交易
  const diary3 = await prisma.diary.create({
    data: {
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

  console.log('種子資料建立完成！')
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

import { PrismaClient, TransactionType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createPrismaClientOptions } from '../lib/prisma-client-options'

const prisma = new PrismaClient(createPrismaClientOptions())

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
      expectedAvgHolding: 500000.00,
      timezone: 'Asia/Taipei'
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
      expectedAvgHolding: 100000.00,
      timezone: 'Asia/Taipei'
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
      expectedAvgHolding: 50000.00,
      timezone: 'Asia/Taipei'
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

  // 建立部落格文章種子數據
  const blogPost1 = await prisma.post.upsert({
    where: { slug: 'investment-getting-started' },
    update: {},
    create: {
      authorId: adminUser.id,
      title: '投資入門：如何開始你的第一筆投資',
      slug: 'investment-getting-started',
      content: `# 投資入門：如何開始你的第一筆投資

投資是實現財務自由的重要途徑之一，但對於初學者來說，開始投資可能會感到困惑。本文將介紹投資的基本概念和步驟，幫助你開始你的投資之旅。

## 第一步：確定投資目標
在開始投資之前，你需要明確你的投資目標。你是為了退休儲蓄、購買房屋，還是為了子女教育？不同的目標需要不同的投資策略和時間框架。

## 第二步：建立緊急基金
在開始投資之前，確保你有足夠的緊急基金，通常建議是3-6個月的生活費用。這筆錢應該存放在容易取用的帳戶中，如儲蓄帳戶。

## 第三步：了解風險承受能力
每個人的風險承受能力都不同。你的年齡、收入、家庭狀況和投資經驗都會影響你的風險承受能力。了解自己的風險承受能力，選擇適合的投資產品。

## 第四步：學習基本投資知識
投資前需要學習基本的投資知識，包括股票、債券、基金等不同投資工具的特點，以及如何分散投資風險。

## 第五步：開始投資
當你準備好後，可以開始投資。對於初學者，建議從指數基金或ETF開始，這些產品風險較低，且能提供市場平均回報。

記住，投資是一場長跑，不是短跑。保持耐心，持續學習，隨著時間推移，你的投資將會成長。`,
      excerpt: '投資是實現財務自由的重要途徑之一。本文將介紹投資的基本概念和步驟，幫助初學者開始投資之旅。',
      category: 'strategy',
      tags: '投資入門,理財,初學者',
      status: 'PUBLISHED' as any,
      publishedAt: new Date('2025-02-01T10:00:00Z')
    }
  })

  const blogPost2 = await prisma.post.upsert({
    where: { slug: 'technical-analysis-k-line' },
    update: {},
    create: {
      authorId: adminUser.id,
      title: '技術面分析：如何看懂K線圖',
      slug: 'technical-analysis-k-line',
      content: `# 技術面分析：如何看懂K線圖

K線圖是技術分析中最基本的工具之一，通過K線圖，投資者可以直觀地了解股票價格的變化趨勢。本文將介紹K線圖的基本概念和如何解讀K線圖。

## 什麼是K線圖
K線圖又稱蠟燭圖，起源於日本18世紀的米市交易。每根K線代表特定時間段內的價格變化，包括開盤價、收盤價、最高價和最低價。

## K線的基本組成
- **實體**：表示開盤價和收盤價之間的價格區間
- **上影線**：從實體頂部延伸到最高價的線
- **下影線**：從實體底部延伸到最低價的線
- **顏色**：通常紅色或綠色表示收盤價高於開盤價，黑色或白色表示收盤價低於開盤價

## 常見K線形態
1. **大陽線**：表示買方力量強勁，價格上漲
2. **大陰線**：表示賣方力量強勁，價格下跌
3. **十字星**：開盤價與收盤價接近，表示市場猶豫不決
4. **錘子線**：下影線較長，可能表示趨勢反轉

## 如何運用K線圖
- **趨勢判斷**：通過連續的K線組合判斷價格趨勢
- **支撐與阻力**：識別價格反轉的關鍵點位
- **買賣信號**：結合其他指標確認交易信號

技術分析需要與基本面分析結合使用，才能做出更準確的投資決策。`,
      excerpt: 'K線圖是技術分析中最基本的工具之一。本文將介紹K線圖的基本概念和如何解讀K線圖。',
      category: 'technical',
      tags: '技術分析,K線圖,交易',
      status: 'PUBLISHED' as any,
      publishedAt: new Date('2025-02-05T14:00:00Z')
    }
  })

  const blogPost3 = await prisma.post.upsert({
    where: { slug: 'market-trends-2025' },
    update: {},
    create: {
      authorId: adminUser.id,
      title: '市場觀察：2025年投資趨勢分析',
      slug: 'market-trends-2025',
      content: `# 市場觀察：2025年投資趨勢分析

隨著全球經濟的不斷變化，投資市場也呈現出新的趨勢和機遇。本文將分析2025年的主要投資趨勢，幫助投資者把握市場脈動。

## 科技股持續領漲
2025年，科技股預計將繼續領漲市場。人工智能、雲計算、半導體等領域的創新將推動科技公司的增長。特別是AI相關企業，預計將保持高速增長。

## 綠色能源投資機遇
隨著全球對可持續發展的重視，綠色能源領域將迎來大量投資機遇。太陽能、風能、電動車等產業鏈相關公司值得關注。

## 新興市場潛力
新興市場經濟體的增長潛力巨大，特別是亞洲地域的新興市場。隨著中產階級的擴大和消費能力的提升，相關企業將受益。

## 通脹壓力下的投資策略
面對可能的通脹壓力，投資者需要調整投資策略。實物資產、通脹保值債券和某些行業的股票可能提供更好的抗通脹保護。

## 風險管理的重要性
在機遇與挑戰並存的市場環境中，風險管理變得尤為重要。分散投資、設定止損點和定期評估投資組合是必不可少的策略。

投資者應保持謹慎樂觀的態度，既要抓住市場機遇，也要做好風險防控。`,
      excerpt: '2025年投資市場呈現新的趨勢和機遇。本文將分析科技股、綠色能源、新興市場等主要投資領域的發展前景。',
      category: 'market',
      tags: '市場趨勢,2025年,投資機遇',
      status: 'PUBLISHED' as any,
      publishedAt: new Date('2025-02-10T09:30:00Z')
    }
  })

  const blogPost4 = await prisma.post.upsert({
    where: { slug: 'fundamental-analysis-company-valuation' },
    update: {},
    create: {
      authorId: user1.id,
      title: '基本面分析：如何評估公司價值',
      slug: 'fundamental-analysis-company-valuation',
      content: `# 基本面分析：如何評估公司價值

基本面分析是評估公司內在價值的重要方法，通過分析公司的財務狀況、行業地位和經濟環境等因素，判斷股票的真實價值。本文將介紹基本面分析的基本方法和指標。

## 財務報表分析
### 損益表
- **營收增長率**：衡量公司業務擴張能力
- **毛利率**：反映公司產品或服務的盈利能力
- **淨利率**：表示公司整體盈利水平
- **每股收益(EPS)**：股東最關注的指標之一

### 資產負債表
- **流動比率**：評估短期償債能力
- **負債比率**：衡量財務槓桿程度
- **股東權益報酬率(ROE)**：反映資本運用效率

### 現金流量表
- **營運現金流**：公司主營業務產生的現金
- **自由現金流**：可用於分配給股東的現金
- **現金流轉換率**：盈利質量的重要指標

## 評價指標
- **本益比(P/E)**：最常用的評價指標
- **股價淨值比(P/B)**：適合金融等資產密集型行業
- **股息收益率**：衡量股息回報
- **企業價值倍數(EV/EBITDA)**：考慮負債的評價指標

## 行業分析
- **行業生命週期**：判斷行業發展階段
- **競爭格局**：分析市場集中度和競爭優勢
- **政策影響**：考慮宏觀政策對行業的影響

基本面分析需要結合定量和定性分析，並與市場情緒和技術分析相結合，才能做出全面的投資決策。`,
      excerpt: '基本面分析是評估公司內在價值的重要方法。本文將介紹財務報表分析、評價指標和行業分析等基本面分析的核心要素。',
      category: 'fundamental',
      tags: '基本面分析,財務報表,評價指標',
      status: 'PUBLISHED' as any,
      publishedAt: new Date('2025-02-12T16:00:00Z')
    }
  })

  const blogPost5 = await prisma.post.upsert({
    where: { slug: 'investment-psychology-biases' },
    update: {},
    create: {
      authorId: user1.id,
      title: '投資心理學：克服常見的投資偏誤',
      slug: 'investment-psychology-biases',
      content: `# 投資心理學：克服常見的投資偏誤

投資不僅是數字和邏輯的遊戲，更是心理的較量。許多投資者因為心理偏誤而做出非理性決策，導致投資失利。本文將介紹常見的投資偏誤及如何克服它們。

## 確認偏誤
**表現**：傾向於尋找支持自己已有觀點的信息，忽視相反證據。
**克服方法**：
- 主動尋找反對意見
- 建立投資決策清單
- 定期重新評估投資假設

## 過度自信偏誤
**表現**：高估自己的判斷能力和預測準確性。
**克服方法**：
- 保持謙遜態度
- 設定明確的止損點
- 尋求專業意見

## 損失厭惡偏誤
**表現**：對損失的痛苦感受遠大於同等收益的快樂，導致過早賣出贏家、持有輸家。
**克服方法**：
- 制定明確的投資規則
- 關注長期投資目標
- 分散投資降低單一損失影響

## 羊群效應
**表現**：盲目跟隨大眾投資行為，缺乏獨立思考。
**克服方法**：
- 培養獨立分析能力
- 堅持自己的投資原則
- 避免情緒化決策

## 錨定效應
**表現**：過度依賴獲得的第一個信息作為參考點。
**克服方法**：
- 收集多方面信息
- 定期更新評估標準
- 避免單一數據點決策

## 培養理性投資心態
1. **制定投資計劃**：明確投資目標、風險承受能力和策略
2. **持續學習**：不斷提升投資知識和心理素質
3. **情緒管理**：學會控制恐懼和貪婪情緒
4. **定期反思**：總結成功和失敗的經驗

投資成功不僅需要專業知識，更需要良好的心理素質。認識並克服心理偏誤，才能在投資路上走得更遠。`,
      excerpt: '投資是心理的較量，許多投資者因心理偏誤而做出非理性決策。本文將介紹常見的投資偏誤及如何克服它們。',
      category: 'strategy',
      tags: '投資心理學,行為金融,決策偏誤',
      status: 'PUBLISHED' as any,
      publishedAt: new Date('2025-02-15T11:00:00Z')
    }
  })

  // 創建一篇草稿文章
  const draftPost = await prisma.post.upsert({
    where: { slug: 'blockchain-investment-future' },
    update: {},
    create: {
      authorId: user2.id,
      title: '區塊鏈投資：未來趨勢與機遇',
      slug: 'blockchain-investment-future',
      content: `# 區塊鏈投資：未來趨勢與機遇

區塊鏈技術作為顛覆性創新，正在重塑金融和商業模式。本文將探討區塊鏈投資的未來趨勢與機遇。

（此文章仍在編寫中...）`,
      excerpt: '區塊鏈技術作為顛覆性創新，正在重塑金融和商業模式。',
      category: 'strategy',
      tags: '區塊鏈,加密貨幣,未來趨勢',
      status: 'DRAFT' as any,
      publishedAt: null
    }
  })

  console.log('\n種子資料建立完成！')
  console.log('用戶數量:', await prisma.user.count())
  console.log('日記數量:', await prisma.diary.count())
  console.log('提醒數量:', await prisma.alert.count())
  console.log('交易數量:', await prisma.transaction.count())
  console.log('部落格文章數量:', await prisma.post.count())
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

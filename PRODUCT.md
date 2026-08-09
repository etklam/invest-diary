# Product

## Register

product

## Users

有紀律需求的零售交易者與主動投資者。他們每天面對市場雜訊，需要一個能幫助他們記錄交易判斷、複盤決策品質、追蹤持倉表現的工具。使用情境：盤中快速記下想法、收盤後系統性複盤、長期回看自己的判斷是否有偏誤。

他們不是被動的「存股族」，而是會主動買賣、需要校正自己決策的人。

## Product Purpose

Diary Vue 是一個投資日記平台，核心命題是「紀錄 + 判斷 + 複盤」的工作台。它不是單純的筆記 app，也不是看盤軟體——它是交易者跟自己對話的空間。每次交易背後都有一個判斷，每個判斷都值得被記下來，日後回頭驗證。

成功的定義：使用者養成每日記錄的習慣，登入後能在 Timeline 一眼看到自己的決策脈絡，需要管理舊資料時再進入 Diaries，並且在複盤時能真實感受到「哦，原來我當時是這樣想的」。

## Brand Personality

**紀律、穩重、清晰**。像一本被高頻翻閱的投資筆記本。不花俏、不推銷、不 gamify。視覺上要有內容重量，語氣上要有專業自信但不過度嚴肅。

情緒目標：讓使用者感覺到「這是一個認真對待投資的地方」，而不是另一個會推播通知的 app。

## Anti-references

絕對不要像：
- **SaaS 模板站**（Vercel/Stripe 風格）：gradient hero、glass card、feature grid、icon + 標題 + 描述的三欄無限卡。這種模板味會讓投資日記失去人格。
- **Robinhood/幣安等 gamified app**：糖果色、confetti 動畫、push 通知轟炸。投資不是遊戲。
- **泛用金融藍綠科技風**：navy + gold 套裝、cyan accent。這些套色讓產品看起來像任何一個 fintech，而不是這一個。

## Design Principles

1. **Make the next move obvious**：每個畫面第一視線內必須有主要任務，不要讓使用者先看一圈裝飾再找入口。
2. **Show system confidence**：成功、失敗、空狀態、載入中要有穩定語氣與視覺模式。不能一頁很精緻，另一頁回到預設 alert。
3. **Honor the data**：金額、比率、日期、持倉數據有等寬數字和穩定 baseline。這是金融產品的基本尊嚴。
4. **Reduce friction before adding features**：功能可以多，但核心任務（寫日記）的路徑必須最短。非核心功能使用漸進式揭露，不一口氣攤開。
5. **Differentiate reading vs doing**：文章、landing 是閱讀型；日記、工具是操作型。共享語系，不同密度。

## Accessibility & Inclusion

- WCAG AA 為基準（色彩對比、鍵盤導航、螢幕閱讀器）
- PWA 支援，讓移動端使用者能加到主畫面使用
- 三語支援（en / zh-TW / zh-CN）
- prefers-reduced-motion 尊重：關閉非必要的過場動畫

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- Platform inferred from the existing Nuxt web application and the responsive web brief. -->

## Users

有紀律需求的零售交易者與主動投資者。他們每天面對市場雜訊，需要一個能幫助他們記錄交易判斷、複盤決策品質、追蹤持倉表現的工具。使用情境：盤中快速記下想法、收盤後系統性複盤、長期回看自己的判斷是否有偏誤。

他們不是被動的「存股族」，而是會主動買賣、需要校正自己決策的人。

## Product Purpose

Diary Vue 是一個投資日記平台，核心命題是「紀錄 + 判斷 + 複盤」的工作台。它不是單純的筆記 app，也不是看盤軟體——它是交易者跟自己對話的空間。每次交易背後都有一個判斷，每個判斷都值得被記下來，日後回頭驗證。

成功的定義：使用者養成每日記錄的習慣，登入後能在 Timeline 一眼看到自己的決策脈絡，需要管理舊資料時再進入 Diaries，並且在複盤時能真實感受到「哦，原來我當時是這樣想的」。

## Positioning

它是交易者的 decision ledger：把交易前的 thesis、risk、execution 與交易後的 review 放在同一條可回看的決策脈絡中。它不是單純筆記工具，也不是即時看盤軟體。

<!-- Positioning inferred from the existing product purpose, route structure, and structured-review fields. -->

## Operating Context

- 盤中使用 Quick Diary 快速記下交易想法與決策脈絡。
- 收盤後在 Timeline、Diaries 與 Review Queue 回看、整理和複盤。
- 在 Portfolio、Watchlist、Calendar 與分析工具中追蹤持倉、活動和市場脈絡。
- 使用者可能以 PWA 形式在行動裝置上操作，也會在桌面瀏覽器處理較密集的資料與工具工作。

<!-- Operating context inferred from current routes, navigation, PWA setup, and the provided responsive-layout scope. -->

## Capabilities and Constraints

- 記錄、編輯、搜尋和整理投資日記與交易資料。
- 保存原始交易判斷，並以 review outcome、summary、learning、adjustment 等欄位補充事後複盤。
- 提供 Timeline、Diaries、Portfolio、Watchlist、Calendar、Reviews、Alerts、Settings 與投資分析工具。
- 支援 en、zh-TW、zh-CN 三種語言。
- 產品 UI 需維持現有功能、business logic、backend/API、視覺識別與 `dt-*` token system。
- 登入後的 authenticated app 使用一致的 responsive layout contract；mobile web 優先使用 CSS/Tailwind responsive behavior，避免以 JS viewport 判斷取代 layout。

<!-- Capabilities and the responsive constraints are inferred from the current codebase and the user's implementation brief. -->

## Brand Commitments

- 產品名稱：Diary Vue（repository：invest-diary）。
- 品牌語氣：紀律、穩重、清晰；像一本被高頻翻閱的投資筆記本。
- 不花俏、不推銷、不 gamify；語氣專業自信但不過度嚴肅。
- 不要變成 SaaS 模板站、gamified trading app，或沒有辨識度的泛用 fintech 產品。

## Evidence on Hand

- 現有 Nuxt/Vue application source code 與 authenticated routes。
- `DESIGN.md`：既有產品設計語言、token、元件與 layout contract。
- `assets/css/design-tokens.css`、`assets/css/main.css`：目前 design token 與 global CSS 實作。
- 現有 i18n 字串、PWA 設定、unit tests 與 Playwright E2E tests。
- 目前沒有可供產品溝通使用的外部 testimonials、customer benchmarks 或 press evidence；未來工作不得自行捏造。

## Product Principles

1. **Make the next move obvious**：每個畫面第一視線內必須有主要任務，不要讓使用者先看一圈裝飾再找入口。
2. **Show system confidence**：成功、失敗、空狀態、載入中要有穩定語氣與視覺模式。不能一頁很精緻，另一頁回到預設 alert。
3. **Honor the data**：金額、比率、日期、持倉數據有等寬數字和穩定 baseline。這是金融產品的基本尊嚴。
4. **Reduce friction before adding features**：功能可以多，但核心任務（寫日記）的路徑必須最短。非核心功能使用漸進式揭露，不一口氣攤開。
5. **Differentiate reading vs doing**：文章、landing 是閱讀型；日記、工具是操作型。共享語系，不同密度。

## Accessibility & Inclusion

- WCAG AA 為基準（色彩對比、鍵盤導航、螢幕閱讀器）。
- PWA 支援，讓移動端使用者能加到主畫面使用。
- 三語支援（en / zh-TW / zh-CN）。
- 尊重 `prefers-reduced-motion`，關閉非必要的過場動畫。

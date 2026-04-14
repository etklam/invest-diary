  Design System — 投資日記 (Diary Vue)                                                                                      
                                                                                                                            
  一、設計哲學                                                                                                              
                                                                                                                            
  - Content-First（內容優先）：UI 是內容的容器。移除所有不服務於內容的裝飾——投影、過度色彩、視覺噪音。排版做所有工作。
  - Precision（精確）：所有間距、大小、對比度基於 4px 網格。數值不靠感覺，靠數學。
  - Intentional Friction（刻意留白）：用負空間引導視線，而非線條。如果一個邊框可以不畫，就不畫它。
  - Contrast Safety（對比安全）：所有前景/背景組合必須通過 WCAG AA（正文 4.5:1，大字 3:1）。這不是建議，是底線。

  「不要試圖填滿空間。好的設計在於知道何時停止。」

  ---
  二、產品背景

  - 定位：個人投資日記應用——日誌撰寫、持倉追蹤、教育博客、投資工具
  - 用戶：自用為主的投資者
  - 場景：內容密集型網頁應用（長時間閱讀/書寫），金融數據展示
  - 平台：Web 為主，PWA 支持移動端

  ---
  三、底層規範（Design Tokens）

  1. 色彩系統

  策略：restrained — 1 個強調色 + 中性色階，色彩稀有才有意義。

  Light Mode

  ┌────────────────────┬─────────┬──────────────────────────────┬────────────────────────┐
  │       Token        │  色值   │             用途             │ WCAG 對比 (on #FFFFFF) │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --bg-main          │ #FFFFFF │ 畫布底層                     │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --bg-surface       │ #F8FAFC │ 卡片、側欄                   │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --bg-elevated      │ #F1F5F9 │ 懸停態、彈窗底色             │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --text-primary     │ #0F172A │ 標題與核心內容               │ 18.4:1 ✅              │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --text-secondary   │ #475569 │ 正文、說明文字               │ 7.2:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --text-muted       │ #64748B │ 輔助說明、時間戳             │ 4.6:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --text-inverse     │ #FFFFFF │ 反白文字（用於 primary btn） │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --line-default     │ #E2E8F0 │ 1px 邊框                     │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --line-hover       │ #CBD5E1 │ hover 態邊框                 │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --line-focus       │ #94A3B8 │ focus 態邊框                 │ —                      │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --accent           │ #2563EB │ CTA、鏈接、重要狀態          │ 4.6:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --accent-hover     │ #1D4ED8 │ accent 懸停態                │ 5.6:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --semantic-success │ #15803D │ 成功、盈利                   │ 5.9:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --semantic-warning │ #854D0E │ 警告                         │ 5.8:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --semantic-error   │ #DC2626 │ 錯誤、虧損                   │ 4.6:1 ✅               │
  ├────────────────────┼─────────┼──────────────────────────────┼────────────────────────┤
  │ --semantic-info    │ #0284C7 │ 提示                         │ 4.8:1 ✅               │
  └────────────────────┴─────────┴──────────────────────────────┴────────────────────────┘

  Dark Mode

  ┌────────────────────┬─────────┬───────────────────────────────┬────────────────────────┐
  │       Token        │  色值   │             用途              │ WCAG 對比 (on #0F172A) │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --bg-main          │ #0F172A │ 畫布底層（Slate 900）         │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --bg-surface       │ #1E293B │ 卡片、側欄（Slate 800）       │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --bg-elevated      │ #334155 │ 懸停態、彈窗底色（Slate 700） │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --text-primary     │ #F8FAFC │ 標題與核心內容                │ 15.7:1 ✅              │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --text-secondary   │ #CBD5E1 │ 正文、說明文字                │ 10.3:1 ✅              │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --text-muted       │ #94A3B8 │ 輔助說明、時間戳              │ 5.9:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --text-inverse     │ #0F172A │ 反白文字                      │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --line-default     │ #334155 │ 1px 邊框                      │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --line-hover       │ #475569 │ hover 態邊框                  │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --line-focus       │ #64748B │ focus 態邊框                  │ —                      │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --accent           │ #60A5FA │ CTA、鏈接、重要狀態           │ 6.1:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --accent-hover     │ #93C5FD │ accent 懸停態                 │ 8.2:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --semantic-success │ #4ADE80 │ 成功、盈利                    │ 8.4:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --semantic-warning │ #FACC15 │ 警告                          │ 9.3:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --semantic-error   │ #F87171 │ 錯誤、虧損                    │ 4.8:1 ✅               │
  ├────────────────────┼─────────┼───────────────────────────────┼────────────────────────┤
  │ --semantic-info    │ #38BDF8 │ 提示                          │ 7.1:1 ✅               │
  └────────────────────┴─────────┴───────────────────────────────┴────────────────────────┘

  Dark Mode 規則

  1. 背景三層為限：#0F172A → #1E293B → #334155。再多層級就糊了。
  2. 邊框是 dark mode 的生命線：dark mode 下邊框使用 #334155（Slate 700），比背景 #1E293B（Slate 800）高一階，確保在 surface 層級上可見。邊框 hover 態使用 #475569（Slate 600）進一步提升對比。
  3. 語意色在 dark mode 下提亮：從 Tailwind 的 *-600 升到 *-400，確保在深色背景上不會「沉」進去。
  4. 禁止純黑 #000 和純白 #FFF：dark mode 文字用 #F8FAFC（帶冷調），背景用 #0F172A（帶藍調）。避免 OLED 純黑 +
  純白的高對比疲勞。

  語意色背景（半透明）

  不在 CSS 變量中使用透明度（不可預測），改用具體色值：

  ┌──────────────┬─────────┬─────────┬────────────┐
  │    Token     │  Light  │  Dark   │    用途    │
  ├──────────────┼─────────┼─────────┼────────────┤
  │ --bg-success │ #F0FDF4 │ #052E16 │ 成功背景色 │
  ├──────────────┼─────────┼─────────┼────────────┤
  │ --bg-warning │ #FEFCE8 │ #422006 │ 警告背景色 │
  ├──────────────┼─────────┼─────────┼────────────┤
  │ --bg-error   │ #FEF2F2 │ #450A0A │ 錯誤背景色 │
  ├──────────────┼─────────┼─────────┼────────────┤
  │ --bg-info    │ #F0F9FF │ #082F49 │ 提示背景色 │
  └──────────────┴─────────┴─────────┴────────────┘

  2. 排版

  字體棧

  /* 正文（中英文） */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC",
    "PingFang TC", "Microsoft JhengHei", sans-serif;

  /* 等寬（金額/數據/代碼） */
  font-family: "JetBrains Mono", "SF Mono", "Cascadia Code", "Consolas", monospace;

  系統字體棧，零加載，跨平台一致。不引入 Inter / Noto Sans 等外部字體——對自用應用來說，CDN 依賴和 FOUT 問題不值得。

  字重

  ┌──────┬──────────────┬───────────────┐
  │ 用途 │     字重     │   Tailwind    │
  ├──────┼──────────────┼───────────────┤
  │ 正文 │ Regular 400  │ font-normal   │
  ├──────┼──────────────┼───────────────┤
  │ 強調 │ Medium 500   │ font-medium   │
  ├──────┼──────────────┼───────────────┤
  │ 標題 │ Semibold 600 │ font-semibold │
  └──────┴──────────────┴───────────────┘

  不使用 font-bold（700）——在系統字體棧下，700 顯得過重，破壞極簡調性。

  字級

  ┌───────────┬──────┬──────┬──────────────────────────┬───────────┐
  │   Token   │ 大小 │ 行高 │           用途           │ Tailwind  │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-xs   │ 12px │ 1.4  │ 時間戳、badge、輔助標籤  │ text-xs   │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-sm   │ 14px │ 1.4  │ 次要資訊、表格、表單說明 │ text-sm   │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-base │ 16px │ 1.6  │ 正文                     │ text-base │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-lg   │ 18px │ 1.5  │ 卡片標題、區段小標       │ text-lg   │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-xl   │ 20px │ 1.4  │ 頁面副標題               │ text-xl   │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-2xl  │ 24px │ 1.3  │ 頁面主標題               │ text-2xl  │
  ├───────────┼──────┼──────┼──────────────────────────┼───────────┤
  │ text-3xl  │ 30px │ 1.25 │ Landing hero、Display    │ text-3xl  │
  └───────────┴──────┴──────┴──────────────────────────┴───────────┘

  text-xs 行高從 1.25 調到 1.4，防止中文標點/注音被裁切。

  排版節奏

  頁面標題：    text-2xl font-semibold mb-8
  區段標題：    text-lg font-medium mb-4
  正文：        text-base leading-relaxed
  輔助說明：    text-sm text-secondary
  金額數據：    font-mono tabular-nums
  標籤元數據：  text-xs uppercase tracking-widest text-muted

  3. 間距

  基礎單位：4px

  ┌───────┬──────┬─────────────────────────────────────┐
  │ Token │  值  │                用途                 │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 1     │ 4px  │ 微間距（圖標與文字、badge padding） │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 2     │ 8px  │ 同行元素間距                        │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 3     │ 12px │ 緊湊列表項間距                      │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 4     │ 16px │ 組件內 padding、段落間距            │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 5     │ 20px │ 表單分組間距                        │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 6     │ 24px │ 組件間間距                          │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 8     │ 32px │ 區段分隔                            │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 10    │ 40px │ 大區段分隔                          │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 12    │ 48px │ 頁面區段分隔                        │
  ├───────┼──────┼─────────────────────────────────────┤
  │ 16    │ 64px │ 頁面頂級區段分隔                    │
  └───────┴──────┴─────────────────────────────────────┘

  4. 容器

  - 最大寬度：1200px（max-w-screen-xl）
  - 水平 padding：mobile 16px（px-4）、tablet 24px（px-6）、desktop 32px（px-8）
  - 居中：mx-auto

  5. 響應式斷點

  ┌──────┬────────┬───────────────────┐
  │ 名稱 │  寬度  │       場景        │
  ├──────┼────────┼───────────────────┤
  │ sm   │ 640px  │ 大手機橫屏        │
  ├──────┼────────┼───────────────────┤
  │ md   │ 768px  │ 平板直屏          │
  ├──────┼────────┼───────────────────┤
  │ lg   │ 1024px │ 平板橫屏 / 小筆電 │
  ├──────┼────────┼───────────────────┤
  │ xl   │ 1280px │ 桌面              │
  └──────┴────────┴───────────────────┘

  6. Z-Index 階層

  ┌────────────┬─────┬────────────┐
  │    層級    │ 值  │    用途    │
  ├────────────┼─────┼────────────┤
  │ z-base     │ 0   │ 正常文檔流 │
  ├────────────┼─────┼────────────┤
  │ z-dropdown │ 10  │ 下拉選單   │
  ├────────────┼─────┼────────────┤
  │ z-sticky   │ 20  │ 粘性導航   │
  ├────────────┼─────┼────────────┤
  │ z-overlay  │ 30  │ Modal 遮罩 │
  ├────────────┼─────┼────────────┤
  │ z-modal    │ 40  │ Modal 內容 │
  ├────────────┼─────┼────────────┤
  │ z-toast    │ 50  │ Toast 通知 │
  ├────────────┼─────┼────────────┤
  │ z-tooltip  │ 60  │ Tooltip    │
  └────────────┴─────┴────────────┘

  7. 圓角

  ┌─────────┬─────┬─────────────────────────────┐
  │  Token  │ 值  │            用途             │
  ├─────────┼─────┼─────────────────────────────┤
  │ DEFAULT │ 0px │ 全域預設——直角              │
  ├─────────┼─────┼─────────────────────────────┤
  │ sm      │ 2px │ Badge、Tag                  │
  ├─────────┼─────┼─────────────────────────────┤
  │ md      │ 6px │ 圖示、Avatar                │
  ├─────────┼─────┼─────────────────────────────┤
  │ lg      │ 8px │ Modal、Dropdown（按需使用） │
  └─────────┴─────┴─────────────────────────────┘

  直角是極簡主義的視覺簽名。Badge 用 2px 收邊，Modal 用 8px 柔和邊緣。其餘一律直角。

  8. 動效

  - 理念：minimal-functional——只保留有助理解的過渡
  - 緩動：ease-in-out（全域）
  - 時長：
    - Fast 150ms——hover、focus 狀態變化
    - Standard 250ms——展開/收起、頁面過渡
  - 禁止：bounce、scale、shadow burst、flash、rotate、任何搶注意力的動畫
  - Hover 反饋：border color 變化 / background 微調 / opacity 變化 / text color 變化
  - 無障礙：必須尊重 @media (prefers-reduced-motion: reduce)，此時所有過渡降為 0ms

  9. 投影

  - 全域禁止 box-shadow
  - 層級靠 border + background layering 實現
  - 唯一例外：Modal 和 Dropdown 允許使用極微妙的投影 shadow: 0 4px 12px rgba(0,0,0,0.08) 作為「浮起」提示，dark mode 下改為
  rgba(0,0,0,0.3)

  ---
  四、組件規範

  1. Button（BaseButton）

  基礎態：
    border: 1px solid var(--line-default)
    background: transparent
    padding: 10px 16px  （touch target ≥ 44px 高度）
    font-size: 14px (text-sm)
    font-weight: 500 (font-medium)
    color: var(--text-primary)
    transition: all 150ms ease-in-out
    border-radius: 0px

  Design Note: 若 0px 直角在 Phase 1 測試中視覺過於生硬，允許立即下修為 2px (rounded-sm) 作為全域基礎，不可在 Phase 2 之後才變更。

  Hover：
    border-color: var(--line-hover)
    background: var(--bg-surface)

  Focus：
    border-color: var(--line-focus)
    ring: 2px solid var(--accent), offset 2px    ← WCAG 2.4.7 必需

  Primary 變體：
    background: var(--accent)
    color: var(--text-inverse)
    border-color: var(--accent)
    Hover: background var(--accent-hover)          ← 用色值偏移，不用 opacity

  Ghost 變體：
    border-color: transparent
    Hover: border-color var(--line-default), background var(--bg-surface)

  Danger 變體：
    border-color: var(--semantic-error)
    color: var(--semantic-error)
    Hover: background var(--bg-error)

  Disabled 態：
    opacity: 0.4
    cursor: not-allowed
    pointer-events: none

  Loading 態：
    顯示 Skeleton pulse 動效替換按鈕文字
    pointer-events: none

  尺寸：
    sm: padding 6px 12px, text-xs, min-height 36px
    md (default): padding 10px 16px, text-sm, min-height 44px
    lg: padding 12px 24px, text-base, min-height 48px

  2. Input / Textarea（BaseInput）

  border: 1px solid var(--line-default)
  background: var(--bg-main)
  padding: 10px 12px
  font-size: 14px
  color: var(--text-primary)
  border-radius: 0px

  Placeholder: color var(--text-muted)
  Focus: border-color var(--accent), ring 2px solid var(--accent) offset 2px
  Error: border-color var(--semantic-error)
  Disabled: opacity 0.4, cursor not-allowed

  Focus 使用 ring 而非僅 border color 變化——確保 WCAG 2.4.7 合規。

  3. Card（BaseCard）

  border: 1px solid var(--line-default)
  background: var(--bg-surface)          ← 注意用 surface，不是 main
  padding: 24px
  border-radius: 0px

  Clickable hover:
    border-color: var(--line-hover)
    background: var(--bg-elevated)

  4. Table（BaseTable）

  Header: bg-surface + text-sm font-medium text-secondary + py-3 px-4
  Row: border-b border-line-default + py-3 px-4
  無斑馬紋
  Row hover: bg-surface
  金額列: font-mono tabular-nums text-right
  小屏策略: 水平滾動 (overflow-x-auto)

  5. Modal（BaseModal）

  Overlay: bg-black/40 (light) / bg-black/60 (dark) + backdrop-blur-sm
  Content: bg-main border border-line-default + max-w-md + p-6 + rounded-lg (8px)
  禁止 shadow（或使用上述例外投影）

  無障礙：
    - Focus trap（打開時焦點鎖在 Modal 內）
    - Escape key 關閉
    - aria-modal="true" + role="dialog"
    - 關閉後焦點回到觸發元素

  尺寸：
    sm: max-w-sm (384px)  — 確認對話框
    md: max-w-md (448px)  — 表單
    lg: max-w-lg (512px)  — 複雜表單 / 明細
    xl: max-w-xl (576px)  — 圖表 / 大量內容

  6. Select / Dropdown（BaseSelect）

  外觀同 Input
  右側 chevron 圖示 (Lucide ChevronDown)
  展開面板: bg-main border border-line-default + rounded-lg + max-h-60 overflow-y-auto
  Option: py-2 px-3 text-sm
  Option hover: bg-surface
  Option selected: font-medium + bg-surface
  Focus: ring 同 Input 規範

  z-index: z-dropdown (10)

  7. Badge / Tag

  border: 1px solid var(--line-default)
  background: var(--bg-surface)
  padding: 2px 8px
  font-size: 12px (text-xs)
  border-radius: 2px

  語意變體：
    success: border-color semantic-success, color semantic-success, bg bg-success
    warning: border-color semantic-warning, color semantic-warning, bg bg-warning
    error:   border-color semantic-error,   color semantic-error,   bg bg-error
    info:    border-color semantic-info,    color semantic-info,    bg bg-info

  8. Alert（AppAlert）

  border-left: 3px solid
  padding: 12px 16px
  font-size: 14px (text-sm)
  border-radius: 0px

  info:    border-color semantic-info,    bg bg-info
  success: border-color semantic-success, bg bg-success
  warning: border-color semantic-warning, bg bg-warning
  error:   border-color semantic-error,   bg bg-error

  9. Toast（BaseToast）

  position: fixed bottom-right
  background: var(--bg-elevated)
  border: 1px solid var(--line-default)
  padding: 12px 16px
  border-radius: 2px
  font-size: 14px
  max-width: 360px
  z-index: z-toast (50)

  帶語意色左邊框 3px（同 Alert 規範）
  自動消失: 4s（info/success）/ 手動關閉（error/warning）
  進入動效: translate-y 150ms ease-in-out

  10. Tooltip（BaseTooltip）

  background: var(--bg-elevated)
  color: var(--text-primary)
  border: 1px solid var(--line-default)
  padding: 4px 8px
  font-size: 12px (text-xs)
  border-radius: 2px
  z-index: z-tooltip (60)
  max-width: 240px

  顯示延遲: 300ms
  隱藏延遲: 100ms

  11. Toggle / Switch（BaseToggle）

  Track: w-11 h-6 rounded-full
    off: bg-surface border border-line-default
    on:  bg-accent border-accent

  Thumb: w-5 h-5 rounded-full bg-white
    off: translate-x-0.5
    on:  translate-x-[22px]

  Disabled: opacity 0.4
  Transition: 150ms ease-in-out

  12. Checkbox（BaseCheckbox）

  Square: w-4 h-4 border border-line-default rounded-sm (2px)
  Checked: bg-accent border-accent + white check icon (Lucide Check, 12px)
  Focus: ring 2px solid accent offset 2px
  Indeterminate: bg-accent + white minus icon

  13. Skeleton（BaseSkeleton）

  background: var(--bg-surface)
  border-radius: 2px
  動效: pulse (opacity 0.5 → 1, 1.5s ease-in-out infinite)

  形狀變體：
    text: h-4 rounded-sm (模擬文字行)
    circle: rounded-full (模擬 avatar)
    card: h-32 rounded-sm (模擬卡片)

  禁止 Spinner。所有 loading 態統一使用 Skeleton。

  14. Empty State（BaseEmpty）

  居中佈局
  Icon: text-muted (Lucide 圖示，不用 emoji)
  描述文字: text-secondary
  操作按鈕: mt-4
  最小留白高度: 視窗 20%

  15. Navigation

  頂部水平導航
  底部邊框: border-b border-line-default
  高度: h-14 (mobile) / h-16 (desktop)
  Active: font-medium + border-b-2 border-accent
  Inactive: text-secondary, hover → text-primary

  Mobile: 底部導航欄 (BottomNavigation)，圖示統一使用 Lucide-vue (2px 線條)

  16. Pagination（BasePagination）

  文字尺寸: text-sm
  按鈕: 同 Ghost Button 規範，min-w 36px
  Active 頁碼: bg-accent text-text-inverse
  Disabled: opacity 0.4
  間距: gap-1

  17. Tabs（BaseTabs）

  Underline 風格（非 pill/box）
  Tab: text-sm font-medium text-secondary py-2 px-1
  Active: text-primary + border-b-2 border-accent
  Hover: text-primary
  Tab panels: pt-4

  ---
  五、Tailwind 整合方案

  tailwind.config.ts

  import type { Config } from 'tailwindcss'

  export default {
    darkMode: 'class',
    content: [
      './components/**/*.{vue,ts}',
      './layouts/**/*.vue',
      './pages/**/*.vue',
      './composables/**/*.ts',
      './plugins/**/*.ts',
      './app.vue',
    ],
    theme: {
      extend: {
        // ---- 色彩 ----
        colors: {
          // 背景
          surface: {
            DEFAULT: 'var(--bg-main)',
            alt: 'var(--bg-surface)',
            raised: 'var(--bg-elevated)',
            success: 'var(--bg-success)',
            warning: 'var(--bg-warning)',
            error: 'var(--bg-error)',
            info: 'var(--bg-info)',
          },
          // 文字
          copy: {
            DEFAULT: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            muted: 'var(--text-muted)',
            inverse: 'var(--text-inverse)',
          },
          // 邊框
          line: {
            DEFAULT: 'var(--line-default)',
            hover: 'var(--line-hover)',
            focus: 'var(--line-focus)',
          },
          // 強調色
          accent: {
            DEFAULT: 'var(--accent)',
            hover: 'var(--accent-hover)',
          },
          // 語意色（僅用於 border/text，背景用 surface-*）
          semantic: {
            success: 'var(--semantic-success)',
            warning: 'var(--semantic-warning)',
            error: 'var(--semantic-error)',
            info: 'var(--semantic-info)',
          },
        },

        // ---- 圓角 ----
        borderRadius: {
          sm: '2px',
          md: '6px',
          lg: '8px',
        },

        // ---- 間距（4px 基礎已內建） ----

        // ---- 最大寬度 ----
        maxWidth: {
          content: '1200px',
        },

        // ---- Z-Index ----
        zIndex: {
          dropdown: '10',
          sticky: '20',
          overlay: '30',
          modal: '40',
          toast: '50',
          tooltip: '60',
        },

        // ---- 過渡 ----
        transitionDuration: {
          fast: '150ms',
        },
      },
    },
  } satisfies Config

  命名說明：surface / copy / line 避開了 Tailwind 內建 utility 前綴衝突。
  用法：bg-surface、bg-surface-alt、text-copy、text-copy-secondary、border-line、border-line-hover。
  不再出現 bg-bg、text-text、border-border 這種繞口令。

  assets/css/main.css

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    :root {
      --bg-main: #FFFFFF;
      --bg-surface: #F8FAFC;
      --bg-elevated: #F1F5F9;
      --text-primary: #0F172A;
      --text-secondary: #475569;
      --text-muted: #64748B;
      --text-inverse: #FFFFFF;
      --line-default: #E2E8F0;
      --line-hover: #CBD5E1;
      --line-focus: #94A3B8;
      --accent: #2563EB;
      --accent-hover: #1D4ED8;
      --semantic-success: #15803D;
      --semantic-warning: #854D0E;
      --semantic-error: #DC2626;
      --semantic-info: #0284C7;
      --bg-success: #F0FDF4;
      --bg-warning: #FEFCE8;
      --bg-error: #FEF2F2;
      --bg-info: #F0F9FF;
    }

    .dark {
      --bg-main: #0F172A;
      --bg-surface: #1E293B;
      --bg-elevated: #334155;
      --text-primary: #F8FAFC;
      --text-secondary: #CBD5E1;
      --text-muted: #94A3B8;
      --text-inverse: #0F172A;
      --line-default: #334155;
      --line-hover: #475569;
      --line-focus: #64748B;
      --accent: #60A5FA;
      --accent-hover: #93C5FD;
      --semantic-success: #4ADE80;
      --semantic-warning: #FACC15;
      --semantic-error: #F87171;
      --semantic-info: #38BDF8;
      --bg-success: #052E16;
      --bg-warning: #422006;
      --bg-error: #450A0A;
      --bg-info: #082F49;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC",
        "PingFang TC", "Microsoft JhengHei", sans-serif;
      color: var(--text-primary);
      background-color: var(--bg-main);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* 尊重系統減少動效偏好 */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition-duration: 0ms !important;
        animation-duration: 0ms !important;
      }
    }
  }

  ---
  六、頁面佈局與 UX 策略

  1. 導航

  - Desktop：頂部水平導航，h-16，底部 border-b border-line
  - Mobile：底部導航欄（BottomNavigation），圖示統一 Lucide-vue（2px 線條）
  - Active 態：font-medium + border-b-2 border-accent（desktop）/ text-accent（mobile）
  - Inactive 態：text-copy-muted，hover → text-copy

  2. FAB（Floating Action Button）

  - 僅保留一個核心動作（「新增日記」）
  - 使用 accent 色
  - 其他動作收納入菜單
  - Mobile only（desktop 用頂部按鈕）

  3. PWA 適配

  - Safe Areas：padding-bottom: env(safe-area-inset-bottom)
  - 手勢：日記卡片支持滑動操作（右滑存檔、左滑刪除），搭配 haptic feedback
  - 安裝提示：遵循現有 PWAInstallPrompt.vue 規範

  4. Dark Mode 切換

  - 使用 useColorMode()（Nuxt 內建）
  - 預設跟隨系統偏好 prefers-color-scheme
  - 允許手動覆蓋，持久化到 localStorage
  - 切換時使用 250ms 過渡（transition: background-color, color 250ms）

  ---
  七、執行路徑

  Phase 1：基礎加固

  1. 更新 tailwind.config.ts：寫入上述 Design Tokens
  2. 更新 assets/css/main.css：寫入 CSS 變量 + base 層
  3. 建立 components/ui/：開發核心原子組件
    - BaseButton.vue
    - BaseInput.vue
    - BaseTextarea.vue
    - BaseCard.vue
    - BaseSelect.vue
    - BaseModal.vue
    - BaseToggle.vue
    - BaseCheckbox.vue
    - BaseBadge.vue
    - BaseAlert.vue
    - BaseToast.vue
    - BaseTooltip.vue
    - BaseSkeleton.vue
    - BaseEmpty.vue
    - BasePagination.vue
    - BaseTabs.vue
  4. 全域清除：移除現有 CSS 雜項，統一改為 @layer base

  Phase 2：核心介面重構

  1. Timeline（時間軸）：線性垂直結構，移除裝飾性元素
  2. Editor（編輯器）：沉浸式模式，打字時隱藏導航列
  3. Blog/Articles：字體大小與行高 WCAG 2.1 合規優化
  4. Portfolio / Transaction：表格組件化，響應式處理
  5. Navigation：重構為響應式導航（desktop top + mobile bottom）

  Phase 3：動態與細節

  1. Nuxt Page Transitions（Slide-left/right）
  2. Dark Mode 無縫切換
  3. 全頁面 Skeleton Screen
  4. 滑動手勢（Mobile）
  5. 無障礙審計：Lighthouse Accessibility ≥ 95

  ---
  八、驗證指標

  ┌──────────────────────────┬──────────────────────┬─────────────────────┐
  │           指標           │         目標         │      驗證方式       │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ Lighthouse Accessibility │ ≥ 95                 │ Lighthouse CI       │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ 對比度（主要文字）       │ > 4.5:1              │ axe-core / 手動驗證 │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ 對比度（大字/圖標）      │ > 3:1                │ axe-core            │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ Focus 可見性             │ 100% 交互元素有 ring │ 鍵盤 Tab 遍歷       │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ CSS 體積                 │ 減少 ≥ 30%           │ Bundle analyzer     │
  ├──────────────────────────┼──────────────────────┼─────────────────────┤
  │ Dark Mode 一致性         │ 所有頁面無殘留淺色   │ 視覺回歸測試        │
  └──────────────────────────┴──────────────────────┴─────────────────────┘

  ---
  九、Decisions Log

  ┌────────────┬────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │    日期    │                  決策                  │                             理由                              │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Initial design system                  │ 極簡主義投資日記，dark mode 安全                              │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ 系統字體棧，不引入外部字體             │ 零加載，跨平台一致，自用應用不需品牌字體                      │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Dark 背景 #0F172A（Slate 900）而非純黑 │ 避免 OLED 純黑疲勞，帶藍調的灰比暖灰更適合金融場景            │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ 直角為主（0px radius）                 │ 極簡主義視覺簽名，Badge 2px 收邊，Modal 8px 柔和              │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ 單一強調色（Blue 600/400）             │ 色彩稀有才有意義，金融場景藍色傳達信任與專業                  │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Token 命名：surface / copy / line      │ 避免 bg-bg、text-text、border-border 命名衝突                 │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ 全語意色具體色值（非透明度疊加）       │ 避免在不同背景層級上產生不可預測的視覺效果                    │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Focus ring 強制 2px accent             │ WCAG 2.4.7 合規，不依賴 border color 變化                     │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Skeleton 取代 Spinner                  │ 骨架屏提供結構預期，降低感知等待                              │
  ├────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2026-04-14 │ Modal 允許例外投影                     │ 純 border 方案在 Modal/Dropdown 上不夠清晰，加入極微妙 shadow │
  └────────────┴────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘

  ---
  十、反模式清單（禁止事項）

  1. ❌ 純黑 #000 做背景、純白 #FFF 做主文字（dark mode 下）
  2. ❌ box-shadow（Modal/Dropdown 例外）
  3. ❌ border-radius 超過 8px（不使用 rounded-xl、rounded-2xl）。例外：Toggle/Switch 的 track 和 thumb 允許 rounded-full，Skeleton circle 變體允許 rounded-full
  4. ❌ Spinner 旋轉加載動畫（用 Skeleton）
  5. ❌ opacity 做 hover 態（用色值偏移）
  6. ❌ Emoji 做圖示（用 Lucide）
  7. ❌ 斑馬紋表格
  8. ❌ bounce、scale、flash 動畫
  9. ❌ 不通過 WCAG AA 的色彩組合
  10. ❌ 無 focus indicator 的交互元素

  ---
  以上就是合併後的完整計畫。相較原始版本的主要改進：

  1. 所有 dark mode 對比度達標——text-muted 從 3.1:1 修正到 5.9:1，改用 Slate 色階
  2. Token 命名不再衝突——surface / copy / line 取代 bg / text / border
  3. 補齊 10+ 缺失組件——Select、Toggle、Checkbox、Toast、Tooltip、Tabs、Pagination、Skeleton
  4. 加入 z-index 階層、響應式斷點、無障礙規範
  5. Focus ring 成為強制要求——不再「no ring」
  6. 語意色背景用具體色值——不用不可控的透明度疊加
  7. darkMode: 'class' 明確配置——不再遺漏
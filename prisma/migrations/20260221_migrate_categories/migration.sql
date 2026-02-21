-- 遷移腳本：將分類欄位從中文值轉換為英文 key
-- 執行時機：在部署新版本程式碼之前
-- 備註：請先備份資料庫

-- 基本面分析 -> fundamental
UPDATE posts SET category = 'fundamental' WHERE category IN ('基本面分析', '基本面分析');

-- 技術面分析 -> technical (處理繁體/簡體變體)
UPDATE posts SET category = 'technical' WHERE category IN ('技术面分析', '技術面分析', '技术面分析');

-- 市場觀察 -> market (處理繁體/簡體變體)
UPDATE posts SET category = 'market' WHERE category IN ('市场观察', '市場觀察', '市场观察');

-- 投資策略 -> strategy (處理繁體/簡體變體)
UPDATE posts SET category = 'strategy' WHERE category IN ('投资策略', '投資策略', '投资策略');

-- 英文值也需要統一（向後相容）
UPDATE posts SET category = 'fundamental' WHERE category = 'Fundamental Analysis';
UPDATE posts SET category = 'technical' WHERE category = 'Technical Analysis';
UPDATE posts SET category = 'market' WHERE category = 'Market Watch';
UPDATE posts SET category = 'strategy' WHERE category = 'Investment Strategy';

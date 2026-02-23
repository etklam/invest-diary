# Prisma + Nuxt + Vite 本地 500 Error 最終解法備忘

## 問題背景
在 Nuxt 3 專案中使用 Prisma（MySQL）時，本地開發（`npm run dev`）出現以下錯誤，但 **Docker / production 正常**：

- `(0, Fo.promisify) is not a function`
- `The requested module '/_nuxt/node_modules/@prisma/client/runtime/library.js' does not provide an export named 'Decimal'`
- `/timeline` SSR 500 error

## 根本原因（重點）
**Prisma runtime 被 Vite dev server 當成 client/shared dependency 打包**。

只要下列任一情況成立，錯誤一定會發生：
- 在 shared / utils / client code 中 `import '@prisma/client/runtime/*'`
- 在 client 可達檔案中 `import { PrismaClient } from '@prisma/client'`
- Vite `optimizeDeps` 沒排除 Prisma
- Vite cache 未清乾淨

這是 **Vite dev 專屬問題**，不是 Prisma、不是 DB、不是 migration 問題。

## 最終正確做法（不可缺一）

### 1. Prisma 僅能存在於 server runtime
**`lib/prisma.ts`（ESM-safe）**
```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const { PrismaClient } = require('@prisma/client')

const prismaClientSingleton = () => new PrismaClient()

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()
export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}
```

✅ 不可使用 `import { PrismaClient } from '@prisma/client'`

---

### 2. **禁止任何 runtime import Prisma Decimal**
❌ 錯誤示例（一定會炸）：
```ts
import { Decimal } from '@prisma/client/runtime/library'
```

✅ 正確（型別專用）：
```ts
import type { Prisma } from '@prisma/client'

quantity: Prisma.Decimal | number
price: Prisma.Decimal | number
```

> 型別 import 會在編譯期消失，不會進 runtime / client bundle。

---

### 3. 明確告訴 Vite 不要碰 Prisma
**`nuxt.config.ts`**
```ts
export default defineNuxtConfig({
  vite: {
    optimizeDeps: {
      exclude: ['@prisma/client', '@prisma/client/runtime']
    }
  }
})
```

---

### 4. 一定要清 Vite cache（一次）
```bash
rm -rf node_modules/.cache/vite
npm run dev
```

> Vite 不會因為 config 改變自動失效 cache。

---

## 為什麼 server / docker 不會中
- Production / Docker 使用 **Nitro server bundle**
- 不經過 Vite dev / optimizeDeps
- Prisma 永遠只在 Node server side

所以這類錯誤 **理論上只會在 local dev 發生**。

## 上線前自檢清單
```bash
# 必須為 0 筆
rg "@prisma/client/runtime"

# PrismaClient 只能存在於 lib/prisma.ts
rg "PrismaClient"
```

通過以上檢查即可確保：
- local ✅
- docker ✅
- production ✅

## 結論
這不是 Prisma 或資料庫問題，而是 **Nuxt + Vite + Prisma 的經典踩雷點**。
只要遵守上述結構，問題不會再復發。

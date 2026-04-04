import { createApp, toNodeListener } from 'h3'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

let testServer: ReturnType<typeof createServer> | null = null
let testApp: ReturnType<typeof createApp> | null = null

/**
 * 測試伺服器配置
 */
export interface TestServerConfig {
  port?: number
}

/**
 * 啟動測試伺服器
 */
export async function setupTestServer(config: TestServerConfig = {}) {
  if (testServer) {
    return testServer
  }

  testApp = createApp()
  testServer = createServer(toNodeListener(testApp))

  await new Promise<void>((resolve) => {
    testServer!.listen(config.port || 0, () => resolve())
  })

  return testServer
}

/**
 * 關閉測試伺服器
 */
export async function teardownTestServer() {
  if (testServer) {
    await new Promise<void>((resolve) => {
      testServer!.close(() => resolve())
    })
    testServer = null
    testApp = null
  }
}

/**
 * 取得測試伺服器 URL
 */
export function getTestServerUrl(): string {
  if (!testServer) {
    throw new Error('Test server not started')
  }
  const address = testServer.address() as AddressInfo
  return `http://localhost:${address.port}`
}

/**
 * 發送 HTTP 請求
 */
export async function makeRequest(
  endpoint: string,
  options: RequestInit = {},
  baseUrl?: string
): Promise<Response> {
  const url = `${baseUrl || getTestServerUrl()}${endpoint}`
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * 發送帶認證的 HTTP 請求
 */
export async function makeAuthenticatedRequest(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return makeRequest(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

/**
 * 解析 JSON 回應
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  return response.json()
}

/**
 * 建立表單數據請求
 */
export async function makeFormDataRequest(
  endpoint: string,
  formData: Record<string, string | Blob>,
  options: RequestInit = {}
): Promise<Response> {
  const form = new FormData()
  
  for (const [key, value] of Object.entries(formData)) {
    form.append(key, value)
  }

  return makeRequest(endpoint, {
    ...options,
    body: form as unknown as BodyInit,
    headers: {
      ...options.headers,
      // 不設置 Content-Type，讓瀏覽器自動設置 boundary
    },
  })
}

/**
 * 等待伺服器回應
 */
export async function waitForServer(maxAttempts = 10, delay = 100): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest('/api/health')
      if (response.ok) {
        return true
      }
    } catch {
      // 忽略錯誤，繼續等待
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  return false
}

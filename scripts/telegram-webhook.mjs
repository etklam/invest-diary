#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const DEFAULT_ENV_FILE = '.env'
const WEBHOOK_PATH = '/api/telegram/webhook'

export function parseEnvFile(content) {
  const env = {}

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/)
    if (!match) continue

    const [, key, rawValue = ''] = match
    let value = rawValue.trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }

    env[key] = value
  }

  return env
}

export function loadEnvFile(file = DEFAULT_ENV_FILE, target = process.env) {
  if (!existsSync(file)) return {}

  const parsed = parseEnvFile(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (target[key] === undefined) target[key] = value
  }
  return parsed
}

export function redactToken(token) {
  const [botId] = token.split(':')
  return botId ? `${botId}:***` : '***'
}

export function normalizeSiteUrl(siteUrl) {
  if (!siteUrl) throw new Error('Missing NUXT_PUBLIC_SITE_URL')

  const parsed = new URL(siteUrl)
  if (parsed.protocol !== 'https:') {
    throw new Error('NUXT_PUBLIC_SITE_URL must be an HTTPS URL reachable by Telegram')
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/+$/, '')
}

export function getWebhookConfig(env = process.env) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim()
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim()
  const siteUrl = env.NUXT_PUBLIC_SITE_URL?.trim()

  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  if (!secret) throw new Error('Missing TELEGRAM_WEBHOOK_SECRET')
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and -')
  }

  const baseUrl = normalizeSiteUrl(siteUrl)
  return {
    token,
    secret,
    webhookUrl: `${baseUrl}${WEBHOOK_PATH}`,
  }
}

async function callTelegram(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'content-type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    const description = data?.description || `${response.status} ${response.statusText}`
    throw new Error(`Telegram ${method} failed: ${description}`)
  }
  return data.result
}

function printWebhookInfo(info) {
  console.log(JSON.stringify({
    url: info.url || '',
    has_custom_certificate: Boolean(info.has_custom_certificate),
    pending_update_count: info.pending_update_count || 0,
    last_error_date: info.last_error_date || null,
    last_error_message: info.last_error_message || null,
    max_connections: info.max_connections || null,
    allowed_updates: info.allowed_updates || [],
  }, null, 2))
}

async function main(argv = process.argv.slice(2)) {
  loadEnvFile()

  const action = argv[0] || 'info'
  const config = getWebhookConfig()

  if (action === 'info') {
    console.log(`Checking Telegram webhook for bot ${redactToken(config.token)}`)
    printWebhookInfo(await callTelegram(config.token, 'getWebhookInfo'))
    return
  }

  if (action === 'set') {
    const dropPending = !argv.includes('--keep-pending')
    console.log(`Setting Telegram webhook to ${config.webhookUrl}${dropPending ? '' : ' (keeping pending updates)'}`)
    await callTelegram(config.token, 'setWebhook', {
      url: config.webhookUrl,
      secret_token: config.secret,
      allowed_updates: ['message'],
      drop_pending_updates: dropPending,
    })
    printWebhookInfo(await callTelegram(config.token, 'getWebhookInfo'))
    return
  }

  if (action === 'delete') {
    console.log(`Deleting Telegram webhook for bot ${redactToken(config.token)}`)
    await callTelegram(config.token, 'deleteWebhook', { drop_pending_updates: false })
    printWebhookInfo(await callTelegram(config.token, 'getWebhookInfo'))
    return
  }

  throw new Error(`Unknown action "${action}". Use one of: info, set, delete`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

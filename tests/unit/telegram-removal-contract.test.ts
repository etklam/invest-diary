import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = (relativePath: string) => resolve(process.cwd(), relativePath)
const read = (relativePath: string) => readFileSync(root(relativePath), 'utf8')

describe('retired chat channel contract', () => {
  it.each([
    'server/plugins/telegram-cleanup.ts',
    'server/utils/telegram-db.ts',
    'scripts/telegram-webhook.mjs',
    'types/telegram.ts',
    'pages/settings/telegram.vue',
  ])('has no production module at %s', (relativePath) => {
    expect(existsSync(root(relativePath))).toBe(false)
  })

  it.each(['lib/telegram', 'server/api/telegram'])('leaves no files under %s', (relativePath) => {
    const directory = root(relativePath)
    expect(existsSync(directory) ? readdirSync(directory) : []).toHaveLength(0)
  })

  it('removes framework packages and webhook commands from package metadata', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts?: Record<string, string>
      dependencies?: Record<string, string>
    }

    expect(packageJson.dependencies).not.toHaveProperty('grammy')
    expect(packageJson.dependencies).not.toHaveProperty('@grammyjs/conversations')
    expect(packageJson.dependencies).not.toHaveProperty('@grammyjs/i18n')
    expect(Object.keys(packageJson.scripts ?? {}).some((key) => key.startsWith('telegram:'))).toBe(false)
  })

  it('does not ship retired runtime settings or deployment secrets', () => {
    const configSources = [
      'nuxt.config.ts',
      '.env.example',
      'k8s/01b-app-secret.yaml',
      'k8s/03-app-deployment.yaml',
      'docs/operations/DEPLOYMENT.md',
    ]
      .map(read)
      .join('\n')

    expect(configSources).not.toMatch(/TELEGRAM_BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET|NUXT_PUBLIC_TELEGRAM_BOT_USERNAME/)
    expect(configSources).not.toMatch(/telegramBotToken|telegramWebhookSecret|telegramBotUsername/)
  })

  it('keeps historical provenance while narrowing new Diary writes', () => {
    const schema = read('prisma/schema.prisma')
    const diaryWrite = read('server/utils/diary-write.ts')

    expect(schema).toContain('TELEGRAM_BOT')
    expect(schema).not.toMatch(/model Telegram(Account|Session|VerificationCode|ProcessedUpdate)/)
    expect(schema).not.toMatch(/telegramAccounts|verificationCodes/)
    expect(diaryWrite).toContain("createdVia?: 'WEB' | 'API_KEY'")
    expect(diaryWrite).not.toContain("createdVia?: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'")
  })

  it('contains a forward migration for all retired persistence tables', () => {
    const migration = read(
      'prisma/migrations/20260807100000_remove_telegram_bot_support/migration.sql'
    )

    for (const table of [
      'telegram_processed_updates',
      'telegram_sessions',
      'telegram_verification_codes',
      'telegram_accounts',
    ]) {
      expect(migration).toMatch(new RegExp('DROP TABLE(?: IF EXISTS)? `' + table + '`'))
    }
    expect(migration).not.toMatch(/ALTER TABLE [`']?diar(?:y|ies)/i)
  })
})

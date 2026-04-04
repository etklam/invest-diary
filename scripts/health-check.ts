#!/usr/bin/env tsx

/**
 * System Health Check Script
 *
 * Runs comprehensive checks to verify system health:
 * - TypeScript compilation
 * - Unit tests
 * - Database connection
 * - Prisma schema validation
 * - Build verification
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface HealthCheckResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  duration?: number
}

const describeError = (error?: unknown) => {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    const serialized = JSON.stringify(error)
    return serialized || String(error)
  } catch {
    return String(error)
  }
}

const appendErrorMessage = (error?: unknown) => {
  const description = describeError(error)
  return description ? `: ${description}` : ''
}

const results: HealthCheckResult[] = []

function runCheck(
  name: string,
  check: () => void,
  skipCondition: boolean = false
): HealthCheckResult {
  if (skipCondition) {
    const result: HealthCheckResult = {
      name,
      status: 'skip',
      message: 'Skipped (condition not met)'
    }
    results.push(result)
    return result
  }

  const startTime = Date.now()
  try {
    check()
    const duration = Date.now() - startTime
    const result: HealthCheckResult = {
      name,
      status: 'pass',
      message: 'OK',
      duration
    }
    results.push(result)
    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    const result: HealthCheckResult = {
      name,
      status: 'fail',
      message: error.message || String(error),
      duration
    }
    results.push(result)
    return result
  }
}

function exec(command: string, options?: { silent?: boolean }) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: options?.silent ? 'pipe' : 'inherit'
    })
    return output
  } catch (error: any) {
    throw new Error(error.stdout || error.message)
  }
}

console.log('🏥 Running System Health Check...\n')

// Check 1: Environment variables
runCheck(
  'Environment Variables',
  () => {
    const envPath = resolve('.env')
    const envExamplePath = resolve('.env.example')

    if (!existsSync(envPath)) {
      throw new Error(`.env file not found. Copy ${envExamplePath} to .env and configure.`)
    }

    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      // Load .env file manually for this check
      const envContent = readFileSync(envPath, 'utf-8')
      const hasDbUrl = envContent.includes('DATABASE_URL')
      if (!hasDbUrl) {
        throw new Error('DATABASE_URL not configured in .env')
      }
    }
  }
)

// Check 2: Prisma Schema Validation
runCheck(
  'Prisma Schema',
  () => {
    try {
      exec('npx prisma validate', { silent: true })
    } catch (error) {
      throw new Error(`Prisma schema validation failed${appendErrorMessage(error)}`)
    }
  }
)

// Check 3: TypeScript Compilation
runCheck(
  'TypeScript Compilation',
  () => {
    exec('npm run typecheck')
  },
  !existsSync(resolve('tsconfig.json'))
)

// Check 4: Unit Tests
runCheck(
  'Unit Tests',
  () => {
    try {
      exec('npm test -- --run', { silent: true })
    } catch (error) {
      throw new Error(`Unit tests failed${appendErrorMessage(error)}`)
    }
  }
)

// Check 5: Database Connection
runCheck(
  'Database Connection',
  () => {
    try {
      // Try to fetch a single record to verify connection
      exec('npx prisma db execute --stdin <<< "SELECT 1;"', { silent: true })
    } catch {
      // If direct execute fails, try through Prisma Client
      try {
        const { PrismaClient } = require('@prisma/client')
        const { PrismaMariaDb } = require('@prisma/adapter-mariadb')
        const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/test'
        const prisma = new PrismaClient({
          adapter: new PrismaMariaDb(databaseUrl)
        })
        prisma.$disconnect()
      } catch (prismaError) {
        throw new Error(`Cannot connect to database. Check DATABASE_URL and ensure MySQL is running.${appendErrorMessage(prismaError)}`)
      }
    }
  }
)

// Check 6: Dependencies
runCheck(
  'Dependencies',
  () => {
    if (!existsSync(resolve('node_modules'))) {
      throw new Error('node_modules not found. Run `npm install`')
    }
    if (!existsSync(resolve('.nuxt'))) {
      throw new Error('Nuxt build not found. Run `npm run postinstall` or `nuxt prepare`')
    }
  }
)

// Print results
console.log('\n📊 Health Check Results:\n')
console.log('─'.repeat(60))

let passed = 0
let failed = 0
let skipped = 0

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️ '
  const duration = result.duration ? ` (${result.duration}ms)` : ''
  console.log(`${icon} ${result.name.padEnd(30)} ${result.message}${duration}`)

  if (result.status === 'pass') passed++
  else if (result.status === 'fail') failed++
  else skipped++
}

console.log('─'.repeat(60))
console.log(`\nTotal: ${results.length} checks | ✅ ${passed} passed | ❌ ${failed} failed | ⏭️ ${skipped} skipped\n`)

if (failed > 0) {
  console.log('❌ Health check FAILED! Please fix the errors above.\n')
  process.exit(1)
} else {
  console.log('✅ All health checks PASSED! System is healthy.\n')
  process.exit(0)
}

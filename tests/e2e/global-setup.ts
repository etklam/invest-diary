import { execFile as execFileCallback, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { assertDisposableDatabaseUrl } from '../../scripts/test-database-guard'

const execFile = promisify(execFileCallback)
const ROOT_DIR = resolve(process.cwd())
const MARIADB_IMAGE = 'mariadb:11.4'
const ROOT_PASSWORD = 'e2e-only-root-password'

interface E2ERuntime {
  databaseUrl: string
  containerName?: string
  externallyManaged: boolean
  serverProcess?: ChildProcess
}

async function run(command: string, args: string[], env?: NodeJS.ProcessEnv) {
  try {
    return await execFile(command, args, {
      cwd: ROOT_DIR,
      env: env ?? process.env,
      maxBuffer: 10 * 1024 * 1024,
    })
  }
  catch (error) {
    const details = error as { stderr?: string; stdout?: string; message?: string }
    throw new Error([
      `E2E setup command failed: ${command} ${args.join(' ')}`,
      details.stderr?.trim(),
      details.stdout?.trim(),
      details.message,
    ].filter(Boolean).join('\n'))
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
}

async function waitForMariaDb(containerName: string): Promise<void> {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await run('docker', [
        'exec', containerName, 'mariadb-admin', 'ping',
        '--host=127.0.0.1', '--user=root', `--password=${ROOT_PASSWORD}`, '--silent',
      ])
      return
    }
    catch {
      if (attempt === 60) break
      await delay(1000)
    }
  }

  throw new Error(`Disposable MariaDB ${containerName} did not become ready within 60 seconds`)
}

async function assertMariaDbVersion(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) })
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ version: string }>>('SELECT VERSION()')
    const version = rows[0]?.version?.trim()
    if (!version || !/^11\.4\./.test(version)) {
      throw new Error(`E2E MariaDB version mismatch: expected 11.4.x, got ${version ?? 'unknown'}`)
    }
  }
  finally {
    await prisma.$disconnect()
  }
}

async function applyMigrations(databaseUrl: string): Promise<void> {
  await run(resolve(ROOT_DIR, 'node_modules/.bin/prisma'), ['migrate', 'deploy'], {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    JWT_SECRET: 'e2e-only-jwt-secret-longer-than-32-characters',
    NUXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
  })
}

async function startDevServer(): Promise<ChildProcess> {
  const serverProcess = spawn(resolve(ROOT_DIR, 'node_modules/.bin/nuxt'), [
    'dev', '--host', '127.0.0.1', '--port', '3000',
  ], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const output: string[] = []
  const rememberOutput = (chunk: Buffer) => {
    output.push(chunk.toString())
    if (output.length > 20) output.shift()
  }
  serverProcess.stdout?.on('data', rememberOutput)
  serverProcess.stderr?.on('data', rememberOutput)

  let processError: Error | undefined
  serverProcess.once('error', error => { processError = error })

  for (let attempt = 1; attempt <= 120; attempt += 1) {
    if (processError) throw processError
    if (serverProcess.exitCode !== null) {
      throw new Error(`E2E dev server exited before readiness:\n${output.join('')}`)
    }

    try {
      const response = await fetch('http://127.0.0.1:3000/auth/login', {
        signal: AbortSignal.timeout(2000),
      })
      if (response.status < 500) return serverProcess
    }
    catch {
      // The Nuxt dev server can take several seconds to compile its first route.
    }
    await delay(1000)
  }

  serverProcess.kill('SIGTERM')
  throw new Error(`E2E dev server did not become ready within 120 seconds:\n${output.join('')}`)
}

async function stopDevServer(serverProcess: ChildProcess | undefined): Promise<void> {
  if (!serverProcess || serverProcess.exitCode !== null) return

  await new Promise<void>(resolveStop => {
    const timer = setTimeout(() => {
      serverProcess.kill('SIGKILL')
      resolveStop()
    }, 5000)
    serverProcess.once('exit', () => {
      clearTimeout(timer)
      resolveStop()
    })
    serverProcess.kill('SIGTERM')
  })
}

async function cleanupRuntime(runtime: E2ERuntime): Promise<void> {
  await stopDevServer(runtime.serverProcess)
  if (runtime.containerName && !runtime.externallyManaged) {
    await run('docker', ['rm', '-f', runtime.containerName]).catch(error => {
      console.warn(`E2E Global Teardown: failed to remove ${runtime.containerName}`, error)
    })
  }
}

async function startDisposableDatabase(runId: string): Promise<E2ERuntime> {
  const databaseName = `diary_e2e_${runId}`
  const containerName = `diary-e2e-${runId}`

  await run('docker', [
    'run', '--rm', '--detach',
    '--name', containerName,
    '--publish', '127.0.0.1::3306',
    '--env', `MARIADB_ROOT_PASSWORD=${ROOT_PASSWORD}`,
    '--env', `MARIADB_DATABASE=${databaseName}`,
    MARIADB_IMAGE,
  ])

  try {
    await waitForMariaDb(containerName)
    const portOutput = await run('docker', ['port', containerName, '3306/tcp'])
    const port = portOutput.stdout.match(/:(\d+)\s*$/m)?.[1]
    if (!port) throw new Error(`Could not resolve disposable MariaDB port for ${containerName}`)

    const databaseUrl = `mysql://root:${ROOT_PASSWORD}@127.0.0.1:${port}/${databaseName}`
    assertDisposableDatabaseUrl(databaseUrl, { databasePrefix: 'diary_e2e_' })

    const versionOutput = await run('docker', [
      'exec', containerName, 'mariadb', '-uroot', `-p${ROOT_PASSWORD}`, '-Nse', 'SELECT VERSION()',
    ])
    if (!/^11\.4\./.test(versionOutput.stdout.trim())) {
      throw new Error(`E2E MariaDB version mismatch: expected 11.4.x, got ${versionOutput.stdout.trim()}`)
    }

    await applyMigrations(databaseUrl)
    return { databaseUrl, containerName, externallyManaged: false }
  }
  catch (error) {
    await run('docker', ['rm', '-f', containerName]).catch(() => undefined)
    throw error
  }
}

async function globalSetup() {
  const generatedRunId = `${Date.now()}-${process.pid}`.replace(/[^0-9-]/g, '')
  const suppliedUrl = process.env.E2E_DATABASE_URL
  const configuredRunId = process.env.E2E_RUN_ID
  if (suppliedUrl && !configuredRunId) {
    throw new Error('E2E_RUN_ID is required when E2E_DATABASE_URL points at an externally managed disposable database')
  }
  const runId = configuredRunId ?? generatedRunId
  if (!/^[a-zA-Z0-9-]+$/.test(runId)) {
    throw new Error('E2E_RUN_ID may contain only ASCII letters, numbers, and hyphens')
  }
  console.log(
    suppliedUrl
      ? `E2E Global Setup: using externally managed disposable MariaDB (${runId})`
      : `E2E Global Setup: creating disposable MariaDB (${runId})`,
  )

  const runtime: E2ERuntime = suppliedUrl
    ? (() => {
        assertDisposableDatabaseUrl(suppliedUrl, { databaseName: `diary_e2e_${runId}` })
        return { databaseUrl: suppliedUrl, externallyManaged: true } satisfies E2ERuntime
      })()
    : await startDisposableDatabase(runId)

  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = runtime.databaseUrl
  process.env.E2E_DATABASE_URL = runtime.databaseUrl
  process.env.E2E_RUN_ID = runId
  process.env.JWT_SECRET = 'e2e-only-jwt-secret-longer-than-32-characters'
  process.env.NUXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3000'
  process.env.TRUST_X_FORWARDED_FOR = 'true'
  process.env.SCHEDULER_ENABLED = 'false'

  try {
    if (runtime.externallyManaged) {
      await assertMariaDbVersion(runtime.databaseUrl)
      await applyMigrations(runtime.databaseUrl)
    }
    // Playwright starts its configured webServer before globalSetup. Spawn the
    // app here so its process receives the disposable DB URL and test config.
    runtime.serverProcess = await startDevServer()
    console.log(`E2E Global Setup: ready (${runtime.databaseUrl.replace(/:[^:@/]+@/, ':***@')})`)

    return async () => {
      await cleanupRuntime(runtime)
      console.log(
        runtime.externallyManaged
          ? 'E2E Global Teardown: externally managed database preserved'
          : 'E2E Global Teardown: disposable database removed',
      )
    }
  }
  catch (error) {
    await cleanupRuntime(runtime)
    throw error
  }
}

export default globalSetup

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Dockerfile Prisma migration runtime contract', () => {
  it('copies prisma.config.ts into the runtime image', () => {
    const dockerfilePath = resolve(process.cwd(), 'Dockerfile')
    const dockerfile = readFileSync(dockerfilePath, 'utf8')

    expect(dockerfile).toContain('COPY --from=builder /app/prisma.config.ts ./prisma.config.ts')
  })

  it('rejects invalid shell-side boolean flags before migrations', () => {
    const entrypointPath = resolve(process.cwd(), 'docker-entrypoint.sh')
    const entrypoint = readFileSync(entrypointPath, 'utf8')

    expect(entrypoint).toContain('validate_runtime_flags || exit 1')
    expect(entrypoint).toContain('Invalid SCHEDULER_ENABLED')
    expect(entrypoint).toContain('Invalid RUN_MIGRATIONS')
  })
})

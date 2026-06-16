/**
 * Thin guard that runs the real `npm run lint` and `npm run typecheck`
 * commands and asserts they exit 0.
 *
 * The previous version (tests/lint-config.test.ts) inspected the ESLint
 * config object structure but never executed lint — so lint could be broken
 * and the test would still pass.
 *
 * This guard replaces that false-confidence test with the actual command.
 * It is intentionally slow (~8s combined) and runs as part of the normal
 * test suite so regressions surface immediately.
 *
 * Set SKIP_LINT_GUARD=1 to skip when iterating on unrelated tests locally.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'

const shouldSkip = process.env.SKIP_LINT_GUARD === '1'

describe.runIf(!shouldSkip)('lint + typecheck guards', () => {
  it('`npm run lint` exits 0', () => {
    expect(() => {
      execFileSync('npm', ['run', 'lint', '--silent'], {
        stdio: 'pipe',
        timeout: 120_000,
      })
    }).not.toThrow()
  }, 180_000)

  it('`npm run typecheck` exits 0', () => {
    expect(() => {
      execFileSync('npm', ['run', 'typecheck', '--silent'], {
        stdio: 'pipe',
        timeout: 120_000,
      })
    }).not.toThrow()
  }, 180_000)
})

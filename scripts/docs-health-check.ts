#!/usr/bin/env tsx

/**
 * Docs Health Check Script
 *
 * Verifies documentation hygiene across the repository:
 *  1. No broken relative/root-relative markdown links
 *  2. No placeholder clone URLs (`yourusername`)
 *  3. Root markdown files match the whitelist
 *  4. Current docs do not link to deprecated docs (`docs/archive/deprecated/`)
 *  5. README has no TODO/placeholder markers
 *  6. Active plans older than 60 days declare an explicit status
 *
 * Exit code: 0 on success, 1 if any check reports an error.
 */

import { execSync } from 'node:child_process'
import { readdir, readFile, stat, lstat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, resolve, dirname, normalize, sep, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const SKIP_DIRS = new Set([
  'node_modules',
  '.nuxt',
  '.output',
  '.git',
  'dist',
  '.data',
  'coverage',
  '.agents'
])

const COLOR = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`
}

interface Issue {
  file: string
  message: string
}

const checksRun: { name: string; passed: boolean }[] = []

/**
 * Recursively walk a directory and yield file paths. Skips symlinks and
 * directories listed in SKIP_DIRS.
 */
async function walkDir(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    let st
    try {
      st = await lstat(full)
    } catch {
      continue
    }
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...(await walkDir(full)))
    } else if (st.isFile()) {
      out.push(full)
    }
  }
  return out
}

/** Find all `.md` files under REPO_ROOT. */
async function findMarkdownFiles(): Promise<string[]> {
  const files = await walkDir(REPO_ROOT)
  return files.filter((f) => f.endsWith('.md'))
}

/** Render a path relative to the repo root for friendlier output. */
function rel(path: string): string {
  return relative(REPO_ROOT, path) || path
}

const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function isExternalLink(link: string): boolean {
  return (
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('tel:') ||
    link.startsWith('ftp://') ||
    link.startsWith('ftps://')
  )
}

/** Check #1 — broken markdown links. */
async function checkBrokenLinks(mdFiles: string[]): Promise<Issue[]> {
  const issues: Issue[] = []
  const archiveRoot = join(REPO_ROOT, 'docs', 'archive') + sep
  const archiveRootAlt = join(REPO_ROOT, 'docs', 'archives') + sep
  for (const file of mdFiles) {
    // Skip historical archive content — those are preserved as-is.
    const norm = file + sep
    if (norm.startsWith(archiveRoot) || norm.startsWith(archiveRootAlt)) continue
    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }
    let match
    MD_LINK_RE.lastIndex = 0
    while ((match = MD_LINK_RE.exec(content)) !== null) {
      const [, , rawLink] = match
      const link = rawLink.trim()
      if (!link) continue
      if (isExternalLink(link)) continue
      // Anchor-only
      if (link.startsWith('#')) continue

      let target: string
      if (link.startsWith('/')) {
        target = normalize(join(REPO_ROOT, link.slice(1)))
      } else {
        target = normalize(join(dirname(file), link))
      }

      // Strip in-file anchor when resolving.
      const hashIdx = target.indexOf('#')
      let fsPath = target
      let anchor: string | null = null
      if (hashIdx >= 0) {
        fsPath = target.slice(0, hashIdx)
        anchor = target.slice(hashIdx + 1)
      }
      // Accept `:line` or `:line:col` suffix on non-archive file links as a
      // code reference convention (e.g. `composables/useAppPWA.ts:1`).
      const colonMatch = fsPath.match(/^(.*?\.[a-zA-Z0-9]+):\d+(?::\d+)?$/)
      if (colonMatch) {
        fsPath = colonMatch[1]
      }
      // If link is only an anchor within the same file, skip (already handled).
      if (!fsPath) continue

      // Directory links are valid if the directory exists.
      let exists = existsSync(fsPath)
      // If it points to a path without extension and exists as dir, fine.
      if (!exists) {
        // Try with `.md` extension for bare references like `[x](./path)`.
        if (!fsPath.endsWith('.md') && existsSync(fsPath + '.md')) {
          exists = true
        }
      }
      if (!exists) {
        issues.push({
          file,
          message: `Broken link: [${match[1]}](${link}) -> ${rel(fsPath)}${
            anchor ? `#${anchor}` : ''
          }`
        })
      }
    }
  }
  return issues
}

/** Check #2 — placeholder clone URL (`yourusername`). */
async function checkPlaceholderCloneUrl(mdFiles: string[]): Promise<Issue[]> {
  const issues: Issue[] = []
  const needle = /yourusername/i
  for (const file of mdFiles) {
    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }
    if (needle.test(content)) {
      issues.push({
        file,
        message: 'Placeholder clone URL detected (`yourusername`)'
      })
    }
  }
  return issues
}

const ROOT_WHITELIST = new Set([
  'README.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'CONTEXT.md',
  'DESIGN.md',
  'PRODUCT.md',
  'AGENTS.md'
])

/** Check #3 — root markdown whitelist. */
async function checkRootMarkdownWhitelist(): Promise<Issue[]> {
  const issues: Issue[] = []
  const entries = await readdir(REPO_ROOT, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue
    if (!entry.name.endsWith('.md')) continue
    if (!ROOT_WHITELIST.has(entry.name)) {
      issues.push({
        file: join(REPO_ROOT, entry.name),
        message: `Unexpected root markdown file: ${entry.name}`
      })
    }
  }
  return issues
}

/** Check #4 — current docs linking into `docs/archive/deprecated/`. */
async function checkLinksToDeprecatedDocs(mdFiles: string[]): Promise<Issue[]> {
  const issues: Issue[] = []
  const archiveRoot = join(REPO_ROOT, 'docs', 'archive') + sep
  const archiveRootAlt = join(REPO_ROOT, 'docs', 'archives') + sep

  for (const file of mdFiles) {
    // Skip anything under docs/archive/ OR docs/archives/
    const norm = file + sep
    if (norm.startsWith(archiveRoot) || norm.startsWith(archiveRootAlt)) continue

    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }
    MD_LINK_RE.lastIndex = 0
    let match
    while ((match = MD_LINK_RE.exec(content)) !== null) {
      const link = match[2].trim()
      if (!link) continue
      if (isExternalLink(link)) continue
      if (link.startsWith('#')) continue

      let target: string
      if (link.startsWith('/')) {
        target = normalize(join(REPO_ROOT, link.slice(1)))
      } else {
        target = normalize(join(dirname(file), link))
      }
      const hashIdx = target.indexOf('#')
      if (hashIdx >= 0) target = target.slice(0, hashIdx)

      // Flag only links to SPECIFIC deprecated files, not directory pointers
      // (an index pointing at `archive/deprecated/` itself is legitimate).
      const relUnderDeprecated = relative(
        join(REPO_ROOT, 'docs', 'archive', 'deprecated'),
        target
      )
      const isSpecificDeprecatedFile =
        relUnderDeprecated &&
        !relUnderDeprecated.startsWith('..') &&
        !isAbsolute(relUnderDeprecated)
      if (isSpecificDeprecatedFile) {
        issues.push({
          file,
          message: `Current doc links to deprecated doc: ${rel(target)}`
        })
      }
    }
  }
  return issues
}

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bscreenshots?\b/i,
  /\bplaceholder\b/i,
  /\bcoming\s+soon\b/i,
  /\bxxx\b/i
]

/** Check #5 — README placeholder markers. */
async function checkReadmePlaceholders(): Promise<Issue[]> {
  const issues: Issue[] = []
  const readmePath = join(REPO_ROOT, 'README.md')
  if (!existsSync(readmePath)) {
    issues.push({ file: readmePath, message: 'README.md is missing' })
    return issues
  }
  const content = await readFile(readmePath, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, idx) => {
    for (const re of PLACEHOLDER_PATTERNS) {
      if (re.test(line)) {
        issues.push({
          file: readmePath,
          message: `Line ${idx + 1}: potential placeholder: ${line.trim()}`
        })
        break // one report per line is enough
      }
    }
  })
  return issues
}

const STATUS_MARKERS = /\bStatus:\s*(active|in-progress|paused|blocked|wip|draft|review|completed|superseded)\b/i

/** Get the date of the last git commit touching a path (ISO string) or null. */
function getLastCommitDate(filePath: string): string | null {
  try {
    const out = execSync(`git log -1 --format="%aI" -- ${JSON.stringify(relative(REPO_ROOT, filePath))}`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
    return out || null
  } catch {
    return null
  }
}

/** Check #6 — stale active plans. */
async function checkStaleActivePlans(): Promise<Issue[]> {
  const issues: Issue[] = []
  const activeDir = join(REPO_ROOT, 'docs', 'plans', 'active')
  if (!existsSync(activeDir)) return issues

  const statResult = await stat(activeDir).catch(() => null)
  if (!statResult || !statResult.isDirectory()) return issues

  const now = Date.now()
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

  const planFiles = (await walkDir(activeDir)).filter((f) => f.endsWith('.md'))
  for (const file of planFiles) {
    const iso = getLastCommitDate(file)
    if (!iso) continue
    const commitTime = Date.parse(iso)
    if (Number.isNaN(commitTime)) continue
    if (now - commitTime <= SIXTY_DAYS_MS) continue

    let content = ''
    try {
      content = await readFile(file, 'utf8')
    } catch {
      // ignore unreadable
    }
    if (!STATUS_MARKERS.test(content)) {
      const ageDays = Math.floor((now - commitTime) / (24 * 60 * 60 * 1000))
      issues.push({
        file,
        message: `Active plan not updated in ${ageDays} days and has no explicit Status: marker`
      })
    }
  }
  return issues
}

interface CheckResult {
  name: string
  issues: Issue[]
}

async function runCheck(
  name: string,
  fn: () => Promise<Issue[]>
): Promise<CheckResult> {
  process.stdout.write(`${COLOR.bold(COLOR.cyan('▶'))} ${name}...`)
  let issues: Issue[] = []
  try {
    issues = await fn()
  } catch (err) {
    issues = [
      {
        file: REPO_ROOT,
        message: `Check crashed: ${err instanceof Error ? err.message : String(err)}`
      }
    ]
  }
  if (issues.length === 0) {
    process.stdout.write(` ${COLOR.green('OK')}\n`)
    checksRun.push({ name, passed: true })
  } else {
    process.stdout.write(` ${COLOR.red(`${issues.length} issue(s)`)}\n`)
    checksRun.push({ name, passed: false })
  }
  return { name, issues }
}

async function main() {
  process.stdout.write(`${COLOR.bold('Docs Health Check')}\n`)
  process.stdout.write(`${COLOR.gray(`Repo: ${REPO_ROOT}\n\n`)}`)

  const mdFiles = await findMarkdownFiles()
  process.stdout.write(
    `${COLOR.gray(`Scanning ${mdFiles.length} markdown files\n\n`)}`
  )

  const results: CheckResult[] = []

  results.push(await runCheck('Broken markdown links', () => checkBrokenLinks(mdFiles)))
  results.push(await runCheck('Placeholder clone URLs', () => checkPlaceholderCloneUrl(mdFiles)))
  results.push(await runCheck('Root markdown whitelist', () => checkRootMarkdownWhitelist()))
  results.push(await runCheck('Links to deprecated docs', () => checkLinksToDeprecatedDocs(mdFiles)))
  results.push(await runCheck('README placeholder markers', () => checkReadmePlaceholders()))
  results.push(await runCheck('Stale active plans', () => checkStaleActivePlans()))

  process.stdout.write('\n')
  const failedFiles = new Set<string>()
  let totalIssues = 0
  for (const r of results) {
    if (r.issues.length === 0) continue
    process.stdout.write(`${COLOR.bold(COLOR.red(`✗ ${r.name}`))}\n`)
    for (const issue of r.issues) {
      totalIssues++
      failedFiles.add(issue.file)
      process.stdout.write(
        `  ${COLOR.yellow(rel(issue.file))}: ${issue.message}\n`
      )
    }
    process.stdout.write('\n')
  }

  const passed = results.filter((r) => r.issues.length === 0).length
  const failed = results.length - passed

  if (failed === 0) {
    process.stdout.write(`${COLOR.green(`✓ ${passed} checks passed`)}\n`)
    process.exit(0)
  } else {
    process.stdout.write(
      `${COLOR.red(
        `✗ ${failed} check(s) failed, ${totalIssues} issue(s) across ${failedFiles.size} file(s)`
      )}\n`
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

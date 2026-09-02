import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

type Schema = {
  $ref?: string
  type?: string
  enum?: unknown[]
  required?: string[]
  properties?: Record<string, Schema>
  items?: Schema
  [key: string]: unknown
}

type Operation = {
  parameters?: Array<{ name: string; in: string; required?: boolean }>
  requestBody?: { required?: boolean; content?: Record<string, { schema?: Schema }> }
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>
}

type OpenApiDocument = {
  info?: { version?: string }
  paths?: Record<string, Record<string, Operation>>
  components?: { schemas?: Record<string, Schema> }
}

const METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head', 'trace']

function resolveSchema(document: OpenApiDocument, schema: Schema | undefined): Schema | undefined {
  if (!schema?.$ref?.startsWith('#/components/schemas/')) return schema
  const name = schema.$ref.slice('#/components/schemas/'.length)
  return document.components?.schemas?.[name]
}

function bodySchema(document: OpenApiDocument, operation: Operation | undefined): Schema | undefined {
  return resolveSchema(document, operation?.requestBody?.content?.['application/json']?.schema)
}

function responseSchema(document: OpenApiDocument, operation: Operation | undefined, status: string): Schema | undefined {
  return resolveSchema(document, operation?.responses?.[status]?.content?.['application/json']?.schema)
}

function compareSchema(
  baseDocument: OpenApiDocument,
  currentDocument: OpenApiDocument,
  base: Schema | undefined,
  current: Schema | undefined,
  location: string,
  findings: string[],
) {
  const baseSchema = resolveSchema(baseDocument, base)
  const currentSchema = resolveSchema(currentDocument, current)
  if (!baseSchema || !currentSchema) return

  if (baseSchema.type && currentSchema.type && baseSchema.type !== currentSchema.type) {
    findings.push(`${location}: schema type changed from ${baseSchema.type} to ${currentSchema.type}`)
  }

  if (baseSchema.enum && currentSchema.enum) {
    for (const value of baseSchema.enum) {
      if (!currentSchema.enum.some(candidate => JSON.stringify(candidate) === JSON.stringify(value))) {
        findings.push(`${location}: enum value ${JSON.stringify(value)} was removed`)
      }
    }
  }

  const baseProperties = baseSchema.properties ?? {}
  const currentProperties = currentSchema.properties ?? {}
  for (const [name, baseProperty] of Object.entries(baseProperties)) {
    const currentProperty = currentProperties[name]
    if (!currentProperty) {
      findings.push(`${location}.${name}: property was removed`)
      continue
    }
    compareSchema(baseDocument, currentDocument, baseProperty, currentProperty, `${location}.${name}`, findings)
  }

  if (baseSchema.items || currentSchema.items) {
    if (!baseSchema.items || !currentSchema.items) {
      findings.push(`${location}: array item schema was removed`)
    } else {
      compareSchema(baseDocument, currentDocument, baseSchema.items, currentSchema.items, `${location}[]`, findings)
    }
  }
}

function compareRequiredRequestFields(
  baseDocument: OpenApiDocument,
  currentDocument: OpenApiDocument,
  baseOperation: Operation,
  currentOperation: Operation,
  location: string,
  findings: string[],
) {
  const baseBody = bodySchema(baseDocument, baseOperation)
  const currentBody = bodySchema(currentDocument, currentOperation)
  if (baseOperation.requestBody?.required && !currentOperation.requestBody?.required) {
    findings.push(`${location}: request body became optional`)
  }
  if (baseOperation.requestBody && !currentOperation.requestBody) {
    findings.push(`${location}: request body was removed`)
    return
  }
  if (!baseBody || !currentBody) return

  const baseRequired = new Set(baseBody.required ?? [])
  const currentRequired = new Set(currentBody.required ?? [])
  for (const field of baseRequired) {
    if (!currentRequired.has(field)) findings.push(`${location}: required request field ${field} became optional`)
  }
  for (const field of currentRequired) {
    if (!baseRequired.has(field)) findings.push(`${location}: new required request field ${field}`)
  }
}

function compareRequiredResponseFields(
  baseDocument: OpenApiDocument,
  currentDocument: OpenApiDocument,
  baseOperation: Operation,
  currentOperation: Operation,
  status: string,
  location: string,
  findings: string[],
) {
  const baseResponse = responseSchema(baseDocument, baseOperation, status)
  const currentResponse = responseSchema(currentDocument, currentOperation, status)
  if (!baseResponse || !currentResponse) return

  const baseRequired = new Set(baseResponse.required ?? [])
  const currentRequired = new Set(currentResponse.required ?? [])
  for (const field of baseRequired) {
    if (!currentRequired.has(field)) {
      findings.push(`${location}: required response field ${field} became optional`)
    }
  }
}

function checkBreakingChanges(baseDocument: OpenApiDocument, currentDocument: OpenApiDocument): string[] {
  const findings: string[] = []
  const basePaths = baseDocument.paths ?? {}
  const currentPaths = currentDocument.paths ?? {}

  for (const [path, basePath] of Object.entries(basePaths)) {
    const currentPath = currentPaths[path]
    if (!currentPath) {
      findings.push(`${path}: path was removed`)
      continue
    }

    for (const method of METHODS) {
      const baseOperation = basePath[method]
      if (!baseOperation) continue
      const currentOperation = currentPath[method]
      const location = `${method.toUpperCase()} ${path}`
      if (!currentOperation) {
        findings.push(`${location}: operation was removed`)
        continue
      }

      const baseParameters = new Map((baseOperation.parameters ?? []).map(parameter => [`${parameter.in}:${parameter.name}`, parameter]))
      const currentParameters = new Map((currentOperation.parameters ?? []).map(parameter => [`${parameter.in}:${parameter.name}`, parameter]))
      for (const [key, parameter] of baseParameters) {
        const currentParameter = currentParameters.get(key)
        if (!currentParameter) {
          findings.push(`${location}: parameter ${key} was removed`)
        } else if (!parameter.required && currentParameter.required) {
          findings.push(`${location}: parameter ${key} became required`)
        }
      }

      compareRequiredRequestFields(baseDocument, currentDocument, baseOperation, currentOperation, location, findings)
      compareSchema(baseDocument, currentDocument, bodySchema(baseDocument, baseOperation), bodySchema(currentDocument, currentOperation), `${location} request`, findings)

      for (const status of Object.keys(baseOperation.responses ?? {})) {
        if (!currentOperation.responses?.[status]) {
          findings.push(`${location}: response ${status} was removed`)
          continue
        }
        compareSchema(
          baseDocument,
          currentDocument,
          responseSchema(baseDocument, baseOperation, status),
          responseSchema(currentDocument, currentOperation, status),
          `${location} response ${status}`,
          findings,
        )
        compareRequiredResponseFields(
          baseDocument,
          currentDocument,
          baseOperation,
          currentOperation,
          status,
          `${location} response ${status}`,
          findings,
        )
      }
    }
  }

  return findings
}

function majorVersion(version: string | undefined): number | null {
  const match = /^(\d+)\./.exec(version ?? '')
  return match ? Number(match[1]) : null
}

async function main() {
  const baseRef = process.env.OPENAPI_BASE_REF ?? 'HEAD^'
  const current = JSON.parse(await readFile('openapi/openapi.json', 'utf8')) as OpenApiDocument
  let baseText: string
  try {
    baseText = execFileSync('git', ['show', `${baseRef}:openapi/openapi.json`], { encoding: 'utf8' })
  } catch {
    let isInitialArtifact = false
    try {
      const headStatus = execFileSync(
        'git',
        ['diff-tree', '--no-commit-id', '--name-status', '-r', 'HEAD', '--', 'openapi/openapi.json'],
        { encoding: 'utf8' },
      )
      isInitialArtifact = headStatus.split('\n').some(line => /^A\s+openapi\/openapi\.json$/.test(line.trim()))
    } catch {
      // A local uncommitted worktree has no meaningful HEAD artifact status.
    }

    if ((process.env.CI === 'true' || process.env.CI === '1') && !isInitialArtifact) {
      console.error(`No OpenAPI baseline at ${baseRef}; refusing to skip the breaking-change check in CI.`)
      process.exitCode = 1
      return
    }

    console.log(`No OpenAPI baseline at ${baseRef}; breaking-change check skipped for the initial artifact.`)
    return
  }

  const baseline = JSON.parse(baseText) as OpenApiDocument
  const findings = checkBreakingChanges(baseline, current)
  if (findings.length === 0) {
    console.log(`OpenAPI breaking-change check passed against ${baseRef}.`)
    return
  }

  const baseMajor = majorVersion(baseline.info?.version)
  const currentMajor = majorVersion(current.info?.version)
  if (baseMajor !== null && currentMajor !== null && currentMajor > baseMajor) {
    console.log(`OpenAPI breaking changes are allowed by major version ${baseline.info?.version} → ${current.info?.version}.`)
    return
  }

  console.error(`OpenAPI breaking changes detected against ${baseRef}. Bump the major version before merging:`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exitCode = 1
}

await main()

import { readFile, writeFile } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { openApiDocument } from './registry'

const outputPath = resolve(process.cwd(), 'openapi/openapi.json')
const checkOnly = process.argv.includes('--check')

async function main() {
  const output = `${JSON.stringify(openApiDocument, null, 2)}\n`

  if (checkOnly) {
    let current: string
    try {
      current = await readFile(outputPath, 'utf8')
    } catch {
      console.error(`Missing generated OpenAPI document: ${outputPath}`)
      process.exitCode = 1
      return
    }

    if (current !== output) {
      console.error('OpenAPI document is stale. Run npm run openapi:generate.')
      process.exitCode = 1
      return
    }

    console.log('OpenAPI document is up to date.')
    return
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, output, 'utf8')
  console.log(`Generated ${outputPath}`)
}

await main()

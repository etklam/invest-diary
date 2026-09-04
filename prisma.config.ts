import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { getDatabaseUrl } from './server/config/env'

const databaseUrl = getDatabaseUrl({ allowTestFallback: true })

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})

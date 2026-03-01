import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/test'

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})

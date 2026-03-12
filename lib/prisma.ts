import { createRequire } from 'node:module'
import { createPrismaClientOptions } from './prisma-client-options'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const prismaClientSingleton = () => {
  return new PrismaClient(createPrismaClientOptions())
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

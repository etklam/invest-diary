import { PrismaClient } from '@prisma/client'
import { createPrismaClientOptions } from './prisma-client-options'

const prismaClientSingleton = () => {
  return new PrismaClient(createPrismaClientOptions())
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

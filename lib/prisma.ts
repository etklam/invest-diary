import { createRequire } from 'node:module'
import { createPrismaClientOptions } from './prisma-client-options'
import { parseRuntimeSettings } from '~/server/config/env'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const prismaClientSingleton = () => {
  return new PrismaClient(createPrismaClientOptions())
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

let prismaClient: ReturnType<typeof prismaClientSingleton> | undefined

function getPrismaClient() {
  if (prismaClient) {
    return prismaClient
  }

  const client = globalThis.prismaGlobal ?? prismaClientSingleton()
  prismaClient = client

  if (parseRuntimeSettings().nodeEnv !== 'production') {
    globalThis.prismaGlobal = client
  }

  return client
}

const prisma = new Proxy({} as ReturnType<typeof prismaClientSingleton>, {
  get(_target, prop, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(getPrismaClient(), prop, value, receiver)
  },
  has(_target, prop) {
    return Reflect.has(getPrismaClient(), prop)
  },
  ownKeys() {
    return Reflect.ownKeys(getPrismaClient())
  },
  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Reflect.getOwnPropertyDescriptor(getPrismaClient(), prop)

    if (!descriptor) {
      return undefined
    }

    return {
      ...descriptor,
      configurable: true,
    }
  },
})

export default prisma

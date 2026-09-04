import prisma from '~/lib/prisma'
import { formatErrorContext, logger } from '~/lib/logger'
import { parseRuntimeSettings } from '~/server/config/env'

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  checks: {
    database: {
      status: 'ok' | 'error'
      message?: string
      responseTime?: number
    }
    server: {
      status: 'ok'
      uptime: number
      environment: string
    }
  }
}

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const startTime = Date.now()
  const checks: HealthCheckResponse['checks'] = {
    database: {
      status: 'ok'
    },
    server: {
      status: 'ok',
      uptime: process.uptime(),
      environment: parseRuntimeSettings().nodeEnv,
    }
  }

  // Database health check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'ok',
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    log.error('Health check database failure', {
      operation: 'health_check',
      ...formatErrorContext(error),
    })
    checks.database = {
      status: 'error',
      message: 'Database unavailable',
    }
    setResponseStatus(event, 503, 'Service Unavailable')

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    } as HealthCheckResponse
  }

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks
  } as HealthCheckResponse
})

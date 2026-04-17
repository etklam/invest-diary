import prisma from '~/lib/prisma'

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
  const startTime = Date.now()
  const checks: HealthCheckResponse['checks'] = {
    database: {
      status: 'ok'
    },
    server: {
      status: 'ok',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
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
    checks.database = {
      status: 'error',
      message: error instanceof Error && error.message
        ? error.message
        : 'Database connection failed'
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

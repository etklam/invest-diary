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

export default defineEventHandler(async () => {
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
    const responseTime = Date.now() - startTime
    checks.database = {
      status: 'ok',
      responseTime
    }
  } catch (error: { message?: string } | unknown) {
    checks.database = {
      status: 'error',
      message: typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : 'Database connection failed'
    }

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

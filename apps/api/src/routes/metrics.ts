import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { metricsCollector } from '../utils/metrics'

type Env = {
  DB: D1Database
  JWT_SECRET: string
}

const metrics = new Hono<{ Bindings: Env }>()

// Protect the metrics endpoint with JWT authentication
metrics.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

// Admin-only middleware
metrics.use('/*', async (c, next) => {
  const payload = c.get('jwtPayload')
  // Assuming role 'GESTOR' is admin/manager role
  if (payload.role !== 'GESTOR') {
    return c.json({ error: 'Acesso negado. Apenas gestores podem acessar métricas.' }, 403)
  }
  await next()
})

metrics.get('/', async (c) => {
  const db = c.env.DB
  
  // Get general metrics from our collector
  const generalMetrics = metricsCollector.getMetrics()
  
  // Calculate derived metrics
  const avgLatency = generalMetrics.totalRequests > 0 
    ? (generalMetrics.totalLatency / generalMetrics.totalRequests) 
    : 0
    
  const errorRate = generalMetrics.totalRequests > 0
    ? (generalMetrics.errorRequests / generalMetrics.totalRequests) * 100
    : 0

  // Get database metrics
  let dbMetrics = {
    totalPromotions: 0,
    activePromotions: 0,
    pendingPromotions: 0,
    expiredPromotions: 0,
    totalStores: 0,
    activeStores: 0
  }

  try {
    // Get promotions counts
    const [promotionsResult, storesResult] = await Promise.all([
      db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ATIVA' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'ENCERRADA' THEN 1 ELSE 0 END) as expired
        FROM promotions
      `).first(),
      
      db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active
        FROM stores
      `).first()
    ])

    if (promotionsResult) {
      dbMetrics.totalPromotions = promotionsResult.total || 0
      dbMetrics.activePromotions = promotionsResult.active || 0
      dbMetrics.pendingPromotions = promotionsResult.pending || 0
      dbMetrics.expiredPromotions = promotionsResult.expired || 0
    }

    if (storesResult) {
      dbMetrics.totalStores = storesResult.total || 0
      dbMetrics.activeStores = storesResult.active || 0
    }
  } catch (error) {
    // If database queries fail, we still return the metrics we have
    console.error('Error fetching database metrics:', error)
  }

  // Get endpoint-specific metrics
  const endpointMetrics = {}
  for (const [key, metric] of Object.entries(generalMetrics.endpointMetrics)) {
    const avgLatency = metric.total > 0 ? (metric.totalLatency / metric.total) : 0
    const errorRate = metric.total > 0 ? (metric.errors / metric.total) * 100 : 0
    
    endpointMetrics[key] = {
      total_requests: metric.total,
      error_requests: metric.errors,
      error_rate_percent: Number(errorRate.toFixed(2)),
      average_latency_ms: Number(avgLatency.toFixed(2))
    }
  }

  return c.json({
    timestamp: new Date().toISOString(),
    general: {
      total_requests: generalMetrics.totalRequests,
      error_requests: generalMetrics.errorRequests,
      error_rate_percent: Number(errorRate.toFixed(2)),
      average_latency_ms: Number(avgLatency.toFixed(2))
    },
    endpoints: endpointMetrics,
    database: dbMetrics
  })
})

export { metrics }
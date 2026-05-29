import { Context } from 'hono'

interface EndpointMetrics {
  total: number
  errors: number
  totalLatency: number
}

interface Metrics {
  totalRequests: number
  errorRequests: number
  totalLatency: number
  endpointMetrics: Record<string, EndpointMetrics>
}

export class MetricsCollector {
  private metrics: Metrics = {
    totalRequests: 0,
    errorRequests: 0,
    totalLatency: 0,
    endpointMetrics: {}
  }

  public incrementTotalRequests(): void {
    this.metrics.totalRequests++
  }

  public incrementErrorRequests(): void {
    this.metrics.errorRequests++
  }

  public addLatency(latency: number): void {
    this.metrics.totalLatency += latency
  }

  public recordEndpointMetric(endpoint: string, latency: number, isError: boolean): void {
    if (!this.metrics.endpointMetrics[endpoint]) {
      this.metrics.endpointMetrics[endpoint] = {
        total: 0,
        errors: 0,
        totalLatency: 0
      }
    }

    const endpointMetric = this.metrics.endpointMetrics[endpoint]
    endpointMetric.total++
    endpointMetric.totalLatency += latency
    if (isError) {
      endpointMetric.errors++
    }
  }

  public getMetrics(): Metrics {
    return { ...this.metrics }
  }

  public reset(): void {
    this.metrics = {
      totalRequests: 0,
      errorRequests: 0,
      totalLatency: 0,
      endpointMetrics: {}
    }
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector()

// Middleware to collect metrics
export const metricsMiddleware = async (c: Context, next: () => Promise<void>) => {
  const start = Date.now()
  try {
    await next()
  } finally {
    const latency = Date.now() - start
    const endpoint = c.req.path
    const method = c.req.method
    const key = `${method} ${endpoint}`
    
    // Update general metrics
    metricsCollector.incrementTotalRequests()
    metricsCollector.addLatency(latency)
    
    // Check if response is an error (status code >= 400)
    const isError = c.res.status >= 400
    if (isError) {
      metricsCollector.incrementErrorRequests()
    }
    
    // Update endpoint-specific metrics
    metricsCollector.recordEndpointMetric(key, latency, isError)
  }
}
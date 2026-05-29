export interface Metrics {
  totalRequests: number;
  errorRequests: number;
  totalLatency: number; // in milliseconds
  // We can add more metrics as needed
}

class MetricsCollector {
  private metrics: Metrics = {
    totalRequests: 0,
    errorRequests: 0,
    totalLatency: 0,
  };

  public incrementTotalRequests(): void {
    this.metrics.totalRequests++;
  }

  public incrementErrorRequests(): void {
    this.metrics.errorRequests++;
  }

  public addLatency(latency: number): void {
    this.metrics.totalLatency += latency;
  }

  public getMetrics(): Metrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {
      totalRequests: 0,
      errorRequests: 0,
      totalLatency: 0,
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
// OpenTelemetry tracing utility for Cloudflare Workers
import { context, SpanStatusCode, trace } from '@opentelemetry/api';

// Create a tracer
const tracer = trace.getTracer('promos-prado-api', '1.0.0');

// Helper to create spans with proper error handling
export function startSpan(name: string, options?: { attributes?: Record<string, unknown> }) {
  return tracer.startSpan(name, {
    attributes: options?.attributes,
  });
}

// Helper to end span with proper error handling
export function endSpan(span: ReturnType<typeof tracer.startSpan>, error?: Error) {
  if (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
  }
  span.end();
}

// Wrapper for async functions with tracing
export async function traceAsyncFn<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { attributes?: Record<string, unknown> }
): Promise<T> {
  const span = startSpan(name, options);
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    endSpan(span, error as Error);
    throw error;
  } finally {
    endSpan(span);
  }
}

// Wrapper for sync functions with tracing
export function traceSyncFn<T>(
  name: string,
  fn: () => T,
  options?: { attributes?: Record<string, unknown> }
): T {
  const span = startSpan(name, options);
  try {
    const result = fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    endSpan(span, error as Error);
    throw error;
  } finally {
    endSpan(span);
  }
}

export default tracer;
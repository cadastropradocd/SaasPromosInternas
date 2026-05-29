const API_BASE = '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  timeout?: number
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Não foi possível conectar à API.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Recurso não encontrado.',
  500: 'Erro inesperado no servidor.',
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  let url = `${API_BASE}${cleanPath}`

  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    }
    const query = searchParams.toString()
    if (query) url += `?${query}`
  }

  return url
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

let onUnauthenticated: (() => void) | null = null

export function setOnUnauthenticated(callback: () => void) {
  onUnauthenticated = callback
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  // Set default timeout of 8 seconds if not provided
  const { timeout = 8000, params, headers, body, ...rest } = options
  const token = localStorage.getItem('token')
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const finalHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // For retries after the first attempt, wait
    if (attempt > 0) {
      await delay(RETRY_DELAY_MS * attempt) // Exponential backoff could be implemented here
    }

    try {
      // Use AbortController for timeout
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), timeout)

      const response = await fetch(buildUrl(path, params), {
        ...rest,
        body,
        headers: finalHeaders,
        signal: abortController.signal,
      })

      clearTimeout(timeoutId)

      const text = await response.text()
      let data: unknown = null

      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          if (!response.ok) {
            throw new ApiError(DEFAULT_MESSAGES[response.status] || `HTTP ${response.status}`, response.status, 'INVALID_JSON', text)
          }
          return text as T
        }
      }

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401 && onUnauthenticated) {
          onUnauthenticated()
        }
        
        const payload = data as { error?: string; code?: string } | null
        throw new ApiError(
          payload?.error || DEFAULT_MESSAGES[response.status] || 'Erro ao processar solicitação.',
          response.status,
          payload?.code,
          data
        )
      }

      return data as T
    } catch (error: any) {
      lastError = error
      
      // If it's a timeout or network error and we have retries left, continue
      if (error.name === 'AbortError' || error instanceof TypeError) {
        if (attempt < MAX_RETRIES) {
          continue // Retry
        }
      }
      
      // For other errors (including 401 handled in the try block), don't retry
      if (!(error.name === 'AbortError' || error instanceof TypeError)) {
        throw error
      }
      
      // If we've exhausted retries for timeout/network error, break and throw last error
      if (attempt === MAX_RETRIES) {
        break
      }
    }
  }

  // If we got here, we exhausted retries
  if (lastError instanceof ApiError) {
    throw lastError
  }
  
  if (lastError instanceof Error) {
    throw new ApiError('Não foi possível conectar à API após várias tentativas.', 0, 'NETWORK_ERROR', lastError)
  }
  
  throw new ApiError('Não foi possível conectar à API após várias tentativas.', 0, 'NETWORK_ERROR', String(lastError))
}
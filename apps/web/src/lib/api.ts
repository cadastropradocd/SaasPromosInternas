const API_BASE = '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
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

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, body, ...rest } = options
  const token = localStorage.getItem('token')
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const finalHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      body,
      headers: finalHeaders,
    })
  } catch (error) {
    throw new ApiError('Não foi possível conectar à API.', 0, 'NETWORK_ERROR', error)
  }

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
    const payload = data as { error?: string; code?: string } | null
    throw new ApiError(
      payload?.error || DEFAULT_MESSAGES[response.status] || 'Erro ao processar solicitação.',
      response.status,
      payload?.code,
      data
    )
  }

  return data as T
}
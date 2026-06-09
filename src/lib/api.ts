/**
 * Cliente HTTP tipado para a API REST da IDIBRA.
 *
 * Em desenvolvimento com VITE_USE_MOCK=true, os services usam dados
 * mock locais e este cliente não é chamado.
 *
 * Em produção (VITE_USE_MOCK=false), toda comunicação passa por aqui.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Base URL da API (para casos fora do cliente `request`, ex.: EventSource/SSE). */
export const apiBaseUrl = API_URL

// ─── Token management ────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('idibra_token')
}

export function setToken(token: string): void {
  localStorage.setItem('idibra_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('idibra_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('idibra_refresh_token')
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('idibra_refresh_token', token)
}

export function clearRefreshToken(): void {
  localStorage.removeItem('idibra_refresh_token')
}

// ─── Erro tipado ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Interceptor de resposta ─────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T // No Content

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const message =
      (typeof body === 'object' && body !== null && 'message' in body)
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(res.status, message, body)
  }

  return body as T
}

// ─── Core request ────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown
    formData?: FormData
    params?: Record<string, string | number | boolean | undefined>
  } = {},
): Promise<T> {
  const { body, formData, params } = options

  // Query string
  let url = `${API_URL}${path}`
  if (params) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.append(k, String(v))
    })
    const qStr = qs.toString()
    if (qStr) url += `?${qStr}`
  }

  const doFetch = () => {
    const headers: HeadersInit = {}
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (body) headers['Content-Type'] = 'application/json'
    // Não setar Content-Type para FormData — o browser define com boundary
    return fetch(url, {
      method,
      headers,
      body: formData ?? (body ? JSON.stringify(body) : undefined),
    })
  }

  // Não tenta refresh nas próprias rotas de auth (evita laço)
  const isAuthPath = path.startsWith('/auth/')

  let res = await doFetch()

  // Token expirado → tenta renovar uma vez e refaz a requisição
  if (res.status === 401 && !isAuthPath) {
    const renovado = await tryRefresh()
    if (renovado) {
      res = await doFetch()
    } else {
      clearToken()
      clearRefreshToken()
      if (window.location.pathname !== '/login') window.location.href = '/login'
      throw new ApiError(401, 'Sessão expirada. Faça login novamente.')
    }
  }

  return handleResponse<T>(res)
}

// ─── Refresh de token (com deduplicação de chamadas concorrentes) ──

let refreshPromise: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  // Se já há um refresh em andamento, reutiliza a mesma promise
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh_token = getRefreshToken()
    if (!refresh_token) return false
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { access_token: string }
      setToken(data.access_token)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─── Interface pública ───────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return request<T>('GET', path, { params })
  },

  post<T>(path: string, body?: unknown) {
    return request<T>('POST', path, { body })
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>('PATCH', path, { body })
  },

  put<T>(path: string, body?: unknown) {
    return request<T>('PUT', path, { body })
  },

  delete<T>(path: string) {
    return request<T>('DELETE', path)
  },

  /** Upload de arquivo (multipart/form-data) */
  upload<T>(path: string, formData: FormData) {
    return request<T>('POST', path, { formData })
  },
}

// ─── Paginação tipada ────────────────────────────────────────────

export interface Paginated<T> {
  data:  T[]
  meta: {
    total: number
    page:  number
    limit: number
    pages: number
  }
}

/**
 * 极简 REST 客户端。开发期由 Vite 代理 /api 到 127.0.0.1:8000。
 * 错误统一归一化为 ApiError，便于页面直接展示中文 detail。
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  code: string
  field?: string
  status: number

  constructor(
    message: string,
    options: { code?: string; field?: string; status?: number } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code ?? 'UNKNOWN'
    this.field = options.field
    this.status = options.status ?? 0
  }
}

interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
}

function normalizeDetail(payload: unknown): {
  message: string
  code: string
  field?: string
} {
  if (payload && typeof payload === 'object') {
    const body = payload as {
      detail?: unknown
      code?: string
      field?: string
    }

    if (typeof body.detail === 'string') {
      return {
        message: body.detail,
        code: body.code ?? 'REQUEST_FAILED',
        field: body.field,
      }
    }

    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const issue = body.detail[0] as ValidationIssue
      const field = issue.loc?.filter((part) => part !== 'body').join('.')
      return {
        message: issue.msg
          ? `请求参数不合法：${issue.msg}`
          : '请求参数不合法。',
        code: body.code ?? 'VALIDATION_ERROR',
        field,
      }
    }
  }

  return {
    message: '请求失败，请确认后端服务已经启动。',
    code: 'NETWORK_ERROR',
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('无法连接后端服务，请先启动 FastAPI（端口 8000）。', {
      code: 'NETWORK_ERROR',
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = normalizeDetail(payload)
    throw new ApiError(detail.message, {
      code: detail.code,
      field: detail.field,
      status: response.status,
    })
  }
  return payload as T
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  async download(path: string): Promise<Blob> {
    let response: Response
    try {
      response = await fetch(`${BASE}${path}`)
    } catch {
      throw new ApiError('无法连接后端服务，请先启动 FastAPI（端口 8000）。', {
        code: 'NETWORK_ERROR',
      })
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const detail = normalizeDetail(payload)
      throw new ApiError(detail.message, {
        code: detail.code,
        field: detail.field,
        status: response.status,
      })
    }
    return response.blob()
  },
}

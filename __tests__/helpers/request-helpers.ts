import { NextRequest } from 'next/server'

export function buildNextRequest(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
  } = options

  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(url, init)
}

export function buildPartnerRequest(options: {
  method?: string
  url?: string
  body?: any
  apiKey?: string
  apiSecret?: string
  idempotencyKey?: string
  ip?: string
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/partner/v1/health',
    body,
    apiKey = 'test-api-key',
    apiSecret = 'test-api-secret',
    idempotencyKey,
    ip,
  } = options

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
    'x-api-secret': apiSecret,
  }

  if (idempotencyKey) {
    headers['x-idempotency-key'] = idempotencyKey
  }

  if (ip) {
    headers['x-forwarded-for'] = ip
  }

  return buildNextRequest({ method, url, body, headers })
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractApiCredentials,
  checkRateLimit,
  checkIpWhitelist,
  checkPermission,
  canAccessCompany,
  cleanupRateLimitCache,
  createErrorResponse,
  isPartnerApiEnabled,
} from '@/lib/partner-auth'
import type { PartnerAuthResult } from '@/types/partner-api.types'
import { buildNextRequest, buildPartnerRequest } from '../../helpers/request-helpers'

// Clear rate limit cache between tests by calling cleanup with mocked time
beforeEach(() => {
  // Force cleanup of all entries by advancing time
  const originalNow = Date.now
  vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 120000)
  cleanupRateLimitCache()
  vi.restoreAllMocks()
})

// =========================================================================
// extractApiCredentials
// =========================================================================
describe('extractApiCredentials', () => {
  it('extracts Bearer token from Authorization header', () => {
    const req = buildPartnerRequest({ apiKey: 'my-api-key', apiSecret: 'my-secret' })
    const creds = extractApiCredentials(req)
    expect(creds.apiKey).toBe('my-api-key')
    expect(creds.apiSecret).toBe('my-secret')
  })

  it('returns null apiKey when no Authorization header', () => {
    const req = buildNextRequest({
      headers: { 'x-api-secret': 'secret' },
    })
    const creds = extractApiCredentials(req)
    expect(creds.apiKey).toBeNull()
    expect(creds.apiSecret).toBe('secret')
  })

  it('returns null apiKey when Authorization header is not Bearer', () => {
    const req = buildNextRequest({
      headers: { authorization: 'Basic abc123', 'x-api-secret': 'secret' },
    })
    const creds = extractApiCredentials(req)
    expect(creds.apiKey).toBeNull()
  })

  it('returns null apiSecret when x-api-secret header is missing', () => {
    const req = buildNextRequest({
      headers: { authorization: 'Bearer my-key' },
    })
    const creds = extractApiCredentials(req)
    expect(creds.apiKey).toBe('my-key')
    expect(creds.apiSecret).toBeNull()
  })

  it('extracts idempotency key from x-idempotency-key header', () => {
    const req = buildPartnerRequest({ idempotencyKey: 'idem-123' })
    const creds = extractApiCredentials(req)
    expect(creds.idempotencyKey).toBe('idem-123')
  })

  it('returns null idempotencyKey when header is missing', () => {
    const req = buildPartnerRequest({})
    const creds = extractApiCredentials(req)
    expect(creds.idempotencyKey).toBeNull()
  })
})

// =========================================================================
// checkRateLimit
// =========================================================================
describe('checkRateLimit', () => {
  it('first request is allowed with remaining = limit - 1', () => {
    const result = checkRateLimit('key-1', 100)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })

  it('requests up to limit are allowed', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('key-2', 5)
      if (i < 5) {
        expect(result.allowed).toBe(true)
      }
    }
  })

  it('request at limit+1 is rejected', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('key-3', 3)
    }
    const result = checkRateLimit('key-3', 3)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('different keyIds have independent rate limits', () => {
    // Exhaust key-a
    for (let i = 0; i < 2; i++) {
      checkRateLimit('key-a', 2)
    }
    const rejectedA = checkRateLimit('key-a', 2)
    expect(rejectedA.allowed).toBe(false)

    // key-b should still be allowed
    const resultB = checkRateLimit('key-b', 2)
    expect(resultB.allowed).toBe(true)
  })

  it('after cache expiry, counter resets', () => {
    // First request
    checkRateLimit('key-expire', 1)

    // Exhaust limit
    const rejected = checkRateLimit('key-expire', 1)
    expect(rejected.allowed).toBe(false)

    // Advance time past the 60-second window
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000)

    const result = checkRateLimit('key-expire', 1)
    expect(result.allowed).toBe(true)

    vi.restoreAllMocks()
  })

  it('remaining decreases with each request', () => {
    const r1 = checkRateLimit('key-dec', 5)
    expect(r1.remaining).toBe(4)
    const r2 = checkRateLimit('key-dec', 5)
    expect(r2.remaining).toBe(3)
    const r3 = checkRateLimit('key-dec', 5)
    expect(r3.remaining).toBe(2)
  })

  it('resetAt is approximately 60 seconds in the future', () => {
    const before = Date.now()
    const result = checkRateLimit('key-reset', 100)
    const after = Date.now()
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 59000)
    expect(result.resetAt).toBeLessThanOrEqual(after + 61000)
  })
})

// =========================================================================
// cleanupRateLimitCache
// =========================================================================
describe('cleanupRateLimitCache', () => {
  it('expired entries are removed after cleanup', () => {
    // Create an entry
    checkRateLimit('cleanup-key', 100)

    // Advance time past expiry
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000)
    cleanupRateLimitCache()

    // New request should be treated as fresh (remaining = limit - 1)
    vi.restoreAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000)
    const result = checkRateLimit('cleanup-key', 100)
    expect(result.remaining).toBe(99)
    vi.restoreAllMocks()
  })
})

// =========================================================================
// checkIpWhitelist
// =========================================================================
describe('checkIpWhitelist', () => {
  it('returns true when allowedIps is null', () => {
    const req = buildNextRequest({})
    expect(checkIpWhitelist(req, null)).toBe(true)
  })

  it('returns true when allowedIps is empty array', () => {
    const req = buildNextRequest({})
    expect(checkIpWhitelist(req, [])).toBe(true)
  })

  it('returns true when client IP is in whitelist', () => {
    const req = buildNextRequest({ headers: { 'x-forwarded-for': '192.168.1.1' } })
    expect(checkIpWhitelist(req, ['192.168.1.1', '10.0.0.1'])).toBe(true)
  })

  it('returns false when client IP is NOT in whitelist', () => {
    const req = buildNextRequest({ headers: { 'x-forwarded-for': '192.168.1.99' } })
    expect(checkIpWhitelist(req, ['192.168.1.1', '10.0.0.1'])).toBe(false)
  })

  it('uses first IP from x-forwarded-for when multiple present', () => {
    const req = buildNextRequest({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(checkIpWhitelist(req, ['1.2.3.4'])).toBe(true)
    expect(checkIpWhitelist(req, ['5.6.7.8'])).toBe(false)
  })

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = buildNextRequest({ headers: { 'x-real-ip': '10.0.0.5' } })
    expect(checkIpWhitelist(req, ['10.0.0.5'])).toBe(true)
  })
})

// =========================================================================
// checkPermission
// =========================================================================
describe('checkPermission', () => {
  it('returns true when permissions.all is true', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k1',
      partner_name: 'P1',
      environment: 'sandbox',
      company_id: null,
      permissions: { all: true },
    }
    expect(checkPermission(partner, 'calls.analyze')).toBe(true)
    expect(checkPermission(partner, 'any.permission')).toBe(true)
  })

  it('returns true for specific granted permission', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k2',
      partner_name: 'P2',
      environment: 'production',
      company_id: null,
      permissions: { 'calls.analyze': true, 'companies.read': false },
    }
    expect(checkPermission(partner, 'calls.analyze')).toBe(true)
  })

  it('returns false for denied permission', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k3',
      partner_name: 'P3',
      environment: 'production',
      company_id: null,
      permissions: { 'calls.analyze': true },
    }
    expect(checkPermission(partner, 'companies.write')).toBe(false)
  })

  it('returns false when permissions is null/undefined', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k4',
      partner_name: 'P4',
      environment: 'sandbox',
      company_id: null,
      permissions: null as any,
    }
    expect(checkPermission(partner, 'anything')).toBe(false)
  })
})

// =========================================================================
// canAccessCompany
// =========================================================================
describe('canAccessCompany', () => {
  it('partner with specific company_id can only access that company', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k1',
      partner_name: 'P1',
      environment: 'sandbox',
      company_id: 'comp-1',
      permissions: { all: true },
    }
    expect(canAccessCompany(partner, 'comp-1')).toBe(true)
    expect(canAccessCompany(partner, 'comp-2')).toBe(false)
  })

  it('partner without company_id checks companies.read permission', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k2',
      partner_name: 'P2',
      environment: 'sandbox',
      company_id: null,
      permissions: { 'companies.read': true },
    }
    expect(canAccessCompany(partner, 'any-company')).toBe(true)
  })

  it('partner without company_id and without companies.read is denied', () => {
    const partner: PartnerAuthResult = {
      is_valid: true,
      key_id: 'k3',
      partner_name: 'P3',
      environment: 'sandbox',
      company_id: null,
      permissions: { 'calls.analyze': true },
    }
    expect(canAccessCompany(partner, 'any-company')).toBe(false)
  })
})

// =========================================================================
// createErrorResponse
// =========================================================================
describe('createErrorResponse', () => {
  it('creates a Response with correct status code', async () => {
    const response = createErrorResponse('TEST_ERROR', 'Something went wrong', 422)
    expect(response.status).toBe(422)
  })

  it('creates JSON body with error object', async () => {
    const response = createErrorResponse('TEST_ERROR', 'Bad request')
    const body = await response.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('TEST_ERROR')
    expect(body.error.message).toBe('Bad request')
    expect(body.error.timestamp).toBeDefined()
  })

  it('defaults status to 400', async () => {
    const response = createErrorResponse('DEFAULT_STATUS', 'test')
    expect(response.status).toBe(400)
  })

  it('includes details when provided', async () => {
    const response = createErrorResponse('WITH_DETAILS', 'test', 400, { field: 'email' })
    const body = await response.json()
    expect(body.error.details).toEqual({ field: 'email' })
  })
})

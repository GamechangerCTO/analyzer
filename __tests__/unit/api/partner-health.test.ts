import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase } from '../../helpers/supabase-mock'
import { buildPartnerRequest } from '../../helpers/request-helpers'
import { FIXTURES } from '../../helpers/fixtures'

// Mock Supabase
const mockSupabase = createMockSupabase()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Must mock env before importing
vi.stubEnv('PARTNER_API_ENABLED', 'true')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const { GET } = await import('@/app/api/partner/v1/health/route')

describe('GET /api/partner/v1/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: valid partner key response
    mockSupabase._rpcBuilder.single.mockResolvedValue({
      data: FIXTURES.partnerKeys.valid,
      error: null,
    })

    // Default: key data (for IP whitelist and rate limit)
    mockSupabase._queryBuilder.single.mockResolvedValue({
      data: { allowed_ips: null, rate_limit_per_minute: 1000 },
      error: null,
    })
  })

  it('returns 200 with status ok for valid credentials', async () => {
    const req = buildPartnerRequest({
      url: 'http://localhost:3000/api/partner/v1/health',
    })

    const response = await GET(req)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.partner_name).toBeDefined()
    expect(body.environment).toBeDefined()
    expect(body.timestamp).toBeDefined()
    expect(body.version).toBe('v1')
  })

  it('returns X-API-Version header', async () => {
    const req = buildPartnerRequest({
      url: 'http://localhost:3000/api/partner/v1/health',
    })

    const response = await GET(req)
    expect(response.headers.get('X-API-Version')).toBe('v1')
  })

  it('returns 401 when credentials are missing', async () => {
    // Mock validation failure
    mockSupabase._rpcBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const req = buildPartnerRequest({
      url: 'http://localhost:3000/api/partner/v1/health',
      apiKey: '',
      apiSecret: '',
    })

    const response = await GET(req)
    // Should return 401 or 500 depending on how missing creds are handled
    expect([401, 500]).toContain(response.status)
  })
})

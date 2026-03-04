import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabase } from '../../helpers/supabase-mock'
import { FIXTURES } from '../../helpers/fixtures'

// Mock Supabase
const mockSupabase = createMockSupabase()

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    responses: {
      create: vi.fn().mockResolvedValue({
        output_text: JSON.stringify({
          scenario_description: 'תרחיש מכירה אגרסיבי',
          customer_background: 'לקוח עסקי',
          main_challenge: 'התנגדות למחיר',
          success_criteria: 'סגירת עסקה',
        }),
      }),
    },
  })),
}))

vi.stubEnv('OPENAI_API_KEY', 'test-openai-key')

const { POST } = await import('@/app/api/simulations/create/route')

describe('POST /api/simulations/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const req = new NextRequest('http://localhost:3000/api/simulations/create', {
      method: 'POST',
      body: JSON.stringify({
        simulation_type: 'objection_handling',
        customer_persona: 'aggressive',
        difficulty_level: 'medium',
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('returns 400 when user has no company', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: FIXTURES.sessions.valid },
      error: null,
    })

    // User without company_id
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { ...FIXTURES.users.agent, company_id: null },
      error: null,
    })

    const req = new NextRequest('http://localhost:3000/api/simulations/create', {
      method: 'POST',
      body: JSON.stringify({
        simulation_type: 'objection_handling',
        customer_persona: 'aggressive',
        difficulty_level: 'medium',
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('returns 401 when auth error occurs', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Auth error' },
    })

    const req = new NextRequest('http://localhost:3000/api/simulations/create', {
      method: 'POST',
      body: JSON.stringify({
        simulation_type: 'objection_handling',
        customer_persona: 'aggressive',
        difficulty_level: 'medium',
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })
})

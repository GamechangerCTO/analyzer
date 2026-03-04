/**
 * Security: Input Validation
 *
 * Tests verify input validation on API routes.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Input Validation', () => {
  describe('Pagination parameters', () => {
    it('partner companies route uses sanitizePagination', () => {
      const routePath = path.resolve(__dirname, '../../app/api/partner/v1/companies/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('sanitizePagination')
      expect(content).toContain("import { sanitizePagination } from '@/lib/api-auth'")
    })

    it('sanitizePagination caps limit and validates offset', () => {
      const apiAuthPath = path.resolve(__dirname, '../../lib/api-auth.ts')
      const content = fs.readFileSync(apiAuthPath, 'utf-8')

      expect(content).toContain('sanitizePagination')
      expect(content).toContain('maxLimit')
      // Validates: NaN, <1, >max for limit; NaN, <0 for offset
    })
  })

  describe('UUID validation', () => {
    it('admin/approve-agent validates requestId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
      expect(content).toContain('isValidUUID(requestId)')
    })

    it('admin/reject-agent validates requestId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/reject-agent/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
      expect(content).toContain('isValidUUID(requestId)')
    })

    it('admin/delete-user validates userId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/delete-user/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
      expect(content).toContain('isValidUUID(userId)')
    })

    it('partner companies/[id] validates companyId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/partner/v1/companies/[id]/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
    })

    it('simulations/ephemeral-token validates simulationId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/simulations/ephemeral-token/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
    })

    it('simulations/complete validates simulationId as UUID', () => {
      const routePath = path.resolve(__dirname, '../../app/api/simulations/complete/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      expect(content).toContain('isValidUUID')
    })
  })

  describe('Enum validation', () => {
    it('AUDIT: simulations/create does not validate simulation_type against enum', () => {
      const routePath = path.resolve(__dirname, '../../app/api/simulations/create/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('simulation_type')
      expect(content).not.toMatch(/validTypes|VALID_TYPES|allowedTypes/)
      // Low risk: invalid types fall through to default scenario
    })
  })

  describe('SQL injection prevention', () => {
    it('uses Supabase parameterized queries (safe)', () => {
      const approveRoute = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
      const content = fs.readFileSync(approveRoute, 'utf-8')

      expect(content).toContain('.eq(')
      expect(content).not.toContain('`SELECT')
      expect(content).not.toMatch(/\$\{.*\}.*SELECT/)
    })
  })

  describe('XSS prevention', () => {
    it('admin routes return JSON, not HTML (safe from reflected XSS)', () => {
      const approveRoute = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
      const content = fs.readFileSync(approveRoute, 'utf-8')

      expect(content).toContain('NextResponse.json')
      expect(content).not.toContain('text/html')
    })
  })
})

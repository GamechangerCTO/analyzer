/**
 * Security: Information Disclosure
 *
 * Tests verify that sensitive information is not exposed to unauthorized users.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Information Disclosure', () => {
  describe('/api/test-env endpoint', () => {
    const testEnvPath = path.resolve(__dirname, '../../app/api/test-env/route.ts')
    const content = fs.readFileSync(testEnvPath, 'utf-8')

    it('blocked in production environment', () => {
      expect(content).toContain("process.env.NODE_ENV === 'production'")
      expect(content).toContain('Endpoint disabled in production')
    })

    it('reveals env presence booleans in development (acceptable)', () => {
      // In dev mode, shows boolean presence of keys (not their values or lengths)
      expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(content).toContain('OPENAI_API_KEY')
    })
  })

  describe('Error response handling', () => {
    it('admin/approve-agent returns generic error on exception', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('שגיאה פנימית בשרת')
    })

    it('admin/reject-agent returns generic error on exception', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/reject-agent/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('שגיאה פנימית בשרת')
    })

    it('AUDIT: partner health endpoint includes error.message in response', () => {
      const routePath = path.resolve(__dirname, '../../app/api/partner/v1/health/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('message: error.message')
      // RECOMMENDATION: Log error details server-side only
    })
  })

  describe('Debug endpoints exposure', () => {
    it('AUDIT: debug-subscription endpoint exists', () => {
      const debugPath = path.resolve(__dirname, '../../app/api/debug-subscription')
      expect(fs.existsSync(debugPath)).toBe(true)
    })

    it('AUDIT: debug-plans endpoint exists', () => {
      const debugPath = path.resolve(__dirname, '../../app/api/debug-plans')
      expect(fs.existsSync(debugPath)).toBe(true)
    })

    it('AUDIT: check-api-key endpoint exists', () => {
      const checkPath = path.resolve(__dirname, '../../app/api/check-api-key')
      expect(fs.existsSync(checkPath)).toBe(true)
      // RECOMMENDATION: Disable or protect debug endpoints in production
    })
  })
})

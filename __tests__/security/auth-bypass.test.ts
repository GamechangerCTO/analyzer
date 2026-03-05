/**
 * Security: Authentication
 *
 * Tests verify that API routes have proper authentication
 * and that middleware correctly enforces auth on protected routes.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const middlewarePath = path.resolve(__dirname, '../../middleware.ts')
const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8')

const approveAgentPath = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
const approveAgentContent = fs.readFileSync(approveAgentPath, 'utf-8')

const rejectAgentPath = path.resolve(__dirname, '../../app/api/admin/reject-agent/route.ts')
const rejectAgentContent = fs.readFileSync(rejectAgentPath, 'utf-8')

const deleteUserPath = path.resolve(__dirname, '../../app/api/admin/delete-user/route.ts')
const deleteUserContent = fs.readFileSync(deleteUserPath, 'utf-8')

describe('Authentication', () => {
  describe('Middleware Public Paths', () => {
    it('/api is NOT a blanket public path (only specific API routes are public)', () => {
      // Previously /api was in publicPaths, bypassing auth for ALL API routes.
      // Now publicApiPaths is a separate list with only specific routes.
      const publicApiPathsMatch = middlewareContent.match(/const publicApiPaths\s*=\s*\[([^\]]+)\]/)
      expect(publicApiPathsMatch).toBeTruthy()
      const publicApiPathsList = publicApiPathsMatch![1]

      // Should NOT contain bare '/api' (which would match all /api/* routes)
      expect(publicApiPathsList).not.toMatch(/['"]\/api['"]/)

      // Should contain only specific public API routes
      expect(publicApiPathsList).toContain('/api/auth/callback')
      expect(publicApiPathsList).toContain('/api/signup')
      expect(publicApiPathsList).toContain('/api/legal-terms/accept')
    })

    it('Partner API routes have separate bypass', () => {
      expect(middlewareContent).toContain("/api/partner/")
    })
  })

  describe('Admin Endpoints - Session Auth', () => {
    it('admin/approve-agent uses authenticateApiRoute with admin role check', () => {
      expect(approveAgentContent).toContain('authenticateApiRoute')
      expect(approveAgentContent).toContain("requiredRoles: ['admin']")
      // No longer uses service role key directly
      expect(approveAgentContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('admin/reject-agent uses authenticateApiRoute with admin role check', () => {
      expect(rejectAgentContent).toContain('authenticateApiRoute')
      expect(rejectAgentContent).toContain("requiredRoles: ['admin']")
      expect(rejectAgentContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('admin/delete-user uses session-derived identity (not body-provided adminId)', () => {
      expect(deleteUserContent).toContain('authenticateApiRoute')
      expect(deleteUserContent).toContain("requiredRoles: ['admin']")
      // No longer reads adminId from request body
      expect(deleteUserContent).not.toContain("const { userId, adminId } = body")
    })
  })

  describe('Debug Endpoints', () => {
    it('/api/test-env is blocked in production', () => {
      const testEnvPath = path.resolve(__dirname, '../../app/api/test-env/route.ts')
      const testEnvContent = fs.readFileSync(testEnvPath, 'utf-8')

      expect(testEnvContent).toContain("process.env.NODE_ENV === 'production'")
      expect(testEnvContent).toContain('404')
    })
  })

  describe('Protected Layout', () => {
    it('AUDIT: super admin identified by hardcoded email (known limitation)', () => {
      const layoutPath = path.resolve(__dirname, '../../app/(protected)/layout.tsx')
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8')
      expect(layoutContent).toContain('ido.segev23@gmail.com')
      // RECOMMENDATION: Use database role field instead of hardcoded email
    })
  })
})

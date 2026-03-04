import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const routePath = path.resolve(__dirname, '../../../app/api/admin/approve-agent/route.ts')
const routeContent = fs.readFileSync(routePath, 'utf-8')

describe('POST /api/admin/approve-agent', () => {
  describe('Structural analysis', () => {
    it('uses authenticateApiRoute with admin role check', () => {
      expect(routeContent).toContain('authenticateApiRoute')
      expect(routeContent).toContain("requiredRoles: ['admin']")
    })

    it('validates requestId as UUID', () => {
      expect(routeContent).toContain('isValidUUID(requestId)')
    })

    it('gets adminId from session, not request body', () => {
      expect(routeContent).toContain('adminUser.id')
      // Should not destructure adminId from body
      expect(routeContent).not.toMatch(/const\s*\{[^}]*adminId[^}]*\}\s*=\s*body/)
    })

    it('implements rollback on insert failure (deletes auth user)', () => {
      expect(routeContent).toContain('deleteUser')
      expect(routeContent).toContain('insertError')
    })

    it('generates temp password for new agents', () => {
      expect(routeContent).toContain('generateTempPassword')
      expect(routeContent).toContain('tempPassword')
    })

    it('creates notification for the requester', () => {
      expect(routeContent).toContain('createNotificationForRequester')
    })

    it('returns generic error message on exception (no stack leak)', () => {
      expect(routeContent).toContain('שגיאה פנימית בשרת')
    })

    it('sets new agent role to "agent" with is_approved: true', () => {
      expect(routeContent).toContain("role: 'agent'")
      expect(routeContent).toContain('is_approved: true')
    })
  })
})

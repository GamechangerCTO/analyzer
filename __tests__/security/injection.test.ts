/**
 * Security: Injection Vulnerabilities
 *
 * Tests verify that the application is protected against
 * SQL injection, XSS, and other injection attacks.
 */
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { isValidUUID, sanitizePagination } from '@/lib/api-auth'
import { extractApiCredentials } from '@/lib/partner-auth'
import * as fs from 'fs'
import * as path from 'path'

describe('Injection Prevention', () => {
  describe('UUID validation blocks injection payloads', () => {
    it('rejects SQL injection payload', () => {
      expect(isValidUUID("'; DROP TABLE users; --")).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidUUID('')).toBe(false)
    })

    it('rejects non-UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('12345')).toBe(false)
      expect(isValidUUID('../../../etc/passwd')).toBe(false)
    })

    it('accepts valid UUID v4', () => {
      expect(isValidUUID('12345678-1234-1234-1234-123456789abc')).toBe(true)
      expect(isValidUUID('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true)
    })
  })

  describe('Pagination sanitization prevents abuse', () => {
    it('caps limit to maxLimit', () => {
      const result = sanitizePagination('999999', '0', 100)
      expect(result.limit).toBe(100)
    })

    it('rejects negative offset', () => {
      const result = sanitizePagination('50', '-10')
      expect(result.offset).toBe(0)
    })

    it('handles NaN values with defaults', () => {
      const result = sanitizePagination('abc', 'xyz')
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it('rejects negative limit', () => {
      const result = sanitizePagination('-5', '0')
      expect(result.limit).toBe(50)
    })
  })

  describe('Header injection', () => {
    it('extractApiCredentials safely extracts credentials from normal headers', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer test-key-value',
          'x-api-secret': 'secret-value',
        },
      })

      const creds = extractApiCredentials(req)
      expect(creds.apiKey).toBe('test-key-value')
      expect(creds.apiSecret).toBe('secret-value')
    })

    it('Headers API rejects CRLF injection attempts', () => {
      expect(() => {
        new NextRequest('http://localhost:3000/api/test', {
          headers: {
            authorization: 'Bearer test\r\nX-Injected: true',
          },
        })
      }).toThrow()
    })
  })

  describe('SQL injection prevention via Supabase', () => {
    it('admin routes use parameterized queries (no raw SQL)', () => {
      const routePath = path.resolve(__dirname, '../../app/api/admin/approve-agent/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')

      // Uses .eq() method which parameterizes values
      expect(content).toContain('.eq(')
      // No raw SQL string concatenation
      expect(content).not.toContain('`SELECT')
      expect(content).not.toMatch(/\$\{.*\}.*SELECT/)
    })

    it('partner-auth uses parameterized RPC calls', () => {
      const partnerAuthPath = path.resolve(__dirname, '../../lib/partner-auth.ts')
      const content = fs.readFileSync(partnerAuthPath, 'utf-8')

      expect(content).toContain("rpc('validate_partner_api_key'")
      expect(content).toContain('p_api_key: apiKey')
    })
  })
})

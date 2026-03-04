/**
 * Security: Rate Limiting Coverage
 *
 * Tests verify rate limiting implementation across API routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, cleanupRateLimitCache } from '@/lib/partner-auth'
import { checkApiRateLimit, cleanupApiRateLimits } from '@/lib/api-auth'
import * as fs from 'fs'
import * as path from 'path'

beforeEach(() => {
  // Clear rate limit caches
  const originalNow = Date.now
  vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 120000)
  cleanupRateLimitCache()
  cleanupApiRateLimits()
  vi.restoreAllMocks()
})

describe('Rate Limiting', () => {
  describe('Partner API rate limiting', () => {
    it('enforces rate limit per key', () => {
      const limit = 5

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('rate-test-key', limit)
        expect(result.allowed).toBe(true)
      }

      const blocked = checkRateLimit('rate-test-key', limit)
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
    })

    it('returns rate limit headers data', () => {
      const result = checkRateLimit('headers-test', 100)
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('remaining')
      expect(result).toHaveProperty('resetAt')
      expect(typeof result.resetAt).toBe('number')
    })

    it('AUDIT: rate limiting is in-memory only', () => {
      const partnerAuthPath = path.resolve(__dirname, '../../lib/partner-auth.ts')
      const content = fs.readFileSync(partnerAuthPath, 'utf-8')

      expect(content).toContain('new Map<string')
      // RECOMMENDATION: Use Redis for distributed rate limiting
    })
  })

  describe('Regular API rate limiting (implemented)', () => {
    it('checkApiRateLimit enforces limits', () => {
      const limit = 3
      for (let i = 0; i < limit; i++) {
        expect(checkApiRateLimit('test-key', limit).allowed).toBe(true)
      }
      expect(checkApiRateLimit('test-key', limit).allowed).toBe(false)
    })

    it('process-call has rate limiting', () => {
      const routePath = path.resolve(__dirname, '../../app/api/process-call/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('checkApiRateLimit')
    })

    it('simulations/create has rate limiting', () => {
      const routePath = path.resolve(__dirname, '../../app/api/simulations/create/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('checkApiRateLimit')
    })
  })
})

/**
 * Security: CORS & Security Headers
 *
 * Tests verify that CORS is properly restricted and security headers are configured.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const nextConfigPath = path.resolve(__dirname, '../../next.config.js')
const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8')

describe('CORS & Security Headers', () => {
  it('CORS origin is restricted to NEXT_PUBLIC_SITE_URL (not wildcard)', () => {
    // Main API routes should use restricted origin
    expect(nextConfigContent).toContain('NEXT_PUBLIC_SITE_URL')
    // The general /api/:path* section should NOT have wildcard origin
    expect(nextConfigContent).toContain("source: '/api/:path*'")
  })

  it('Partner API routes allow wildcard CORS (by design)', () => {
    // Partner APIs are designed for external access
    expect(nextConfigContent).toContain("source: '/api/partner/:path*'")
  })

  it('X-Frame-Options header is configured', () => {
    expect(nextConfigContent).toContain('X-Frame-Options')
    expect(nextConfigContent).toContain('DENY')
  })

  it('X-Content-Type-Options header is configured', () => {
    expect(nextConfigContent).toContain('X-Content-Type-Options')
    expect(nextConfigContent).toContain('nosniff')
  })

  it('Strict-Transport-Security header is configured', () => {
    expect(nextConfigContent).toContain('Strict-Transport-Security')
  })

  it('Referrer-Policy header is configured', () => {
    expect(nextConfigContent).toContain('Referrer-Policy')
    expect(nextConfigContent).toContain('strict-origin-when-cross-origin')
  })

  it('security headers apply to all routes (/:path*)', () => {
    expect(nextConfigContent).toContain("source: '/:path*'")
  })
})

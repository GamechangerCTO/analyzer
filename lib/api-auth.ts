/**
 * API Route Authentication & Validation Helpers
 * שימוש בכל API route שדורש אימות משתמש
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * אימות session + בדיקת role עבור API routes.
 * מחזיר את המשתמש מהDB או שגיאת Response.
 */
export async function authenticateApiRoute(options?: {
  requiredRoles?: string[]
}): Promise<
  | { success: true; user: any; supabaseAdmin: any }
  | { success: false; error: NextResponse }
> {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError || !session) {
    return {
      success: false,
      error: NextResponse.json({ error: 'לא מורשה - נדרשת התחברות' }, { status: 401 }),
    }
  }

  // יצירת service role client לפעולות admin
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // שליפת פרטי המשתמש מהDB
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, company_id, is_approved')
    .eq('id', session.user.id)
    .single()

  if (userError || !user) {
    return {
      success: false,
      error: NextResponse.json({ error: 'משתמש לא נמצא במערכת' }, { status: 403 }),
    }
  }

  // בדיקת role אם נדרש
  if (options?.requiredRoles && !options.requiredRoles.includes(user.role)) {
    return {
      success: false,
      error: NextResponse.json({ error: 'אין הרשאה לביצוע פעולה זו' }, { status: 403 }),
    }
  }

  return { success: true, user, supabaseAdmin }
}

/**
 * וידוא שמחרוזת היא UUID תקין
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * נרמול ובדיקת limit/offset לפגינציה
 */
export function sanitizePagination(
  rawLimit: string | null,
  rawOffset: string | null,
  maxLimit: number = 100
): { limit: number; offset: number } {
  let limit = parseInt(rawLimit || '50', 10)
  let offset = parseInt(rawOffset || '0', 10)

  if (isNaN(limit) || limit < 1) limit = 50
  if (limit > maxLimit) limit = maxLimit
  if (isNaN(offset) || offset < 0) offset = 0

  return { limit, offset }
}

// Rate limit store (in-memory, per-instance)
const apiRateLimits = new Map<string, { count: number; resetAt: number }>()

/**
 * Rate limiter פשוט עבור API routes רגילים.
 * מפתח: userId או IP.
 * מחזיר true אם הבקשה מותרת.
 */
export function checkApiRateLimit(
  key: string,
  limitPerMinute: number = 60
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const cacheKey = `api_rl_${key}`
  const cached = apiRateLimits.get(cacheKey)

  if (!cached || cached.resetAt < now) {
    apiRateLimits.set(cacheKey, { count: 1, resetAt: now + 60000 })
    return { allowed: true, remaining: limitPerMinute - 1 }
  }

  if (cached.count >= limitPerMinute) {
    return { allowed: false, remaining: 0 }
  }

  cached.count++
  return { allowed: true, remaining: limitPerMinute - cached.count }
}

/**
 * ניקוי rate limit cache
 */
export function cleanupApiRateLimits(): void {
  const now = Date.now()
  apiRateLimits.forEach((value, key) => {
    if (value.resetAt < now) {
      apiRateLimits.delete(key)
    }
  })
}

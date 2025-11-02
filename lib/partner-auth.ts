/**
 * Partner API Authentication Library
 * מבודד לחלוטין מהמערכת הקיימת
 * Created: December 2024
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import type { PartnerAuthResult, PartnerApiError } from '@/types/partner-api.types';

// ============================================================================
// Constants
// ============================================================================

const PARTNER_API_ENABLED = process.env.PARTNER_API_ENABLED === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Rate limiting cache (in-memory - יכול להשתפר ל-Redis)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// Supabase Client (Service Role - לאימות)
// ============================================================================

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * בדיקה אם Partner API מופעל
 */
export function isPartnerApiEnabled(): boolean {
  return PARTNER_API_ENABLED;
}

/**
 * יצירת תשובת שגיאה סטנדרטית
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
): Response {
  const error: PartnerApiError = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
  
  return new Response(JSON.stringify(error), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * חילוץ API credentials מה-headers
 */
export function extractApiCredentials(request: NextRequest): {
  apiKey: string | null;
  apiSecret: string | null;
  idempotencyKey: string | null;
} {
  const authHeader = request.headers.get('authorization');
  const apiSecret = request.headers.get('x-api-secret');
  const idempotencyKey = request.headers.get('x-idempotency-key');
  
  // חילוץ API key מה-Bearer token
  let apiKey: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  }
  
  return {
    apiKey,
    apiSecret,
    idempotencyKey,
  };
}

/**
 * שמירת request log למעקב
 */
export async function logPartnerRequest(
  keyId: string | null,
  request: NextRequest,
  responseStatus: number,
  responseTimeMs: number,
  idempotencyKey: string | null = null
): Promise<void> {
  try {
    const supabase = getServiceClient();
    
    // חילוץ endpoint (ללא query params)
    const url = new URL(request.url);
    const endpoint = url.pathname;
    
    // חילוץ IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // חילוץ user agent
    const userAgent = request.headers.get('user-agent');
    
    // קריאת body (אם קיים)
    let requestBody = null;
    if (request.method !== 'GET') {
      try {
        const clonedRequest = request.clone();
        requestBody = await clonedRequest.json();
      } catch {
        // אם לא ניתן לקרוא את הbody, לא נורא
      }
    }
    
    await supabase.from('partner_api_requests').insert({
      partner_api_key_id: keyId,
      endpoint,
      method: request.method,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_body: requestBody,
      response_status: responseStatus,
      response_time_ms: responseTimeMs,
      idempotency_key: idempotencyKey,
    });
  } catch (error) {
    // לא נרצה לזרוק exception אם הlog נכשל
    console.error('Failed to log partner request:', error);
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * בדיקת rate limit
 */
export function checkRateLimit(
  keyId: string,
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const cacheKey = `rate_limit_${keyId}`;
  
  // בדיקה אם יש entry בcache
  const cached = rateLimitCache.get(cacheKey);
  
  // אם אין או שפג תוקף, אתחל מחדש
  if (!cached || cached.resetAt < now) {
    rateLimitCache.set(cacheKey, {
      count: 1,
      resetAt: now + 60000, // דקה מעכשיו
    });
    
    return {
      allowed: true,
      remaining: limitPerMinute - 1,
      resetAt: now + 60000,
    };
  }
  
  // אם עברנו את הlimit
  if (cached.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: cached.resetAt,
    };
  }
  
  // עדכון המונה
  cached.count++;
  rateLimitCache.set(cacheKey, cached);
  
  return {
    allowed: true,
    remaining: limitPerMinute - cached.count,
    resetAt: cached.resetAt,
  };
}

/**
 * ניקוי cache של rate limiting (לתחזוקה)
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];
  
  rateLimitCache.forEach((value, key) => {
    if (value.resetAt < now) {
      entriesToDelete.push(key);
    }
  });
  
  entriesToDelete.forEach(key => {
    rateLimitCache.delete(key);
  });
}

// ============================================================================
// IP Whitelist
// ============================================================================

/**
 * בדיקת IP whitelist
 */
export function checkIpWhitelist(
  request: NextRequest,
  allowedIps: string[] | null
): boolean {
  // אם אין whitelist, מאפשרים הכל
  if (!allowedIps || allowedIps.length === 0) {
    return true;
  }
  
  // חילוץ IP של הclient
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  
  // בדיקה אם הIP ברשימה המאושרת
  return allowedIps.includes(clientIp);
}

// ============================================================================
// Main Authentication Function
// ============================================================================

/**
 * אימות Partner API Key
 * זו הפונקציה המרכזית שנשתמש בה בכל endpoint
 */
export async function validatePartnerApiKey(
  request: NextRequest
): Promise<{
  success: boolean;
  partner?: PartnerAuthResult;
  error?: Response;
}> {
  // בדיקה 1: האם Partner API מופעל?
  if (!isPartnerApiEnabled()) {
    return {
      success: false,
      error: createErrorResponse(
        'SERVICE_UNAVAILABLE',
        'Partner API is temporarily disabled',
        503
      ),
    };
  }
  
  // בדיקה 2: חילוץ credentials
  const { apiKey, apiSecret, idempotencyKey } = extractApiCredentials(request);
  
  if (!apiKey || !apiSecret) {
    return {
      success: false,
      error: createErrorResponse(
        'INVALID_API_KEY',
        'Missing API credentials. Include Authorization header with Bearer token and X-API-Secret header',
        401
      ),
    };
  }
  
  // בדיקה 3: אימות מול הDB
  const supabase = getServiceClient();
  
  const { data, error } = await supabase.rpc('validate_partner_api_key', {
    p_api_key: apiKey,
    p_api_secret: apiSecret,
  }).single();
  
  if (error || !data) {
    return {
      success: false,
      error: createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to validate API credentials',
        500
      ),
    };
  }
  
  // בדיקה אם המפתח תקין
  const validationResult = data as any;
  if (!validationResult.is_valid) {
    return {
      success: false,
      error: createErrorResponse(
        'INVALID_API_KEY',
        'Invalid API credentials or expired key',
        401
      ),
    };
  }
  
  const partner: PartnerAuthResult = {
    is_valid: validationResult.is_valid,
    key_id: validationResult.key_id,
    partner_name: validationResult.partner_name,
    environment: validationResult.environment,
    company_id: validationResult.company_id,
    permissions: validationResult.permissions,
  };
  
  // בדיקה 4: IP Whitelist (אם הוגדר)
  // צריך לשלוף את allowed_ips מהDB
  const { data: keyData } = await supabase
    .from('partner_api_keys')
    .select('allowed_ips, rate_limit_per_minute')
    .eq('id', partner.key_id)
    .single();
  
  if (keyData && !checkIpWhitelist(request, keyData.allowed_ips)) {
    return {
      success: false,
      error: createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Your IP address is not whitelisted for this API key',
        403
      ),
    };
  }
  
  // בדיקה 5: Rate Limiting
  const rateLimit = keyData?.rate_limit_per_minute || 1000;
  const rateLimitResult = checkRateLimit(partner.key_id!, rateLimit);
  
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)} seconds`,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }
  
  // הכל תקין! 
  return {
    success: true,
    partner,
  };
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * בדיקת הרשאה ספציפית
 */
export function checkPermission(
  partner: PartnerAuthResult,
  permission: string
): boolean {
  // אם יש "all", מאפשרים הכל
  if (partner.permissions?.all === true) {
    return true;
  }
  
  // בדיקת הרשאה ספציפית
  return partner.permissions?.[permission] === true;
}

/**
 * בדיקה אם השותף יכול לגשת לחברה מסוימת
 */
export function canAccessCompany(
  partner: PartnerAuthResult,
  companyId: string
): boolean {
  // אם השותף קשור לחברה ספציפית, רק אליה הוא יכול לגשת
  if (partner.company_id) {
    return partner.company_id === companyId;
  }
  
  // אחרת, יכול לגשת לכל חברה (לפי הרשאות)
  return checkPermission(partner, 'companies.read');
}

// ============================================================================
// Idempotency Handling
// ============================================================================

/**
 * בדיקת idempotency key - למניעת duplicate requests
 */
export async function checkIdempotency(
  idempotencyKey: string,
  partnerId: string
): Promise<{
  isDuplicate: boolean;
  existingJob?: any;
}> {
  if (!idempotencyKey) {
    return { isDuplicate: false };
  }
  
  const supabase = getServiceClient();
  
  // חיפוש job קיים עם אותו idempotency key
  const { data, error } = await supabase
    .from('async_jobs')
    .select('*')
    .eq('partner_api_key_id', partnerId)
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking idempotency:', error);
    return { isDuplicate: false };
  }
  
  if (data) {
    return {
      isDuplicate: true,
      existingJob: data,
    };
  }
  
  return { isDuplicate: false };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isPartnerApiEnabled,
  validatePartnerApiKey,
  createErrorResponse,
  extractApiCredentials,
  checkRateLimit,
  checkIpWhitelist,
  checkPermission,
  canAccessCompany,
  checkIdempotency,
  logPartnerRequest,
  cleanupRateLimitCache,
};


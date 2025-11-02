/**
 * Webhook Caller Library
 * מערכת שליחת webhooks עם retry logic ו-signature verification
 * Created: December 2024
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default_webhook_secret_change_in_production';

// ============================================================================
// Types
// ============================================================================

interface WebhookPayload {
  job_id: string;
  job_type: string;
  status: 'completed' | 'failed';
  timestamp: string;
  [key: string]: any;
}

interface WebhookOptions {
  maxRetries?: number;
  retryDelays?: number[]; // milliseconds
  timeout?: number; // milliseconds
}

// ============================================================================
// Supabase Client
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
// Signature Generation
// ============================================================================

/**
 * יצירת HMAC signature לwebhook payload
 * השותף יכול לאמת שהwebhook באמת הגיע מהמערכת שלנו
 */
export function generateWebhookSignature(payload: any): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

/**
 * אימות signature של webhook
 * (לשימוש אם השותף שולח webhooks חזרה אלינו)
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================================
// Webhook Sending
// ============================================================================

/**
 * שליחת webhook אחד (ניסיון בודד)
 */
async function sendWebhookAttempt(
  url: string,
  payload: WebhookPayload,
  attemptNumber: number,
  timeout: number = 30000
): Promise<{
  success: boolean;
  status: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, any> | null;
  duration: number;
  error: string | null;
}> {
  const startTime = Date.now();
  
  try {
    // יצירת signature
    const signature = generateWebhookSignature(payload);
    
    // שליחת הwebhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-Signature': signature,
        'X-Webhook-Attempt': attemptNumber.toString(),
        'X-Webhook-ID': payload.job_id,
        'User-Agent': 'PartnerAPI-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    const responseBody = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    
    return {
      success: response.ok, // 2xx status
      status: response.status,
      responseBody,
      responseHeaders,
      duration,
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    let errorMessage = 'Unknown error';
    if (error.name === 'AbortError') {
      errorMessage = `Timeout after ${timeout}ms`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Host not found';
    } else {
      errorMessage = error.message || String(error);
    }
    
    return {
      success: false,
      status: null,
      responseBody: null,
      responseHeaders: null,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * שמירת log של webhook
 */
async function logWebhookAttempt(
  jobId: string,
  webhookUrl: string,
  payload: WebhookPayload,
  attemptNumber: number,
  result: Awaited<ReturnType<typeof sendWebhookAttempt>>
): Promise<void> {
  try {
    const supabase = getServiceClient();
    
    await supabase.from('webhook_logs').insert({
      async_job_id: jobId,
      webhook_url: webhookUrl,
      http_status: result.status,
      response_body: result.responseBody,
      response_headers: result.responseHeaders,
      request_payload: payload,
      attempt_number: attemptNumber,
      duration_ms: result.duration,
      success: result.success,
      error_message: result.error,
    });
  } catch (error) {
    console.error('Failed to log webhook attempt:', error);
    // לא נזרוק exception כדי לא להפריע לזרימה
  }
}

/**
 * שליחת webhook עם retry logic
 */
export async function sendWebhook(
  jobId: string,
  webhookUrl: string,
  payload: WebhookPayload,
  options: WebhookOptions = {}
): Promise<{
  success: boolean;
  finalAttempt: number;
  totalDuration: number;
}> {
  const {
    maxRetries = 3,
    retryDelays = [0, 60000, 300000], // 0s, 1min, 5min
    timeout = 30000,
  } = options;
  
  const supabase = getServiceClient();
  const totalStartTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Delay לפני ניסיון (אם זה לא הניסיון הראשון)
    if (attempt > 1 && retryDelays[attempt - 1]) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
    }
    
    // שליחת הwebhook
    const result = await sendWebhookAttempt(webhookUrl, payload, attempt, timeout);
    
    // שמירת log
    await logWebhookAttempt(jobId, webhookUrl, payload, attempt, result);
    
    // עדכון הjob
    await supabase
      .from('async_jobs')
      .update({
        webhook_attempts: attempt,
        webhook_last_attempt: new Date().toISOString(),
        webhook_completed: result.success,
      })
      .eq('id', jobId);
    
    // אם הצלחנו, סיימנו!
    if (result.success) {
      return {
        success: true,
        finalAttempt: attempt,
        totalDuration: Date.now() - totalStartTime,
      };
    }
    
    // אם זה הניסיון האחרון, נכשלנו
    if (attempt === maxRetries) {
      console.error(
        `Webhook failed after ${maxRetries} attempts for job ${jobId}:`,
        result.error
      );
      
      return {
        success: false,
        finalAttempt: attempt,
        totalDuration: Date.now() - totalStartTime,
      };
    }
    
    // אחרת, נסה שוב
    console.log(
      `Webhook attempt ${attempt}/${maxRetries} failed for job ${jobId}. Retrying...`
    );
  }
  
  // לא אמור להגיע לכאן, אבל לכל מקרה
  return {
    success: false,
    finalAttempt: maxRetries,
    totalDuration: Date.now() - totalStartTime,
  };
}

/**
 * retry של webhook שנכשל (לשימוש manual או מתזמון)
 */
export async function retryWebhook(jobId: string): Promise<boolean> {
  const supabase = getServiceClient();
  
  // שליפת הjob
  const { data: job, error } = await supabase
    .from('async_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error || !job) {
    console.error('Job not found for retry:', jobId);
    return false;
  }
  
  if (!job.webhook_url) {
    console.error('No webhook URL for job:', jobId);
    return false;
  }
  
  if (job.webhook_completed) {
    console.log('Webhook already completed for job:', jobId);
    return true;
  }
  
  // הכנת payload
  const payload: WebhookPayload = {
    job_id: job.id,
    job_type: job.job_type,
    status: job.status,
    timestamp: new Date().toISOString(),
    ...job.output_data,
  };
  
  // שליחה מחדש (ניסיון אחד)
  const result = await sendWebhook(job.id, job.webhook_url, payload, {
    maxRetries: 1,
    retryDelays: [0],
  });
  
  return result.success;
}

/**
 * שליפת כל הwebhooks שנכשלו ולא הושלמו (לתזמון)
 */
export async function getFailedWebhooks(): Promise<string[]> {
  const supabase = getServiceClient();
  
  const { data: jobs, error } = await supabase
    .from('async_jobs')
    .select('id')
    .eq('webhook_completed', false)
    .not('webhook_url', 'is', null)
    .in('status', ['completed', 'failed'])
    .limit(100);
  
  if (error) {
    console.error('Error fetching failed webhooks:', error);
    return [];
  }
  
  return (jobs || []).map(j => j.id);
}

/**
 * תזמון retry לכל הwebhooks שנכשלו
 */
export async function retryAllFailedWebhooks(): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  const failedJobIds = await getFailedWebhooks();
  
  let successful = 0;
  let failed = 0;
  
  for (const jobId of failedJobIds) {
    const success = await retryWebhook(jobId);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    total: failedJobIds.length,
    successful,
    failed,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  sendWebhook,
  retryWebhook,
  getFailedWebhooks,
  retryAllFailedWebhooks,
  generateWebhookSignature,
  verifyWebhookSignature,
};


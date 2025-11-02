/**
 * Partner API - Get Job Status
 * GET /api/partner/v1/jobs/[id]/status
 * 
 * בדיקת סטטוס job (polling)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { JobStatusResponse } from '@/types/partner-api.types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    // אימות API key
    const authResult = await validatePartnerApiKey(request);
    
    if (!authResult.success) {
      await logPartnerRequest(null, request, 401, Date.now() - startTime);
      return authResult.error!;
    }
    
    const partner = authResult.partner!;
    const jobId = params.id;
    
    // שליפת הjob
    const { data: job, error: jobError } = await supabase
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime);
      return createErrorResponse('JOB_NOT_FOUND', 'Job not found', 404);
    }
    
    // בדיקת הרשאה - רק השותף שיצר את הjob יכול לראות אותו
    if (job.partner_api_key_id !== partner.key_id) {
      await logPartnerRequest(partner.key_id!, request, 403, Date.now() - startTime);
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'You do not have permission to access this job',
        403
      );
    }
    
    // הכנת תשובה
    const response: JobStatusResponse = {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at,
    };
    
    // אם הושלם בהצלחה, כלול את התוצאות
    if (job.status === 'completed' && job.output_data) {
      response.call_id = job.call_id || job.output_data.call_id;
      response.results = {
        transcript: job.output_data.transcript,
        tone_analysis: job.output_data.tone_analysis,
        content_analysis: job.output_data.content_analysis,
        overall_score: job.output_data.overall_score,
      };
    }
    
    // אם נכשל, כלול פרטי שגיאה
    if (job.status === 'failed') {
      response.error_message = job.error_message;
      response.error_details = job.error_details;
    }
    
    await logPartnerRequest(partner.key_id!, request, 200, Date.now() - startTime);
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
        // Cache headers לפי סטטוס
        'Cache-Control': job.status === 'completed' || job.status === 'failed'
          ? 'public, max-age=3600' // cache למשך שעה
          : 'no-cache', // לא לcache אם עדיין בתהליך
      },
    });
    
  } catch (error: any) {
    console.error('Get job status error:', error);
    await logPartnerRequest(null, request, 500, Date.now() - startTime);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      { message: error.message }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}


/**
 * Partner API - Analyze Call
 * POST /api/partner/v1/calls/analyze
 * 
 * העלאת שיחה לניתוח (async)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, canAccessCompany, checkIdempotency, logPartnerRequest, extractApiCredentials } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import { processJob } from '@/lib/partner-job-processor';
import type { AnalyzeCallRequest, AnalyzeCallResponse } from '@/types/partner-api.types';

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // אימות API key
    const authResult = await validatePartnerApiKey(request);
    
    if (!authResult.success) {
      await logPartnerRequest(null, request, 401, Date.now() - startTime);
      return authResult.error!;
    }
    
    const partner = authResult.partner!;
    
    // קריאת body
    let body: AnalyzeCallRequest;
    try {
      body = await request.json();
    } catch {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid JSON body', 400);
    }
    
    // Validation
    if (!body.audio_file || !body.company_id || !body.agent_id || !body.call_type) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse(
        'INVALID_INPUT',
        'Missing required fields: audio_file, company_id, agent_id, call_type',
        400
      );
    }
    
    // בדיקת הרשאה לחברה
    if (!canAccessCompany(partner, body.company_id)) {
      await logPartnerRequest(partner.key_id!, request, 403, Date.now() - startTime);
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'You do not have permission to access this company',
        403
      );
    }
    
    // בדיקת idempotency
    const { idempotencyKey } = extractApiCredentials(request);
    if (idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, partner.key_id!);
      if (idempotencyCheck.isDuplicate && idempotencyCheck.existingJob) {
        // החזר את הjob הקיים
        const response: AnalyzeCallResponse = {
          job_id: idempotencyCheck.existingJob.id,
          status: 'queued',
          estimated_time: '2-3 minutes',
          message: 'Duplicate request detected. Returning existing job.',
        };
        
        await logPartnerRequest(partner.key_id!, request, 200, Date.now() - startTime, idempotencyKey);
        return NextResponse.json(response, { status: 200 });
      }
    }
    
    // בדיקה שהחברה קיימת
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', body.company_id)
      .single();
    
    if (!company) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime, idempotencyKey);
      return createErrorResponse('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    
    // בדיקה שהאג'נט קיים
    const { data: agent } = await supabase
      .from('auth.users')
      .select('id')
      .eq('id', body.agent_id)
      .single();
    
    if (!agent) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime, idempotencyKey);
      return createErrorResponse('AGENT_NOT_FOUND', 'Agent not found', 404);
    }
    
    // יצירת job
    const { data: job, error: jobError } = await supabase
      .from('async_jobs')
      .insert({
        job_type: 'call_analysis',
        partner_api_key_id: partner.key_id!,
        company_id: body.company_id,
        agent_id: body.agent_id,
        status: 'pending',
        progress: 0,
        input_data: {
          audio_file: body.audio_file,
          company_id: body.company_id,
          agent_id: body.agent_id,
          call_type: body.call_type,
          analysis_type: body.analysis_type || 'full',
          metadata: body.metadata || {},
        },
        webhook_url: body.webhook_url || null,
        idempotency_key: idempotencyKey || null,
      })
      .select()
      .single();
    
    if (jobError || !job) {
      console.error('Error creating job:', jobError);
      await logPartnerRequest(partner.key_id!, request, 500, Date.now() - startTime, idempotencyKey);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create analysis job',
        500,
        { db_error: jobError?.message }
      );
    }
    
    // הפעלת העיבוד באופן אסינכרוני (לא נחכה)
    processJob(job.id).catch(error => {
      console.error('Job processing failed:', error);
    });
    
    // תשובה
    const response: AnalyzeCallResponse = {
      job_id: job.id,
      status: 'queued',
      estimated_time: body.analysis_type === 'tone_only' ? '1-2 minutes' : '2-3 minutes',
      message: 'Analysis job created successfully. Use the job_id to check status or wait for webhook callback.',
    };
    
    await logPartnerRequest(partner.key_id!, request, 202, Date.now() - startTime, idempotencyKey);
    
    return NextResponse.json(response, {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
        'Location': `/api/partner/v1/jobs/${job.id}/status`,
      },
    });
    
  } catch (error: any) {
    console.error('Analyze call error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type, X-Idempotency-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

